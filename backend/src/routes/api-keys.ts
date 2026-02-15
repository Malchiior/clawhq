import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import crypto from 'crypto'

const router = Router()
router.use(authenticate)

// Encryption key for API keys (in production, use a proper key management system)
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || 'default-key-for-dev-only-32-chars'

if (process.env.NODE_ENV === 'production' && ENCRYPTION_KEY === 'default-key-for-dev-only-32-chars') {
  console.error('🚨 WARNING: API_KEY_ENCRYPTION_KEY is using the default value! Set a strong key in production.')
}

function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(text: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const parts = text.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts[1]
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Get all API keys for user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        provider: true,
        name: true,
        isActive: true,
        lastUsed: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json({ apiKeys })
  } catch (error) {
    console.error('Failed to fetch API keys:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Add/update API key
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { provider, key, name } = req.body
    
    if (!provider || !key) {
      res.status(400).json({ error: 'Provider and key are required' })
      return
    }
    
    // Validate the API key format based on provider
    const isValidKey = validateApiKey(provider, key)
    if (!isValidKey) {
      res.status(400).json({ error: 'Invalid API key format for the selected provider' })
      return
    }
    
    const encryptedKey = encrypt(key)
    
    // Use upsert to either create or update
    const apiKey = await prisma.apiKey.upsert({
      where: {
        userId_provider: {
          userId: req.userId!,
          provider
        }
      },
      create: {
        userId: req.userId!,
        provider,
        key: encryptedKey,
        name: name || provider,
        isActive: true
      },
      update: {
        key: encryptedKey,
        name: name || provider,
        isActive: true,
        updatedAt: new Date()
      }
    })
    
    res.status(201).json({ 
      success: true, 
      message: 'API key saved successfully',
      apiKey: {
        id: apiKey.id,
        provider: apiKey.provider,
        name: apiKey.name,
        isActive: apiKey.isActive
      }
    })
  } catch (error) {
    console.error('Failed to save API key:', error)
    res.status(500).json({ error: 'Failed to save API key' })
  }
})

// Test API key
router.post('/test/:provider', async (req: AuthRequest, res: Response) => {
  try {
    const provider = req.params.provider as string
    const { key } = req.body
    
    const testResult = await testApiKey(provider, key)
    
    res.json({
      success: testResult.success,
      message: testResult.message,
      details: testResult.details
    })
  } catch (error) {
    console.error('Failed to test API key:', error)
    res.status(500).json({ error: 'Failed to test API key' })
  }
})

// Delete API key
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const apiKey = await prisma.apiKey.deleteMany({
      where: {
        id: req.params.id as string,
        userId: req.userId
      }
    })
    
    if (apiKey.count === 0) {
      res.status(404).json({ error: 'API key not found' })
      return
    }
    
    res.json({ success: true, message: 'API key deleted successfully' })
  } catch (error) {
    console.error('Failed to delete API key:', error)
    res.status(500).json({ error: 'Failed to delete API key' })
  }
})

// Toggle API key active status
router.patch('/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const apiKeyId = req.params.id as string
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId: req.userId
      }
    })
    
    if (!apiKey) {
      res.status(404).json({ error: 'API key not found' })
      return
    }
    
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: !apiKey.isActive }
    })
    
    res.json({ 
      success: true, 
      message: `API key ${apiKey.isActive ? 'disabled' : 'enabled'} successfully` 
    })
  } catch (error) {
    console.error('Failed to toggle API key:', error)
    res.status(500).json({ error: 'Failed to toggle API key' })
  }
})

// Update user's API mode preference
router.post('/mode', async (req: AuthRequest, res: Response) => {
  try {
    const { mode } = req.body // "bundled" or "byok"
    
    if (!['bundled', 'byok'].includes(mode)) {
      res.status(400).json({ error: 'Invalid API mode. Must be "bundled" or "byok"' })
      return
    }
    
    await prisma.user.update({
      where: { id: req.userId },
      data: { apiMode: mode }
    })
    
    res.json({ 
      success: true, 
      message: `API mode updated to ${mode === 'byok' ? 'Bring Your Own Key' : 'Bundled API'}` 
    })
  } catch (error) {
    console.error('Failed to update API mode:', error)
    res.status(500).json({ error: 'Failed to update API mode' })
  }
})

// Get user's decrypted API keys (for agent deployment)
export async function getUserApiKeys(userId: string): Promise<Record<string, string>> {
  const apiKeys = await prisma.apiKey.findMany({
    where: { 
      userId,
      isActive: true 
    }
  })
  
  const decryptedKeys: Record<string, string> = {}
  
  for (const apiKey of apiKeys) {
    try {
      const decryptedKey = decrypt(apiKey.key)
      decryptedKeys[apiKey.provider.toLowerCase()] = decryptedKey
    } catch (error) {
      console.error(`Failed to decrypt API key for provider ${apiKey.provider}:`, error)
    }
  }
  
  return decryptedKeys
}

function validateApiKey(provider: string, key: string): boolean {
  switch (provider.toUpperCase()) {
    case 'OPENAI':
      return key.startsWith('sk-') && key.length > 20
    case 'ANTHROPIC':
      return key.startsWith('sk-ant-') && key.length > 20
    case 'GOOGLE':
      return key.length > 20 // Google AI API keys vary in format
    case 'DEEPSEEK':
      return key.startsWith('sk-') && key.length > 20
    case 'GROK':
      return key.startsWith('xai-') && key.length > 20
    default:
      return false
  }
}

async function testApiKey(provider: string, key: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    switch (provider.toUpperCase()) {
      case 'OPENAI':
        // Test OpenAI API key
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (openaiResponse.ok) {
          return { success: true, message: 'OpenAI API key is valid' }
        } else {
          return { success: false, message: 'OpenAI API key is invalid or has insufficient permissions' }
        }
        
      case 'ANTHROPIC':
        // Test Anthropic API key
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }]
          })
        })
        
        if (anthropicResponse.status === 200 || anthropicResponse.status === 400) {
          // 400 is also OK - it means the key is valid but request format might be off
          return { success: true, message: 'Anthropic API key is valid' }
        } else {
          return { success: false, message: 'Anthropic API key is invalid' }
        }
        
      case 'GOOGLE':
        // Test Google AI API key
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
        
        if (googleResponse.ok) {
          return { success: true, message: 'Google AI API key is valid' }
        } else {
          return { success: false, message: 'Google AI API key is invalid' }
        }
        
      default:
        return { success: false, message: 'API key testing not implemented for this provider' }
    }
  } catch (error) {
    return { 
      success: false, 
      message: 'Failed to test API key',
      details: String(error)
    }
  }
}

export default router