import { useState, useEffect } from 'react'
import { Clock, Plus, Trash2 } from 'lucide-react'

interface Event { id: string; title: string; desc: string; date: string; type: 'milestone' | 'update' | 'launch' | 'decision' | 'note' }

const KEY = 'clawhq-timeline'
const TYPES: { value: Event['type']; label: string; color: string }[] = [
  { value: 'milestone', label: 'Milestone', color: '#FFC904' },
  { value: 'launch', label: 'Launch', color: '#10B981' },
  { value: 'update', label: 'Update', color: '#3B82F6' },
  { value: 'decision', label: 'Decision', color: '#8B5CF6' },
  { value: 'note', label: 'Note', color: '#6B7280' },
]

function load(): Event[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(e: Event[]) { localStorage.setItem(KEY, JSON.stringify(e)) }

export default function TimelinePage() {
  const [events, setEvents] = useState<Event[]>(load)
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [type, setType] = useState<Event['type']>('milestone')

  useEffect(() => { save(events) }, [events])

  const add = () => {
    if (!title.trim()) return
    setEvents(p => [...p, { id: Date.now().toString(), title: title.trim(), desc: desc.trim(), date, type }])
    setTitle(''); setDesc(''); setShowNew(false)
  }

  const remove = (id: string) => setEvents(p => p.filter(e => e.id !== id))
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date))
  const getColor = (t: string) => TYPES.find(x => x.value === t)?.color || '#6B7280'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock size={28} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text)]">Timeline</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center gap-2"><Plus size={16} /> Add Event</button>
      </div>

      {showNew && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6 space-y-4">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title..." className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description..." rows={2} className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)] resize-none" />
          <div className="flex gap-4">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] outline-none" />
            <div className="flex gap-2">
              {TYPES.map(t => (
                <button key={t.value} onClick={() => setType(t.value)} className={`px-3 py-1 rounded-lg text-xs ${type === t.value ? 'font-semibold' : 'opacity-50'}`} style={{ backgroundColor: t.color + '30', color: t.color }}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="bg-[var(--accent)] text-black font-semibold rounded-lg px-4 py-2 text-sm">Add</button>
            <button onClick={() => setShowNew(false)} className="text-[var(--text-muted)] text-sm">Cancel</button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Clock size={48} className="mx-auto text-[var(--text-dim)] mb-4" />
          <p className="text-[var(--text-muted)]">No events yet.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-[var(--border)]" />
          <div className="space-y-6">
            {sorted.map(ev => (
              <div key={ev.id} className="flex gap-4 group">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10" style={{ backgroundColor: getColor(ev.type) + '30' }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(ev.type) }} />
                </div>
                <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:bg-[var(--card-hover)] transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--text)] text-sm">{ev.title}</h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{ev.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: getColor(ev.type) + '30', color: getColor(ev.type) }}>{TYPES.find(t => t.value === ev.type)?.label}</span>
                      <button onClick={() => remove(ev.id)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {ev.desc && <p className="text-sm text-[var(--text-muted)] mt-2">{ev.desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
