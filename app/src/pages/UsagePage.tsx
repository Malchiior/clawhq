import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '../lib/api'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { Zap, MessageSquare, DollarSign, Bot, Calendar, TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react'

/* ─── types ─── */
interface Agent {
  id: string; name: string; model: string; status: string
  totalMessages: number; totalTokens: number
}

interface DailyUsage {
  date: string; messages: number; tokens: number; cost: number
}

/* ─── helpers ─── */
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function fmtCost(n: number) {
  return '$' + n.toFixed(2)
}

// rough cost estimate per 1K tokens by model family
const MODEL_COST_PER_1K: Record<string, number> = {
  'gpt-4': 0.03, 'gpt-4o': 0.005, 'gpt-3.5': 0.001,
  'claude-3-opus': 0.015, 'claude-3-sonnet': 0.003, 'claude-3-haiku': 0.00025,
  'claude-sonnet': 0.003, 'claude-opus': 0.015,
  default: 0.005,
}

function estimateCost(tokens: number, model: string): number {
  const key = Object.keys(MODEL_COST_PER_1K).find(k => model.toLowerCase().includes(k))
  const rate = key ? MODEL_COST_PER_1K[key] : MODEL_COST_PER_1K.default
  return (tokens / 1000) * rate
}

const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#f97316']

const PERIODS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

/* ─── mock daily data generator (replace with real API later) ─── */
function generateDailyData(agents: Agent[], days: number): DailyUsage[] {
  const result: DailyUsage[] = []
  const now = new Date()
  const totalMsgs = agents.reduce((s, a) => s + a.totalMessages, 0)
  const totalTokens = agents.reduce((s, a) => s + a.totalTokens, 0)
  const avgDailyMsgs = Math.max(1, Math.round(totalMsgs / Math.max(days, 7)))
  const avgDailyTokens = Math.max(100, Math.round(totalTokens / Math.max(days, 7)))

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const variance = 0.5 + Math.random()
    const msgs = Math.round(avgDailyMsgs * variance)
    const tokens = Math.round(avgDailyTokens * variance)
    const cost = estimateCost(tokens, agents[0]?.model || 'default')
    result.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      messages: msgs,
      tokens,
      cost: Math.round(cost * 100) / 100,
    })
  }
  return result
}

/* ─── component ─── */
export default function UsagePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    apiFetch('/api/agents')
      .then(data => setAgents(data.agents || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const dailyData = useMemo(() => generateDailyData(agents, period), [agents, period])

  const totalMessages = agents.reduce((s, a) => s + a.totalMessages, 0)
  const totalTokens = agents.reduce((s, a) => s + a.totalTokens, 0)
  const totalCost = agents.reduce((s, a) => s + estimateCost(a.totalTokens, a.model), 0)
  const periodCost = dailyData.reduce((s, d) => s + d.cost, 0)
  const periodMessages = dailyData.reduce((s, d) => s + d.messages, 0)
  const periodTokens = dailyData.reduce((s, d) => s + d.tokens, 0)

  // trend: compare last 7 days vs previous 7
  const last7 = dailyData.slice(-7)
  const prev7 = dailyData.slice(-14, -7)
  const last7Msgs = last7.reduce((s, d) => s + d.messages, 0)
  const prev7Msgs = prev7.reduce((s, d) => s + d.messages, 0)
  const trend = prev7Msgs > 0 ? Math.round(((last7Msgs - prev7Msgs) / prev7Msgs) * 100) : 0

  // per-agent pie data
  const agentPie = agents
    .filter(a => a.totalTokens > 0)
    .map(a => ({ name: a.name, value: a.totalTokens }))
    .sort((a, b) => b.value - a.value)

  // plan limits (mock — replace with real plan data)
  const planLimit = { messages: 100, agents: 1, name: 'Free' }
  const msgsToday = dailyData.length > 0 ? dailyData[dailyData.length - 1].messages : 0
  const usagePct = Math.min(100, Math.round((msgsToday / planLimit.messages) * 100))

  const stats = [
    {
      label: 'Messages (period)',
      value: fmt(periodMessages),
      icon: MessageSquare,
      color: 'text-primary',
      bg: 'bg-primary/10',
      sub: `${fmt(totalMessages)} all time`,
    },
    {
      label: 'Tokens (period)',
      value: fmt(periodTokens),
      icon: Zap,
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
      sub: `${fmt(totalTokens)} all time`,
    },
    {
      label: 'Est. Cost (period)',
      value: fmtCost(periodCost),
      icon: DollarSign,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      sub: `${fmtCost(totalCost)} all time`,
    },
    {
      label: '7-Day Trend',
      value: `${trend >= 0 ? '+' : ''}${trend}%`,
      icon: trend >= 0 ? TrendingUp : TrendingDown,
      color: trend >= 0 ? 'text-emerald-400' : 'text-red-400',
      bg: trend >= 0 ? 'bg-emerald-400/10' : 'bg-red-400/10',
      sub: `${fmt(last7Msgs)} msgs last 7d`,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-error">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span className="text-sm">{error}</span>
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Usage</h1>
          <p className="text-sm text-text-secondary mt-1">Monitor your token, message, and cost usage</p>
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setPeriod(p.days)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                period === p.days
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <motion.div variants={container} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <motion.div key={s.label} variants={item} className="bg-card border border-border rounded-xl p-5 hover:border-border-light transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-text">{s.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
            <p className="text-[10px] text-text-muted mt-1">{s.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Daily Usage Limit Bar */}
      <motion.div variants={item} className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium text-text">Today's Usage</span>
          </div>
          <span className="text-xs text-text-muted">{planLimit.name} Plan — {msgsToday} / {planLimit.messages} messages</span>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usagePct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-400' : 'bg-primary'
            }`}
          />
        </div>
        {usagePct >= 80 && (
          <p className="text-[11px] text-amber-400 mt-2">
            ⚠️ You're nearing your daily limit. <button className="underline text-primary hover:text-primary-hover">Upgrade your plan</button> for more.
          </p>
        )}
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages Area Chart */}
        <motion.div variants={item} className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Messages Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="messages" stroke="#6366f1" strokeWidth={2} fill="url(#msgGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Agent Token Distribution */}
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Token Distribution</h3>
          {agentPie.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-text-muted text-xs">No usage data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={agentPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                    {agentPie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number | undefined) => fmt(value ?? 0) + ' tokens'}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {agentPie.slice(0, 5).map((a, i) => (
                  <div key={a.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-text-secondary truncate max-w-[120px]">{a.name}</span>
                    </div>
                    <span className="text-text-muted">{fmt(a.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Token Usage Bar Chart */}
      <motion.div variants={item} className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text mb-4">Daily Token Usage</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number | undefined) => fmt(value ?? 0) + ' tokens'}
            />
            <Bar dataKey="tokens" fill="#22d3ee" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Per-Agent Table */}
      <motion.div variants={item} className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-text">Per-Agent Breakdown</h3>
          <Bot className="w-4 h-4 text-text-muted" />
        </div>
        {agents.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">No agents yet. Deploy one to see usage.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs">
                  <th className="text-left px-5 py-3 font-medium">Agent</th>
                  <th className="text-left px-5 py-3 font-medium">Model</th>
                  <th className="text-right px-5 py-3 font-medium">Messages</th>
                  <th className="text-right px-5 py-3 font-medium">Tokens</th>
                  <th className="text-right px-5 py-3 font-medium">Est. Cost</th>
                  <th className="text-right px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agents.map(a => {
                  const cost = estimateCost(a.totalTokens, a.model)
                  return (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-text">{a.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary text-xs font-mono">{a.model}</td>
                      <td className="px-5 py-3.5 text-right text-text">{fmt(a.totalMessages)}</td>
                      <td className="px-5 py-3.5 text-right text-text">{fmt(a.totalTokens)}</td>
                      <td className="px-5 py-3.5 text-right text-text">{fmtCost(cost)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
                          a.status === 'RUNNING' ? 'bg-emerald-400/10 text-emerald-400' :
                          a.status === 'ERROR' ? 'bg-red-400/10 text-red-400' :
                          'bg-white/5 text-text-muted'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            a.status === 'RUNNING' ? 'bg-emerald-400' :
                            a.status === 'ERROR' ? 'bg-red-400' : 'bg-text-muted'
                          }`} />
                          {a.status.toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
