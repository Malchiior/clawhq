import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import dockerService, { ContainerConfig } from '../lib/docker'

const router = Router()
router.use(authenticate)

function paramId(req: AuthRequest): string {
  return req.params.id as string
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const agents = await prisma.agent.findMany({
      where: { userId: req.userId },
      include: { channels: { include: { channel: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ agents })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, model, systemPrompt, temperature, maxTokens } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    const agentCount = await prisma.agent.count({ where: { userId: req.userId } })

    if (user && agentCount >= user.maxAgents) {
      res.status(403).json({ error: 'Agent limit reached. Upgrade your plan.' })
      return
    }

    const agent = await prisma.agent.create({
      data: { name, model, systemPrompt, temperature, maxTokens, userId: req.userId! },
    })
    res.status(201).json({ agent })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: { id: paramId(req), userId: req.userId },
      include: { channels: { include: { channel: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 50 } },
    })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }
    res.json({ agent })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, systemPrompt, temperature, maxTokens, model } = req.body
    const agent = await prisma.agent.updateMany({
      where: { id: paramId(req), userId: req.userId },
      data: { name, systemPrompt, temperature, maxTokens, model },
    })
    if (agent.count === 0) { res.status(404).json({ error: 'Agent not found' }); return }
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.agent.deleteMany({ where: { id: paramId(req), userId: req.userId } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = paramId(req)
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId },
      include: { 
        channels: { include: { channel: true } },
        user: true
      }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    if (agent.status === 'RUNNING') {
      res.status(400).json({ error: 'Agent is already running' })
      return
    }

    const config: ContainerConfig = {
      agentId: agent.id,
      userId: agent.userId,
      model: agent.model,
      systemPrompt: agent.systemPrompt || undefined,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      apiKeys: {
        // In production, these would come from user's API key settings
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        gemini: process.env.GOOGLE_AI_API_KEY,
      },
      channels: agent.channels.map(ca => ({
        type: ca.channel.type,
        config: ca.channel.config as Record<string, any>
      }))
    }

    const containerId = await dockerService.createContainer(config)
    
    res.json({ 
      success: true, 
      message: 'Agent started successfully',
      containerId
    })
  } catch (error) {
    console.error('Failed to start agent:', error)
    res.status(500).json({ error: 'Failed to start agent', details: String(error) })
  }
})

router.post('/:id/stop', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = paramId(req)
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    if (agent.status === 'STOPPED') {
      res.status(400).json({ error: 'Agent is already stopped' })
      return
    }

    await dockerService.stopContainer(agentId)
    
    res.json({ success: true, message: 'Agent stopped successfully' })
  } catch (error) {
    console.error('Failed to stop agent:', error)
    res.status(500).json({ error: 'Failed to stop agent', details: String(error) })
  }
})

router.post('/:id/restart', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = paramId(req)
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    await dockerService.restartContainer(agentId)
    
    res.json({ success: true, message: 'Agent restarted successfully' })
  } catch (error) {
    console.error('Failed to restart agent:', error)
    res.status(500).json({ error: 'Failed to restart agent', details: String(error) })
  }
})

router.get('/:id/logs', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.agentLog.findMany({
      where: { agent: { id: paramId(req), userId: req.userId } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    res.json({ logs })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: { id: paramId(req), userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    let containerStatus = 'unknown'
    if (agent.containerId) {
      containerStatus = await dockerService.getContainerStatus(agent.containerId)
    }

    res.json({
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        containerId: agent.containerId,
        containerStatus,
        lastActiveAt: agent.lastActiveAt,
        totalMessages: agent.totalMessages,
        totalTokens: agent.totalTokens
      }
    })
  } catch (error) {
    console.error('Failed to get agent status:', error)
    res.status(500).json({ error: 'Failed to get agent status' })
  }
})

router.get('/:id/container-logs', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: { id: paramId(req), userId: req.userId }
    })
    
    if (!agent?.containerId) {
      res.status(404).json({ error: 'Container not found' })
      return
    }

    const lines = parseInt(req.query.lines as string) || 100
    const logs = await dockerService.getContainerLogs(agent.containerId, lines)
    
    res.json({ logs })
  } catch (error) {
    console.error('Failed to get container logs:', error)
    res.status(500).json({ error: 'Failed to get container logs' })
  }
})

// Quick deploy endpoint - the main "30-second deploy" functionality
router.post('/deploy', async (req: AuthRequest, res: Response) => {
  try {
    const { name, model = 'claude-sonnet-4-20250514', systemPrompt, channels } = req.body
    
    if (!name || !channels || channels.length === 0) {
      res.status(400).json({ error: 'Name and at least one channel are required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    const agentCount = await prisma.agent.count({ where: { userId: req.userId } })

    if (user && agentCount >= user.maxAgents) {
      res.status(403).json({ error: 'Agent limit reached. Upgrade your plan.' })
      return
    }

    // Create agent in database
    const agent = await prisma.agent.create({
      data: {
        name,
        model,
        systemPrompt,
        userId: req.userId!,
        status: 'DEPLOYING'
      },
    })

    // Create channels
    const channelPromises = channels.map(async (channelData: any) => {
      const channel = await prisma.channel.create({
        data: {
          type: channelData.type,
          config: channelData.config,
          userId: req.userId!
        }
      })

      await prisma.channelAgent.create({
        data: {
          channelId: channel.id,
          agentId: agent.id
        }
      })

      return { type: channelData.type, config: channelData.config }
    })

    const createdChannels = await Promise.all(channelPromises)

    // Deploy container
    const config: ContainerConfig = {
      agentId: agent.id,
      userId: agent.userId,
      model: agent.model,
      systemPrompt: agent.systemPrompt || undefined,
      apiKeys: {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        gemini: process.env.GOOGLE_AI_API_KEY,
      },
      channels: createdChannels
    }

    const containerId = await dockerService.createContainer(config)

    res.status(201).json({
      success: true,
      message: 'Agent deployed successfully!',
      agent: {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        status: 'RUNNING',
        containerId
      }
    })
  } catch (error) {
    console.error('Failed to deploy agent:', error)
    res.status(500).json({ 
      error: 'Failed to deploy agent', 
      details: String(error) 
    })
  }
})

export default router
