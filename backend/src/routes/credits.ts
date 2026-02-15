import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { PLAN_CREDITS, getPlanCredits } from '../middleware/credits'

const router = Router()
router.use(authenticate)

// GET /api/credits — current credit status
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        apiMode: true,
        monthlyCredits: true,
        usedCredits: true,
        creditResetDate: true
      }
    })

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Auto-reset if needed
    const now = new Date()
    let { monthlyCredits, usedCredits, creditResetDate } = user
    if (now >= new Date(creditResetDate)) {
      const nextReset = new Date(creditResetDate)
      while (nextReset <= now) nextReset.setMonth(nextReset.getMonth() + 1)

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          usedCredits: 0,
          monthlyCredits: getPlanCredits(user.plan),
          creditResetDate: nextReset
        },
        select: { monthlyCredits: true, usedCredits: true, creditResetDate: true }
      })
      monthlyCredits = updated.monthlyCredits
      usedCredits = updated.usedCredits
      creditResetDate = updated.creditResetDate
    }

    const remaining = Math.max(0, monthlyCredits - usedCredits)
    const usagePercent = monthlyCredits > 0
      ? Math.min(100, Math.round((usedCredits / monthlyCredits) * 100))
      : 100

    res.json({
      plan: user.plan,
      apiMode: user.apiMode,
      monthlyCredits,
      usedCredits,
      remainingCredits: remaining,
      usagePercent,
      isExhausted: remaining <= 0,
      resetDate: creditResetDate,
      // Dollar amounts for display
      monthlyCreditsUsd: (monthlyCredits / 100).toFixed(2),
      usedCreditsUsd: (usedCredits / 100).toFixed(2),
      remainingCreditsUsd: (remaining / 100).toFixed(2),
      // Plan comparison
      plans: Object.entries(PLAN_CREDITS).map(([name, cents]) => ({
        name,
        monthlyCreditsUsd: (cents / 100).toFixed(2),
        isCurrent: name === user.plan
      }))
    })
  } catch (error) {
    console.error('Failed to get credits:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
