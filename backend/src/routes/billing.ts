import { Router, Request, Response } from 'express'
import stripe from '../lib/stripe'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const PLAN_PRICES: Record<string, string> = {
  pro: 'price_placeholder_pro',
  business: 'price_placeholder_business',
}

router.post('/checkout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { plan } = req.body
    const priceId = PLAN_PRICES[plan]
    if (!priceId) { res.status(400).json({ error: 'Invalid plan' }); return }

    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email })
      customerId = customer.id
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/billing?canceled=true`,
    })

    res.json({ url: session.url })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeSubscriptionId: subscriptionId, plan: 'pro', maxAgents: 5, maxChannels: 5, dailyMsgLimit: 10000 },
        })
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any
      const customerId = subscription.customer as string
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeSubscriptionId: null, plan: 'free', maxAgents: 1, maxChannels: 1, dailyMsgLimit: 100 },
        })
      }
    }

    res.json({ received: true })
  } catch {
    res.status(400).json({ error: 'Webhook signature verification failed' })
  }
})

router.get('/subscription', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    res.json({ plan: user.plan, maxAgents: user.maxAgents, maxChannels: user.maxChannels, dailyMsgLimit: user.dailyMsgLimit })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
