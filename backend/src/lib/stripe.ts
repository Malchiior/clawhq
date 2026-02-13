import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''

let stripe: Stripe | null = null

if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover' as any,
  })
} else {
  console.warn('Stripe disabled: STRIPE_SECRET_KEY not set')
}

export { stripe }
export default stripe
