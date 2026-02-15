import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Bot, Loader2 } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface Agent {
  id: string
  name: string
  model: string
  status: string
}

export default function ChatHubPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    apiFetch('/agents').then(r => r.json()).then(data => {
      setAgents(Array.isArray(data) ? data : data.agents || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle size={28} className="text-[var(--accent)]" />
        <h1 className="text-2xl font-bold text-[var(--text)]">Chat</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--accent)]" size={32} /></div>
      ) : agents.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Bot size={48} className="mx-auto text-[var(--text-dim)] mb-4" />
          <p className="text-[var(--text-muted)]">No agents yet. Create one to start chatting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 hover:bg-[var(--card-hover)] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Bot size={24} className="text-[var(--accent)]" />
                <div>
                  <h3 className="font-semibold text-[var(--text)]">{agent.name}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{agent.model}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full ${agent.status === 'RUNNING' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {agent.status}
                </span>
                <button
                  onClick={() => navigate(`/agents/${agent.id}/chat`)}
                  className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center gap-2"
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
