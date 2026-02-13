import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, Brain, MessageSquare, Sliders, Rocket, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { apiFetch } from '../lib/api'

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

export default function NewAgentPage() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-20250514')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const navigate = useNavigate()

  const steps = ['Name', 'Model', 'Prompt', 'Config', 'Deploy']

  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState('')
  const [maxTokens, setMaxTokens] = useState(4096)

  const deploy = async () => {
    setDeploying(true)
    setError('')
    try {
      // Create agent first
      const agent = await apiFetch('/api/agents', {
        method: 'POST',
        body: JSON.stringify({ 
          name: name || 'Unnamed Agent', 
          model, 
          systemPrompt, 
          temperature, 
          maxTokens 
        }),
      })
      
      // Then start the container
      await apiFetch(`/api/agents/${agent.agent.id}/start`, {
        method: 'POST'
      })
      
      navigate('/agents')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deploy failed')
    } finally {
      setDeploying(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Deploy New Agent</h1>
        <p className="text-sm text-text-secondary mt-1">Configure and launch your AI agent</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Bot className="w-5 h-5 text-primary" /></div>
              <div><h2 className="text-lg font-semibold text-text">Name your agent</h2><p className="text-xs text-text-secondary">Give it a descriptive name</p></div>
            </div>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50" placeholder="e.g. Customer Support Bot" />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Brain className="w-5 h-5 text-primary" /></div>
              <div><h2 className="text-lg font-semibold text-text">Choose AI Model</h2><p className="text-xs text-text-secondary">Select the brain behind your agent</p></div>
            </div>
            <div className="space-y-5">
              {/* Group models by provider */}
              {['Anthropic', 'OpenAI', 'Google', 'DeepSeek', 'xAI'].map(provider => (
                <div key={provider} className="space-y-2">
                  <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide">{provider}</h3>
                  <div className="space-y-2">
                    {models.filter(m => m.provider === provider).map(m => (
                      <button key={m.id} onClick={() => setModel(m.id)} className={`w-full text-left p-3 rounded-lg border transition-all ${model === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-border-light'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium text-text text-sm">{m.name}</span>
                          </div>
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
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-primary" /></div>
              <div><h2 className="text-lg font-semibold text-text">System Prompt</h2><p className="text-xs text-text-secondary">Define your agent's personality and behavior</p></div>
            </div>
            <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={8} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50 resize-none font-mono" placeholder="You are a helpful customer support agent for Acme Inc..." />
            <p className="text-xs text-text-muted">Tip: Be specific about tone, knowledge boundaries, and escalation rules.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Sliders className="w-5 h-5 text-primary" /></div>
              <div><h2 className="text-lg font-semibold text-text">Configuration</h2><p className="text-xs text-text-secondary">Fine-tune your agent's behavior</p></div>
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
                <option value={1024}>1024</option><option value={2048}>2048</option><option value={4096}>4096</option><option value={8192}>8192</option><option value={16384}>16384</option>
              </select>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto"><Rocket className="w-8 h-8 text-primary" /></div>
            <div>
              <h2 className="text-xl font-bold text-text">Ready to Deploy</h2>
              <p className="text-sm text-text-secondary mt-1">Your agent will start in a Docker container</p>
            </div>
            {error && <div className="mb-3 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{error}</div>}
            <div className="bg-navy/50 border border-border rounded-lg p-4 text-left max-w-xs mx-auto space-y-2">
              <div className="flex justify-between text-sm"><span className="text-text-muted">Name</span><span className="text-text font-medium">{name || 'Unnamed'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-muted">Model</span><span className="text-text font-medium">{models.find(m => m.id === model)?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-muted">Temperature</span><span className="text-text font-mono">{temperature}</span></div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-border">
          <button onClick={() => step === 0 ? navigate('/agents') : setStep(s => s - 1)} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors">
            <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(s => s + 1)} className="flex items-center gap-1 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={deploy} disabled={deploying} className="flex items-center gap-1 bg-success hover:bg-success/80 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              {deploying ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</> : <><Rocket className="w-4 h-4" /> Deploy Agent</>}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
