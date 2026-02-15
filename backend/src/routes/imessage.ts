import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

/**
 * iMessage Channel Support for ClawHQ
 *
 * iMessage integration uses the OpenClaw BlueBubbles / Beeper bridge approach:
 * - Users self-host a BlueBubbles server on their Mac
 * - ClawHQ connects to their BlueBubbles API for send/receive
 * - Alternatively, users can use Beeper's cloud bridge
 *
 * Configuration requires:
 * - BlueBubbles server URL (user's Mac address)
 * - BlueBubbles API password
 * - OR Beeper API credentials
 */

interface BlueBubblesConfig {
  serverUrl: string
  password: string
  isConfigured: boolean
}

// Helper to call BlueBubbles API
const bluebubbles = {
  async ping(serverUrl: string, password: string): Promise<{ ok: boolean; data?: any }> {
    try {
      const response = await fetch(`${serverUrl}/api/v1/ping?password=${encodeURIComponent(password)}`)
      if (!response.ok) return { ok: false }
      const data = await response.json()
      return { ok: true, data }
    } catch {
      return { ok: false }
    }
  },

  async sendMessage(
    serverUrl: string,
    password: string,
    chatGuid: string,
    text: string
  ): Promise<{ ok: boolean; data?: any }> {
    try {
      const response = await fetch(`${serverUrl}/api/v1/message/text?password=${encodeURIComponent(password)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatGuid,
          message: text,
          method: 'apple-script'
        })
      })
      if (!response.ok) return { ok: false }
      const data = await response.json()
      return { ok: true, data }
    } catch {
      return { ok: false }
    }
  },

  async registerWebhook(
    serverUrl: string,
    password: string,
    webhookUrl: string
  ): Promise<{ ok: boolean }> {
    try {
      const response = await fetch(`${serverUrl}/api/v1/webhook?password=${encodeURIComponent(password)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          events: ['new-message']
        })
      })
      return { ok: response.ok }
    } catch {
      return { ok: false }
    }
  }
}

// Configure iMessage channel via BlueBubbles
router.post('/configure', async (req: AuthRequest, res: Response) => {
  try {
    const { serverUrl, password, channelId } = req.body

    if (!serverUrl || !password || !channelId) {
      return res.status(400).json({
        error: 'BlueBubbles server URL, password, and channel ID are required'
      })
    }

    // Normalize URL (strip trailing slash)
    const normalizedUrl = serverUrl.replace(/\/+$/, '')

    // Ping the BlueBubbles server to verify connection
    const pingResult = await bluebubbles.ping(normalizedUrl, password)
    if (!pingResult.ok) {
      return res.status(400).json({
        error: 'Cannot connect to BlueBubbles server. Ensure it is running and the URL/password are correct.'
      })
    }

    // Set up webhook for incoming messages
    const webhookUrl = `${process.env.APP_URL}/api/imessage/webhook/${channelId}`
    await bluebubbles.registerWebhook(normalizedUrl, password, webhookUrl)

    // Save config
    const updatedChannel = await prisma.channel.update({
      where: {
        id: channelId,
        userId: req.userId
      },
      data: {
        config: {
          serverUrl: normalizedUrl,
          password,
          webhookUrl,
          isConfigured: true
        } satisfies BlueBubblesConfig & { webhookUrl: string },
        isActive: true
      }
    })

    res.json({
      success: true,
      channel: updatedChannel,
      instructions: [
        'Your BlueBubbles server is connected!',
        'Make sure your Mac stays on and BlueBubbles is running.',
        'Incoming iMessages will be forwarded to your paired agents.'
      ]
    })
  } catch (error) {
    console.error('iMessage configuration error:', error)
    res.status(500).json({ error: 'Failed to configure iMessage channel' })
  }
})

// Webhook endpoint for BlueBubbles incoming messages
router.post('/webhook/:channelId', async (req, res) => {
  try {
    const channelId = req.params.channelId as string
    const event = req.body

    // BlueBubbles webhook payload structure
    if (event.type !== 'new-message' || !event.data) {
      return res.status(200).json({ ok: true })
    }

    const message = event.data
    const text = message.text
    const senderHandle = message.handle?.address || message.handle?.id || 'unknown'
    const chatGuid = message.chats?.[0]?.guid

    if (!text || message.isFromMe || !chatGuid) {
      return res.status(200).json({ ok: true })
    }

    // Find channel and paired agents
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, type: 'IMESSAGE' },
      include: {
        channelAgents: {
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

    // Route message to all paired agents
    for (const channelAgent of channel.channelAgents) {
      const agent = channelAgent.agent

      console.log(`iMessage from ${senderHandle} to agent ${agent.name}:`, text)

      // Echo response for testing
      const response = `Hello! I received your message: "${text}". Agent "${agent.name}" is processing your request.`

      await bluebubbles.sendMessage(config.serverUrl, config.password, chatGuid, response)

      // Log the interaction
      await prisma.agentLog.create({
        data: {
          agentId: agent.id,
          level: 'info',
          message: 'iMessage received',
          metadata: {
            sender: senderHandle,
            messageText: text,
            chatGuid
          }
        }
      })
    }

    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('iMessage webhook error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

// Get iMessage channel status
router.get('/status/:channelId', async (req: AuthRequest, res: Response) => {
  try {
    const channelId = req.params.channelId as string

    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        userId: req.userId,
        type: 'IMESSAGE'
      },
      include: {
        channelAgents: { include: { agent: true } }
      }
    })

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }

    const config = channel.config as any

    // Check if BlueBubbles server is reachable
    let serverStatus = 'unknown'
    if (config?.serverUrl && config?.password) {
      const ping = await bluebubbles.ping(config.serverUrl, config.password)
      serverStatus = ping.ok ? 'active' : 'unreachable'
    }

    const recentLogs = await prisma.agentLog.findMany({
      where: {
        agent: {
          agentChannels: {
            some: { channelId }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    res.json({
      channel,
      serverStatus,
      pairedAgents: channel.channelAgents.length,
      recentActivity: recentLogs.length,
      config: {
        serverUrl: config?.serverUrl,
        isConfigured: config?.isConfigured || false
      }
    })
  } catch (error) {
    console.error('iMessage status error:', error)
    res.status(500).json({ error: 'Failed to get channel status' })
  }
})

export default router
