import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Palette, Brain, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'

const models = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet', desc: 'Fast & capable Ã¢â‚¬â€ best for most use cases', badge: 'Recommended' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus', desc: 'Most powerful Ã¢â‚¬â€ complex reasoning & analysis', badge: 'Premium' },
  { id: 'gpt-4o', name: 'GPT-4o', desc: 'OpenAI flagship Ã¢â‚¬â€ multimodal capabilities', badge: null },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Budget-friendly Ã¢â‚¬â€ great for simple tasks', badge: 'Budget' },
]

const brandColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16']

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [businessName, setBusinessName] = useState('')
  const [brandColor, setBrandColor] = useState('#3b82f6')
  const [model, setModel] = useState('claude-sonnet-4-20250514')
  const navigate = useNavigate()

  const steps = [
    { icon: Building2, title: 'Your Business', subtitle: 'Tell us about your brand' },
    { icon: Palette, title: 'Brand Identity', subtitle: 'Choose your brand color' },
    { icon: Brain, title: 'AI Model', subtitle: 'Select your default model' },
  ]

  const finish = () => {
    // Would POST to /api/users/onboard
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= step ? 'bg-primary text-white' : 'bg-card border border-border text-text-muted'}`}>
                {i + 1}
              </div>
              {i < steps.length - 1 && <div className={`w-12 h-0.5 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center gap-3 mb-6">
                {(() => { const Icon = steps[step].icon; return <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Icon className="w-5 h-5 text-primary" /></div> })()}
                <div>
                  <h2 className="text-xl font-bold text-text">{steps[step].title}</h2>
                  <p className="text-sm text-text-secondary">{steps[step].subtitle}</p>
                </div>
              </div>

              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Business / Project Name</label>
                    <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50" placeholder="Acme AI Solutions" />
                  </div>
                  <p className="text-xs text-text-muted">This will appear as your agent's brand name to end users.</p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {brandColors.map(c => (
                      <button key={c} onClick={() => setBrandColor(c)} className={`h-12 rounded-lg transition-all ${brandColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-card scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Custom color</label>
                    <div className="flex gap-2">
                      <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
                      <input type="text" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="flex-1 bg-navy/50 border border-border rounded-lg px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary/50" />
                    </div>
                  </div>
                  <div className="bg-navy/50 border border-border rounded-lg p-4">
                    <p className="text-xs text-text-muted mb-2">Preview</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: brandColor + '33' }}>
                        <Sparkles className="w-4 h-4" style={{ color: brandColor }} />
                      </div>
                      <span className="font-semibold text-text">{businessName || 'Your Brand'}</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  {models.map(m => (
                    <button key={m.id} onClick={() => setModel(m.id)} className={`w-full text-left p-4 rounded-lg border transition-all ${model === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-border-light bg-navy/30'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-text text-sm">{m.name}</span>
                        {m.badge && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.badge === 'Recommended' ? 'bg-primary/20 text-primary' : m.badge === 'Premium' ? 'bg-accent/20 text-accent' : 'bg-success/20 text-success'}`}>{m.badge}</span>}
                      </div>
                      <p className="text-xs text-text-muted mt-1">{m.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between mt-8">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {step < 2 ? (
              <button onClick={() => setStep(s => s + 1)} className="flex items-center gap-1 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={finish} className="flex items-center gap-1 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                <Sparkles className="w-4 h-4" /> Launch Dashboard
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
