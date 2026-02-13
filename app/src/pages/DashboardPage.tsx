import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Bot, MessageSquare, Zap, TrendingUp, Activity, Clock, Plus, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

interface Agent {
  id: string
  name: string
  model: string
  status: string
  totalMessages: number
  totalTokens: number
  channels: { channel: { name: string } }[]
  logs: { level: string; message: string; createdAt: string }[]
}

const statusColors: Record<string, string> = {
  RUNNING: 'bg-success',
  STOPPED: 'bg-text-muted',
  ERROR: 'bg-error',
  STARTING: 'bg-accent',
}

const activityColors: Record<string, string> = {
  info: 'bg-primary',
  warn: 'bg-accent',
  error: 'bg-error',
  success: 'bg-success',
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

function formatNumber(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return n.toString()
}

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/agents')
      .then(data => setAgents(data.agents))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const activeAgents = agents.filter(a => a.status === 'RUNNING').length
  const totalMessages = agents.reduce((s, a) => s + a.totalMessages, 0)
  const totalTokens = agents.reduce((s, a) => s + a.totalTokens, 0)

  // Collect recent logs from all agents
  const recentLogs = agents
    .flatMap(a => (a.logs || []).map(l => ({ ...l, agentName: a.name })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)

  const stats = [
    { label: 'Active Agents', value: String(activeAgents), icon: Bot, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Total Messages', value: formatNumber(totalMessages), icon: MessageSquare, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Tokens Used', value: formatNumber(totalTokens), icon: Zap, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Total Agents', value: String(agents.length), icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Overview of your AI agent fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/agents/quick-deploy" className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <Zap className="w-4 h-4" /> Quick Deploy (30s)
          </Link>
          <Link to="/agents/new" className="flex items-center gap-2 bg-card border border-border hover:border-border-light text-text text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Advanced
          </Link>
        </div>
      </div>

      {/* Stats */}
      <motion.div variants={container} className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <motion.div key={s.label} variants={item} className="bg-card border border-border rounded-xl p-5 hover:border-border-light transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-text">{s.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {agents.length === 0 ? (
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">Welcome to ClawHQ!</h3>
          <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">Deploy your first AI agent in 30 seconds. Connect it to Telegram, WhatsApp, Discord, or any channel.</p>
          <div className="flex items-center gap-3 justify-center">
            <Link to="/agents/quick-deploy" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors">
              <Zap className="w-4 h-4" /> Quick Deploy (30s)
            </Link>
            <Link to="/agents/new" className="inline-flex items-center gap-2 bg-card border border-border hover:border-border-light text-text text-sm font-medium px-4 py-3 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Advanced Setup
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Agent Overview */}
          <motion.div variants={item} className="col-span-2 bg-card border border-border rounded-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-text">Agent Overview</h2>
              <Link to="/agents" className="text-xs text-primary hover:text-primary-hover transition-colors">View all →</Link>
            </div>
            <div className="divide-y divide-border">
              {agents.slice(0, 5).map(a => (
                <Link key={a.id} to={`/agents/${a.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text">{a.name}</p>
                      <p className="text-[11px] text-text-muted">{a.model}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-text-secondary">{formatNumber(a.totalMessages)} msgs</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${statusColors[a.status] || 'bg-text-muted'}`} />
                      <span className="text-xs text-text-muted capitalize">{a.status.toLowerCase()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={item} className="bg-card border border-border rounded-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-text">Recent Activity</h2>
              <Activity className="w-4 h-4 text-text-muted" />
            </div>
            <div className="p-3 space-y-1">
              {recentLogs.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-8">No activity yet. Deploy an agent to get started.</p>
              ) : (
                recentLogs.map((log, i) => (
                  <div key={i} className="flex gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className="mt-1.5"><div className={`w-2 h-2 rounded-full ${activityColors[log.level] || 'bg-primary'}`} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-secondary truncate">{log.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-text-muted font-medium">{log.agentName}</span>
                        <span className="text-[10px] text-text-muted flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{timeAgo(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
