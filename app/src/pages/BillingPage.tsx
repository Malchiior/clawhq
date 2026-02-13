import { motion } from 'framer-motion'
import { CreditCard, Check, ArrowUpRight, Download, Calendar } from 'lucide-react'

const plans = [
  { id: 'free', name: 'Free', price: '$0', period: '/mo', features: ['1 agent', '1 channel', '100 msgs/day', 'Community support'], current: true },
  { id: 'pro', name: 'Pro', price: '$19', period: '/mo', features: ['3 agents', 'All channels', '5K msgs/day', 'Priority support', 'Custom branding'], popular: true },
  { id: 'business', name: 'Business', price: '$49', period: '/mo', features: ['10 agents', 'All channels', '25K msgs/day', 'White-label', 'SSO & audit logs', 'API access'] },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited agents', 'Unlimited everything', 'SLA guarantee', 'Custom integrations', 'Dedicated support'] },
]

const invoices = [
  { date: 'Feb 1, 2026', amount: '$0.00', status: 'Paid', plan: 'Free' },
  { date: 'Jan 1, 2026', amount: '$0.00', status: 'Paid', plan: 'Free' },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function BillingPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">Billing</h1>
        <p className="text-sm text-text-secondary mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current Usage */}
      <motion.div variants={item} className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-text mb-4">Current Usage</h2>
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Messages', used: 67, max: 100, unit: 'today' },
            { label: 'Agents', used: 1, max: 1, unit: 'total' },
            { label: 'Channels', used: 1, max: 1, unit: 'total' },
          ].map(u => (
            <div key={u.label}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">{u.label}</span>
                <span className="text-text font-medium">{u.used}/{u.max} {u.unit}</span>
              </div>
              <div className="h-2 bg-navy rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${u.used / u.max > 0.8 ? 'bg-error' : 'bg-primary'}`} style={{ width: `${(u.used / u.max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Plans */}
      <div>
        <h2 className="font-semibold text-text mb-4">Plans</h2>
        <motion.div variants={container} className="grid grid-cols-4 gap-4">
          {plans.map(plan => (
            <motion.div key={plan.id} variants={item} className={`relative bg-card border rounded-xl p-5 ${plan.popular ? 'border-primary' : 'border-border'}`}>
              {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-0.5 rounded-full">POPULAR</div>}
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
              {plan.current ? (
                <button className="w-full bg-white/5 border border-border text-text-muted text-sm py-2 rounded-lg cursor-default">Current Plan</button>
              ) : plan.id === 'enterprise' ? (
                <button className="w-full bg-card border border-border text-text hover:border-border-light text-sm py-2 rounded-lg transition-colors">Contact Sales</button>
              ) : (
                <button className="w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2 rounded-lg transition-colors">
                  Upgrade <ArrowUpRight className="w-3.5 h-3.5 inline ml-1" />
                </button>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Invoices */}
      <motion.div variants={item} className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-text">Invoice History</h2>
          <Calendar className="w-4 h-4 text-text-muted" />
        </div>
        <div className="divide-y divide-border">
          {invoices.map((inv, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-text-muted" />
                <div>
                  <p className="text-sm text-text">{inv.date}</p>
                  <p className="text-xs text-text-muted">{inv.plan} Plan</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-text">{inv.amount}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-success/10 text-success">{inv.status}</span>
                <button className="text-text-muted hover:text-text transition-colors"><Download className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
