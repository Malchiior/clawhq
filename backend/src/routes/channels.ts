import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

function paramId(req: AuthRequest): string { return req.params.id as string }

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const channels = await prisma.channel.findMany({
      where: { userId: req.userId },
      include: { agents: { include: { agent: true } } },
    })
    res.json({ channels })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const channel = await prisma.channel.findFirst({
      where: { id: paramId(req), userId: req.userId },
      include: { agents: { include: { agent: true } } },
    })
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }
    
    res.json({ channel })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, config } = req.body
    const channel = await prisma.channel.create({
      data: { type, config, userId: req.userId! },
    })
    res.status(201).json({ channel })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { config } = req.body
    const channel = await prisma.channel.updateMany({
      where: { id: paramId(req), userId: req.userId },
      data: { config },
    })
    
    if (channel.count === 0) {
      return res.status(404).json({ error: 'Channel not found' })
    }
    
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.channel.deleteMany({ where: { id: paramId(req), userId: req.userId } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/pair', async (req: AuthRequest, res: Response) => {
  try {
    const { agentId } = req.body
    const pair = await prisma.channelAgent.create({
      data: { channelId: paramId(req), agentId },
    })
    res.status(201).json({ pair })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id/pair/:agentId', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.channelAgent.deleteMany({
      where: { channelId: paramId(req), agentId: req.params.agentId as string },
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
