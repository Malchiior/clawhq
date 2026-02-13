import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' })
      return
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: 'Email already registered' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    })

    const token = signToken(user.id)
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, plan: user.plan, businessName: user.businessName, brandColor: user.brandColor },
    })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const token = signToken(user.id)
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, plan: user.plan, businessName: user.businessName, brandColor: user.brandColor },
    })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, plan: user.plan, businessName: user.businessName, brandColor: user.brandColor },
    })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/google', (_req: Request, res: Response) => {
  // TODO: Implement Google OAuth redirect
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.FRONTEND_URL}/auth/google/callback&response_type=code&scope=openid%20email%20profile`)
})

router.post('/forgot-password', async (req: Request, res: Response) => {
  // TODO: Implement password reset email
  res.json({ message: 'If that email exists, a reset link has been sent.' })
})

router.post('/reset-password', async (req: Request, res: Response) => {
  // TODO: Implement password reset
  res.json({ message: 'Password reset successfully.' })
})

export default router
