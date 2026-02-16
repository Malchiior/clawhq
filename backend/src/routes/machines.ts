import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import jwt from 'jsonwebtoken'

const router = Router()

// GET /api/machines — list all machines for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const machines = await prisma.machine.findMany({
      where: { userId: req.userId! },
      include: { agents: { select: { id: true, name: true, status: true, model: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ machines })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/machines — create a new machine
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, platform } = req.body
    if (!name) { res.status(400).json({ error: 'Name required' }); return }

    const secret = process.env.JWT_SECRET || 'dev-secret'
    const bridgeToken = jwt.sign(
      { userId: req.userId!, type: 'access', bridge: true },
      secret,
      { expiresIn: '365d' }
    )

    const machine = await prisma.machine.create({
      data: {
        name,
        platform: platform || null,
        bridgeToken,
        userId: req.userId!,
      },
      include: { agents: true },
    })
    res.json({ machine })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/machines/:id — get machine details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const machineId = req.params.id as string
    const machine = await prisma.machine.findFirst({
      where: { id: machineId, userId: req.userId! },
      include: { agents: { select: { id: true, name: true, status: true, model: true, deployMode: true } } },
    })
    if (!machine) { res.status(404).json({ error: 'Machine not found' }); return }
    res.json({ machine })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/machines/:id — update machine
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body
    const mid = req.params.id as string
    const machine = await prisma.machine.update({
      where: { id: mid },
      data: { ...(name ? { name } : {}) },
    })
    res.json({ machine })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/machines/:id — delete machine (agents become unattached)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const delId = req.params.id as string
    const machine = await prisma.machine.findFirst({ where: { id: delId, userId: req.userId! } })
    if (!machine) { res.status(404).json({ error: 'Machine not found' }); return }

    await prisma.agent.updateMany({ where: { machineId: delId }, data: { machineId: null } })
    await prisma.machine.delete({ where: { id: delId } })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
