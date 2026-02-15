import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, Maximize2, Minimize2, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { apiFetch } from '../lib/api'
import ChatPanel from '../components/ChatPanel'
import CommandPanel from '../components/CommandPanel'

interface AgentBasic {
  id: string
  name: string
  model: string
  status: string
}

export default function ChatPage() {
  const { agentId } = useParams()
  const navigate = useNavigate()
  const [agent, setAgent] = useState<AgentBasic | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(() => {
    const saved = localStorage.getItem('clawhq_command_panel_open')
    return saved !== null ? saved === 'true' : true
  })
  const chatPanelRef = useRef<{ insertPrompt: (text: string) => void } | null>(null)

  useEffect(() => {
    localStorage.setItem('clawhq_command_panel_open', String(panelOpen))
  }, [panelOpen])

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch(`/api/agents/${agentId}`)
        setAgent(data.agent)
      } catch {
        // Agent not found
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [agentId])

  const handleSwitchAgent = (newAgentId: string) => {
    if (newAgentId !== agentId) {
      navigate(`/agents/${newAgentId}/chat`)
    }
  }

  const handleInsertPrompt = (text: string) => {
    chatPanelRef.current?.insertPrompt(text)
  }

  const handleRouteAction = (action: string) => {
    // Insert a routing prefix into the chat input
    const prefixes: Record<string, string> = {
      checklist: '/checklist add ',
      cron: '/schedule ',
      reminder: '/remind me ',
      queue: '/queue add ',
    }
    const prefix = prefixes[action] || `/${action} `
    handleInsertPrompt(prefix)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-navy">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-navy gap-4">
        <p className="text-text-secondary">Agent not found</p>
        <button onClick={() => navigate('/agents')} className="text-primary hover:underline text-sm">Back to Agents</button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50 bg-navy' : 'h-full'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <button
          onClick={() => navigate(`/agents/${agentId}`)}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {agent.name}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="p-1.5 text-text-muted hover:text-text transition-colors"
            title={panelOpen ? 'Hide Command Panel' : 'Show Command Panel'}
          >
            {panelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 text-text-muted hover:text-text transition-colors"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main content: Chat + Command Panel */}
      <div className="flex-1 min-h-0 flex">
        {/* Chat fills remaining space */}
        <div className="flex-1 min-w-0">
          <div className="h-full" style={{ display: 'flex', flexDirection: 'column' }}>
            <ChatPanel
              ref={chatPanelRef}
              agentId={agent.id}
              agentName={agent.name}
              agentStatus={agent.status}
              agentModel={agent.model}
            />
          </div>
        </div>

        {/* Command Panel sidebar */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="shrink-0 overflow-hidden hidden md:block"
            >
              <CommandPanel
                currentAgentId={agent.id}
                currentAgentName={agent.name}
                onSwitchAgent={handleSwitchAgent}
                onInsertPrompt={handleInsertPrompt}
                onRouteAction={handleRouteAction}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
