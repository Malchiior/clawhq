import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Bot } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function FloatingChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('clawhq-floating-chat')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem('clawhq-floating-chat', JSON.stringify(messages.slice(-100)))
  }, [messages])

  useEffect(() => {
    if (open && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, open])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  // Load agents
  useEffect(() => {
    apiFetch('/api/agents').then((data: any) => {
      const list = Array.isArray(data) ? data : data.agents || []
      setAgents(list.map((a: any) => ({ id: a.id, name: a.name })))
      if (list.length > 0 && !selectedAgent) setSelectedAgent(list[0].id)
    }).catch(() => {})
  }, [])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading || !selectedAgent) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const data = await apiFetch(`/api/chat/${selectedAgent}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: text })
      })
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || data.message || data.content || 'No response',
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, reply])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to send message'}`,
        timestamp: Date.now()
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center z-[9998] shadow-lg transition-transform hover:scale-110"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none' }}
        >
          <MessageCircle size={24} className="text-white" />
        </button>
      )}

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[9998]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed top-0 right-0 h-full flex flex-col z-[9999]"
          style={{
            width: 380,
            maxWidth: '100%',
            background: '#0f0f23',
            borderLeft: '1px solid var(--border)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: '#1a1a2e' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Agent Chat</p>
                {agents.length > 1 ? (
                  <select
                    value={selectedAgent || ''}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="text-xs bg-transparent text-[var(--text-muted)] border-none outline-none cursor-pointer"
                  >
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">{agents[0]?.name || 'No agents'}</p>
                )}
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)] p-1">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                <Bot size={40} className="text-[var(--accent)] mb-3" />
                <p className="text-sm text-[var(--text-muted)]">Send a message to your agent</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed"
                  style={{
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                      : '#1a1a2e',
                    color: msg.role === 'user' ? '#fff' : 'var(--text)',
                    border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#1a1a2e', border: '1px solid var(--border)' }}>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 items-center" style={{ borderTop: '1px solid var(--border)', background: '#1a1a2e' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={selectedAgent ? 'Message your agent...' : 'No agents available'}
              disabled={!selectedAgent}
              className="flex-1 rounded-lg px-3.5 py-2.5 text-sm outline-none"
              style={{ background: '#12122a', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading || !selectedAgent}
              className="rounded-lg h-10 px-3.5 flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
