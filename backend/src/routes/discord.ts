import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

interface DiscordBotInfo {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  bot: boolean
  public_bot: boolean
  require_code_grant: boolean
  verified: boolean
  flags: number
}

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

// Test Discord bot connection
router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    const { botToken, applicationId, guildId } = req.body

    if (!botToken || !applicationId) {
      return res.status(400).json({ error: 'Bot token and application ID are required' })
    }

    // Test bot token by getting bot user info
    const botResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!botResponse.ok) {
      const error = await botResponse.json() as { message?: string }
      return res.status(400).json({ 
        error: `Invalid bot token: ${error.message || botResponse.statusText}` 
      })
    }

    const botInfo = await botResponse.json() as DiscordBotInfo

    // Verify that the bot belongs to the provided application ID
    if (botInfo.id !== applicationId) {
      return res.status(400).json({ 
        error: 'Application ID does not match the bot token' 
      })
    }

    let guildInfo: DiscordGuild | null = null
    
    // If guild ID is provided, verify bot has access to the guild
    if (guildId) {
      const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!guildResponse.ok) {
        return res.status(400).json({ 
          error: `Cannot access guild ${guildId}. Make sure the bot is added to this server.` 
        })
      }

      guildInfo = await guildResponse.json() as DiscordGuild
    }

    // Return success with bot and guild information
    res.json({
      success: true,
      message: `Connected successfully as ${botInfo.username}#${botInfo.discriminator}`,
      botInfo: {
        id: botInfo.id,
        username: botInfo.username,
        discriminator: botInfo.discriminator,
        verified: botInfo.verified,
      },
      guildInfo: guildInfo ? {
        id: guildInfo.id,
        name: guildInfo.name,
      } : null,
    })

  } catch (error: any) {
    console.error('Discord test error:', error)
    res.status(500).json({ 
      error: 'Failed to connect to Discord API', 
      details: error.message 
    })
  }
})

// Get bot guilds
router.get('/guilds', async (req: AuthRequest, res: Response) => {
  try {
    const { botToken } = req.query

    if (!botToken) {
      return res.status(400).json({ error: 'Bot token is required' })
    }

    const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!guildsResponse.ok) {
      return res.status(400).json({ error: 'Failed to fetch guilds' })
    }

    const guilds = await guildsResponse.json() as DiscordGuild[]

    res.json({
      guilds: guilds.map(guild => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: guild.owner,
      })),
    })

  } catch (error: any) {
    console.error('Discord guilds error:', error)
    res.status(500).json({ error: 'Failed to fetch Discord guilds' })
  }
})

// Generate invite URL
router.post('/invite-url', async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId, permissions = '8' } = req.body // 8 = Administrator permission

    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' })
    }

    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${applicationId}&permissions=${permissions}&scope=bot%20applications.commands`

    res.json({ inviteUrl })

  } catch (error: any) {
    console.error('Discord invite URL error:', error)
    res.status(500).json({ error: 'Failed to generate invite URL' })
  }
})

export default router