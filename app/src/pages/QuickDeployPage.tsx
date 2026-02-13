import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Rocket, Clock, CheckCircle2, Loader2, Settings2, ChevronRight } from 'lucide-react'
import { apiFetch } from '../lib/api'

const channelOptions = [
  { type: 'telegram', name: 'Telegram', description: 'Bot for Telegram chats', icon: '📱' },
  { type: 'discord', name: 'Discord', description: 'Bot for Discord servers', icon: '🎮' },
  { type: 'slack', name: 'Slack', description: 'Bot for Slack workspaces', icon: '💼' },
  { type: 'whatsapp', name: 'WhatsApp', description: 'Bot for WhatsApp Business', icon: '💬' },
]

const quickTemplates = [
  { 
    name: 'Customer Support',
    prompt: 'You are a friendly customer support agent. Help users with their questions, provide clear answers, and escalate to humans when needed. Always be polite and helpful.',
    channels: ['telegram']
  },
  {
    name: 'Discord Community',
    prompt: 'You are a helpful community bot for a Discord server. Welcome new members, answer questions about the community, and help moderate discussions.',
    channels: ['discord']
  },
  {
    name: 'Slack Assistant',
    prompt: 'You are an office assistant bot. Help team members with information, schedule meetings, and provide productivity tips. Keep responses professional but friendly.',
    channels: ['slack']
  },
  {
    name: 'Personal Assistant',
    prompt: 'You are a personal AI assistant. Help with tasks, answer questions, provide reminders, and be a helpful companion.',
    channels: ['telegram', 'whatsapp']
  }
]

export default function QuickDeployPage() {
  const [step, setStep] = useState<'template' | 'customize' | 'deploying' | 'success'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<typeof quickTemplates[0] | null>(null)
  const [name, setName] = useState('')
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [deployProgress, setDeployProgress] = useState('')
  const [deployedAgent, setDeployedAgent] = useState<any>(null)
  const [error, setError] = useState('')
  const [startTime, setStartTime] = useState(0)
  const [deployTime, setDeployTime] = useState(0)
  const navigate = useNavigate()

  const selectTemplate = (template: typeof quickTemplates[0]) => {
    setSelectedTemplate(template)
    setName(template.name + ' Bot')
    setSelectedChannels(template.channels)
    setStep('customize')
  }

  const deploy = async () => {
    if (!selectedTemplate || !name || selectedChannels.length === 0) return
    
    setStep('deploying')
    setError('')
    setStartTime(Date.now())
    
    try {
      // Prepare channel configs (simplified for demo)
      const channels = selectedChannels.map(type => ({
        type,
        config: { token: 'demo-token-' + Math.random().toString(36).substr(2, 9) }
      }))

      setDeployProgress('Creating container...')
      await new Promise(r => setTimeout(r, 800)) // Simulate progress
      
      setDeployProgress('Configuring channels...')
      await new Promise(r => setTimeout(r, 500))
      
      setDeployProgress('Starting agent...')
      const response = await apiFetch('/api/agents/deploy', {
        method: 'POST',
        body: JSON.stringify({
          name,
          model: 'claude-sonnet-4-20250514', // Default to recommended model for quick deploy
          systemPrompt: selectedTemplate.prompt,
          channels
        }),
      })

      setDeployTime(Date.now() - startTime)
      setDeployedAgent(response.agent)
      setStep('success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deploy failed')
      setStep('customize')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            <div className="flex items-center gap-1 text-sm text-text-muted">
              <Clock className="w-4 h-4" />
              <span>Deploy in ~30 seconds</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text">Quick Deploy</h1>
          <p className="text-sm text-text-secondary mt-1">Get your AI agent running in under 30 seconds</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full transition-colors ${step === 'template' ? 'bg-primary' : step === 'customize' || step === 'deploying' || step === 'success' ? 'bg-success' : 'bg-border'}`} />
          <div className={`flex-1 h-0.5 transition-colors ${step === 'customize' || step === 'deploying' || step === 'success' ? 'bg-success' : 'bg-border'}`} />
          <div className={`w-3 h-3 rounded-full transition-colors ${step === 'customize' ? 'bg-primary' : step === 'deploying' || step === 'success' ? 'bg-success' : 'bg-border'}`} />
          <div className={`flex-1 h-0.5 transition-colors ${step === 'deploying' || step === 'success' ? 'bg-success' : 'bg-border'}`} />
          <div className={`w-3 h-3 rounded-full transition-colors ${step === 'deploying' ? 'bg-primary animate-pulse' : step === 'success' ? 'bg-success' : 'bg-border'}`} />
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          {step === 'template' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-text mb-1">Choose a template</h2>
                <p className="text-sm text-text-secondary">Start with a pre-configured agent</p>
              </div>
              
              <div className="grid gap-3">
                {quickTemplates.map(template => (
                  <button
                    key={template.name}
                    onClick={() => selectTemplate(template)}
                    className="p-4 text-left border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-text mb-1">{template.name}</h3>
                        <p className="text-xs text-text-secondary mb-2">{template.prompt.substring(0, 80)}...</p>
                        <div className="flex items-center gap-1">
                          {template.channels.map(channel => (
                            <span key={channel} className="text-xs px-2 py-0.5 bg-white/5 rounded text-text-muted">
                              {channel}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-border">
                <button
                  onClick={() => navigate('/agents/new')}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm text-text-secondary hover:text-text transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                  Advanced Setup
                </button>
              </div>
            </div>
          )}

          {step === 'customize' && selectedTemplate && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-text mb-1">Customize your agent</h2>
                <p className="text-sm text-text-secondary">Fine-tune the details</p>
              </div>
              
              {error && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Agent Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-navy/50 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50"
                  placeholder="My AI Assistant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Channels</label>
                <div className="space-y-2">
                  {channelOptions.map(channel => (
                    <label key={channel.type} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(channel.type)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedChannels(prev => [...prev, channel.type])
                          } else {
                            setSelectedChannels(prev => prev.filter(c => c !== channel.type))
                          }
                        }}
                        className="w-4 h-4 text-primary rounded border-border bg-transparent focus:ring-primary/20"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-lg">{channel.icon}</span>
                        <div>
                          <div className="font-medium text-text text-sm">{channel.name}</div>
                          <div className="text-xs text-text-secondary">{channel.description}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <button
                  onClick={() => setStep('template')}
                  className="text-sm text-text-secondary hover:text-text transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={deploy}
                  disabled={!name || selectedChannels.length === 0}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
                >
                  <Rocket className="w-4 h-4" />
                  Deploy Now
                </button>
              </div>
            </div>
          )}

          {step === 'deploying' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text">Deploying Agent</h2>
                <p className="text-sm text-text-secondary mt-1">{deployProgress}</p>
                <div className="text-xs text-text-muted mt-2">
                  {Math.floor((Date.now() - startTime) / 1000)}s elapsed
                </div>
              </div>
            </div>
          )}

          {step === 'success' && deployedAgent && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-success/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text">Agent Deployed!</h2>
                <p className="text-sm text-text-secondary mt-1">
                  {deployedAgent.name} is running and ready to chat
                </p>
                <div className="text-xs text-success font-medium mt-2">
                  ⚡ Deployed in {(deployTime / 1000).toFixed(1)}s
                </div>
              </div>
              
              <div className="bg-navy/50 border border-border rounded-lg p-4 text-left max-w-xs mx-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Status</span>
                  <span className="text-success font-medium">Running</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Channels</span>
                  <span className="text-text font-medium">{selectedChannels.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Model</span>
                  <span className="text-text font-medium">Claude Sonnet</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/agents/${deployedAgent.id}`)}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  View Agent
                </button>
                <button
                  onClick={() => {
                    setStep('template')
                    setSelectedTemplate(null)
                    setName('')
                    setSelectedChannels([])
                    setDeployedAgent(null)
                  }}
                  className="flex-1 bg-card border border-border hover:border-border-light text-text text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  Deploy Another
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}