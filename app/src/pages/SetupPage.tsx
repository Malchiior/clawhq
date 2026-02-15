import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Bot, Zap, ArrowRight } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const quickReplies = [
  { label: 'Connect Existing OpenClaw', value: 'I want to connect my existing OpenClaw' },
  { label: 'Cloud Deploy', value: 'I want Cloud Deploy - host everything for me' },
  { label: 'Download OpenClaw', value: 'I want to download OpenClaw and run it locally' },
]

export default function SetupPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const [setupComplete, setSetupComplete] = useState(false)
  const [progress, setProgress] = useState(0)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load initial message
  useEffect(() => {
    apiFetch('/api/setup/status')
      .then((r: Response) => r.json())
      .then((data: any) => {
        if (!data.setupRequired) {
          navigate('/dashboard')
          return
        }
        if (data.initialMessage) {
          setMessages([{ id: 'init', role: 'assistant', content: data.initialMessage }])
        }
      })
      .catch(() => {
        setMessages([{
          id: 'init', role: 'assistant',
          content: "Hey there! Welcome to ClawHQ - let's get your AI agent up and running.\n\nHow would you like to set up?\n\n**1. Connect Existing OpenClaw** - Already running OpenClaw? Link it here.\n\n**2. Cloud Deploy** - We host everything. Pick a model and you're live in 30 seconds.\n\n**3. Download OpenClaw** - Free! Run it on your own machine with your own API keys.\n\nWhich sounds right for you?"
        }])
      })
  }, [])

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    setInput('')
    setShowQuickReplies(false)
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    // Update progress
    setProgress(prev => Math.min(prev + 15, 90))

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await apiFetch('/api/setup/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history })
      })
      const data = await res.json()

      if (data.error) {
        setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: data.error }])
      } else {
        setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: data.reply }])
      }

      if (data.setupComplete) {
        setProgress(100)
        setSetupComplete(true)
        setTimeout(() => navigate('/dashboard'), 3000)
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const skipSetup = async () => {
    try {
      await apiFetch('/api/setup/skip', { method: 'POST' })
      navigate('/agents/new')
    } catch {
      navigate('/agents/new')
    }
  }

  const renderContent = (content: string) => {
    // Simple markdown bold + newlines
    return content.split('\n').map((line, i) => (
      <p key={i} className={line ? 'mb-1' : 'mb-3'}>
        {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
            : <span key={j}>{part}</span>
        )}
      </p>
    ))
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a1a' }}>
      {/* Progress bar */}
      <div className="h-1 bg-[#1a1a2e]">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1a1a2e' }}>
        <div className="flex items-center gap-3">
          <Zap size={22} className="text-[#a855f7]" />
          <span className="text-lg font-bold text-white tracking-wide">CLAWHQ</span>
          <span className="text-sm text-gray-500 ml-2">Setup</span>
        </div>
        <button onClick={skipSetup} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          Skip to manual setup <ArrowRight size={12} className="inline ml-1" />
        </button>
      </div>

      {/* Chat area */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
        {messages.map(msg => (
          <div key={msg.id} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-1"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div
              className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={{
                background: msg.role === 'user' ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#1a1a2e',
                color: msg.role === 'user' ? '#fff' : '#ccc',
                border: msg.role === 'assistant' ? '1px solid #2a2a4a' : 'none',
              }}
            >
              {renderContent(msg.content)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex mb-4 justify-start">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
              <Bot size={14} className="text-white" />
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {setupComplete && (
          <div className="flex justify-center my-6">
            <div className="rounded-2xl px-6 py-4 text-center" style={{ background: 'linear-gradient(135deg, #1a1a2e, #2a1a3e)', border: '1px solid #7c3aed' }}>
              <p className="text-lg font-bold text-white mb-1">Your agent is ready!</p>
              <p className="text-sm text-gray-400">Redirecting to your dashboard...</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick replies */}
      {showQuickReplies && !loading && messages.length <= 1 && (
        <div className="px-4 pb-2 max-w-2xl mx-auto w-full">
          <div className="flex flex-wrap gap-2">
            {quickReplies.map(qr => (
              <button
                key={qr.value}
                onClick={() => sendMessage(qr.value)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
                style={{ background: '#1a1a2e', border: '1px solid #7c3aed', color: '#a855f7' }}
              >
                {qr.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {!setupComplete && (
        <div className="px-4 py-4 max-w-2xl mx-auto w-full">
          <div className="flex gap-3 items-center rounded-xl px-4 py-2" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Type your reply..."
              disabled={loading}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="rounded-lg h-9 w-9 flex items-center justify-center text-white disabled:opacity-30 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
