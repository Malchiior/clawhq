import { Router, Response } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

function paramId(req: AuthRequest): string { return req.params.id as string }

router.post('/onboard', async (req: AuthRequest, res: Response) => {
  try {
    const { businessName, brandColor, defaultModel } = req.body
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { businessName, brandColor },
    })
    // Create first agent with chosen model
    if (defaultModel) {
      await prisma.agent.create({
        data: {
          name: businessName ? `${businessName} Agent` : 'My First Agent',
          model: defaultModel,
          userId: req.userId!,
        },
      })
    }
    res.json({ user })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    res.json({ user })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

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
    const { name, businessName, brandColor, customDomain, logoUrl } = req.body
    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (businessName !== undefined) data.businessName = businessName
    if (brandColor !== undefined) data.brandColor = brandColor
    if (customDomain !== undefined) data.customDomain = customDomain
    if (logoUrl !== undefined) data.logoUrl = logoUrl
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
    })
    res.json({ user })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/profile/logo', async (req: AuthRequest, res: Response) => {
  try {
    const { logo } = req.body // base64 data URI (e.g., "data:image/png;base64,...")
    if (!logo || typeof logo !== 'string') {
      res.status(400).json({ error: 'Logo data URI required' }); return
    }
    // Validate it's a data URI and under 2MB
    if (!logo.startsWith('data:image/')) {
      res.status(400).json({ error: 'Must be a data:image/* URI' }); return
    }
    const base64Part = logo.split(',')[1] || ''
    const sizeBytes = Math.ceil(base64Part.length * 0.75)
    if (sizeBytes > 2 * 1024 * 1024) {
      res.status(400).json({ error: 'Logo must be under 2MB' }); return
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { logoUrl: logo },
    })
    res.json({ user })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/profile/logo', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { logoUrl: null },
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
    const { name, provider } = req.body
    if (!provider) {
      res.status(400).json({ error: 'Provider is required' })
      return
    }
    const key = `clw_${crypto.randomBytes(32).toString('hex')}`
    const apiKey = await prisma.apiKey.create({
      data: { key, name: name || 'Unnamed Key', provider, userId: req.userId! },
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
