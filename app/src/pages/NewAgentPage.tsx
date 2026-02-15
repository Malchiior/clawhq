import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Brain, MessageSquare, Sliders, Rocket, ChevronRight, ChevronLeft, Loader2, Cloud, Monitor, Globe, Wifi, Check } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { track } from '../lib/analytics'

const models = [
  // Anthropic Claude Models
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet', provider: 'Anthropic', speed: 'Fast', cost: '$$', badge: 'Recommended' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus', provider: 'Anthropic', speed: 'Medium', cost: '$$$$', badge: 'Premium' },
  { id: 'claude-haiku-4-20250514', name: 'Claude Haiku', provider: 'Anthropic', speed: 'Very Fast', cost: '$', badge: 'Budget' },
  // OpenAI GPT Models
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', speed: 'Fast', cost: '$$$', badge: null },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', speed: 'Very Fast', cost: '$', badge: 'Budget' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', speed: 'Medium', cost: '$$$', badge: null },
  // Google Gemini Models
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'Google', speed: 'Very Fast', cost: '$', badge: 'New' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', speed: 'Fast', cost: '$$', badge: null },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', speed: 'Very Fast', cost: '$', badge: 'Budget' },
  // DeepSeek Models
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', speed: 'Fast', cost: '$', badge: 'Budget' },
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'DeepSeek', speed: 'Medium', cost: '$$', badge: 'Reasoning' },
  // xAI Grok Models
  { id: 'grok-2-1212', name: 'Grok 2', provider: 'xAI', speed: 'Fast', cost: '$$', badge: null },
  { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', provider: 'xAI', speed: 'Medium', cost: '$$$', badge: 'Vision' },
]

type DeployMode = 'CLOUD' | 'LOCAL' | 'DASHBOARD'

const deployModes: { id: DeployMode; name: string; icon: React.ReactNode; desc: string; detail: string; badge?: string; badgeColor?: string }[] = [
  {
    id: 'LOCAL',
    name: 'Local Connector',
    icon: <Monitor className="w-6 h-6" />,
    desc: 'Connect your existing OpenClaw instance',
    detail: 'Already running OpenClaw? Connect it to ClawHQ with a single config line. Your agent runs on your machine with your API keys — ClawHQ becomes a beautiful dashboard and chat interface on top. No port forwarding needed.',
    badge: 'Free',
    badgeColor: 'bg-green-500/20 text-green-400',
  },
  {
    id: 'DASHBOARD',
    name: 'Dashboard Agent',
    icon: <Globe className="w-6 h-6" />,
    desc: 'Chat-only agent powered by ClawHQ',
    detail: 'Create an agent that lives entirely in your ClawHQ dashboard. Uses our bundled API — no setup, no server, no API keys needed. Perfect for quick assistants and trying things out.',
    badge: 'Quick Start',
    badgeColor: 'bg-blue-500/20 text-blue-400',
  },
  {
    id: 'CLOUD',
    name: 'Cloud Container',
    icon: <Cloud className="w-6 h-6" />,
    desc: 'Fully managed Docker deployment',
    detail: 'We deploy and manage your agent in an isolated Docker container. Always-on, auto-scaling, with full channel support. Best for production workloads and teams.',
    badge: 'Pro',
    badgeColor: 'bg-purple-500/20 text-purple-400',
  },
]

export default function NewAgentPage() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [deployMode, setDeployMode] = useState<DeployMode>('DASHBOARD')
  const [model, setModel] = useState('claude-sonnet-4-20250514')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Steps vary by deploy mode
  const getSteps = () => {
    if (deployMode === 'LOCAL') return ['Name', 'Deploy Mode', 'Model', 'Prompt', 'Review']
    if (deployMode === 'DASHBOARD') return ['Name', 'Deploy Mode', 'Model', 'Prompt', 'Config', 'Review']
    return ['Name', 'Deploy Mode', 'Model', 'Prompt', 'Config', 'Review']
  }
  const steps = getSteps()

  const deploy = async () => {
    setDeploying(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        name: name || 'Unnamed Agent',
        model,
        systemPrompt,
        temperature,
        maxTokens,
        deployMode,
      }

      // Dashboard mode uses bundled API
      if (deployMode === 'DASHBOARD') {
        body.usesBundledApi = true
      }

      const result = await apiFetch('/api/agents', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      // Only deploy container for CLOUD mode
      if (deployMode === 'CLOUD') {
        await apiFetch(`/api/agents/${result.agent.id}/deploy`, { method: 'POST' })
      }

      track('agent_deployed', { model, name, deployMode })

      // For LOCAL mode, go to agent detail (connect tab) so user can set up relay
      if (deployMode === 'LOCAL') {
        navigate(`/agents/${result.agent.id}?tab=connect`)
      } else {
        navigate(`/agents/${result.agent.id}`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deploy failed')
    } finally {
      setDeploying(false)
    }
  }

  const renderStepContent = () => {
    const currentStepName = steps[step]

    switch (currentStepName) {
      case 'Name':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">Name your agent</h2>
                <p className="text-xs text-text-secondary">Give it a descriptive name</p>
              </div>
            </div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-navy/50 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50"
              placeholder="e.g. Customer Support Bot"
              autoFocus
            />
          </div>
        )

      case 'Deploy Mode':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">Choose how to run your agent</h2>
                <p className="text-xs text-text-secondary">Pick the deployment that fits your setup</p>
              </div>
            </div>
            <div className="space-y-3">
              {deployModes.map(mode => {
                const selected = deployMode === mode.id
                return (
                  <button
                    key={mode.id}
                    onClick={() => setDeployMode(mode.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                        : 'border-border hover:border-border-light bg-navy/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${selected ? 'bg-primary/20 text-primary' : 'bg-white/5 text-text-muted'} transition-colors`}>
                        {mode.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-text">{mode.name}</span>
                          {mode.badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mode.badgeColor}`}>
                              {mode.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary">{mode.desc}</p>
                        <AnimatePresence>
                          {selected && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="text-xs text-text-muted mt-2 leading-relaxed"
                            >
                              {mode.detail}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${
                        selected ? 'border-primary bg-primary' : 'border-border'
                      }`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )

      case 'Model':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">
                  {deployMode === 'LOCAL' ? 'Default Model' : 'Choose AI Model'}
                </h2>
                <p className="text-xs text-text-secondary">
                  {deployMode === 'LOCAL'
                    ? 'Select the model shown in the dashboard (your local config determines the actual model)'
                    : 'Select the brain behind your agent'}
                </p>
              </div>
            </div>
            <div className="space-y-5">
              {['Anthropic', 'OpenAI', 'Google', 'DeepSeek', 'xAI'].map(provider => (
                <div key={provider} className="space-y-2">
                  <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide">{provider}</h3>
                  <div className="space-y-2">
                    {models.filter(m => m.provider === provider).map(m => (
                      <button
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${model === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-border-light'}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-text text-sm">{m.name}</span>
                          <div className="flex gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-text-muted">{m.speed}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-text-muted">{m.cost}</span>
                            {m.badge && <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary">{m.badge}</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'Prompt':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">System Prompt</h2>
                <p className="text-xs text-text-secondary">
                  {deployMode === 'LOCAL'
                    ? 'Optional — your local OpenClaw config takes priority'
                    : "Define your agent's personality and behavior"}
                </p>
              </div>
            </div>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={8}
              className="w-full bg-navy/50 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50 resize-none font-mono"
              placeholder="You are a helpful customer support agent for Acme Inc..."
            />
            <p className="text-xs text-text-muted">Tip: Be specific about tone, knowledge boundaries, and escalation rules.</p>
          </div>
        )

      case 'Config':
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sliders className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">Configuration</h2>
                <p className="text-xs text-text-secondary">Fine-tune your agent's behavior</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-text-secondary">Temperature</label>
                <span className="text-sm text-text font-mono">{temperature}</span>
              </div>
              <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-text-muted mt-1"><span>Precise</span><span>Creative</span></div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Max Tokens</label>
              <select value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50">
                <option value={1024}>1024</option>
                <option value={2048}>2048</option>
                <option value={4096}>4096</option>
                <option value={8192}>8192</option>
                <option value={16384}>16384</option>
              </select>
            </div>
          </div>
        )

      case 'Review':
        return (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
              {deployMode === 'LOCAL' ? <Wifi className="w-8 h-8 text-primary" /> :
               deployMode === 'DASHBOARD' ? <Globe className="w-8 h-8 text-primary" /> :
               <Rocket className="w-8 h-8 text-primary" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">
                {deployMode === 'LOCAL' ? 'Ready to Connect' :
                 deployMode === 'DASHBOARD' ? 'Ready to Chat' :
                 'Ready to Deploy'}
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                {deployMode === 'LOCAL' ? "We'll create your agent and show you how to connect your local OpenClaw" :
                 deployMode === 'DASHBOARD' ? 'Your agent will be ready to chat immediately' :
                 'Your agent will start in a managed Docker container'}
              </p>
            </div>
            {error && <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{error}</div>}
            <div className="bg-navy/50 border border-border rounded-lg p-4 text-left max-w-sm mx-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Name</span>
                <span className="text-text font-medium">{name || 'Unnamed'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Deploy Mode</span>
                <span className="text-text font-medium flex items-center gap-1.5">
                  {deployModes.find(m => m.id === deployMode)?.name}
                  {deployMode === 'LOCAL' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-bold">FREE</span>}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Model</span>
                <span className="text-text font-medium">{models.find(m => m.id === model)?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Temperature</span>
                <span className="text-text font-mono">{temperature}</span>
              </div>
            </div>

            {deployMode === 'LOCAL' && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 text-left max-w-sm mx-auto">
                <p className="text-xs text-blue-300 leading-relaxed">
                  <strong>Next step:</strong> After creating, you'll get a relay token and config snippet to paste into your OpenClaw config. Your agent will appear online instantly — no port forwarding needed.
                </p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const deployLabel = deployMode === 'LOCAL' ? 'Create & Connect' :
                      deployMode === 'DASHBOARD' ? 'Create Agent' :
                      'Deploy Agent'

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Create New Agent</h1>
        <p className="text-sm text-text-secondary mt-1">Configure and launch your AI agent</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={steps[step]}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-6 pt-4 border-t border-border">
          <button
            onClick={() => step === 0 ? navigate('/agents') : setStep(s => s - 1)}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !name.trim()}
              className="flex items-center gap-1 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={deploy}
              disabled={deploying}
              className="flex items-center gap-1 bg-success hover:bg-success/80 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {deploying ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Rocket className="w-4 h-4" /> {deployLabel}</>}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
