import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, Plus, Play, Square, RotateCcw, MoreVertical, Search, Filter, Loader2, Zap, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

interface Agent {
  id: string
  name: string
  model: string
  deployMode?: string
  status: string
  totalMessages: number
  totalTokens: number
  createdAt: string
  channels: { channel: { name: string; type: string } }[]
}

const deployBadge: Record<string, { label: string; color: string }> = {
  LOCAL: { label: 'Local', color: 'bg-green-500/10 text-green-400' },
  CLOUD: { label: 'Cloud', color: 'bg-purple-500/10 text-purple-400' },
  DASHBOARD: { label: 'Dashboard', color: 'bg-blue-500/10 text-blue-400' },
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  RUNNING: { color: 'text-success', bg: 'bg-success', label: 'Running' },
  STOPPED: { color: 'text-text-muted', bg: 'bg-text-muted', label: 'Stopped' },
  ERROR: { color: 'text-error', bg: 'bg-error', label: 'Error' },
  STARTING: { color: 'text-accent', bg: 'bg-accent', label: 'Starting' },
  DEPLOYING: { color: 'text-primary', bg: 'bg-primary', label: 'Deploying' },
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

function formatNumber(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return n.toString()
}

function getUptime(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<number | null>(null)

  const fetchAgents = async () => {
    try {
      const data = await apiFetch('/api/agents')
      setAgents(data.agents)
    } catch {
      // Silent fail
    }
  }

  useEffect(() => {
    fetchAgents().finally(() => setLoading(false))
    
    // Poll every 3 seconds if there are agents in transitional states
    const startPolling = () => {
      const interval = setInterval(async () => {
        const hasTransitionalAgents = agents.some(agent => 
          ['DEPLOYING', 'STARTING', 'ERROR'].includes(agent.status)
        )
        if (hasTransitionalAgents) {
          await fetchAgents()
        }
      }, 3000)
      setPollingInterval(interval)
    }

    startPolling()
    
    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [agents])

  const doAction = async (agentId: string, action: string) => {
    setActionLoading(agentId)
    try {
      await apiFetch(`/api/agents/${agentId}/${action}`, { method: 'POST' })
      await fetchAgents()
    } catch { /* */ }
    setActionLoading(null)
  }

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.model.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Agents</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your AI agent fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/agents/quick-deploy" className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors group">
            <Zap className="w-4 h-4 group-hover:animate-pulse" /> Quick Deploy
            <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded">
              <Clock className="w-3 h-3" /> 30s
            </div>
          </Link>
          <Link to="/agents/new" className="flex items-center gap-2 bg-card border border-border hover:border-border-light text-text text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Advanced
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type="text" placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50" />
        </div>
        <button className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text hover:border-border-light transition-colors">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">
            {agents.length === 0 ? 'No agents yet' : 'No matching agents'}
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            {agents.length === 0 ? 'Deploy your first AI agent in 30 seconds.' : 'Try a different search term.'}
          </p>
          {agents.length === 0 && (
            <div className="flex items-center gap-3 justify-center">
              <Link to="/agents/quick-deploy" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors">
                <Zap className="w-4 h-4" /> Quick Deploy (30s)
              </Link>
              <Link to="/agents/new" className="inline-flex items-center gap-2 bg-card border border-border hover:border-border-light text-text text-sm font-medium px-4 py-3 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Advanced Setup
              </Link>
            </div>
          )}
        </div>
      ) : (
        <motion.div variants={container} className="grid gap-4">
          {filtered.map(agent => {
            const s = statusConfig[agent.status] || statusConfig.STOPPED
            const channelNames = agent.channels.map(c => c.channel.name)
            const uptime = agent.status === 'RUNNING' ? getUptime(agent.createdAt) : '—'
            const isActioning = actionLoading === agent.id
            return (
              <motion.div key={agent.id} variants={item}>
                <Link to={`/agents/${agent.id}`} className="block bg-card border border-border rounded-xl p-5 hover:border-border-light transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Bot className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-semibold text-text">{agent.name}</h3>
                          {agent.deployMode && deployBadge[agent.deployMode] && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${deployBadge[agent.deployMode].color}`}>
                              {deployBadge[agent.deployMode].label}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${s.bg} ${agent.status === 'RUNNING' ? 'animate-pulse' : ''}`} />
                            <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-text-muted">{agent.model}</span>
                          {channelNames.length > 0 && (
                            <span className="text-xs text-text-muted">· {channelNames.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium text-text">{formatNumber(agent.totalMessages)}</p>
                        <p className="text-[10px] text-text-muted">messages</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-text">{formatNumber(agent.totalTokens)}</p>
                        <p className="text-[10px] text-text-muted">tokens</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-text">{uptime}</p>
                        <p className="text-[10px] text-text-muted">uptime</p>
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
                        {isActioning ? (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        ) : (
                          <>
                            {agent.status === 'STOPPED' && <button onClick={() => doAction(agent.id, 'start')} className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors"><Play className="w-4 h-4" /></button>}
                            {agent.status === 'RUNNING' && <button onClick={() => doAction(agent.id, 'stop')} className="p-1.5 text-text-muted hover:bg-white/5 rounded-lg transition-colors"><Square className="w-4 h-4" /></button>}
                            {agent.status === 'ERROR' && <button onClick={() => doAction(agent.id, 'restart')} className="p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors"><RotateCcw className="w-4 h-4" /></button>}
                          </>
                        )}
                        <button className="p-1.5 text-text-muted hover:bg-white/5 rounded-lg transition-colors"><MoreVertical className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
