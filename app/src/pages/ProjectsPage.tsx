import { useState, useEffect } from 'react'
import { FolderKanban, Plus, Trash2 } from 'lucide-react'

interface Project { id: string; name: string; desc: string; status: string; color: string; updatedAt: string }

const KEY = 'clawhq-projects'
const COLORS = ['#FFC904', '#3B82F6', '#10B981', '#F43F5E', '#8B5CF6', '#F97316']
const STATUSES = ['Active', 'On Hold', 'Completed']

function load(): Project[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(p: Project[]) { localStorage.setItem(KEY, JSON.stringify(p)) }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(load)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState(COLORS[0])
  useEffect(() => { save(projects) }, [projects])

  const add = () => {
    if (!name.trim()) return
    setProjects(p => [...p, { id: Date.now().toString(), name: name.trim(), desc: desc.trim(), status: 'Active', color, updatedAt: new Date().toISOString() }])
    setName(''); setDesc(''); setShowNew(false)
  }

  const remove = (id: string) => setProjects(p => p.filter(x => x.id !== id))
  const cycleStatus = (id: string) => setProjects(p => p.map(x => x.id === id ? { ...x, status: STATUSES[(STATUSES.indexOf(x.status) + 1) % STATUSES.length], updatedAt: new Date().toISOString() } : x))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderKanban size={28} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text)]">Projects</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center gap-2">
          <Plus size={16} /> New Project
        </button>
      </div>

      {showNew && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6 space-y-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name..." className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description..." rows={2} className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)] resize-none" />
          <div className="flex items-center gap-2">
            {COLORS.map(c => <button key={c} onClick={() => setColor(c)} className="w-6 h-6 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'transparent' }} />)}
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="bg-[var(--accent)] text-black font-semibold rounded-lg px-4 py-2 text-sm">Create</button>
            <button onClick={() => setShowNew(false)} className="text-[var(--text-muted)] text-sm">Cancel</button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <FolderKanban size={48} className="mx-auto text-[var(--text-dim)] mb-4" />
          <p className="text-[var(--text-muted)]">No projects yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 hover:bg-[var(--card-hover)] transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: p.color }} />
                <button onClick={() => remove(p.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
              </div>
              <h3 className="font-semibold text-[var(--text)] mb-1">{p.name}</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">{p.desc || 'No description'}</p>
              <button onClick={() => cycleStatus(p.id)} className={`text-xs px-2 py-1 rounded-full ${p.status === 'Active' ? 'bg-green-500/20 text-green-400' : p.status === 'Completed' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {p.status}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
