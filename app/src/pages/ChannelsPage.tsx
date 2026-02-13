import { motion } from 'framer-motion'
import { Plus, MessageCircle, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

interface Channel {
  id: string
  type: string
  name: string
  status: string
  config: Record<string, unknown>
  agents: { agent: { id: string; name: string } }[]
}

const channelIcons: Record<string, string> = {
  TELEGRAM: '✈️',
  WHATSAPP: '📱',
  DISCORD: '🎮',
  SLACK: '💬',
  IMESSAGE: '🍎',
  TEAMS: '🏢',
  IRC: '📡',
}

const availableChannels = [
  { type: 'TELEGRAM', name: 'Telegram', desc: 'Connect a Telegram bot', color: 'bg-blue-500/10 text-blue-400' },
  { type: 'WHATSAPP', name: 'WhatsApp', desc: 'WhatsApp Business API', color: 'bg-green-500/10 text-green-400' },
  { type: 'DISCORD', name: 'Discord', desc: 'Discord bot integration', color: 'bg-indigo-500/10 text-indigo-400' },
  { type: 'SLACK', name: 'Slack', desc: 'Slack workspace app', color: 'bg-purple-500/10 text-purple-400' },
  { type: 'IMESSAGE', name: 'iMessage', desc: 'Apple iMessage relay', color: 'bg-gray-500/10 text-gray-400', soon: true },
  { type: 'TEAMS', name: 'MS Teams', desc: 'Microsoft Teams bot', color: 'bg-blue-600/10 text-blue-300', soon: true },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    apiFetch('/api/channels')
      .then(data => setChannels(data.channels))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const addChannel = async (type: string) => {
    try {
      await apiFetch('/api/channels', { method: 'POST', body: JSON.stringify({ type, config: {} }) })
      const data = await apiFetch('/api/channels')
      setChannels(data.channels)
      setShowAdd(false)
    } catch { /* */ }
  }

  const deleteChannel = async (id: string) => {
    try {
      await apiFetch(`/api/channels/${id}`, { method: 'DELETE' })
      setChannels(prev => prev.filter(c => c.id !== id))
    } catch { /* */ }
  }

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
          <h1 className="text-2xl font-bold text-text">Channels</h1>
          <p className="text-sm text-text-secondary mt-1">Connect your agents to messaging platforms</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Channel
        </button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-text mb-4">Connect a Platform</h2>
          <div className="grid grid-cols-3 gap-3">
            {availableChannels.map(ch => (
              <button key={ch.type} onClick={() => !ch.soon && addChannel(ch.type)} disabled={ch.soon} className={`text-left p-4 rounded-lg border border-border hover:border-border-light transition-all ${ch.soon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{channelIcons[ch.type]}</span>
                  <div>
                    <p className="font-medium text-text text-sm">{ch.name}</p>
                    {ch.soon && <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded">Coming Soon</span>}
                  </div>
                </div>
                <p className="text-xs text-text-muted">{ch.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={container} className="space-y-3">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Connected Channels</h2>
        {channels.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center">
            <MessageCircle className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <h3 className="font-semibold text-text">No channels connected</h3>
            <p className="text-sm text-text-secondary mt-1 mb-4">Add a channel to start receiving messages</p>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Add Channel
            </button>
          </div>
        ) : (
          channels.map(ch => (
            <motion.div key={ch.id} variants={item} className="bg-card border border-border rounded-xl p-5 hover:border-border-light transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{channelIcons[ch.type] || '📡'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-text">{ch.name || ch.type}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-text-muted">{ch.type}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {ch.agents.length} agent{ch.agents.length !== 1 ? 's' : ''} connected
                      {ch.agents.length > 0 && ` (${ch.agents.map(a => a.agent.name).join(', ')})`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {ch.status === 'ACTIVE' ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-success"><CheckCircle className="w-3.5 h-3.5" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted"><XCircle className="w-3.5 h-3.5" /> Inactive</span>
                  )}
                  <button className="text-xs text-primary hover:text-primary-hover transition-colors">Configure</button>
                  <button onClick={() => deleteChannel(ch.id)} className="p-1 text-text-muted hover:text-error transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  )
}
