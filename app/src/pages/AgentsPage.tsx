import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, Plus, Play, Square, RotateCcw, MoreVertical, Search, Filter } from 'lucide-react'

const agents = [
  { id: '1', name: 'Support Bot', model: 'Claude Sonnet', status: 'RUNNING', messages: 12847, tokens: 2400000, uptime: '14d 6h', channels: ['Telegram', 'WhatsApp'] },
  { id: '2', name: 'Sales Agent', model: 'GPT-4o', status: 'RUNNING', messages: 3120, tokens: 890000, uptime: '7d 2h', channels: ['Discord'] },
  { id: '3', name: 'Content Writer', model: 'Claude Sonnet', status: 'RUNNING', messages: 880, tokens: 1200000, uptime: '3d 18h', channels: ['Slack'] },
  { id: '4', name: 'Data Analyst', model: 'Claude Opus', status: 'ERROR', messages: 156, tokens: 340000, uptime: '0h', channels: [] },
  { id: '5', name: 'Onboarding Guide', model: 'GPT-4o Mini', status: 'STOPPED', messages: 0, tokens: 0, uptime: '0h', channels: [] },
]

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

export default function AgentsPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Agents</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your AI agent fleet</p>
        </div>
        <Link to="/agents/new" className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Deploy Agent
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type="text" placeholder="Search agents..." className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50" />
        </div>
        <button className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text hover:border-border-light transition-colors">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      <motion.div variants={container} className="grid gap-4">
        {agents.map(agent => {
          const s = statusConfig[agent.status]
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
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${s.bg} ${agent.status === 'RUNNING' ? 'animate-pulse' : ''}`} />
                          <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-text-muted">{agent.model}</span>
                        {agent.channels.length > 0 && (
                          <span className="text-xs text-text-muted">· {agent.channels.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-text">{formatNumber(agent.messages)}</p>
                      <p className="text-[10px] text-text-muted">messages</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-text">{formatNumber(agent.tokens)}</p>
                      <p className="text-[10px] text-text-muted">tokens</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-text">{agent.uptime}</p>
                      <p className="text-[10px] text-text-muted">uptime</p>
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
                      {agent.status === 'STOPPED' && <button className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors"><Play className="w-4 h-4" /></button>}
                      {agent.status === 'RUNNING' && <button className="p-1.5 text-text-muted hover:bg-white/5 rounded-lg transition-colors"><Square className="w-4 h-4" /></button>}
                      {agent.status === 'ERROR' && <button className="p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors"><RotateCcw className="w-4 h-4" /></button>}
                      <button className="p-1.5 text-text-muted hover:bg-white/5 rounded-lg transition-colors"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
