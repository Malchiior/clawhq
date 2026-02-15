import { useState, useEffect } from 'react'
import { Lightbulb, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'

interface Idea { id: string; title: string; desc: string; votes: number; priority: 'Low' | 'Medium' | 'High'; status: 'New' | 'Considering' | 'Planned' | 'Done' }

const KEY = 'clawhq-ideas'
const PRIORITIES: Idea['priority'][] = ['Low', 'Medium', 'High']
const STATUSES: Idea['status'][] = ['New', 'Considering', 'Planned', 'Done']

function load(): Idea[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(i: Idea[]) { localStorage.setItem(KEY, JSON.stringify(i)) }

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>(load)
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [priority, setPriority] = useState<Idea['priority']>('Medium')
  const [sortBy, setSortBy] = useState<'votes' | 'priority'>('votes')

  useEffect(() => { save(ideas) }, [ideas])

  const add = () => {
    if (!title.trim()) return
    setIdeas(p => [...p, { id: Date.now().toString(), title: title.trim(), desc: desc.trim(), votes: 0, priority, status: 'New' }])
    setTitle(''); setDesc(''); setShowNew(false)
  }

  const vote = (id: string, delta: number) => setIdeas(p => p.map(i => i.id === id ? { ...i, votes: i.votes + delta } : i))
  const cycleStatus = (id: string) => setIdeas(p => p.map(i => i.id === id ? { ...i, status: STATUSES[(STATUSES.indexOf(i.status) + 1) % STATUSES.length] } : i))
  const remove = (id: string) => setIdeas(p => p.filter(i => i.id !== id))

  const prioVal = (p: string) => p === 'High' ? 3 : p === 'Medium' ? 2 : 1
  const sorted = [...ideas].sort((a, b) => sortBy === 'votes' ? b.votes - a.votes : prioVal(b.priority) - prioVal(a.priority))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Lightbulb size={28} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text)]">Ideas</h1>
        </div>
        <div className="flex gap-2">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none">
            <option value="votes">Sort by Votes</option>
            <option value="priority">Sort by Priority</option>
          </select>
          <button onClick={() => setShowNew(true)} className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center gap-2"><Plus size={16} /> New Idea</button>
        </div>
      </div>

      {showNew && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6 space-y-4">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Idea title..." className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description..." rows={2} className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)] resize-none" />
          <div className="flex gap-2">
            {PRIORITIES.map(p => <button key={p} onClick={() => setPriority(p)} className={`px-3 py-1 rounded-lg text-sm ${priority === p ? 'bg-[var(--accent)] text-black font-semibold' : 'bg-[var(--card-hover)] text-[var(--text-muted)]'}`}>{p}</button>)}
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="bg-[var(--accent)] text-black font-semibold rounded-lg px-4 py-2 text-sm">Add Idea</button>
            <button onClick={() => setShowNew(false)} className="text-[var(--text-muted)] text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
            <Lightbulb size={48} className="mx-auto text-[var(--text-dim)] mb-4" />
            <p className="text-[var(--text-muted)]">No ideas yet. Add your first one!</p>
          </div>
        ) : sorted.map(idea => (
          <div key={idea.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 group hover:bg-[var(--card-hover)] transition-colors">
            <div className="flex flex-col items-center gap-1">
              <button onClick={() => vote(idea.id, 1)} className="text-[var(--text-muted)] hover:text-[var(--accent)]"><ArrowUp size={16} /></button>
              <span className="text-sm font-bold text-[var(--accent)]">{idea.votes}</span>
              <button onClick={() => vote(idea.id, -1)} className="text-[var(--text-muted)] hover:text-red-400"><ArrowDown size={16} /></button>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--text)] text-sm">{idea.title}</h3>
              {idea.desc && <p className="text-xs text-[var(--text-muted)] mt-1">{idea.desc}</p>}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${idea.priority === 'High' ? 'bg-red-500/20 text-red-400' : idea.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{idea.priority}</span>
            <button onClick={() => cycleStatus(idea.id)} className={`text-xs px-2 py-1 rounded-full ${idea.status === 'Done' ? 'bg-green-500/20 text-green-400' : idea.status === 'Planned' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{idea.status}</button>
            <button onClick={() => remove(idea.id)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
