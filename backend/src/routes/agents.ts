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
    // TODO: Start Docker container
    await prisma.agent.updateMany({ where: { id: paramId(req), userId: req.userId }, data: { status: 'RUNNING' } })
    res.json({ success: true, message: 'Agent started' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/stop', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.agent.updateMany({ where: { id: paramId(req), userId: req.userId }, data: { status: 'STOPPED' } })
    res.json({ success: true, message: 'Agent stopped' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/restart', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.agent.updateMany({ where: { id: paramId(req), userId: req.userId }, data: { status: 'STARTING' } })
    // TODO: Restart container
    res.json({ success: true, message: 'Agent restarting' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
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

export default router
