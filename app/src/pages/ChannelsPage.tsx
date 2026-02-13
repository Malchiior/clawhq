import { motion } from 'framer-motion'
import { Plus, MessageCircle, CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'

const channels = [
  { id: '1', type: 'TELEGRAM', name: 'Main Support Bot', status: true, agents: 2, messages: 8420, icon: 'âœˆï¸' },
  { id: '2', type: 'WHATSAPP', name: 'WhatsApp Business', status: true, agents: 1, messages: 3210, icon: 'ðŸ“±' },
  { id: '3', type: 'DISCORD', name: 'Community Server', status: false, agents: 0, messages: 0, icon: 'ðŸŽ®' },
]

const availableChannels = [
  { type: 'TELEGRAM', name: 'Telegram', desc: 'Connect a Telegram bot', icon: 'âœˆï¸', color: 'bg-blue-500/10 text-blue-400' },
  { type: 'WHATSAPP', name: 'WhatsApp', desc: 'WhatsApp Business API', icon: 'ðŸ“±', color: 'bg-green-500/10 text-green-400' },
  { type: 'DISCORD', name: 'Discord', desc: 'Discord bot integration', icon: 'ðŸŽ®', color: 'bg-indigo-500/10 text-indigo-400' },
  { type: 'SLACK', name: 'Slack', desc: 'Slack workspace app', icon: 'ðŸ’¬', color: 'bg-purple-500/10 text-purple-400' },
  { type: 'IMESSAGE', name: 'iMessage', desc: 'Apple iMessage relay', icon: 'ðŸŽ', color: 'bg-gray-500/10 text-gray-400', soon: true },
  { type: 'TEAMS', name: 'MS Teams', desc: 'Microsoft Teams bot', icon: 'ðŸ¢', color: 'bg-blue-600/10 text-blue-300', soon: true },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function ChannelsPage() {
  const [showAdd, setShowAdd] = useState(false)

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

      {/* Add Channel Modal */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-text mb-4">Connect a Platform</h2>
          <div className="grid grid-cols-3 gap-3">
            {availableChannels.map(ch => (
              <button key={ch.type} disabled={ch.soon} className={`text-left p-4 rounded-lg border border-border hover:border-border-light transition-all ${ch.soon ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{ch.icon}</span>
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

      {/* Connected Channels */}
      <motion.div variants={container} className="space-y-3">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Connected Channels</h2>
        {channels.map(ch => (
          <motion.div key={ch.id} variants={item} className="bg-card border border-border rounded-xl p-5 hover:border-border-light transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{ch.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text">{ch.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-text-muted">{ch.type}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{ch.agents} agent{ch.agents !== 1 ? 's' : ''} connected Â· {ch.messages.toLocaleString()} messages</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {ch.status ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-success"><CheckCircle className="w-3.5 h-3.5" /> Active</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted"><XCircle className="w-3.5 h-3.5" /> Inactive</span>
                )}
                <button className="text-xs text-primary hover:text-primary-hover transition-colors">Configure</button>
              </div>
            </div>
          </motion.div>
        ))}

        {channels.length === 0 && (
          <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center">
            <MessageCircle className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <h3 className="font-semibold text-text">No channels connected</h3>
            <p className="text-sm text-text-secondary mt-1">Add a channel to start receiving messages</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
