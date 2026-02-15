import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, Plus, Trash2, X, Rocket, ShoppingCart, Smartphone, Globe, Server, FileText } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface Project {
  id: string
  name: string
  description: string | null
  template: string
  status: string
  progress: number
  color: string
  techStack: string[]
  createdAt: string
  updatedAt: string
}

interface TemplateInfo {
  id: string
  name: string
  icon: string
  description: string
  itemCount: number
}

const TEMPLATE_ICONS: Record<string, typeof Rocket> = {
  'saas-launch': Rocket,
  'ecommerce': ShoppingCart,
  'mobile-app': Smartphone,
  'landing-page': Globe,
  'api-backend': Server,
  'blank': FileText,
}

const STATUS_COLORS: Record<string, string> = {
  discovery: 'bg-blue-500/20 text-blue-400',
  design: 'bg-pink-500/20 text-pink-400',
  'dev-1': 'bg-yellow-500/20 text-yellow-400',
  'dev-2': 'bg-orange-500/20 text-orange-400',
  testing: 'bg-cyan-500/20 text-cyan-400',
  billing: 'bg-green-500/20 text-green-400',
  deploy: 'bg-purple-500/20 text-purple-400',
  marketing: 'bg-red-500/20 text-red-400',
  'post-launch': 'bg-emerald-500/20 text-emerald-400',
  complete: 'bg-emerald-500/20 text-emerald-400',
}

const COLORS = ['#7c3aed', '#3B82F6', '#10B981', '#F43F5E', '#F97316', '#FFC904', '#8B5CF6', '#06B6D4']

type Step = 'templates' | 'details'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState<Step>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [startedFrom, setStartedFrom] = useState('scratch')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadProjects()
    apiFetch('/api/projects/templates').then(setTemplates).catch(() => {})
  }, [])

  const loadProjects = async () => {
    try {
      const data = await apiFetch('/api/projects')
      setProjects(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const openModal = () => {
    setShowModal(true)
    setStep('templates')
    setSelectedTemplate('')
    setStartedFrom('scratch')
    setName('')
    setDescription('')
    setColor(COLORS[0])
  }

  const pickTemplate = (id: string) => {
    setSelectedTemplate(id)
    setStep('details')
  }

  const createProject = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const project = await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, template: selectedTemplate, color, startedFrom }),
      })
      setProjects(p => [project, ...p])
      setShowModal(false)
      navigate(`/projects/${project.id}`)
    } catch { /* ignore */ } finally { setCreating(false) }
  }

  const deleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this project and all its items?')) return
    try {
      await apiFetch(`/api/projects/${id}`, { method: 'DELETE' })
      setProjects(p => p.filter(x => x.id !== id))
    } catch { /* ignore */ }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderKanban size={28} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text)]">Projects</h1>
        </div>
        <button onClick={openModal} className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center gap-2">
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 h-40 animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <FolderKanban size={48} className="mx-auto text-[var(--text-dim)] mb-4" />
          <p className="text-[var(--text-muted)] mb-4">No projects yet. Pick a template to get started.</p>
          <button onClick={openModal} className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm">
            <Plus size={16} className="inline mr-1" /> New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const Icon = TEMPLATE_ICONS[p.template] || FileText
            return (
              <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 hover:bg-[var(--card-hover)] transition-colors cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
                      <Icon size={16} style={{ color: p.color }} />
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-500/20 text-gray-400'}`}>
                      {p.status}
                    </span>
                  </div>
                  <button onClick={e => deleteProject(e, p.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 className="font-semibold text-[var(--text)] mb-1">{p.name}</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">{p.description || 'No description'}</p>
                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, backgroundColor: p.color }} />
                  </div>
                  <span className="text-xs text-[var(--text-muted)] font-medium">{p.progress}%</span>
                </div>
                {p.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {p.techStack.slice(0, 3).map(t => (
                      <span key={t} className="text-[10px] bg-[var(--border)] text-[var(--text-muted)] rounded px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--text)]">{step === 'templates' ? 'Choose a Template' : 'Project Details'}</h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
            </div>

            {step === 'templates' ? (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {templates.map(t => (
                    <button key={t.id} onClick={() => pickTemplate(t.id)} className="bg-[var(--card-hover)] border border-[var(--border)] rounded-xl p-4 text-left hover:border-[var(--accent)] transition-colors">
                      <div className="text-2xl mb-2">{t.icon}</div>
                      <h3 className="font-semibold text-[var(--text)] text-sm mb-1">{t.name}</h3>
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2">{t.description}</p>
                      <p className="text-xs text-[var(--text-dim)] mt-2">{t.itemCount} items</p>
                    </button>
                  ))}
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Starting from */}
                <div>
                  <label className="text-sm text-[var(--text-muted)] mb-2 block">Starting from...</label>
                  <div className="flex gap-2">
                    {['scratch', 'prototype'].map(opt => (
                      <button key={opt} onClick={() => setStartedFrom(opt)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${startedFrom === opt ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-dim)]'}`}>
                        {opt === 'scratch' ? '🆕 Scratch' : '🔧 Existing Prototype'}
                      </button>
                    ))}
                  </div>
                </div>

                <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name..." autoFocus
                  className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />

                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)..." rows={2}
                  className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)] resize-none" />

                <div>
                  <label className="text-sm text-[var(--text-muted)] mb-2 block">Color</label>
                  <div className="flex items-center gap-2">
                    {COLORS.map(c => <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'transparent' }} />)}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setStep('templates')} className="text-[var(--text-muted)] text-sm px-4 py-2">← Back</button>
                  <button onClick={createProject} disabled={!name.trim() || creating}
                    className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-6 py-2 text-sm disabled:opacity-50">
                    {creating ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
