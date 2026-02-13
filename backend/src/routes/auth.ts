import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import passport from '../lib/passport'
import { sendEmail, generateVerificationEmailHtml } from '../lib/email'
import { 
  createSession, 
  refreshSession, 
  revokeSession, 
  revokeAllUserSessions,
  getUserSessions,
  cleanupExpiredSessions
} from '../lib/session'

const router = Router()
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

function getSessionInfo(req: Request) {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip || req.connection.remoteAddress
  }
}

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' })
      return
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: 'Email already registered' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const verificationToken = uuidv4()
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const user = await prisma.user.create({
      data: { 
        email, 
        passwordHash, 
        name,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        emailVerified: false
      },
    })

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`
    const emailHtml = generateVerificationEmailHtml(verificationUrl, name || undefined)
    
    await sendEmail({
      to: email,
      subject: 'Verify your ClawHQ account',
      html: emailHtml
    })

    res.status(201).json({
      message: 'Account created! Please check your email to verify your account.',
      needsVerification: true,
      user: { id: user.id, email: user.email, name: user.name, emailVerified: false }
    })
  } catch (err) {
    console.error('Signup error:', err)
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

    // Check if email is verified
    if (!user.emailVerified) {
      res.status(403).json({ 
        error: 'Email not verified',
        needsVerification: true,
        message: 'Please verify your email address before logging in.'
      })
      return
    }

    const sessionInfo = getSessionInfo(req)
    const tokens = await createSession(user.id, sessionInfo)
    
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        avatarUrl: user.avatarUrl, 
        plan: user.plan, 
        businessName: user.businessName, 
        brandColor: user.brandColor,
        emailVerified: user.emailVerified
      },
    })
  } catch (err) {
    console.error('Login error:', err)
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
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        avatarUrl: user.avatarUrl, 
        plan: user.plan, 
        businessName: user.businessName, 
        brandColor: user.brandColor,
        emailVerified: user.emailVerified
      },
    })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}))

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any
      if (!user) {
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`)
      }
      
      // Create session
      const sessionInfo = getSessionInfo(req)
      const tokens = await createSession(user.id, sessionInfo)
      
      // Redirect to frontend with tokens
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`)
    } catch (error) {
      console.error('Google OAuth callback error:', error)
      res.redirect(`${FRONTEND_URL}/login?error=oauth_error`)
    }
  }
)

router.post('/forgot-password', async (req: Request, res: Response) => {
  // TODO: Implement password reset email
  res.json({ message: 'If that email exists, a reset link has been sent.' })
})

router.post('/reset-password', async (req: Request, res: Response) => {
  // TODO: Implement password reset
  res.json({ message: 'Password reset successfully.' })
})

// Email verification endpoint
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body
    if (!token) {
      res.status(400).json({ error: 'Verification token required' })
      return
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gte: new Date()
        }
      }
    })

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired verification token' })
      return
    }

    // Mark email as verified and clear verification fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    })

    // Create session for automatic login after verification
    const sessionInfo = getSessionInfo(req)
    const tokens = await createSession(user.id, sessionInfo)

    res.json({
      message: 'Email verified successfully!',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        plan: user.plan,
        businessName: user.businessName,
        brandColor: user.brandColor,
        emailVerified: true
      }
    })
  } catch (err) {
    console.error('Email verification error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Resend verification email
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    if (!email) {
      res.status(400).json({ error: 'Email required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    if (user.emailVerified) {
      res.status(400).json({ error: 'Email already verified' })
      return
    }

    // Generate new verification token
    const verificationToken = uuidv4()
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      }
    })

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`
    const emailHtml = generateVerificationEmailHtml(verificationUrl, user.name || undefined)
    
    await sendEmail({
      to: email,
      subject: 'Verify your ClawHQ account',
      html: emailHtml
    })

    res.json({ message: 'Verification email sent!' })
  } catch (err) {
    console.error('Resend verification error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken: refreshTokenInput } = req.body
    if (!refreshTokenInput) {
      res.status(400).json({ error: 'Refresh token required' })
      return
    }

    const tokens = await refreshSession(refreshTokenInput)
    if (!tokens) {
      res.status(401).json({ error: 'Invalid or expired refresh token' })
      return
    }

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString()
    })
  } catch (err) {
    console.error('Refresh token error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Logout endpoint (revoke current session)
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const header = req.headers.authorization
    if (header?.startsWith('Bearer ')) {
      const token = header.slice(7)
      await revokeSession(token)
    }

    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    console.error('Logout error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Logout from all devices
router.post('/logout-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    const revokedCount = await revokeAllUserSessions(req.userId)
    res.json({ 
      message: `Logged out from ${revokedCount} sessions`,
      revokedSessions: revokedCount
    })
  } catch (err) {
    console.error('Logout all error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get active sessions for current user
router.get('/sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    const sessions = await getUserSessions(req.userId)
    res.json({ sessions })
  } catch (err) {
    console.error('Get sessions error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Admin endpoint to cleanup expired sessions (can be called by cron)
router.post('/cleanup-sessions', async (req: Request, res: Response) => {
  try {
    // Basic API key auth for cleanup endpoint
    const apiKey = req.headers['x-api-key']
    if (apiKey !== process.env.CLEANUP_API_KEY) {
      res.status(401).json({ error: 'Invalid API key' })
      return
    }

    const cleanedUp = await cleanupExpiredSessions()
    res.json({ 
      message: `Cleaned up ${cleanedUp} expired sessions`,
      cleanedSessions: cleanedUp
    })
  } catch (err) {
    console.error('Session cleanup error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
