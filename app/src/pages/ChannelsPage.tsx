import { motion } from 'framer-motion'
import { Plus, MessageCircle, CheckCircle, XCircle, Loader2, Trash2, Settings, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import TelegramConfigModal from '../components/TelegramConfigModal'
import WhatsAppConfigModal from '../components/WhatsAppConfigModal'
import DiscordConfigModal from '../components/DiscordConfigModal'
import SlackConfigModal from '../components/SlackConfigModal'

interface Channel {
  id: string
  type: string
  name: string
  status?: string
  isActive: boolean
  config: Record<string, unknown> & {
    botUsername?: string
    botName?: string
    isConfigured?: boolean
  }
  agents: { agent: { id: string; name: string } }[]
}

const channelIcons: Record<string, string> = {
  TELEGRAM: 'âœˆï¸',
  WHATSAPP: 'ðŸ“±',
  DISCORD: 'ðŸŽ®',
  SLACK: 'ðŸ’¬',
  IMESSAGE: 'ðŸŽ',
  TEAMS: 'ðŸ¢',
  IRC: 'ðŸ“¡',
}

const availableChannels = [
  { type: 'TELEGRAM', name: 'Telegram', desc: 'Connect your own Telegram bot', color: 'bg-blue-500/10 text-blue-400' },
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
  const [configModal, setConfigModal] = useState<{ isOpen: boolean; channelId: string; type: string }>({
    isOpen: false,
    channelId: '',
    type: ''
  })

  useEffect(() => {
    apiFetch('/api/channels')
      .then(data => setChannels(data.channels))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const addChannel = async (type: string) => {
    try {
      const response = await apiFetch('/api/channels', { 
        method: 'POST', 
        body: JSON.stringify({ type, config: {} }) 
      })
      
      // For Telegram, WhatsApp, Discord, and Slack channels, open configuration modal
      if (type === 'TELEGRAM' || type === 'WHATSAPP' || type === 'DISCORD' || type === 'SLACK') {
        setConfigModal({ isOpen: true, channelId: response.channel.id, type })
        setShowAdd(false)
      } else {
        // For other channel types, just refresh the list
        await refreshChannels()
        setShowAdd(false)
      }
    } catch { /* */ }
  }

  const refreshChannels = async () => {
    try {
      const data = await apiFetch('/api/channels')
      setChannels(data.channels)
    } catch { /* */ }
  }

  const openConfig = (channelId: string, type: string) => {
    setConfigModal({ isOpen: true, channelId, type })
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
          channels.map(ch => {
            const isConfigured = ch.config?.isConfigured
            const botUsername = ch.config?.botUsername
            const displayName = ch.config?.botName || botUsername || ch.type

            return (
              <motion.div key={ch.id} variants={item} className="bg-card border border-border rounded-xl p-5 hover:border-border-light transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{channelIcons[ch.type] || 'ðŸ“¡'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-text">{displayName}</h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-text-muted">{ch.type}</span>
                        {!isConfigured && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            Setup Required
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-text-muted">
                          {ch.agents.length} agent{ch.agents.length !== 1 ? 's' : ''} connected
                          {ch.agents.length > 0 && ` (${ch.agents.map(a => a.agent.name).join(', ')})`}
                        </p>
                        {botUsername && (
                          <a 
                            href={`https://t.me/${botUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            @{botUsername}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isConfigured && ch.isActive ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                        <CheckCircle className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : isConfigured && !ch.isActive ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-yellow-400">
                        <XCircle className="w-3.5 h-3.5" /> Inactive
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
                        <XCircle className="w-3.5 h-3.5" /> Not Configured
                      </span>
                    )}
                    
                    {(ch.type === 'TELEGRAM' || ch.type === 'WHATSAPP' || ch.type === 'DISCORD' || ch.type === 'SLACK') && (
                      <button 
                        onClick={() => openConfig(ch.id, ch.type)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        {isConfigured ? 'Reconfigure' : 'Configure'}
                      </button>
                    )}
                    
                    <button 
                      onClick={() => deleteChannel(ch.id)} 
                      className="p-1 text-text-muted hover:text-error transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </motion.div>

      <TelegramConfigModal
        isOpen={configModal.isOpen && configModal.type === 'TELEGRAM'}
        onClose={() => setConfigModal({ isOpen: false, channelId: '', type: '' })}
        onSuccess={refreshChannels}
        channelId={configModal.channelId}
      />

      <WhatsAppConfigModal
        isOpen={configModal.isOpen && configModal.type === 'WHATSAPP'}
        onClose={() => setConfigModal({ isOpen: false, channelId: '', type: '' })}
        onSuccess={refreshChannels}
        channelId={configModal.channelId}
      />

      <DiscordConfigModal
        isOpen={configModal.isOpen && configModal.type === 'DISCORD'}
        onClose={() => setConfigModal({ isOpen: false, channelId: '', type: '' })}
        onSuccess={refreshChannels}
        channelId={configModal.channelId}
      />

      <SlackConfigModal
        isOpen={configModal.isOpen && configModal.type === 'SLACK'}
        onClose={() => setConfigModal({ isOpen: false, channelId: '', type: '' })}
        onSuccess={refreshChannels}
        channelId={configModal.channelId}
      />
    </motion.div>
  )
}
