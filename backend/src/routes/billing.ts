import { Router, Request, Response } from 'express'
import stripe from '../lib/stripe'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// Plan configuration — price IDs come from env so we can swap test/live easily
const PLANS: Record<string, { priceEnv: string; maxAgents: number; maxChannels: number; dailyMsgLimit: number }> = {
  pro:      { priceEnv: 'STRIPE_PRICE_PRO',      maxAgents: 3,  maxChannels: 10, dailyMsgLimit: 5000  },
  business: { priceEnv: 'STRIPE_PRICE_BUSINESS',  maxAgents: 10, maxChannels: 10, dailyMsgLimit: 25000 },
}

const FREE_LIMITS = { maxAgents: 1, maxChannels: 1, dailyMsgLimit: 100 }

function getPriceId(plan: string): string | null {
  const cfg = PLANS[plan]
  if (!cfg) return null
  return process.env[cfg.priceEnv] || null
}

// ─── GET /subscription ───────────────────────────────────────────
router.get('/subscription', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    let renewsAt: string | null = null
    let cancelAtPeriodEnd = false

    // Fetch live subscription details from Stripe if available
    if (stripe && user.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId) as any
        renewsAt = new Date((sub.current_period_end as number) * 1000).toISOString()
        cancelAtPeriodEnd = !!sub.cancel_at_period_end
      } catch { /* subscription may have been deleted */ }
    }

    res.json({
      plan: user.plan,
      maxAgents: user.maxAgents,
      maxChannels: user.maxChannels,
      dailyMsgLimit: user.dailyMsgLimit,
      hasPaymentMethod: !!user.stripeCustomerId,
      renewsAt,
      cancelAtPeriodEnd,
    })
  } catch (err) {
    console.error('Billing subscription error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ─── POST /checkout ──────────────────────────────────────────────
router.post('/checkout', authenticate, async (req: AuthRequest, res: Response) => {
  if (!stripe) { res.status(503).json({ error: 'Billing not configured' }); return }

  try {
    const { plan } = req.body as { plan?: string }
    if (!plan || !PLANS[plan]) { res.status(400).json({ error: 'Invalid plan. Choose: pro, business' }); return }

    const priceId = getPriceId(plan)
    if (!priceId) { res.status(503).json({ error: `Price not configured for ${plan} plan` }); return }

    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    // Create or reuse Stripe customer
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { clawhq_user_id: user.id },
      })
      customerId = customer.id
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
    }

    // If user already has an active subscription, redirect to portal to change plan
    if (user.stripeSubscriptionId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing`,
      })
      res.json({ url: portalSession.url })
      return
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing?canceled=true`,
      metadata: { plan },
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('Billing checkout error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ─── POST /portal ────────────────────────────────────────────────
router.post('/portal', authenticate, async (req: AuthRequest, res: Response) => {
  if (!stripe) { res.status(503).json({ error: 'Billing not configured' }); return }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user?.stripeCustomerId) { res.status(400).json({ error: 'No billing account found' }); return }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing`,
    })
    res.json({ url: session.url })
  } catch (err) {
    console.error('Billing portal error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ─── POST /webhook (Stripe) ─────────────────────────────────────
router.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe) { res.status(503).json({ error: 'Billing not configured' }); return }

  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not set')
    res.status(500).json({ error: 'Webhook not configured' })
    return
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    res.status(400).json({ error: 'Invalid signature' })
    return
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const plan = session.metadata?.plan || 'pro'
        const limits = PLANS[plan] || PLANS.pro

        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: subscriptionId,
              plan,
              maxAgents: limits.maxAgents,
              maxChannels: limits.maxChannels,
              dailyMsgLimit: limits.dailyMsgLimit,
            },
          })
          console.log(`✅ User ${user.email} upgraded to ${plan}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as any
        const customerId = sub.customer as string
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
        if (!user) break

        // If subscription cancelled at period end, just log — don't downgrade yet
        if (sub.cancel_at_period_end) {
          console.log(`⚠️ User ${user.email} subscription set to cancel at period end`)
          break
        }

        // Check if plan changed (price lookup)
        const priceId = sub.items?.data?.[0]?.price?.id
        let newPlan = user.plan
        for (const [planKey, cfg] of Object.entries(PLANS)) {
          if (process.env[cfg.priceEnv] === priceId) {
            newPlan = planKey
            break
          }
        }

        if (newPlan !== user.plan) {
          const limits = PLANS[newPlan] || PLANS.pro
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: newPlan,
              maxAgents: limits.maxAgents,
              maxChannels: limits.maxChannels,
              dailyMsgLimit: limits.dailyMsgLimit,
            },
          })
          console.log(`🔄 User ${user.email} plan changed to ${newPlan}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as any
        const customerId = sub.customer as string
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: null,
              plan: 'free',
              ...FREE_LIMITS,
            },
          })
          console.log(`⬇️ User ${user.email} downgraded to free (subscription deleted)`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const customerId = invoice.customer as string
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
        if (user) {
          console.error(`❌ Payment failed for user ${user.email} (invoice ${invoice.id})`)
          // TODO: Send email notification about failed payment
        }
        break
      }

      default:
        // Unhandled event type — that's fine
        break
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook processing error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

export default router
