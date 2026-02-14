import { Router, Response } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

interface WhatsAppWebhookEntry {
  id: string
  changes: Array<{
    value: {
      messaging_product: string
      metadata: { display_phone_number: string; phone_number_id: string }
      contacts?: Array<{ profile: { name: string }; wa_id: string }>
      messages?: Array<{
        from: string
        id: string
        timestamp: string
        text?: { body: string }
        type: string
      }>
    }
    field: string
  }>
}

interface WhatsAppWebhookPayload {
  object: string
  entry: WhatsAppWebhookEntry[]
}

// WhatsApp Business API helper functions
const whatsapp = {
  async verifyToken(accessToken: string, phoneNumberId: string): Promise<{ ok: boolean; data?: any }> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        return { ok: false }
      }
      
      const data = await response.json()
      return { ok: true, data }
    } catch {
      return { ok: false }
    }
  },

  async sendMessage(accessToken: string, phoneNumberId: string, to: string, text: string): Promise<{ ok: boolean }> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: text }
        })
      })
      
      const data = await response.json()
      return { ok: response.ok }
    } catch {
      return { ok: false }
    }
  },

  async setWebhook(accessToken: string, appId: string, webhookUrl: string, verifyToken: string): Promise<{ ok: boolean }> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${appId}/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          object: 'whatsapp_business_account',
          callback_url: webhookUrl,
          verify_token: verifyToken,
          fields: 'messages'
        })
      })
      
      return { ok: response.ok }
    } catch {
      return { ok: false }
    }
  }
}

// Verify and configure WhatsApp Business API
router.post('/configure', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { accessToken, phoneNumberId, businessDisplayName, channelId } = req.body

    if (!accessToken || !phoneNumberId || !channelId) {
      return res.status(400).json({ error: 'Access token, phone number ID, and channel ID are required' })
    }

    // Verify access token and phone number with WhatsApp Business API
    const phoneInfo = await whatsapp.verifyToken(accessToken, phoneNumberId)
    if (!phoneInfo.ok) {
      return res.status(400).json({ error: 'Invalid access token or phone number ID' })
    }

    // Generate verify token for webhook
    const verifyToken = crypto.randomBytes(32).toString('hex')
    const webhookUrl = `${process.env.APP_URL}/api/whatsapp/webhook/${channelId}`

    // Update channel config in database
    const updatedChannel = await prisma.channel.update({
      where: { 
        id: channelId,
        userId: req.userId // Ensure user owns this channel
      },
      data: {
        config: {
          accessToken,
          phoneNumberId,
          businessDisplayName: businessDisplayName || phoneInfo.data?.display_phone_number || phoneNumberId,
          verifyToken,
          webhookUrl,
          isConfigured: true
        },
        isActive: true
      }
    })

    res.json({ 
      success: true, 
      business: {
        displayName: businessDisplayName || phoneInfo.data?.display_phone_number || phoneNumberId,
        phoneNumber: phoneInfo.data?.display_phone_number || phoneNumberId
      },
      channel: updatedChannel,
      webhookSetup: {
        url: webhookUrl,
        verifyToken: verifyToken,
        instructions: "Add this webhook URL to your WhatsApp Business App configuration in the Meta for Developers console"
      }
    })

  } catch (error) {
    console.error('WhatsApp configuration error:', error)
    res.status(500).json({ error: 'Failed to configure WhatsApp Business API' })
  }
})

// Webhook verification endpoint (GET request from Meta)
router.get('/webhook/:channelId', async (req, res) => {
  try {
    const channelId = req.params.channelId as string
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    // Find the channel
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, type: 'WHATSAPP' }
    })

    if (!channel || !channel.config) {
      return res.status(404).send('Channel not found')
    }

    const config = channel.config as any

    // Verify the webhook
    if (mode === 'subscribe' && token === config.verifyToken) {
      console.log('WhatsApp webhook verified for channel:', channelId)
      res.status(200).send(challenge)
    } else {
      res.status(403).send('Forbidden')
    }

  } catch (error) {
    console.error('WhatsApp webhook verification error:', error)
    res.status(500).send('Verification failed')
  }
})

// Webhook endpoint for receiving messages from WhatsApp (POST request from Meta)
router.post('/webhook/:channelId', async (req, res) => {
  try {
    const channelId = req.params.channelId as string
    const payload: WhatsAppWebhookPayload = req.body

    // Find the channel and its paired agents
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, type: 'WHATSAPP' },
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

    // Process each entry in the webhook payload
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const value = change.value
        
        if (!value.messages || value.messages.length === 0) {
          continue // No messages to process
        }

        for (const message of value.messages) {
          if (message.type !== 'text' || !message.text) {
            continue // Only process text messages
          }

          const senderName = value.contacts?.find(c => c.wa_id === message.from)?.profile?.name || message.from
          
          // Route message to all paired agents
          for (const channelAgent of channel.channelAgents) {
            const agent = channelAgent.agent
            
            // Here we would normally send the message to the agent's runtime
            // For now, we'll just log it and send an echo response
            console.log(`WhatsApp message from ${senderName} (${message.from}) to agent ${agent.name}:`, message.text.body)
            
            // Echo response for testing
            const response = `Hello ${senderName}! I received your message: "${message.text.body}". Agent "${agent.name}" is processing your request.`
            
            await whatsapp.sendMessage(config.accessToken, config.phoneNumberId, message.from, response)
            
            // Log the interaction
            await prisma.agentLog.create({
              data: {
                agentId: agent.id,
                level: 'info',
                message: 'WhatsApp message received',
                metadata: {
                  whatsappSender: message.from,
                  senderName: senderName,
                  messageText: message.text.body,
                  messageId: message.id,
                  timestamp: message.timestamp
                }
              }
            })
          }
        }
      }
    }

    res.status(200).json({ ok: true })

  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

// Get WhatsApp channel status and stats
router.get('/status/:channelId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const channelId = req.params.channelId as string

    const channel = await prisma.channel.findFirst({
      where: { 
        id: channelId, 
        userId: req.userId,
        type: 'WHATSAPP' 
      },
      include: {
        channelAgents: { include: { agent: true } }
      }
    })

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }

    const config = channel.config as any
    
    // Check if access token is still valid
    let apiStatus = 'unknown'
    if (config?.accessToken && config?.phoneNumberId) {
      const tokenInfo = await whatsapp.verifyToken(config.accessToken, config.phoneNumberId)
      apiStatus = tokenInfo.ok ? 'active' : 'invalid'
    }

    // Get recent logs for this channel
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
      apiStatus,
      pairedAgents: channel.channelAgents.length,
      recentActivity: recentLogs.length,
      config: {
        businessDisplayName: config?.businessDisplayName,
        phoneNumberId: config?.phoneNumberId,
        isConfigured: config?.isConfigured || false,
        webhookUrl: config?.webhookUrl
      }
    })

  } catch (error) {
    console.error('WhatsApp status error:', error)
    res.status(500).json({ error: 'Failed to get channel status' })
  }
})

export default router