import { Router, Response } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// ---------------------------------------------------------------------------
// Discord Bot API helpers
// ---------------------------------------------------------------------------

const discord = {
  async getBotUser(botToken: string): Promise<{ ok: boolean; data?: any }> {
    try {
      const res = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bot ${botToken}` },
      })
      if (!res.ok) return { ok: false }
      return { ok: true, data: await res.json() }
    } catch {
      return { ok: false }
    }
  },

  async getGuild(botToken: string, guildId: string): Promise<{ ok: boolean; data?: any }> {
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      })
      if (!res.ok) return { ok: false }
      return { ok: true, data: await res.json() }
    } catch {
      return { ok: false }
    }
  },

  async sendMessage(botToken: string, channelId: string, content: string): Promise<{ ok: boolean }> {
    try {
      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })
      return { ok: res.ok }
    } catch {
      return { ok: false }
    }
  },

  async getGuildChannels(botToken: string, guildId: string): Promise<any[]> {
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${botToken}` },
      })
      if (!res.ok) return []
      return (await res.json()) as any[]
    } catch {
      return []
    }
  },
}

// ---------------------------------------------------------------------------
// Test Discord bot connection (authenticated)
// ---------------------------------------------------------------------------

router.post('/test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { botToken, applicationId, guildId } = req.body

    if (!botToken || !applicationId) {
      return res.status(400).json({ error: 'Bot token and application ID are required' })
    }

    const botInfo = await discord.getBotUser(botToken)
    if (!botInfo.ok) {
      return res.status(400).json({ error: 'Invalid bot token' })
    }

    let guildInfo: { id: string; name: string } | null = null
    if (guildId) {
      const guild = await discord.getGuild(botToken, guildId)
      if (!guild.ok) {
        return res.status(400).json({
          error: `Cannot access guild ${guildId}. Make sure the bot is added to this server.`,
        })
      }
      guildInfo = { id: guild.data.id, name: guild.data.name }
    }

    res.json({
      success: true,
      message: `Connected successfully as ${botInfo.data.username}#${botInfo.data.discriminator}`,
      botInfo: {
        id: botInfo.data.id,
        username: botInfo.data.username,
        discriminator: botInfo.data.discriminator,
        verified: botInfo.data.verified,
      },
      guildInfo,
    })
  } catch (error: any) {
    console.error('Discord test error:', error)
    res.status(500).json({ error: 'Failed to connect to Discord API' })
  }
})

// ---------------------------------------------------------------------------
// Configure (verify + persist + set up interactions endpoint)
// ---------------------------------------------------------------------------

router.post('/configure', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { botToken, applicationId, guildId, channelId } = req.body

    if (!botToken || !applicationId || !channelId) {
      return res.status(400).json({ error: 'Bot token, application ID, and channel ID are required' })
    }

    // Verify bot
    const botInfo = await discord.getBotUser(botToken)
    if (!botInfo.ok) {
      return res.status(400).json({ error: 'Invalid bot token or cannot reach Discord API' })
    }

    // If guild provided, verify access
    let guildInfo: { id: string; name: string } | null = null
    if (guildId) {
      const guild = await discord.getGuild(botToken, guildId)
      if (!guild.ok) {
        return res.status(400).json({
          error: `Bot cannot access guild ${guildId}. Invite the bot first.`,
        })
      }
      guildInfo = { id: guild.data.id, name: guild.data.name }
    }

    // Generate a webhook secret for validating incoming interactions
    const webhookSecret = crypto.randomBytes(32).toString('hex')
    const webhookUrl = `${process.env.APP_URL || 'https://clawhq.dev'}/api/discord/webhook/${channelId}`

    // Persist config
    const updatedChannel = await prisma.channel.update({
      where: { id: channelId, userId: req.userId },
      data: {
        config: {
          botToken,
          applicationId,
          guildId: guildId || null,
          guildName: guildInfo?.name || null,
          botUsername: botInfo.data.username,
          botDiscriminator: botInfo.data.discriminator,
          botName: `${botInfo.data.username}#${botInfo.data.discriminator}`,
          webhookUrl,
          webhookSecret,
          isConfigured: true,
        },
        isActive: true,
      },
    })

    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${applicationId}&permissions=2147483648&scope=bot%20applications.commands`

    res.json({
      success: true,
      bot: {
        id: botInfo.data.id,
        username: botInfo.data.username,
        discriminator: botInfo.data.discriminator,
      },
      guild: guildInfo,
      inviteUrl,
      webhookUrl,
      channel: updatedChannel,
    })
  } catch (error) {
    console.error('Discord configuration error:', error)
    res.status(500).json({ error: 'Failed to configure Discord bot' })
  }
})

// ---------------------------------------------------------------------------
// Get bot's guilds
// ---------------------------------------------------------------------------

router.get('/guilds', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { botToken } = req.query
    if (!botToken) return res.status(400).json({ error: 'Bot token is required' })

    const r = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bot ${botToken}` },
    })
    if (!r.ok) return res.status(400).json({ error: 'Failed to fetch guilds' })

    const guilds = (await r.json()) as any[]
    res.json({
      guilds: guilds.map((g: any) => ({ id: g.id, name: g.name, icon: g.icon, owner: g.owner })),
    })
  } catch (error: any) {
    console.error('Discord guilds error:', error)
    res.status(500).json({ error: 'Failed to fetch guilds' })
  }
})

// ---------------------------------------------------------------------------
// Generate invite URL
// ---------------------------------------------------------------------------

router.post('/invite-url', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId, permissions = '2147483648' } = req.body
    if (!applicationId) return res.status(400).json({ error: 'Application ID is required' })

    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${applicationId}&permissions=${permissions}&scope=bot%20applications.commands`
    res.json({ inviteUrl })
  } catch (error: any) {
    console.error('Discord invite URL error:', error)
    res.status(500).json({ error: 'Failed to generate invite URL' })
  }
})

// ---------------------------------------------------------------------------
// Webhook endpoint - receives Discord Interactions / Gateway events
// For production, this would be set as the Interactions Endpoint URL in
// the Discord Developer Portal. We handle:
//   1. URL verification (ping)
//   2. Application commands
//   3. Message components
// ---------------------------------------------------------------------------

router.post('/webhook/:channelId', async (req, res) => {
  try {
    const channelId = req.params.channelId as string
    const body = req.body

    // Find the channel
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, type: 'DISCORD' },
      include: {
        channelAgents: { include: { agent: { include: { user: true } } } },
      },
    })

    if (!channel || !(channel.config as any)?.isConfigured) {
      return res.status(404).json({ error: 'Channel not found or not configured' })
    }

    const config = channel.config as any

    // Type 1 = PING (Discord verification handshake)
    if (body.type === 1) {
      return res.json({ type: 1 })
    }

    // Type 2 = APPLICATION_COMMAND
    if (body.type === 2) {
      const user = body.member?.user || body.user
      const commandName = body.data?.name
      const options = body.data?.options || []

      // Route to paired agents
      for (const ca of channel.channelAgents) {
        await prisma.agentLog.create({
          data: {
            agentId: ca.agent.id,
            level: 'info',
            message: 'Discord slash command received',
            metadata: {
              discordUserId: user?.id,
              discordUsername: user?.username,
              command: commandName,
              options,
              guildId: body.guild_id,
              channelId: body.channel_id,
            },
          },
        })
      }

      // Acknowledge with a deferred response (agent will follow up)
      return res.json({
        type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        data: { flags: 0 },
      })
    }

    // Fallback for other interaction types
    res.json({ type: 1 })
  } catch (error) {
    console.error('Discord webhook error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

// ---------------------------------------------------------------------------
// Gateway event webhook - receives forwarded gateway events from a
// lightweight Discord bot process (e.g. MESSAGE_CREATE). This is the
// main message ingestion path.
// ---------------------------------------------------------------------------

router.post('/events/:channelId', async (req, res) => {
  try {
    const channelId = req.params.channelId as string
    const { event, data } = req.body // event = "MESSAGE_CREATE", data = message payload

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, type: 'DISCORD' },
      include: {
        channelAgents: { include: { agent: { include: { user: true } } } },
      },
    })

    if (!channel || !(channel.config as any)?.isConfigured) {
      return res.status(404).json({ error: 'Channel not configured' })
    }

    const config = channel.config as any

    // Verify the shared secret
    const authHeader = req.headers['x-webhook-secret']
    if (authHeader !== config.webhookSecret) {
      return res.status(403).json({ error: 'Invalid webhook secret' })
    }

    if (event === 'MESSAGE_CREATE' && data) {
      // Ignore messages from bots (including our own)
      if (data.author?.bot) {
        return res.status(200).json({ ok: true })
      }

      const messageText = data.content || ''
      const authorName = data.author?.username || 'Unknown'
      const messageChannelId = data.channel_id

      // Route to all paired agents
      for (const ca of channel.channelAgents) {
        console.log(
          `Discord message from ${authorName} to agent ${ca.agent.name}: ${messageText}`
        )

        // Echo response for now (will be replaced by real agent routing)
        const reply = `Hello ${authorName}! I received your message: "${messageText}". Agent "${ca.agent.name}" is processing your request.`
        await discord.sendMessage(config.botToken, messageChannelId, reply)

        await prisma.agentLog.create({
          data: {
            agentId: ca.agent.id,
            level: 'info',
            message: 'Discord message received',
            metadata: {
              discordUserId: data.author?.id,
              discordUsername: authorName,
              messageText,
              messageId: data.id,
              discordChannelId: messageChannelId,
              guildId: data.guild_id,
            },
          },
        })
      }
    }

    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Discord events error:', error)
    res.status(500).json({ error: 'Event processing failed' })
  }
})

// ---------------------------------------------------------------------------
// Channel status
// ---------------------------------------------------------------------------

router.get('/status/:channelId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const channelId = req.params.channelId as string

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, userId: req.userId, type: 'DISCORD' },
      include: { channelAgents: { include: { agent: true } } },
    })

    if (!channel) return res.status(404).json({ error: 'Channel not found' })

    const config = channel.config as any

    let botStatus = 'unknown'
    if (config?.botToken) {
      const info = await discord.getBotUser(config.botToken)
      botStatus = info.ok ? 'active' : 'invalid'
    }

    const recentLogs = await prisma.agentLog.findMany({
      where: { agent: { agentChannels: { some: { channelId } } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    res.json({
      channel,
      botStatus,
      pairedAgents: channel.channelAgents.length,
      recentActivity: recentLogs.length,
      config: {
        botUsername: config?.botUsername,
        botName: config?.botName,
        guildName: config?.guildName,
        isConfigured: config?.isConfigured || false,
      },
    })
  } catch (error) {
    console.error('Discord status error:', error)
    res.status(500).json({ error: 'Failed to get channel status' })
  }
})

export default router
