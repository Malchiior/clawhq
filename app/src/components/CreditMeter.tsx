import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, AlertTriangle, XCircle, ArrowUpRight } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface CreditData {
  plan: string
  monthlyCredits: number
  usedCredits: number
  remainingCredits: number
  usagePercent: number
  isExhausted: boolean
  resetDate: string
  monthlyCreditsUsd: string
  usedCreditsUsd: string
  remainingCreditsUsd: string
}

/**
 * Compact credit meter for the sidebar / top bar.
 * Shows remaining credits with a progress ring and upgrade CTA when low.
 */
export default function CreditMeter({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<CreditData | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    apiFetch('/api/credits')
      .then(setData)
      .catch(() => {}) // silently fail — meter is non-critical
  }, [])

  if (!data) return null

  const { usagePercent, isExhausted, remainingCreditsUsd, monthlyCreditsUsd, plan, resetDate } = data

  // Color based on usage
  const color = isExhausted
    ? 'text-red-400'
    : usagePercent >= 80
    ? 'text-amber-400'
    : usagePercent >= 50
    ? 'text-yellow-300'
    : 'text-emerald-400'

  const bgColor = isExhausted
    ? 'bg-red-400'
    : usagePercent >= 80
    ? 'bg-amber-400'
    : usagePercent >= 50
    ? 'bg-yellow-300'
    : 'bg-emerald-400'

  const daysUntilReset = Math.max(0, Math.ceil(
    (new Date(resetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ))

  if (compact) {
    return (
      <div
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-colors"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Zap className={`w-4 h-4 ${color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted">Credits</span>
            <span className={`text-[11px] font-medium ${color}`}>
              ${remainingCreditsUsd}
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, 100 - usagePercent)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${bgColor}`}
            />
          </div>
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="absolute left-full ml-3 top-0 z-50 w-56 bg-[#1a1730] border border-border rounded-xl p-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text">
                    {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                  </span>
                  <span className={`text-xs ${color}`}>
                    {isExhausted ? 'Exhausted' : `${100 - usagePercent}% left`}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-muted">Used</span>
                    <span className="text-text">${data.usedCreditsUsd} / ${monthlyCreditsUsd}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-muted">Remaining</span>
                    <span className={color}>${remainingCreditsUsd}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-muted">Resets in</span>
                    <span className="text-text">{daysUntilReset} days</span>
                  </div>
                </div>

                {isExhausted && (
                  <a
                    href="/billing"
                    className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
                  >
                    Upgrade Plan <ArrowUpRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full-size card variant
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg ${isExhausted ? 'bg-red-400/10' : 'bg-primary/10'} flex items-center justify-center`}>
            {isExhausted ? (
              <XCircle className="w-5 h-5 text-red-400" />
            ) : usagePercent >= 80 ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <Zap className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">API Credits</h3>
            <p className="text-[11px] text-text-muted">
              {plan.charAt(0).toUpperCase() + plan.slice(1)} plan · Resets in {daysUntilReset} days
            </p>
          </div>
        </div>
        <span className={`text-lg font-bold ${color}`}>${remainingCreditsUsd}</span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[11px] text-text-muted mb-1.5">
          <span>${data.usedCreditsUsd} used</span>
          <span>${monthlyCreditsUsd} total</span>
        </div>
        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usagePercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${bgColor}`}
          />
        </div>
      </div>

      {/* Warning / exhausted banner */}
      {isExhausted && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-3">
          <p className="text-xs text-red-300 mb-2">
            Your free credits are used up. Your agents can't make API calls until credits reset or you upgrade.
          </p>
          <a
            href="/billing"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Upgrade for more credits <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      )}

      {!isExhausted && usagePercent >= 80 && (
        <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
          <p className="text-xs text-amber-300">
            ⚠️ You've used {usagePercent}% of your monthly credits. Consider upgrading to avoid interruptions.
          </p>
        </div>
      )}
    </div>
  )
}
