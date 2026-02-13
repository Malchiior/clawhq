import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, Square, Play, RotateCcw, Settings, Terminal, Activity, MessageSquare, Zap, Clock, AlertCircle, CheckCircle, Info, Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'

interface AgentLog {
  id: string
  level: string
  message: string
  createdAt: string
}

interface Channel {
  id: string
  name: string
  type: string
  status: string
}

interface Agent {
  id: string
  name: string
  model: string
  status: string
  systemPrompt: string | null
  temperature: number
  maxTokens: number
  totalMessages: number
  totalTokens: number
  createdAt: string
  channels: { channel: Channel }[]
  logs: AgentLog[]
}

const statusColors: Record<string, { dot: string; text: string; label: string }> = {
  RUNNING: { dot: 'bg-success animate-pulse', text: 'text-success', label: 'Running' },
  STOPPED: { dot: 'bg-text-muted', text: 'text-text-muted', label: 'Stopped' },
  STARTING: { dot: 'bg-accent animate-pulse', text: 'text-accent', label: 'Starting' },
  ERROR: { dot: 'bg-error', text: 'text-error', label: 'Error' },
}

const logIcons: Record<string, typeof Info> = { info: Info, warn: AlertCircle, error: AlertCircle, success: CheckCircle }
const logColors: Record<string, string> = { info: 'text-primary', warn: 'text-accent', error: 'text-error', success: 'text-success' }

export default function AgentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [tab, setTab] = useState<'logs' | 'config' | 'metrics'>('logs')
  const [configForm, setConfigForm] = useState({ systemPrompt: '', temperature: 0.7, maxTokens: 4096, name: '', model: '' })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const fetchAgent = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/agents/${id}`)
      setAgent(data.agent)
      setLogs(data.agent.logs || [])
      setConfigForm({
        systemPrompt: data.agent.systemPrompt || '',
        temperature: data.agent.temperature,
        maxTokens: data.agent.maxTokens,
        name: data.agent.name,
        model: data.agent.model,
      })
    } catch {
      // Agent not found or error
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchAgent() }, [fetchAgent])

  // Poll logs every 10s when on logs tab
  useEffect(() => {
    if (tab !== 'logs') return
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch(`/api/agents/${id}/logs`)
        setLogs(data.logs)
      } catch { /* silent */ }
    }, 10000)
    return () => clearInterval(interval)
  }, [id, tab])

  const doAction = async (action: string) => {
    setActionLoading(action)
    try {
      await apiFetch(`/api/agents/${id}/${action}`, { method: 'POST' })
      await fetchAgent()
    } catch { /* */ }
    setActionLoading(null)
  }

  const saveConfig = async () => {
    setSaveStatus('saving')
    try {
      await apiFetch(`/api/agents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(configForm),
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const deleteAgent = async () => {
    try {
      await apiFetch(`/api/agents/${id}`, { method: 'DELETE' })
      navigate('/agents')
    } catch { /* */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-text-secondary">Agent not found</p>
        <button onClick={() => navigate('/agents')} className="text-primary hover:underline text-sm">← Back to Agents</button>
      </div>
    )
  }

  const status = statusColors[agent.status] || statusColors.STOPPED
  const uptime = agent.status === 'RUNNING' ? getUptime(agent.createdAt) : '—'

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/agents')} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Agents
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-7 h-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text">{agent.name}</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
                <span className={`text-sm font-medium ${status.text}`}>{status.label}</span>
              </div>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">{agent.model} · ID: {agent.id.slice(0, 8)}...</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {agent.status === 'RUNNING' ? (
            <button onClick={() => doAction('stop')} disabled={!!actionLoading} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-error hover:border-error/30 transition-colors disabled:opacity-50">
              {actionLoading === 'stop' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />} Stop
            </button>
          ) : (
            <button onClick={() => doAction('start')} disabled={!!actionLoading} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-success hover:border-success/30 transition-colors disabled:opacity-50">
              {actionLoading === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Start
            </button>
          )}
          <button onClick={() => doAction('restart')} disabled={!!actionLoading} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text hover:border-border-light transition-colors disabled:opacity-50">
            {actionLoading === 'restart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Restart
          </button>
          <button onClick={() => setTab('config')} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text hover:border-border-light transition-colors">
            <Settings className="w-4 h-4" /> Configure
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Messages', value: formatNum(agent.totalMessages), icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Tokens Used', value: formatTokens(agent.totalTokens), icon: Zap, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Uptime', value: uptime, icon: Clock, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Channels', value: String(agent.channels.length), icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-xl font-bold text-text">{s.value}</p>
            <p className="text-xs text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Connected Channels */}
      {agent.channels.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-text mb-3">Connected Channels</h3>
          <div className="flex flex-wrap gap-2">
            {agent.channels.map(({ channel }) => (
              <div key={channel.id} className="flex items-center gap-2 bg-navy/50 border border-border rounded-lg px-3 py-1.5 text-sm">
                <div className={`w-2 h-2 rounded-full ${channel.status === 'ACTIVE' ? 'bg-success' : 'bg-text-muted'}`} />
                <span className="text-text-secondary">{channel.name}</span>
                <span className="text-text-muted text-xs">({channel.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl">
        <div className="flex border-b border-border">
          {(['logs', 'config', 'metrics'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}>
              {t === 'logs' && <Terminal className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'logs' && (
            <div className="bg-navy/50 rounded-lg p-4 font-mono text-xs space-y-1.5 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-text-muted text-center py-8">No logs yet. Start the agent to see activity.</p>
              ) : (
                logs.map((log) => {
                  const Icon = logIcons[log.level] || Info
                  const time = new Date(log.createdAt).toLocaleTimeString('en-US', { hour12: false })
                  return (
                    <div key={log.id} className="flex items-start gap-2">
                      <span className="text-text-muted w-16 shrink-0">{time}</span>
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${logColors[log.level] || 'text-text-secondary'}`} />
                      <span className={log.level === 'error' ? 'text-error' : log.level === 'warn' ? 'text-accent' : 'text-text-secondary'}>{log.message}</span>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {tab === 'config' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Agent Name</label>
                  <input type="text" value={configForm.name} onChange={e => setConfigForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Model</label>
                  <select value={configForm.model} onChange={e => setConfigForm(p => ({ ...p, model: e.target.value }))} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50">
                    <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                    <option value="claude-opus-4-20250514">Claude Opus 4</option>
                    <option value="claude-haiku-3-20250307">Claude Haiku 3.5</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">System Prompt</label>
                <textarea rows={5} value={configForm.systemPrompt} onChange={e => setConfigForm(p => ({ ...p, systemPrompt: e.target.value }))} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-3 text-sm text-text font-mono focus:outline-none focus:border-primary/50 resize-none" placeholder="You are a helpful assistant..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Temperature</label>
                  <input type="number" step="0.1" min="0" max="2" value={configForm.temperature} onChange={e => setConfigForm(p => ({ ...p, temperature: parseFloat(e.target.value) || 0 }))} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Max Tokens</label>
                  <input type="number" value={configForm.maxTokens} onChange={e => setConfigForm(p => ({ ...p, maxTokens: parseInt(e.target.value) || 0 }))} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button onClick={saveConfig} disabled={saveStatus === 'saving'} className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saveStatus === 'saved' ? '✓ Saved!' : saveStatus === 'error' ? 'Error — Try Again' : 'Save Changes'}
                </button>
                <div>
                  {!deleteConfirm ? (
                    <button onClick={() => setDeleteConfirm(true)} className="text-sm text-text-muted hover:text-error transition-colors flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4" /> Delete Agent
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-error">Are you sure?</span>
                      <button onClick={deleteAgent} className="text-sm bg-error/10 text-error px-3 py-1 rounded-lg hover:bg-error/20 transition-colors">Yes, delete</button>
                      <button onClick={() => setDeleteConfirm(false)} className="text-sm text-text-muted hover:text-text transition-colors">Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'metrics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-navy/50 border border-border rounded-lg p-4">
                  <p className="text-xs text-text-muted mb-3">Messages (Last 7 days)</p>
                  <div className="flex items-end gap-1 h-24">
                    {[40, 65, 45, 80, 60, 90, 75].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary/30 hover:bg-primary/50 rounded-t transition-colors cursor-pointer" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-text-muted mt-1"><span>Mon</span><span>Sun</span></div>
                </div>
                <div className="bg-navy/50 border border-border rounded-lg p-4">
                  <p className="text-xs text-text-muted mb-3">Token Usage (Last 7 days)</p>
                  <div className="flex items-end gap-1 h-24">
                    {[55, 70, 50, 85, 65, 95, 80].map((h, i) => (
                      <div key={i} className="flex-1 bg-accent/30 hover:bg-accent/50 rounded-t transition-colors cursor-pointer" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-text-muted mt-1"><span>Mon</span><span>Sun</span></div>
                </div>
              </div>
              <p className="text-xs text-text-muted text-center">Real-time metrics will be available once the agent processes messages.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
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
