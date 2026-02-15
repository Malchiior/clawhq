import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react'

interface Secret { id: string; name: string; value: string; category: string; notes: string; createdAt: string }

const KEY = 'clawhq-vault'
const CATS = ['API Keys', 'Passwords', 'Tokens', 'Credentials', 'Other']

function load(): Secret[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(s: Secret[]) { localStorage.setItem(KEY, JSON.stringify(s)) }

export default function VaultPage() {
  const [secrets, setSecrets] = useState<Secret[]>(load)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [category, setCategory] = useState(CATS[0])
  const [notes, setNotes] = useState('')
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { save(secrets) }, [secrets])

  const add = () => {
    if (!name.trim() || !value.trim()) return
    setSecrets(p => [...p, { id: Date.now().toString(), name: name.trim(), value: value.trim(), category, notes: notes.trim(), createdAt: new Date().toISOString() }])
    setName(''); setValue(''); setNotes(''); setShowNew(false)
  }

  const remove = (id: string) => setSecrets(p => p.filter(s => s.id !== id))
  const copy = (id: string, val: string) => { navigator.clipboard.writeText(val); setCopied(id); setTimeout(() => setCopied(null), 2000) }
  const toggleVis = (id: string) => setVisible(p => ({ ...p, [id]: !p[id] }))

  const filtered = secrets.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text)]">Vault</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center gap-2"><Plus size={16} /> Add Secret</button>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
        <p className="text-xs text-yellow-400 mb-1">⚠️ Stored in browser localStorage — not encrypted. For sensitive production secrets, use a proper vault.</p>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search secrets..." className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 mb-4 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />

      {showNew && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6 space-y-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name..." className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
          <input value={value} onChange={e => setValue(e.target.value)} placeholder="Secret value..." type="password" className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] outline-none">
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)..." rows={2} className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)] resize-none" />
          <div className="flex gap-2">
            <button onClick={add} className="bg-[var(--accent)] text-black font-semibold rounded-lg px-4 py-2 text-sm">Save</button>
            <button onClick={() => setShowNew(false)} className="text-[var(--text-muted)] text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
            <Shield size={48} className="mx-auto text-[var(--text-dim)] mb-4" />
            <p className="text-[var(--text-muted)]">No secrets stored.</p>
          </div>
        ) : filtered.map(s => (
          <div key={s.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 group hover:bg-[var(--card-hover)] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">{s.name}</h3>
                <span className="text-xs text-[var(--accent)]">{s.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => copy(s.id, s.value)} className="text-[var(--text-muted)] hover:text-[var(--accent)]">
                  {copied === s.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
                <button onClick={() => toggleVis(s.id)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  {visible[s.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => remove(s.id)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
            <code className="text-xs text-[var(--text-muted)] bg-[var(--card-hover)] px-2 py-1 rounded block overflow-hidden">
              {visible[s.id] ? s.value : '•'.repeat(Math.min(s.value.length, 30))}
            </code>
            {s.notes && <p className="text-xs text-[var(--text-dim)] mt-2">{s.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
