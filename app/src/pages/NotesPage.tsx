import { useState, useEffect } from 'react'
import { StickyNote, Plus, Trash2, Search } from 'lucide-react'

interface Note { id: string; title: string; content: string; updatedAt: string; color: string }

const KEY = 'clawhq-notes'
const COLORS = ['var(--card)', '#1e293b', '#172554', '#14532d', '#4c1d95', '#7f1d1d']

function load(): Note[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(n: Note[]) { localStorage.setItem(KEY, JSON.stringify(n)) }

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(load)
  const [active, setActive] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { save(notes) }, [notes])

  const add = () => {
    const n: Note = { id: Date.now().toString(), title: 'Untitled Note', content: '', updatedAt: new Date().toISOString(), color: COLORS[0] }
    setNotes(p => [n, ...p])
    setActive(n.id)
  }

  const update = (id: string, fields: Partial<Note>) => {
    setNotes(p => p.map(n => n.id === id ? { ...n, ...fields, updatedAt: new Date().toISOString() } : n))
  }

  const remove = (id: string) => {
    setNotes(p => p.filter(n => n.id !== id))
    if (active === id) setActive(null)
  }

  const filtered = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
  const current = notes.find(n => n.id === active)

  return (
    <div className="p-6 h-[calc(100vh-2rem)]">
      <div className="flex items-center gap-3 mb-6">
        <StickyNote size={28} className="text-[var(--accent)]" />
        <h1 className="text-2xl font-bold text-[var(--text)]">Notes</h1>
      </div>
      <div className="flex gap-4 h-[calc(100%-4rem)]">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="p-3 border-b border-[var(--border)] space-y-2">
            <button onClick={add} className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-2">
              <Plus size={16} /> New Note
            </button>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.map(n => (
              <div
                key={n.id}
                onClick={() => setActive(n.id)}
                className={`p-3 rounded-lg cursor-pointer group transition-colors ${active === n.id ? 'bg-[var(--accent-dim)] border-l-2 border-[var(--accent)]' : 'hover:bg-[var(--card-hover)]'}`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-medium text-[var(--text)] truncate">{n.title}</h3>
                  <button onClick={e => { e.stopPropagation(); remove(n.id) }} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={12} /></button>
                </div>
                <p className="text-xs text-[var(--text-dim)] mt-1 truncate">{n.content || 'Empty note'}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Editor */}
        <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col">
          {current ? (
            <>
              <input
                value={current.title}
                onChange={e => update(current.id, { title: e.target.value })}
                className="px-6 py-4 text-xl font-bold text-[var(--text)] bg-transparent border-b border-[var(--border)] outline-none"
              />
              <textarea
                value={current.content}
                onChange={e => update(current.id, { content: e.target.value })}
                placeholder="Start writing..."
                className="flex-1 px-6 py-4 text-[var(--text)] bg-transparent outline-none resize-none text-sm leading-relaxed placeholder-[var(--text-dim)]"
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-dim)]">
              Select a note or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
