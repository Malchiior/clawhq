import { Router, Response } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// ---------------------------------------------------------------------------
// Slack API helpers
// ---------------------------------------------------------------------------

const slack = {
  async authTest(botToken: string): Promise<{ ok: boolean; data?: any }> {
    try {
      const res = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
      })
      const data = (await res.json()) as any
      return { ok: data.ok, data }
    } catch {
      return { ok: false }
    }
  },

  async getTeamInfo(botToken: string, teamId: string): Promise<any | null> {
    try {
      const res = await fetch(`https://slack.com/api/team.info?team=${teamId}`, {
        headers: { Authorization: `Bearer ${botToken}` },
      })
      const data = (await res.json()) as any
      return data.ok ? data.team : null
    } catch {
      return null
    }
  },

  async sendMessage(botToken: string, channel: string, text: string): Promise<{ ok: boolean }> {
    try {
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel, text }),
      })
      const data = (await res.json()) as any
      return { ok: data.ok }
    } catch {
      return { ok: false }
    }
  },
}

// ---------------------------------------------------------------------------
// Test connection (authenticated)
// ---------------------------------------------------------------------------

router.post('/test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { botToken, signingSecret } = req.body

    if (!botToken) return res.status(400).json({ error: 'Bot token is required' })
    if (!signingSecret) return res.status(400).json({ error: 'Signing secret is required' })

    const auth = await slack.authTest(botToken)
    if (!auth.ok) {
      return res.status(400).json({ error: `Invalid bot token: ${auth.data?.error || 'Unknown error'}` })
    }

    let teamInfo: any = null
    if (auth.data.team_id) {
      teamInfo = await slack.getTeamInfo(botToken, auth.data.team_id)
    }

    res.json({
      success: true,
      message: `Connected successfully as ${auth.data.user} in ${auth.data.team}`,
      botInfo: {
        userId: auth.data.user_id,
        botId: auth.data.bot_id,
        username: auth.data.user,
      },
      teamInfo: teamInfo
        ? { id: teamInfo.id, name: teamInfo.name, domain: teamInfo.domain }
        : { id: auth.data.team_id, name: auth.data.team },
    })
  } catch (error: any) {
    console.error('Slack test error:', error)
    res.status(500).json({ error: 'Failed to connect to Slack API' })
  }
})

// ---------------------------------------------------------------------------
// Configure (verify + persist + provide event URL)
// ---------------------------------------------------------------------------

router.post('/configure', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { botToken, signingSecret, channelId } = req.body

    if (!botToken || !signingSecret || !channelId) {
      return res.status(400).json({ error: 'Bot token, signing secret, and channel ID are required' })
    }

    // Verify token
    const auth = await slack.authTest(botToken)
    if (!auth.ok) {
      return res.status(400).json({ error: `Invalid bot token: ${auth.data?.error || 'Unknown error'}` })
    }

    let teamInfo: any = null
    if (auth.data.team_id) {
      teamInfo = await slack.getTeamInfo(botToken, auth.data.team_id)
    }

    const eventsUrl = `${process.env.APP_URL || 'https://clawhq.dev'}/api/slack/events/${channelId}`

    // Persist
    const updatedChannel = await prisma.channel.update({
      where: { id: channelId, userId: req.userId },
      data: {
        config: {
          botToken,
          signingSecret,
          botUsername: auth.data.user,
          botUserId: auth.data.user_id,
          botId: auth.data.bot_id,
          botName: auth.data.user,
          teamId: auth.data.team_id,
          teamName: teamInfo?.name || auth.data.team,
          teamDomain: teamInfo?.domain || null,
          eventsUrl,
          isConfigured: true,
        },
        isActive: true,
      },
    })

    res.json({
      success: true,
      bot: {
        username: auth.data.user,
        userId: auth.data.user_id,
      },
      team: {
        id: auth.data.team_id,
        name: teamInfo?.name || auth.data.team,
        domain: teamInfo?.domain || null,
      },
      eventsUrl,
      channel: updatedChannel,
    })
  } catch (error) {
    console.error('Slack configuration error:', error)
    res.status(500).json({ error: 'Failed to configure Slack app' })
  }
})

// ---------------------------------------------------------------------------
// List channels the bot can see
// ---------------------------------------------------------------------------

router.get('/channels', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { botToken } = req.query
    if (!botToken) return res.status(400).json({ error: 'Bot token is required' })

    const r = await fetch(
      'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100',
      { headers: { Authorization: `Bearer ${botToken}` } }
    )
    const result = (await r.json()) as any
    if (!result.ok) return res.status(400).json({ error: result.error || 'Failed to fetch channels' })

    res.json({
      channels: (result.channels || []).map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        isMember: ch.is_member,
        isPrivate: ch.is_private,
        numMembers: ch.num_members,
      })),
    })
  } catch (error: any) {
    console.error('Slack channels error:', error)
    res.status(500).json({ error: 'Failed to fetch Slack channels' })
  }
})

// ---------------------------------------------------------------------------
// Slack Events API endpoint
// Handles:
//   1. URL verification challenge
//   2. event_callback (message events)
// ---------------------------------------------------------------------------

function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  rawBody: string,
  signature: string
): boolean {
  // Reject requests older than 5 minutes
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false

  const sigBasestring = `v0:${timestamp}:${rawBody}`
  const mySignature = 'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature))
  } catch {
    return false
  }
}

router.post('/events/:channelId', async (req, res) => {
  try {
    const channelId = req.params.channelId as string
    const body = req.body

    // 1. URL Verification challenge (Slack sends this when you set the Events URL)
    if (body.type === 'url_verification') {
      return res.json({ challenge: body.challenge })
    }

    // Find channel
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, type: 'SLACK' },
      include: {
        channelAgents: { include: { agent: { include: { user: true } } } },
      },
    })

    if (!channel || !(channel.config as any)?.isConfigured) {
      return res.status(404).json({ error: 'Channel not configured' })
    }

    const config = channel.config as any

    // Optionally verify Slack signature (requires raw body middleware)
    // In production, enable raw body parsing for this route and verify

    // 2. Event callback
    if (body.type === 'event_callback') {
      const event = body.event

      // Ignore bot messages (prevent loops)
      if (event?.bot_id || event?.subtype === 'bot_message') {
        return res.status(200).json({ ok: true })
      }

      // Handle message events
      if (event?.type === 'message' && event?.text) {
        const senderName = event.user || 'Unknown'
        const messageText = event.text
        const slackChannel = event.channel

        // Route to all paired agents
        for (const ca of channel.channelAgents) {
          console.log(
            `Slack message from ${senderName} to agent ${ca.agent.name}: ${messageText}`
          )

          // Echo response for now (will be replaced by real agent routing)
          const reply = `Hello <@${senderName}>! I received your message: "${messageText}". Agent "${ca.agent.name}" is processing your request.`
          await slack.sendMessage(config.botToken, slackChannel, reply)

          await prisma.agentLog.create({
            data: {
              agentId: ca.agent.id,
              level: 'info',
              message: 'Slack message received',
              metadata: {
                slackUserId: event.user,
                messageText,
                slackChannel,
                eventType: event.type,
                timestamp: event.ts,
                teamId: body.team_id,
              },
            },
          })
        }
      }

      // Handle app_mention events
      if (event?.type === 'app_mention' && event?.text) {
        const senderName = event.user || 'Unknown'
        const messageText = event.text
        const slackChannel = event.channel

        for (const ca of channel.channelAgents) {
          console.log(
            `Slack mention from ${senderName} to agent ${ca.agent.name}: ${messageText}`
          )

          const reply = `Hey <@${senderName}>! Agent "${ca.agent.name}" heard you. Processing: "${messageText}"`
          await slack.sendMessage(config.botToken, slackChannel, reply)

          await prisma.agentLog.create({
            data: {
              agentId: ca.agent.id,
              level: 'info',
              message: 'Slack app mention received',
              metadata: {
                slackUserId: event.user,
                messageText,
                slackChannel,
                eventType: event.type,
                timestamp: event.ts,
                teamId: body.team_id,
              },
            },
          })
        }
      }
    }

    // Slack requires 200 within 3 seconds
    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Slack events error:', error)
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
      where: { id: channelId, userId: req.userId, type: 'SLACK' },
      include: { channelAgents: { include: { agent: true } } },
    })

    if (!channel) return res.status(404).json({ error: 'Channel not found' })

    const config = channel.config as any

    let apiStatus = 'unknown'
    if (config?.botToken) {
      const auth = await slack.authTest(config.botToken)
      apiStatus = auth.ok ? 'active' : 'invalid'
    }

    const recentLogs = await prisma.agentLog.findMany({
      where: { agent: { agentChannels: { some: { channelId } } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    res.json({
      channel,
      apiStatus,
      pairedAgents: channel.channelAgents.length,
      recentActivity: recentLogs.length,
      config: {
        botUsername: config?.botUsername,
        botName: config?.botName,
        teamName: config?.teamName,
        teamDomain: config?.teamDomain,
        isConfigured: config?.isConfigured || false,
        eventsUrl: config?.eventsUrl,
      },
    })
  } catch (error) {
    console.error('Slack status error:', error)
    res.status(500).json({ error: 'Failed to get channel status' })
  }
})

export default router
