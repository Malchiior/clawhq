import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  DollarSign, 
  MessageCircle, 
  Zap, 
  TrendingUp, 
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { apiFetch } from '../lib/api'

interface BundledApiStatus {
  user: {
    apiMode: string
    plan: string
    dailyMsgLimit: number
    maxAgents: number
    maxChannels: number
  }
  limits: {
    canUse: boolean
    reason?: string
    dailyUsage: {
      messages: number
      inputTokens: number
      outputTokens: number
      costUsd: number
    } | null
  }
  availableProviders: string[]
  pricing: Record<string, { input: number; output: number }>
  bundledApiEnabled: boolean
}

interface UsageHistory {
  usageRecords: Array<{
    date: string
    messages: number
    inputTokens: number
    outputTokens: number
    costUsd: number
  }>
  totals: {
    messages: number
    inputTokens: number
    outputTokens: number
    costUsd: number
  }
  period: string
}

export default function BundledApiDashboard() {
  const [status, setStatus] = useState<BundledApiStatus | null>(null)
  const [usage, setUsage] = useState<UsageHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(7)

  useEffect(() => {
    fetchStatus()
    fetchUsage()
  }, [selectedPeriod])

  const fetchStatus = async () => {
    try {
      const data = await apiFetch('/api/bundled-api/status')
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch bundled API status:', error)
    }
  }

  const fetchUsage = async () => {
    try {
      const data = await apiFetch(`/api/bundled-api/usage?days=${selectedPeriod}`)
      setUsage(data)
    } catch (error) {
      console.error('Failed to fetch usage history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const dailyUsage = status.limits.dailyUsage
  const usagePercentage = dailyUsage 
    ? Math.round((dailyUsage.messages / status.user.dailyMsgLimit) * 100)
    : 0

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`
  const formatNumber = (num: number) => num.toLocaleString()

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Status Alert */}
      {!status.limits.canUse && (
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-error flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-error">API Limit Reached</h4>
            <p className="text-sm text-error/80">{status.limits.reason}</p>
          </div>
        </div>
      )}

      {/* Usage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Messages Used Today */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-text-secondary">Today</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-text">
              {dailyUsage?.messages || 0}
            </div>
            <div className="text-sm text-text-secondary">
              of {formatNumber(status.user.dailyMsgLimit)} messages
            </div>
            <div className="mt-2">
              <div className="w-full bg-border rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    usagePercentage > 90 ? 'bg-error' : 
                    usagePercentage > 70 ? 'bg-warning' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-text-muted mt-1">{usagePercentage}% used</div>
            </div>
          </div>
        </div>

        {/* Cost Today */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
            <span className="text-sm font-medium text-text-secondary">Today</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-text">
              {formatCurrency(dailyUsage?.costUsd || 0)}
            </div>
            <div className="text-sm text-text-secondary">API cost</div>
            {status.user.plan === 'free' && (
              <div className="text-xs text-text-muted mt-1">
                Free tier limit: $0.50/day
              </div>
            )}
          </div>
        </div>

        {/* Tokens Used Today */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <span className="text-sm font-medium text-text-secondary">Today</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-text">
              {formatNumber((dailyUsage?.inputTokens || 0) + (dailyUsage?.outputTokens || 0))}
            </div>
            <div className="text-sm text-text-secondary">tokens used</div>
            <div className="text-xs text-text-muted mt-1">
              In: {formatNumber(dailyUsage?.inputTokens || 0)} • 
              Out: {formatNumber(dailyUsage?.outputTokens || 0)}
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              status.bundledApiEnabled ? 'bg-success/10' : 'bg-error/10'
            }`}>
              {status.bundledApiEnabled ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-error" />
              )}
            </div>
            <span className="text-sm font-medium text-text-secondary">Status</span>
          </div>
          <div className="mt-4">
            <div className={`text-lg font-semibold ${
              status.bundledApiEnabled ? 'text-success' : 'text-error'
            }`}>
              {status.bundledApiEnabled ? 'Active' : 'Unavailable'}
            </div>
            <div className="text-sm text-text-secondary">
              {status.availableProviders.length} provider{status.availableProviders.length !== 1 ? 's' : ''} available
            </div>
            <div className="text-xs text-text-muted mt-1">
              {status.availableProviders.map(provider => 
                provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase()
              ).join(', ')}
            </div>
          </div>
        </div>
      </div>

      {/* Usage History */}
      {usage && (
        <div className="bg-card border border-border rounded-xl">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Usage History
              </h3>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                className="bg-navy/50 border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary/50"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
          </div>

          {/* Totals */}
          <div className="p-6 border-b border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-text">{formatNumber(usage.totals.messages)}</div>
                <div className="text-sm text-text-secondary">Messages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text">
                  {formatNumber(usage.totals.inputTokens + usage.totals.outputTokens)}
                </div>
                <div className="text-sm text-text-secondary">Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text">{formatCurrency(usage.totals.costUsd)}</div>
                <div className="text-sm text-text-secondary">Total Cost</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text">
                  {formatCurrency(usage.totals.costUsd / Math.max(1, selectedPeriod))}
                </div>
                <div className="text-sm text-text-secondary">Daily Avg</div>
              </div>
            </div>
          </div>

          {/* Daily Breakdown */}
          <div className="p-6">
            {usage.usageRecords.length > 0 ? (
              <div className="space-y-2">
                {usage.usageRecords.slice(0, 10).map((record, index) => {
                  const date = new Date(record.date).toLocaleDateString()
                  const totalTokens = record.inputTokens + record.outputTokens
                  return (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-text-muted" />
                        <span className="text-sm font-medium text-text">{date}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-text-secondary">
                          {record.messages} msg{record.messages !== 1 ? 's' : ''}
                        </span>
                        <span className="text-text-secondary">
                          {formatNumber(totalTokens)} tokens
                        </span>
                        <span className="text-text font-medium">
                          {formatCurrency(record.costUsd)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-secondary">No usage data for the selected period</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}