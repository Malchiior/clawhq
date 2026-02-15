import { Router, Response } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// Admin-only middleware (checks user.plan === 'admin' or email in allowlist)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)

async function requireAdmin(req: AuthRequest, res: Response, next: Function) {
  if (!req.userId) { res.status(401).json({ error: 'Unauthorized' }); return }
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}

// Generate a clean invite code like "CLAW-XXXX-XXXX"
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I/O/0/1 for readability
  const seg1 = Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('')
  const seg2 = Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('')
  return `CLAW-${seg1}-${seg2}`
}

// Validate an invite code (public - used during signup)
router.post('/validate', async (req: any, res: Response) => {
  try {
    const { code } = req.body
    if (!code) { res.status(400).json({ error: 'Invite code required', valid: false }); return }

    const invite = await prisma.inviteCode.findUnique({ where: { code: code.toUpperCase().trim() } })
    
    if (!invite || !invite.isActive) {
      res.json({ valid: false, error: 'Invalid invite code' })
      return
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      res.json({ valid: false, error: 'Invite code has expired' })
      return
    }
    if (invite.usedCount >= invite.maxUses) {
      res.json({ valid: false, error: 'Invite code has been fully redeemed' })
      return
    }

    res.json({ valid: true })
  } catch (err) {
    console.error('Invite validate error:', err)
    res.status(500).json({ error: 'Internal server error', valid: false })
  }
})

// Create invite codes (admin only)
router.post('/', authenticate, requireAdmin as any, async (req: AuthRequest, res: Response) => {
  try {
    const { count = 1, maxUses = 1, note, expiresInDays } = req.body
    const batchSize = Math.min(count, 100) // Cap at 100 per request

    const codes = []
    for (let i = 0; i < batchSize; i++) {
      const code = generateCode()
      const invite = await prisma.inviteCode.create({
        data: {
          code,
          maxUses,
          note: note || null,
          createdBy: req.userId,
          expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null,
        }
      })
      codes.push(invite)
    }

    res.status(201).json({ codes })
  } catch (err) {
    console.error('Create invite error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// List invite codes (admin only)
router.get('/', authenticate, requireAdmin as any, async (req: AuthRequest, res: Response) => {
  try {
    const codes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } }
    })
    res.json({ codes })
  } catch (err) {
    console.error('List invites error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Deactivate an invite code (admin only)
router.patch('/:id', authenticate, requireAdmin as any, async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.body
    const invite = await prisma.inviteCode.update({
      where: { id: req.params.id as string },
      data: { isActive }
    })
    res.json({ invite })
  } catch (err) {
    console.error('Update invite error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete an invite code (admin only)
router.delete('/:id', authenticate, requireAdmin as any, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.inviteCode.delete({ where: { id: req.params.id as string } })
    res.json({ success: true })
  } catch (err) {
    console.error('Delete invite error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

// Helper: redeem an invite code (called from auth signup)
export async function redeemInviteCode(code: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const invite = await prisma.inviteCode.findUnique({ where: { code: code.toUpperCase().trim() } })
  
  if (!invite || !invite.isActive) return { success: false, error: 'Invalid invite code' }
  if (invite.expiresAt && invite.expiresAt < new Date()) return { success: false, error: 'Invite code has expired' }
  if (invite.usedCount >= invite.maxUses) return { success: false, error: 'Invite code has been fully redeemed' }

  await prisma.$transaction([
    prisma.inviteCode.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } }
    }),
    prisma.inviteRedemption.create({
      data: { inviteCodeId: invite.id, userId }
    })
  ])

  return { success: true }
}
