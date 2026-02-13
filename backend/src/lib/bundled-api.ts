import crypto from 'crypto'
import prisma from './prisma'

// ClawHQ's bundled API keys (encrypted with master key)
const MASTER_ENCRYPTION_KEY = process.env.MASTER_API_ENCRYPTION_KEY || 'clawhq-master-key-32-chars-long'

// Bundled API pricing per 1K tokens (in USD)
const API_PRICING = {
  // Claude models (Anthropic)
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-opus-4-6': { input: 0.015, output: 0.075 },
  'claude-haiku-3-20240307': { input: 0.00025, output: 0.00125 },
  
  // GPT models (OpenAI)
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  
  // Google models
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  
  // DeepSeek
  'deepseek-chat': { input: 0.00014, output: 0.00028 },
  'deepseek-coder': { input: 0.00014, output: 0.00028 },
  
  // Grok
  'grok-beta': { input: 0.005, output: 0.015 }
} as const

interface BundledApiKey {
  provider: string
  key: string
  isActive: boolean
  dailyQuota: number // tokens per day
  usedToday: number
}

interface UsageData {
  inputTokens: number
  outputTokens: number
  model: string
  timestamp: Date
}

class BundledApiService {
  private apiKeys: BundledApiKey[] = []
  private lastKeyRefresh = 0
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.loadApiKeys()
  }

  private encrypt(text: string): string {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(MASTER_ENCRYPTION_KEY, 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  }

  private decrypt(text: string): string {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(MASTER_ENCRYPTION_KEY, 'salt', 32)
    const parts = text.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const encryptedText = parts[1]
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  private async loadApiKeys(): Promise<void> {
    try {
      // Load from environment variables or database
      const bundledKeys = {
        ANTHROPIC: process.env.CLAWHQ_ANTHROPIC_KEY,
        OPENAI: process.env.CLAWHQ_OPENAI_KEY,
        GOOGLE: process.env.CLAWHQ_GOOGLE_KEY,
        DEEPSEEK: process.env.CLAWHQ_DEEPSEEK_KEY,
        GROK: process.env.CLAWHQ_GROK_KEY
      }

      this.apiKeys = []
      
      for (const [provider, key] of Object.entries(bundledKeys)) {
        if (key) {
          this.apiKeys.push({
            provider,
            key,
            isActive: true,
            dailyQuota: 1000000, // 1M tokens per day per key
            usedToday: await this.getTodayUsage(provider)
          })
        }
      }

      this.lastKeyRefresh = Date.now()
      console.log(`🔑 Loaded ${this.apiKeys.length} bundled API keys`)
    } catch (error) {
      console.error('❌ Failed to load bundled API keys:', error)
    }
  }

  private async refreshKeysIfNeeded(): Promise<void> {
    if (Date.now() - this.lastKeyRefresh > this.CACHE_TTL) {
      await this.loadApiKeys()
    }
  }

  private async getTodayUsage(provider: string): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const usage = await prisma.bundledUsage.findFirst({
      where: {
        provider,
        date: today
      }
    })

    return usage?.totalTokens || 0
  }

  public async getApiKey(provider: string): Promise<string | null> {
    await this.refreshKeysIfNeeded()

    const apiKey = this.apiKeys.find(k => 
      k.provider.toUpperCase() === provider.toUpperCase() && 
      k.isActive && 
      k.usedToday < k.dailyQuota
    )

    return apiKey?.key || null
  }

  public async recordUsage(
    userId: string, 
    provider: string, 
    usage: UsageData
  ): Promise<void> {
    const cost = this.calculateCost(usage.model, usage.inputTokens, usage.outputTokens)
    const totalTokens = usage.inputTokens + usage.outputTokens

    try {
      // Record usage in database
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Update user's daily usage
      await prisma.usageRecord.upsert({
        where: {
          userId_date: {
            userId,
            date: today
          }
        },
        create: {
          userId,
          date: today,
          messages: 1,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          costUsd: cost
        },
        update: {
          messages: { increment: 1 },
          inputTokens: { increment: usage.inputTokens },
          outputTokens: { increment: usage.outputTokens },
          costUsd: { increment: cost }
        }
      })

      // Update bundled API usage tracking
      await prisma.bundledUsage.upsert({
        where: {
          provider_date: {
            provider,
            date: today
          }
        },
        create: {
          provider,
          date: today,
          totalTokens,
          costUsd: cost,
          requestCount: 1
        },
        update: {
          totalTokens: { increment: totalTokens },
          costUsd: { increment: cost },
          requestCount: { increment: 1 }
        }
      })

      // Update in-memory usage counter
      const apiKey = this.apiKeys.find(k => k.provider.toUpperCase() === provider.toUpperCase())
      if (apiKey) {
        apiKey.usedToday += totalTokens
      }

    } catch (error) {
      console.error('❌ Failed to record bundled API usage:', error)
      throw error
    }
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = API_PRICING[model as keyof typeof API_PRICING]
    
    if (!pricing) {
      console.warn(`⚠️ No pricing data for model ${model}, using default`)
      return (inputTokens * 0.001 + outputTokens * 0.003) / 1000 // Default pricing
    }

    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000
  }

  public async checkUserLimits(userId: string): Promise<{ 
    canUse: boolean
    reason?: string
    dailyUsage: any
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get user's plan and limits
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return { canUse: false, reason: 'User not found', dailyUsage: null }
    }

    // Get today's usage
    const dailyUsage = await prisma.usageRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date: today
        }
      }
    })

    const messagesUsed = dailyUsage?.messages || 0

    // Check daily message limit
    if (messagesUsed >= user.dailyMsgLimit) {
      return { 
        canUse: false, 
        reason: `Daily message limit reached (${user.dailyMsgLimit})`,
        dailyUsage 
      }
    }

    // For free tier, also check if they've exceeded cost threshold
    if (user.plan === 'free') {
      const costUsed = dailyUsage?.costUsd || 0
      const FREE_TIER_COST_LIMIT = 0.50 // $0.50 per day for free tier
      
      if (costUsed >= FREE_TIER_COST_LIMIT) {
        return {
          canUse: false,
          reason: `Daily cost limit reached ($${FREE_TIER_COST_LIMIT})`,
          dailyUsage
        }
      }
    }

    return { canUse: true, dailyUsage }
  }

  public getAvailableProviders(): string[] {
    return this.apiKeys
      .filter(k => k.isActive && k.usedToday < k.dailyQuota)
      .map(k => k.provider)
  }

  public getPricingInfo() {
    return API_PRICING
  }
}

export const bundledApiService = new BundledApiService()
export default bundledApiService