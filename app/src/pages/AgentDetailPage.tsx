import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, Square, RotateCcw, Settings, Terminal, Activity, MessageSquare, Zap, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { useState } from 'react'

const logs = [
  { level: 'info', message: 'Agent started successfully', time: '14:23:01', icon: Info },
  { level: 'info', message: 'Connected to Telegram channel', time: '14:23:02', icon: CheckCircle },
  { level: 'info', message: 'Received message from user @john_doe', time: '14:25:18', icon: MessageSquare },
  { level: 'info', message: 'Generated response (342 tokens)', time: '14:25:19', icon: Zap },
  { level: 'warn', message: 'Rate limit approaching (87/100 daily)', time: '14:30:00', icon: AlertCircle },
  { level: 'error', message: 'Failed to send message: timeout after 30s', time: '14:32:15', icon: AlertCircle },
  { level: 'info', message: 'Retry successful', time: '14:32:17', icon: CheckCircle },
]

const logColors: Record<string, string> = { info: 'text-primary', warn: 'text-accent', error: 'text-error' }

export default function AgentDetailPage() {
  const { id } = useParams()
  const [tab, setTab] = useState<'logs' | 'config' | 'metrics'>('logs')

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-7 h-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text">Support Bot</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-medium text-success">Running</span>
              </div>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">Claude Sonnet Â· Agent ID: {id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text hover:border-border-light transition-colors">
            <Square className="w-4 h-4" /> Stop
          </button>
          <button className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text hover:border-border-light transition-colors">
            <RotateCcw className="w-4 h-4" /> Restart
          </button>
          <button className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text hover:border-border-light transition-colors">
            <Settings className="w-4 h-4" /> Configure
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Messages', value: '12,847', icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Tokens Used', value: '2.4M', icon: Zap, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Uptime', value: '14d 6h', icon: Clock, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Avg Latency', value: '1.1s', icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
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
              {logs.map((log, i) => {
                const Icon = log.icon
                return (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-text-muted w-16 shrink-0">{log.time}</span>
                    <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${logColors[log.level]}`} />
                    <span className={`${log.level === 'error' ? 'text-error' : log.level === 'warn' ? 'text-accent' : 'text-text-secondary'}`}>{log.message}</span>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'config' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">System Prompt</label>
                <textarea rows={5} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-3 text-sm text-text font-mono focus:outline-none focus:border-primary/50 resize-none" defaultValue="You are a helpful customer support agent for Acme Inc. Be concise, friendly, and professional." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Temperature</label>
                  <input type="number" step="0.1" min="0" max="2" defaultValue="0.7" className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Max Tokens</label>
                  <input type="number" defaultValue="4096" className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <button className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Save Changes</button>
            </div>
          )}

          {tab === 'metrics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-navy/50 border border-border rounded-lg p-4">
                  <p className="text-xs text-text-muted mb-3">Messages (Last 7 days)</p>
                  <div className="flex items-end gap-1 h-24">
                    {[40, 65, 45, 80, 60, 90, 75].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary/30 hover:bg-primary/50 rounded-t transition-colors" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-text-muted mt-1"><span>Mon</span><span>Sun</span></div>
                </div>
                <div className="bg-navy/50 border border-border rounded-lg p-4">
                  <p className="text-xs text-text-muted mb-3">Token Usage (Last 7 days)</p>
                  <div className="flex items-end gap-1 h-24">
                    {[55, 70, 50, 85, 65, 95, 80].map((h, i) => (
                      <div key={i} className="flex-1 bg-accent/30 hover:bg-accent/50 rounded-t transition-colors" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-text-muted mt-1"><span>Mon</span><span>Sun</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
