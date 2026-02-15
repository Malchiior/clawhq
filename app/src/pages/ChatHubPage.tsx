import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MessageCircle, Bot, Loader2, Search, Plus, Zap } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface Agent {
  id: string
  name: string
  model: string
  status: string
  totalMessages?: number
}

export default function ChatHubPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    apiFetch('/api/agents').then(data => {
      setAgents(Array.isArray(data) ? data : data.agents || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.model.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-5xl mx-auto page-enter">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageCircle size={28} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text)]">Chat</h1>
        </div>
      </div>

      {/* Search bar */}
      {agents.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]/50 transition-colors"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--accent)]" size={32} /></div>
      ) : agents.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center mx-auto mb-4">
            <Bot size={32} className="text-[var(--accent)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">No agents yet</h3>
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md mx-auto">Create your first agent to start chatting. It only takes 30 seconds!</p>
          <div className="flex items-center gap-3 justify-center">
            <Link to="/agents/quick-deploy" className="inline-flex items-center gap-2 bg-[var(--accent)] hover:opacity-90 text-black text-sm font-semibold px-6 py-3 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Zap size={16} /> Create Your First Agent
            </Link>
            <Link to="/agents/new" className="inline-flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--text-dim)] text-[var(--text)] text-sm font-medium px-4 py-3 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Plus size={16} /> Advanced Setup
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Search size={48} className="mx-auto text-[var(--text-dim)] mb-4" />
          <p className="text-[var(--text-muted)]">No agents match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(agent => (
            <div key={agent.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 hover:bg-[var(--card-hover)] hover:border-[var(--text-dim)] transition-all hover:scale-[1.01]">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <Bot size={24} className="text-[var(--accent)]" />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--card)] ${agent.status === 'RUNNING' ? 'bg-green-400' : 'bg-gray-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--text)] truncate">{agent.name}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{agent.model}</p>
                </div>
              </div>

              {/* Message count */}
              {agent.totalMessages !== undefined && (
                <p className="text-xs text-[var(--text-dim)] mb-3 flex items-center gap-1.5">
                  <MessageCircle size={12} />
                  {agent.totalMessages} messages
                </p>
              )}

              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full ${agent.status === 'RUNNING' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {agent.status === 'RUNNING' ? '● Online' : '○ Offline'}
                </span>
                <button
                  onClick={() => navigate(`/agents/${agent.id}/chat`)}
                  className="bg-[var(--accent)] hover:opacity-90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <MessageCircle size={14} /> Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
