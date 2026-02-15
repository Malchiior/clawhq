import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Check, ArrowUpRight, Loader2, ExternalLink, Sparkles } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { track } from '../lib/analytics'

interface Subscription {
  plan: string
  maxAgents: number
  maxChannels: number
  dailyMsgLimit: number
  hasPaymentMethod: boolean
  renewsAt: string | null
  cancelAtPeriodEnd: boolean
}

const plans = [
  { id: 'free', name: 'Free', price: '$0', period: '/mo', features: ['1 agent', '1 channel', '100 msgs/day', 'Community support'] },
  { id: 'pro', name: 'Pro', price: '$19', period: '/mo', features: ['3 agents', 'All channels', '5K msgs/day', 'Priority support', 'Custom branding'], popular: true },
  { id: 'business', name: 'Business', price: '$49', period: '/mo', features: ['10 agents', 'All channels', '25K msgs/day', 'White-label', 'SSO & audit logs', 'API access'] },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited agents', 'Unlimited everything', 'SLA guarantee', 'Custom integrations', 'Dedicated support'] },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function BillingPage() {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      setSuccessMsg('🎉 Subscription activated! Your plan may take a moment to update.')
      window.history.replaceState({}, '', '/billing')
    }
    if (params.get('canceled') === 'true') {
      window.history.replaceState({}, '', '/billing')
    }
    fetchSubscription()
  }, [])

  async function fetchSubscription() {
    try {
      const data = await apiFetch('/api/billing/subscription')
      setSub(data)
    } catch (err) {
      console.error('Failed to fetch subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(planId: string) {
    setUpgrading(planId)
    try {
      const { url } = await apiFetch('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: planId }),
      })
      if (url) {
        track('billing_upgrade_started', { plan: planId })
        window.location.href = url
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setUpgrading(null)
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true)
    try {
      const { url } = await apiFetch('/api/billing/portal', { method: 'POST' })
      if (url) window.location.href = url
    } catch (err) {
      console.error('Portal error:', err)
      setPortalLoading(false)
    }
  }

  const currentPlan = sub?.plan || 'free'
  const planOrder = ['free', 'pro', 'business', 'enterprise']
  const currentIdx = planOrder.indexOf(currentPlan)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">Billing</h1>
        <p className="text-sm text-text-secondary mt-1">Manage your subscription and usage</p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <motion.div variants={item} className="bg-success/10 border border-success/30 text-success rounded-xl px-5 py-3 flex items-center gap-3">
          <Sparkles className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </motion.div>
      )}

      {/* Current Usage */}
      <motion.div variants={item} className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text">Current Usage</h2>
          {sub?.hasPaymentMethod && (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
            >
              {portalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
              Manage Billing
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
          </div>
        ) : sub ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Plan', value: sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) },
                { label: 'Agents', used: 0, max: sub.maxAgents, unit: 'total' },
                { label: 'Daily Messages', used: 0, max: sub.dailyMsgLimit, unit: 'limit' },
              ].map(u => (
                <div key={u.label}>
                  {'value' in u ? (
                    <div>
                      <span className="text-sm text-text-secondary">{u.label}</span>
                      <p className="text-lg font-semibold text-text mt-1 flex items-center gap-2">
                        {u.value}
                        {sub.cancelAtPeriodEnd && (
                          <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">Cancelling</span>
                        )}
                      </p>
                      {sub.renewsAt && !sub.cancelAtPeriodEnd && (
                        <p className="text-xs text-text-muted mt-1">
                          Renews {new Date(sub.renewsAt).toLocaleDateString()}
                        </p>
                      )}
                      {sub.renewsAt && sub.cancelAtPeriodEnd && (
                        <p className="text-xs text-warning mt-1">
                          Active until {new Date(sub.renewsAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-text-secondary">{u.label}</span>
                        <span className="text-text font-medium">{u.max.toLocaleString()} {u.unit}</span>
                      </div>
                      <div className="h-2 bg-navy rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary/30" style={{ width: '0%' }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-text-muted">Unable to load subscription info.</p>
        )}
      </motion.div>

      {/* Plans */}
      <div>
        <h2 className="font-semibold text-text mb-4">Plans</h2>
        <motion.div variants={container} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan, idx) => {
            const isCurrent = plan.id === currentPlan
            const isDowngrade = idx < currentIdx
            const isUpgrade = idx > currentIdx && plan.id !== 'enterprise'

            return (
              <motion.div
                key={plan.id}
                variants={item}
                className={`relative bg-card border rounded-xl p-5 transition-colors ${
                  plan.popular ? 'border-primary' : isCurrent ? 'border-success/50' : 'border-border'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                    POPULAR
                  </div>
                )}
                <h3 className="font-semibold text-text">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-text">{plan.price}</span>
                  <span className="text-sm text-text-muted">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                      <Check className="w-3.5 h-3.5 text-success shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button className="w-full bg-success/10 border border-success/30 text-success text-sm py-2 rounded-lg cursor-default font-medium">
                    Current Plan
                  </button>
                ) : plan.id === 'enterprise' ? (
                  <a
                    href="mailto:support@clawhq.dev?subject=Enterprise%20Inquiry"
                    className="block w-full text-center bg-card border border-border text-text hover:border-border-light text-sm py-2 rounded-lg transition-colors"
                  >
                    Contact Sales
                  </a>
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading === plan.id}
                    className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    {upgrading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Upgrade <ArrowUpRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                ) : isDowngrade && sub?.hasPaymentMethod ? (
                  <button
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="w-full bg-card border border-border text-text-secondary hover:border-border-light text-sm py-2 rounded-lg transition-colors"
                  >
                    Downgrade
                  </button>
                ) : (
                  <button className="w-full bg-white/5 border border-border text-text-muted text-sm py-2 rounded-lg cursor-default">
                    —
                  </button>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Payment Method */}
      <motion.div variants={item} className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="w-5 h-5 text-text-muted" />
          <h2 className="font-semibold text-text">Payment Method</h2>
        </div>
        {sub?.hasPaymentMethod ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">Managed through Stripe</p>
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="text-sm text-primary hover:text-primary-hover transition-colors flex items-center gap-1"
            >
              {portalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Update Payment Method
            </button>
          </div>
        ) : (
          <p className="text-sm text-text-muted">No payment method on file. Add one by upgrading your plan.</p>
        )}
      </motion.div>
    </motion.div>
  )
}
