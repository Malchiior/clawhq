import { useState, useEffect } from 'react'
import { Zap, Plus, Trash2, Play, Clock } from 'lucide-react'

interface Automation { id: string; name: string; trigger: string; action: string; enabled: boolean; lastRun: string | null }

const KEY = 'clawhq-automations'
const TRIGGERS = ['On Schedule', 'On Webhook', 'On Event', 'On Email', 'Manual']
const ACTIONS = ['Send Notification', 'Run Agent', 'Update Database', 'Send Email', 'Call API']

function load(): Automation[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(a: Automation[]) { localStorage.setItem(KEY, JSON.stringify(a)) }

export default function AutomationsPage() {
  const [items, setItems] = useState<Automation[]>(load)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState(TRIGGERS[0])
  const [action, setAction] = useState(ACTIONS[0])

  useEffect(() => { save(items) }, [items])

  const add = () => {
    if (!name.trim()) return
    setItems(p => [...p, { id: Date.now().toString(), name: name.trim(), trigger, action, enabled: true, lastRun: null }])
    setName(''); setShowNew(false)
  }

  const toggle = (id: string) => setItems(p => p.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a))
  const remove = (id: string) => setItems(p => p.filter(a => a.id !== id))
  const run = (id: string) => setItems(p => p.map(a => a.id === id ? { ...a, lastRun: new Date().toISOString() } : a))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap size={28} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text)]">Automations</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center gap-2"><Plus size={16} /> New Automation</button>
      </div>

      {showNew && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6 space-y-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Automation name..." className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Trigger</label>
              <select value={trigger} onChange={e => setTrigger(e.target.value)} className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] outline-none">
                {TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Action</label>
              <select value={action} onChange={e => setAction(e.target.value)} className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] outline-none">
                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="bg-[var(--accent)] text-black font-semibold rounded-lg px-4 py-2 text-sm">Create</button>
            <button onClick={() => setShowNew(false)} className="text-[var(--text-muted)] text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
            <Zap size={48} className="mx-auto text-[var(--text-dim)] mb-4" />
            <p className="text-[var(--text-muted)]">No automations yet.</p>
          </div>
        ) : items.map(a => (
          <div key={a.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 group hover:bg-[var(--card-hover)] transition-colors">
            <button onClick={() => toggle(a.id)} className={`w-10 h-6 rounded-full relative transition-colors ${a.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${a.enabled ? 'left-5' : 'left-1'}`} />
            </button>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--text)] text-sm">{a.name}</h3>
              <p className="text-xs text-[var(--text-muted)]">{a.trigger} → {a.action}</p>
            </div>
            {a.lastRun && <span className="text-xs text-[var(--text-dim)] flex items-center gap-1"><Clock size={12} />{new Date(a.lastRun).toLocaleString()}</span>}
            <button onClick={() => run(a.id)} className="text-[var(--accent)] hover:text-[var(--accent)]/80"><Play size={16} /></button>
            <button onClick={() => remove(a.id)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
