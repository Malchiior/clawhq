import { motion, AnimatePresence } from 'framer-motion'
import { LifeBuoy, Plus, Send, Clock, CheckCircle, AlertCircle, ChevronRight, ArrowLeft, Loader2, X, Tag, Flag } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../lib/api'

interface TicketSummary {
  id: string
  subject: string
  category: string
  priority: string
  status: string
  messageCount: number
  lastMessage: { content: string; isStaff: boolean; createdAt: string } | null
  createdAt: string
  updatedAt: string
}

interface TicketMessage {
  id: string
  content: string
  isStaff: boolean
  senderName: string | null
  createdAt: string
}

interface TicketDetail {
  id: string
  subject: string
  category: string
  priority: string
  status: string
  createdAt: string
  messages: TicketMessage[]
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: typeof Clock }> = {
  OPEN: { color: 'text-primary', bg: 'bg-primary/10', label: 'Open', icon: Clock },
  IN_PROGRESS: { color: 'text-accent', bg: 'bg-accent/10', label: 'In Progress', icon: Loader2 },
  WAITING_ON_USER: { color: 'text-warning', bg: 'bg-yellow-500/10', label: 'Awaiting Reply', icon: AlertCircle },
  RESOLVED: { color: 'text-success', bg: 'bg-success/10', label: 'Resolved', icon: CheckCircle },
  CLOSED: { color: 'text-text-muted', bg: 'bg-text-muted/10', label: 'Closed', icon: CheckCircle },
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  LOW: { color: 'text-text-muted', label: 'Low' },
  NORMAL: { color: 'text-text-secondary', label: 'Normal' },
  HIGH: { color: 'text-accent', label: 'High' },
  URGENT: { color: 'text-error', label: 'Urgent' },
}

const categoryLabels: Record<string, string> = {
  general: 'General',
  billing: 'Billing',
  technical: 'Technical',
  feature: 'Feature Request',
  bug: 'Bug Report',
}

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function SupportPage() {
  const [view, setView] = useState<'list' | 'detail' | 'new'>('list')
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [activeTicket, setActiveTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // New ticket form
  const [newSubject, setNewSubject] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [newPriority, setNewPriority] = useState('NORMAL')
  const [newMessage, setNewMessage] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchTickets = async () => {
    try {
      const data = await apiFetch('/api/support/tickets')
      setTickets(data.tickets)
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchTickets().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeTicket?.messages])

  const openTicket = async (id: string) => {
    setDetailLoading(true)
    setView('detail')
    try {
      const data = await apiFetch(`/api/support/tickets/${id}`)
      setActiveTicket(data.ticket)
    } catch { /* */ }
    setDetailLoading(false)
  }

  const createTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return
    setCreating(true)
    try {
      const data = await apiFetch('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: newSubject,
          category: newCategory,
          priority: newPriority,
          message: newMessage,
        }),
      })
      setNewSubject('')
      setNewCategory('general')
      setNewPriority('NORMAL')
      setNewMessage('')
      await fetchTickets()
      setActiveTicket(data.ticket)
      setView('detail')
    } catch { /* */ }
    setCreating(false)
  }

  const sendReply = async () => {
    if (!replyText.trim() || !activeTicket) return
    setReplySending(true)
    try {
      await apiFetch(`/api/support/tickets/${activeTicket.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText }),
      })
      setReplyText('')
      // Refresh ticket
      const data = await apiFetch(`/api/support/tickets/${activeTicket.id}`)
      setActiveTicket(data.ticket)
      await fetchTickets()
    } catch { /* */ }
    setReplySending(false)
  }

  const closeTicket = async () => {
    if (!activeTicket) return
    try {
      await apiFetch(`/api/support/tickets/${activeTicket.id}/close`, { method: 'PATCH' })
      await fetchTickets()
      setView('list')
      setActiveTicket(null)
    } catch { /* */ }
  }

  // ---------- LIST VIEW ----------
  if (view === 'list') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Support</h1>
            <p className="text-sm text-text-secondary mt-1">Get help with your account or report issues</p>
          </div>
          <button onClick={() => setView('new')} className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Ticket
          </button>
        </div>

        {/* Quick Help */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Documentation', desc: 'Guides and tutorials', href: '/docs', icon: '📖' },
            { title: 'Status Page', desc: 'System uptime & incidents', href: '#', icon: '🟢' },
            { title: 'Community', desc: 'Discord support server', href: 'https://discord.com/invite/clawd', icon: '💬' },
          ].map((item) => (
            <a key={item.title} href={item.href} className="bg-card border border-border rounded-xl p-4 hover:border-border-light transition-colors group">
              <span className="text-2xl">{item.icon}</span>
              <h3 className="text-sm font-semibold text-text mt-2 group-hover:text-primary transition-colors">{item.title}</h3>
              <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
            </a>
          ))}
        </div>

        {/* Ticket List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <LifeBuoy className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-text mb-2">No tickets yet</h3>
            <p className="text-sm text-text-secondary mb-6">Need help? Create a support ticket and we'll get back to you quickly.</p>
            <button onClick={() => setView('new')} className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Create Your First Ticket
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {tickets.map((ticket) => {
              const s = statusConfig[ticket.status] || statusConfig.OPEN
              const p = priorityConfig[ticket.priority] || priorityConfig.NORMAL
              return (
                <button key={ticket.id} onClick={() => openTicket(ticket.id)} className="w-full text-left p-4 hover:bg-white/[0.02] transition-colors group flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-5 h-5 ${s.color} ${ticket.status === 'IN_PROGRESS' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-text truncate">{ticket.subject}</h3>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${s.bg} ${s.color}`}>{s.label}</span>
                      {ticket.priority !== 'NORMAL' && (
                        <span className={`text-[10px] font-medium ${p.color}`}>{p.label}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-muted">{categoryLabels[ticket.category] || ticket.category}</span>
                      <span className="text-xs text-text-muted">·</span>
                      <span className="text-xs text-text-muted">{ticket.messageCount} message{ticket.messageCount !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-text-muted">·</span>
                      <span className="text-xs text-text-muted">{timeAgo(ticket.updatedAt)}</span>
                    </div>
                    {ticket.lastMessage && (
                      <p className="text-xs text-text-muted mt-1 truncate">
                        {ticket.lastMessage.isStaff ? '🛡️ Staff: ' : ''}{ticket.lastMessage.content}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text transition-colors shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </motion.div>
    )
  }

  // ---------- NEW TICKET VIEW ----------
  if (view === 'new') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
        <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
        </button>

        <div>
          <h1 className="text-2xl font-bold text-text">New Support Ticket</h1>
          <p className="text-sm text-text-secondary mt-1">Describe your issue and we'll get back to you</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Subject</label>
            <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Brief description of your issue" maxLength={200} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                <Tag className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Category
              </label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50">
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="feature">Feature Request</option>
                <option value="bug">Bug Report</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                <Flag className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Priority
              </label>
              <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50">
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
            <textarea rows={6} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Please describe your issue in detail. Include steps to reproduce, error messages, or screenshots if applicable." maxLength={5000} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted font-mono focus:outline-none focus:border-primary/50 resize-none" />
            <p className="text-xs text-text-muted mt-1">{newMessage.length}/5000 characters</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setView('list')} className="text-sm text-text-muted hover:text-text transition-colors">Cancel</button>
            <button onClick={createTicket} disabled={creating || newSubject.trim().length < 3 || newMessage.trim().length < 10} className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Ticket
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  // ---------- DETAIL VIEW ----------
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <button onClick={() => { setView('list'); setActiveTicket(null) }} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Tickets
      </button>

      {detailLoading || !activeTicket ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-text">{activeTicket.subject}</h1>
                {(() => {
                  const s = statusConfig[activeTicket.status] || statusConfig.OPEN
                  return <span className={`text-xs font-medium px-2 py-0.5 rounded ${s.bg} ${s.color}`}>{s.label}</span>
                })()}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-text-muted">{categoryLabels[activeTicket.category]}</span>
                <span className="text-xs text-text-muted">·</span>
                <span className={`text-xs ${(priorityConfig[activeTicket.priority] || priorityConfig.NORMAL).color}`}>
                  {(priorityConfig[activeTicket.priority] || priorityConfig.NORMAL).label} priority
                </span>
                <span className="text-xs text-text-muted">·</span>
                <span className="text-xs text-text-muted">Opened {timeAgo(activeTicket.createdAt)}</span>
              </div>
            </div>
            {!['CLOSED', 'RESOLVED'].includes(activeTicket.status) && (
              <button onClick={closeTicket} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-error transition-colors border border-border rounded-lg px-3 py-1.5 hover:border-error/30">
                <X className="w-3.5 h-3.5" /> Close Ticket
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="bg-card border border-border rounded-xl">
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              <AnimatePresence>
                {activeTicket.messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.isStaff ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] rounded-xl px-4 py-3 ${msg.isStaff ? 'bg-primary/10 border border-primary/20' : 'bg-navy/50 border border-border'}`}>
                      {msg.isStaff && (
                        <p className="text-xs font-medium text-primary mb-1">🛡️ {msg.senderName || 'Support Staff'}</p>
                      )}
                      <p className="text-sm text-text whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-[10px] text-text-muted mt-1.5">{timeAgo(msg.createdAt)}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            {!['CLOSED', 'RESOLVED'].includes(activeTicket.status) && (
              <div className="border-t border-border p-4">
                <div className="flex gap-3">
                  <textarea rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your reply..." maxLength={5000} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }} className="flex-1 bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50 resize-none" />
                  <button onClick={sendReply} disabled={replySending || replyText.trim().length < 1} className="self-end bg-primary hover:bg-primary-hover text-white p-2.5 rounded-lg transition-colors disabled:opacity-50">
                    {replySending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-text-muted mt-1.5">Press Ctrl+Enter to send</p>
              </div>
            )}

            {['CLOSED', 'RESOLVED'].includes(activeTicket.status) && (
              <div className="border-t border-border p-4 text-center">
                <p className="text-sm text-text-muted">This ticket is {activeTicket.status.toLowerCase()}. Create a new ticket if you need further help.</p>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}
