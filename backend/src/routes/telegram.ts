import { Router, Response } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

interface TelegramWebhookUpdate {
  message?: {
    message_id: number
    from: { id: number; username?: string; first_name: string }
    chat: { id: number; type: string }
    text?: string
    date: number
  }
}

// Telegram Bot API helper functions
const telegram = {
  async verifyBotToken(token: string): Promise<{ ok: boolean; result?: any }> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`)
      return await response.json() as { ok: boolean; result?: any }
    } catch {
      return { ok: false }
    }
  },

  async setWebhook(token: string, webhookUrl: string): Promise<{ ok: boolean }> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl, secret_token: crypto.randomBytes(32).toString('hex') })
      })
      return await response.json() as { ok: boolean }
    } catch {
      return { ok: false }
    }
  },

  async sendMessage(token: string, chatId: number, text: string): Promise<{ ok: boolean }> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text,
          parse_mode: 'Markdown'
        })
      })
      return await response.json() as { ok: boolean }
    } catch {
      return { ok: false }
    }
  }
}

// Verify and configure a Telegram bot
router.post('/configure', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { botToken, channelId } = req.body

    if (!botToken || !channelId) {
      return res.status(400).json({ error: 'Bot token and channel ID are required' })
    }

    // Verify bot token with Telegram
    const botInfo = await telegram.verifyBotToken(botToken)
    if (!botInfo.ok) {
      return res.status(400).json({ error: 'Invalid bot token or cannot reach Telegram API' })
    }

    // Set up webhook URL for this channel
    const webhookUrl = `${process.env.APP_URL}/api/telegram/webhook/${channelId}`
    const webhookResult = await telegram.setWebhook(botToken, webhookUrl)
    
    if (!webhookResult.ok) {
      return res.status(500).json({ error: 'Failed to set up webhook with Telegram' })
    }

    // Update channel config in database
    const updatedChannel = await prisma.channel.update({
      where: { 
        id: channelId,
        userId: req.userId // Ensure user owns this channel
      },
      data: {
        config: {
          botToken,
          botUsername: botInfo.result.username,
          botName: botInfo.result.first_name,
          webhookUrl,
          isConfigured: true
        },
        isActive: true
      }
    })

    res.json({ 
      success: true, 
      bot: {
        username: botInfo.result.username,
        name: botInfo.result.first_name
      },
      channel: updatedChannel
    })

  } catch (error) {
    console.error('Telegram configuration error:', error)
    res.status(500).json({ error: 'Failed to configure Telegram bot' })
  }
})

// Webhook endpoint for receiving messages from Telegram
router.post('/webhook/:channelId', async (req, res) => {
  try {
    const channelId = req.params.channelId as string
    const update: TelegramWebhookUpdate = req.body

    // Find the channel and its paired agents
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, type: 'TELEGRAM' },
      include: { 
        agents: { 
          include: { 
            agent: { include: { user: true } } 
          } 
        } 
      }
    })

    if (!channel || !channel.config || !(channel.config as any).isConfigured) {
      return res.status(404).json({ error: 'Channel not found or not configured' })
    }

    const config = channel.config as any
    const message = update.message

    if (!message || !message.text) {
      return res.status(200).json({ ok: true }) // Ignore non-text messages
    }

    // Route message to all paired agents
    for (const channelAgent of channel.agents) {
      const agent = channelAgent.agent
      
      // Here we would normally send the message to the agent's runtime
      // For now, we'll just log it and send an echo response
      console.log(`Message from Telegram user ${message.from.first_name} to agent ${agent.name}:`, message.text)
      
      // Echo response for testing
      const response = `Hello ${message.from.first_name}! I received your message: "${message.text}". Agent "${agent.name}" is processing your request.`
      
      await telegram.sendMessage(config.botToken, message.chat.id, response)
      
      // Log the interaction
      await prisma.agentLog.create({
        data: {
          agentId: agent.id,
          level: 'info',
          message: 'Telegram message received',
          metadata: {
            telegramUserId: message.from.id,
            telegramUsername: message.from.username,
            messageText: message.text,
            chatId: message.chat.id
          }
        }
      })
    }

    res.status(200).json({ ok: true })

  } catch (error) {
    console.error('Telegram webhook error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

// Get Telegram channel status and stats
router.get('/status/:channelId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const channelId = req.params.channelId as string

    const channel = await prisma.channel.findFirst({
      where: { 
        id: channelId, 
        userId: req.userId,
        type: 'TELEGRAM' 
      },
      include: {
        agents: { include: { agent: true } }
      }
    })

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }

    const config = channel.config as any
    
    // Check if bot is still valid
    let botStatus = 'unknown'
    if (config?.botToken) {
      const botInfo = await telegram.verifyBotToken(config.botToken)
      botStatus = botInfo.ok ? 'active' : 'invalid'
    }

    // Get recent logs for this channel
    const recentLogs = await prisma.agentLog.findMany({
      where: {
        agent: {
          channels: {
            some: { channelId }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    res.json({
      channel,
      botStatus,
      pairedAgents: channel.agents.length,
      recentActivity: recentLogs.length,
      config: {
        botUsername: config?.botUsername,
        botName: config?.botName,
        isConfigured: config?.isConfigured || false
      }
    })

  } catch (error) {
    console.error('Telegram status error:', error)
    res.status(500).json({ error: 'Failed to get channel status' })
  }
})

export default router