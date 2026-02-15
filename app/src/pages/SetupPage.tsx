import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Bot, Zap, ArrowRight, RotateCcw, Sparkles } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'clawhq-setup-session'

const quickReplies = [
  { label: 'Connect Existing OpenClaw', value: 'I want to connect my existing OpenClaw', icon: '🔗' },
  { label: 'Cloud Deploy', value: 'I want Cloud Deploy - host everything for me', icon: '☁️' },
  { label: 'Download OpenClaw', value: 'I want to download OpenClaw and run it locally', icon: '💻' },
]

function loadSession(): { messages: Message[]; progress: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return { messages: [], progress: 0 }
}

function saveSession(messages: Message[], progress: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, progress }))
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

export default function SetupPage() {
  const navigate = useNavigate()
  const saved = loadSession()
  const [messages, setMessages] = useState<Message[]>(saved.messages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showQuickReplies, setShowQuickReplies] = useState(saved.messages.length <= 1)
  const [setupComplete, setSetupComplete] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [progress, setProgress] = useState(saved.progress)
  const [handoffPhase, setHandoffPhase] = useState(0) // 0=none, 1=celebrating, 2=transitioning
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load initial message if no session
  useEffect(() => {
    if (messages.length > 0) return // Resume existing session
    apiFetch('/api/setup/status')
      .then((data: any) => {
        if (!data.setupRequired) { navigate('/dashboard'); return }
        if (data.initialMessage) {
          const init = [{ id: 'init', role: 'assistant' as const, content: data.initialMessage }]
          setMessages(init)
          saveSession(init, 0)
        }
      })
      .catch(() => {
        const fallback = [{
          id: 'init', role: 'assistant' as const,
          content: "Hey there! Welcome to ClawHQ - let's get your AI agent up and running.\n\nHow would you like to set up?\n\n**1. Connect Existing OpenClaw** - Already running OpenClaw? Link it here.\n\n**2. Cloud Deploy** - We host everything. Pick a model and you're live in 30 seconds.\n\n**3. Download OpenClaw** - Free! Run it on your own machine with your own API keys.\n\nWhich sounds right for you?"
        }]
        setMessages(fallback)
        saveSession(fallback, 0)
      })
  }, [])

  // Persist session
  useEffect(() => { saveSession(messages, progress) }, [messages, progress])

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages, loading])

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    setInput('')
    setError(null)
    setShowQuickReplies(false)
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setProgress(prev => Math.min(prev + 12, 90))

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const data = await apiFetch('/api/setup/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history })
      })

      if (data.error && data.redirect) {
        // Rate limited — redirect to manual
        navigate(data.redirect)
        return
      }

      if (data.error) {
        setError(data.error)
        setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: data.error }])
      } else {
        setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: data.reply }])
      }

      if (data.setupComplete) {
        setProgress(100)
        setSetupComplete(true)
        setAgentName(data.agentName || 'Your Agent')
        clearSession()
        
        // Handoff animation sequence
        setHandoffPhase(1) // Celebration
        setTimeout(() => setHandoffPhase(2), 2000) // Transition
        setTimeout(() => navigate('/dashboard'), 4000) // Redirect
      }
    } catch (err: any) {
      setError('Connection failed')
      setMessages(prev => [...prev, {
        id: (Date.now()+1).toString(), role: 'assistant',
        content: 'Hmm, I lost connection for a moment. Could you try that again?'
      }])
    } finally {
      setLoading(false)
    }
  }

  const retry = () => {
    if (messages.length < 2) return
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
      // Remove last assistant error message
      setMessages(prev => prev.slice(0, -1))
      sendMessage(lastUserMsg.content)
    }
  }

  const skipSetup = async () => {
    clearSession()
    try { await apiFetch('/api/setup/skip', { method: 'POST' }) } catch {}
    navigate('/agents/new')
  }

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <p key={i} className={line ? 'mb-1' : 'mb-2.5'}>
        {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
            : <span key={j}>{part}</span>
        )}
      </p>
    ))
  }

  // Handoff overlay
  if (handoffPhase > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center animate-fade-in">
          {handoffPhase === 1 && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center animate-pulse"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                <Sparkles size={36} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">You're all set!</h1>
              <p className="text-gray-400 text-lg">{agentName} is ready to go</p>
            </>
          )}
          {handoffPhase === 2 && (
            <>
              <div className="w-16 h-16 mx-auto mb-4">
                <div className="w-full h-full border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-gray-400">Loading your dashboard...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a1a' }}>
      {/* Progress bar */}
      <div className="h-1 bg-[#1a1a2e]">
        <div className="h-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b" style={{ borderColor: '#1a1a2e' }}>
        <div className="flex items-center gap-2 sm:gap-3">
          <Zap size={20} className="text-[#a855f7]" />
          <span className="text-base sm:text-lg font-bold text-white tracking-wide">CLAWHQ</span>
          <span className="text-xs sm:text-sm text-gray-500 ml-1 sm:ml-2">Setup</span>
        </div>
        <button onClick={skipSetup} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          Skip <ArrowRight size={12} className="inline ml-0.5" />
        </button>
      </div>

      {/* Chat area */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 max-w-2xl mx-auto w-full">
        {messages.map(msg => (
          <div key={msg.id} className={`flex mb-3 sm:mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-2 sm:mr-3 mt-1"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                <Bot size={13} className="text-white" />
              </div>
            )}
            <div
              className="max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed"
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
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-2 sm:mr-3"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
              <Bot size={13} className="text-white" />
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

        {/* Retry button on error */}
        {error && !loading && (
          <div className="flex justify-center mb-4">
            <button onClick={retry}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-purple-400 hover:text-purple-300 transition-colors"
              style={{ border: '1px solid #7c3aed33' }}>
              <RotateCcw size={14} /> Try again
            </button>
          </div>
        )}
      </div>

      {/* Quick replies */}
      {showQuickReplies && !loading && messages.length <= 1 && (
        <div className="px-3 sm:px-4 pb-2 max-w-2xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row gap-2">
            {quickReplies.map(qr => (
              <button key={qr.value} onClick={() => sendMessage(qr.value)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                style={{ background: '#1a1a2e', border: '1px solid #7c3aed', color: '#a855f7' }}>
                <span>{qr.icon}</span> {qr.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {!setupComplete && (
        <div className="px-3 sm:px-4 py-3 sm:py-4 max-w-2xl mx-auto w-full">
          <div className="flex gap-2 sm:gap-3 items-center rounded-xl px-3 sm:px-4 py-2"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Type your reply..."
              disabled={loading}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600"
            />
            <button onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="rounded-lg h-9 w-9 flex items-center justify-center text-white disabled:opacity-30 transition-opacity flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
