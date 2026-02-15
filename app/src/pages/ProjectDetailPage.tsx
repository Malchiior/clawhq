import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2, Check, Edit3, X, Save } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface ProjectItem {
  id: string
  stage: string
  category: string | null
  title: string
  description: string | null
  completed: boolean
  order: number
  blockedBy: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
  template: string
  status: string
  progress: number
  color: string
  techStack: string[]
  startedFrom: string
  items: ProjectItem[]
}

const STAGES = [
  { key: 'infrastructure', emoji: '🔧', label: 'Infrastructure' },
  { key: 'discovery', emoji: '📋', label: 'Discovery' },
  { key: 'design', emoji: '🎨', label: 'Design' },
  { key: 'dev-1', emoji: '⚙️', label: 'Dev-1 (Core)' },
  { key: 'dev-2', emoji: '⚙️', label: 'Dev-2 (Polish)' },
  { key: 'testing', emoji: '🧪', label: 'Testing' },
  { key: 'billing', emoji: '💰', label: 'Billing' },
  { key: 'deploy', emoji: '🚀', label: 'Deploy' },
  { key: 'marketing', emoji: '📣', label: 'Marketing' },
  { key: 'post-launch', emoji: '📊', label: 'Post-Launch' },
]

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [addingItem, setAddingItem] = useState<string | null>(null)
  const [newItemTitle, setNewItemTitle] = useState('')

  useEffect(() => {
    if (!id) return
    apiFetch(`/api/projects/${id}`).then(data => {
      setProject(data)
      setEditName(data.name)
      setEditDesc(data.description || '')
    }).catch(() => navigate('/projects')).finally(() => setLoading(false))
  }, [id])

  const toggleItem = async (item: ProjectItem) => {
    if (!project) return
    try {
      const { progress } = await apiFetch(`/api/projects/${project.id}/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !item.completed }),
      })
      setProject(p => p ? {
        ...p,
        progress,
        items: p.items.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i),
      } : p)
    } catch { /* ignore */ }
  }

  const addItem = async (stage: string) => {
    if (!project || !newItemTitle.trim()) return
    try {
      const { item, progress } = await apiFetch(`/api/projects/${project.id}/items`, {
        method: 'POST',
        body: JSON.stringify({ stage, title: newItemTitle.trim() }),
      })
      setProject(p => p ? { ...p, progress, items: [...p.items, item] } : p)
      setNewItemTitle('')
      setAddingItem(null)
    } catch { /* ignore */ }
  }

  const deleteItem = async (itemId: string) => {
    if (!project) return
    try {
      const { progress } = await apiFetch(`/api/projects/${project.id}/items/${itemId}`, { method: 'DELETE' })
      setProject(p => p ? { ...p, progress, items: p.items.filter(i => i.id !== itemId) } : p)
    } catch { /* ignore */ }
  }

  const saveEdit = async () => {
    if (!project) return
    try {
      const updated = await apiFetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }),
      })
      setProject(p => p ? { ...p, name: updated.name, description: updated.description } : p)
      setEditing(false)
    } catch { /* ignore */ }
  }

  if (loading) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="h-8 w-48 bg-[var(--card)] rounded animate-pulse mb-6" />
      <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-[var(--card)] rounded-xl animate-pulse" />)}</div>
    </div>
  )

  if (!project) return null

  const stagesWithItems = STAGES.filter(s => project.items.some(i => i.stage === s.key))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text)] text-sm mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Projects
      </button>

      <div className="mb-6">
        {editing ? (
          <div className="space-y-3">
            <input value={editName} onChange={e => setEditName(e.target.value)} className="text-2xl font-bold bg-transparent border-b border-[var(--accent)] text-[var(--text)] outline-none w-full" />
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description..." rows={2}
              className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="text-green-400 hover:text-green-300"><Save size={16} /></button>
              <button onClick={() => setEditing(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={16} /></button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                {project.name}
              </h1>
              {project.description && <p className="text-[var(--text-muted)] mt-1">{project.description}</p>}
            </div>
            <button onClick={() => setEditing(true)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><Edit3 size={16} /></button>
          </div>
        )}
      </div>

      {/* Overall progress */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text)]">Overall Progress</span>
          <span className="text-sm font-bold" style={{ color: project.color }}>{project.progress}%</span>
        </div>
        <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${project.progress}%`, backgroundColor: project.color }} />
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-dim)]">
          <span>{project.items.filter(i => i.completed).length} / {project.items.length} items</span>
          <span>•</span>
          <span>Started from {project.startedFrom}</span>
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-3">
        {stagesWithItems.map(stage => {
          const stageItems = project.items.filter(i => i.stage === stage.key)
          const done = stageItems.filter(i => i.completed).length
          const total = stageItems.length
          const isCollapsed = collapsed[stage.key]
          const pct = total === 0 ? 0 : Math.round((done / total) * 100)

          // Group by category
          const categories = new Map<string, ProjectItem[]>()
          stageItems.forEach(item => {
            const cat = item.category || ''
            if (!categories.has(cat)) categories.set(cat, [])
            categories.get(cat)!.push(item)
          })

          return (
            <div key={stage.key} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <button onClick={() => setCollapsed(c => ({ ...c, [stage.key]: !isCollapsed }))}
                className="w-full flex items-center justify-between p-4 hover:bg-[var(--card-hover)] transition-colors">
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronRight size={16} className="text-[var(--text-dim)]" /> : <ChevronDown size={16} className="text-[var(--text-dim)]" />}
                  <span className="text-lg">{stage.emoji}</span>
                  <span className="font-semibold text-[var(--text)]">{stage.label}</span>
                  <span className="text-xs text-[var(--text-dim)]">{done}/{total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10B981' : project.color }} />
                  </div>
                  <span className="text-xs text-[var(--text-dim)] w-8 text-right">{pct}%</span>
                </div>
              </button>

              {!isCollapsed && (
                <div className="border-t border-[var(--border)] px-4 pb-4">
                  {Array.from(categories.entries()).map(([cat, catItems]) => (
                    <div key={cat}>
                      {cat && <h4 className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide mt-3 mb-1 px-1">🔑 {cat}</h4>}
                      {catItems.map(item => {
                        const isCheckpoint = item.title.startsWith('⛔')
                        return (
                          <div key={item.id} className={`flex items-start gap-3 py-2 px-1 group ${isCheckpoint ? 'bg-amber-500/10 rounded-lg mx-[-4px] px-2 my-1 border border-amber-500/20' : ''}`}>
                            <button onClick={() => toggleItem(item)}
                              className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${item.completed ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] hover:border-[var(--accent)]'}`}>
                              {item.completed && <Check size={12} className="text-black" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm ${item.completed ? 'text-[var(--text-dim)] line-through' : 'text-[var(--text)]'} ${isCheckpoint ? 'font-semibold text-amber-400' : ''}`}>
                                {item.blockedBy && <span className="text-red-400 mr-1">🔴</span>}
                                {item.title}
                              </span>
                              {item.blockedBy && <p className="text-xs text-red-400 mt-0.5">Blocked: {item.blockedBy}</p>}
                            </div>
                            <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity mt-0.5">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ))}

                  {/* Add item */}
                  {addingItem === stage.key ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="New item..."
                        autoFocus onKeyDown={e => e.key === 'Enter' && addItem(stage.key)}
                        className="flex-1 bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
                      <button onClick={() => addItem(stage.key)} className="text-[var(--accent)] hover:text-[var(--accent)]/80"><Plus size={16} /></button>
                      <button onClick={() => { setAddingItem(null); setNewItemTitle('') }} className="text-[var(--text-muted)]"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingItem(stage.key)} className="flex items-center gap-1 text-xs text-[var(--text-dim)] hover:text-[var(--accent)] mt-2 transition-colors">
                      <Plus size={12} /> Add item
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
