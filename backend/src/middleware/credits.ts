import { Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from './auth'

// Plan credit allocations (in USD cents per month)
const PLAN_CREDITS: Record<string, number> = {
  free: 50,         // $0.50/month — enough for ~100 haiku messages or ~15 sonnet messages
  pro: 1500,        // $15.00/month included credits
  business: 5000,   // $50.00/month included credits
  enterprise: 25000 // $250.00/month included credits
}

/**
 * Middleware that checks whether the user still has API credits remaining.
 * Resets the credit counter automatically when a new billing period starts.
 * Attaches `req.creditInfo` for downstream handlers.
 */
export interface CreditInfo {
  monthlyCredits: number   // cents allocated
  usedCredits: number      // cents used
  remainingCredits: number // cents remaining
  usagePercent: number     // 0-100
  isExhausted: boolean
  resetDate: Date
}

export interface CreditRequest extends AuthRequest {
  creditInfo?: CreditInfo
}

export async function enforceCredits(
  req: CreditRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.userId
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  try {
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
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

    // BYOK users skip credit checks — they pay their own provider
    if (user.apiMode === 'byok') {
      req.creditInfo = {
        monthlyCredits: 0,
        usedCredits: 0,
        remainingCredits: Infinity,
        usagePercent: 0,
        isExhausted: false,
        resetDate: new Date()
      }
      next()
      return
    }

    // Auto-reset credits if past the reset date
    const now = new Date()
    if (now >= new Date(user.creditResetDate)) {
      const nextReset = new Date(user.creditResetDate)
      // Advance to next month
      while (nextReset <= now) {
        nextReset.setMonth(nextReset.getMonth() + 1)
      }

      const planAllocation = PLAN_CREDITS[user.plan] ?? PLAN_CREDITS.free

      user = await prisma.user.update({
        where: { id: userId },
        data: {
          usedCredits: 0,
          monthlyCredits: planAllocation,
          creditResetDate: nextReset
        },
        select: {
          id: true,
          plan: true,
          apiMode: true,
          monthlyCredits: true,
          usedCredits: true,
          creditResetDate: true
        }
      })
    }

    const remaining = Math.max(0, user.monthlyCredits - user.usedCredits)
    const usagePercent = user.monthlyCredits > 0
      ? Math.min(100, Math.round((user.usedCredits / user.monthlyCredits) * 100))
      : 100

    const creditInfo: CreditInfo = {
      monthlyCredits: user.monthlyCredits,
      usedCredits: user.usedCredits,
      remainingCredits: remaining,
      usagePercent,
      isExhausted: remaining <= 0,
      resetDate: new Date(user.creditResetDate)
    }

    req.creditInfo = creditInfo

    // Block if credits exhausted
    if (creditInfo.isExhausted) {
      res.status(429).json({
        error: 'credits_exhausted',
        message: 'You\'ve used all your free credits for this month.',
        creditInfo,
        upgrade: {
          message: 'Upgrade to Pro for 30x more credits and priority models.',
          url: '/billing',
          plans: {
            pro: { price: '$19/mo', credits: '$15.00 included' },
            business: { price: '$49/mo', credits: '$50.00 included' }
          }
        }
      })
      return
    }

    next()
  } catch (error) {
    console.error('Credit check failed:', error)
    // Fail open — don't block users on credit check errors
    next()
  }
}

/**
 * Deduct credits after a successful API call.
 * Call this after recording usage. costCents = cost in USD cents.
 */
export async function deductCredits(userId: string, costCents: number): Promise<CreditInfo> {
  const rounded = Math.max(1, Math.round(costCents)) // minimum 1 cent per call

  const user = await prisma.user.update({
    where: { id: userId },
    data: { usedCredits: { increment: rounded } },
    select: { monthlyCredits: true, usedCredits: true, creditResetDate: true }
  })

  const remaining = Math.max(0, user.monthlyCredits - user.usedCredits)

  return {
    monthlyCredits: user.monthlyCredits,
    usedCredits: user.usedCredits,
    remainingCredits: remaining,
    usagePercent: user.monthlyCredits > 0
      ? Math.min(100, Math.round((user.usedCredits / user.monthlyCredits) * 100))
      : 100,
    isExhausted: remaining <= 0,
    resetDate: new Date(user.creditResetDate)
  }
}

/**
 * Get plan credit allocation in cents.
 */
export function getPlanCredits(plan: string): number {
  return PLAN_CREDITS[plan] ?? PLAN_CREDITS.free
}

export { PLAN_CREDITS }
