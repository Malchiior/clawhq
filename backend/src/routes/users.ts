import { Router, Response } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

function paramId(req: AuthRequest): string { return paramId(req) as string }

router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    res.json({ user })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const { name, businessName, brandColor, customDomain } = req.body
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name, businessName, brandColor, customDomain },
    })
    res.json({ user })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/api-keys', async (req: AuthRequest, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' } })
    res.json({ keys: keys.map(k => ({ ...k, key: k.key.slice(0, 12) + '****' + k.key.slice(-4) })) })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/api-keys', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body
    const key = `clw_${crypto.randomBytes(32).toString('hex')}`
    const apiKey = await prisma.apiKey.create({
      data: { key, name: name || 'Unnamed Key', userId: req.userId! },
    })
    res.status(201).json({ apiKey: { ...apiKey, key } }) // Return full key only on creation
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/api-keys/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.apiKey.deleteMany({ where: { id: paramId(req), userId: req.userId } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/usage', async (req: AuthRequest, res: Response) => {
  try {
    const records = await prisma.usageRecord.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' },
      take: 30,
    })
    res.json({ usage: records })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
