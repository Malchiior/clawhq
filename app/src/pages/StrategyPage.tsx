import { useState, useEffect } from 'react'
import { Target, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'

interface Goal { id: string; title: string; category: string; milestones: { id: string; text: string; done: boolean }[]; progress: number }

const KEY = 'clawhq-strategy'
const CATEGORIES = ['Growth', 'Product', 'Marketing', 'Operations', 'Finance']

function load(): Goal[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(g: Goal[]) { localStorage.setItem(KEY, JSON.stringify(g)) }

export default function StrategyPage() {
  const [goals, setGoals] = useState<Goal[]>(load)
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [milestoneText, setMilestoneText] = useState<Record<string, string>>({})

  useEffect(() => { save(goals) }, [goals])

  const add = () => {
    if (!title.trim()) return
    setGoals(p => [...p, { id: Date.now().toString(), title: title.trim(), category, milestones: [], progress: 0 }])
    setTitle(''); setShowNew(false)
  }

  const addMilestone = (goalId: string) => {
    const text = milestoneText[goalId]?.trim()
    if (!text) return
    setGoals(p => p.map(g => {
      if (g.id !== goalId) return g
      const ms = [...g.milestones, { id: Date.now().toString(), text, done: false }]
      return { ...g, milestones: ms, progress: Math.round(ms.filter(m => m.done).length / ms.length * 100) }
    }))
    setMilestoneText(p => ({ ...p, [goalId]: '' }))
  }

  const toggleMilestone = (goalId: string, msId: string) => {
    setGoals(p => p.map(g => {
      if (g.id !== goalId) return g
      const ms = g.milestones.map(m => m.id === msId ? { ...m, done: !m.done } : m)
      return { ...g, milestones: ms, progress: ms.length ? Math.round(ms.filter(m => m.done).length / ms.length * 100) : 0 }
    }))
  }

  const remove = (id: string) => setGoals(p => p.filter(g => g.id !== id))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target size={28} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text)]">Strategy</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center gap-2"><Plus size={16} /> New Goal</button>
      </div>

      {showNew && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6 space-y-4">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal title..." className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] outline-none">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={add} className="bg-[var(--accent)] text-black font-semibold rounded-lg px-4 py-2 text-sm">Create</button>
            <button onClick={() => setShowNew(false)} className="text-[var(--text-muted)] text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
            <Target size={48} className="mx-auto text-[var(--text-dim)] mb-4" />
            <p className="text-[var(--text-muted)]">No strategic goals yet.</p>
          </div>
        ) : goals.map(g => (
          <div key={g.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-[var(--text)]">{g.title}</h3>
                <span className="text-xs text-[var(--accent)]">{g.category}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-[var(--accent)]">{g.progress}%</span>
                <button onClick={() => remove(g.id)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="w-full bg-[var(--border)] rounded-full h-2 mb-4">
              <div className="bg-[var(--accent)] h-2 rounded-full transition-all" style={{ width: `${g.progress}%` }} />
            </div>
            <div className="space-y-2 mb-3">
              {g.milestones.map(m => (
                <button key={m.id} onClick={() => toggleMilestone(g.id, m.id)} className="flex items-center gap-2 w-full text-left">
                  {m.done ? <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" /> : <Circle size={16} className="text-[var(--text-dim)] flex-shrink-0" />}
                  <span className={`text-sm ${m.done ? 'line-through text-[var(--text-dim)]' : 'text-[var(--text)]'}`}>{m.text}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={milestoneText[g.id] || ''}
                onChange={e => setMilestoneText(p => ({ ...p, [g.id]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addMilestone(g.id)}
                placeholder="Add milestone..."
                className="flex-1 bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]"
              />
              <button onClick={() => addMilestone(g.id)} className="text-[var(--accent)] text-sm"><Plus size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
