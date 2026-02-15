import { useState, useEffect } from 'react'
import { TrendingUp, Plus, Trash2, DollarSign } from 'lucide-react'

interface Entry { id: string; source: string; amount: number; date: string; recurring: boolean }

const KEY = 'clawhq-revenue'
function load(): Entry[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(e: Entry[]) { localStorage.setItem(KEY, JSON.stringify(e)) }

export default function RevenuePage() {
  const [entries, setEntries] = useState<Entry[]>(load)
  const [showNew, setShowNew] = useState(false)
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [recurring, setRecurring] = useState(false)

  useEffect(() => { save(entries) }, [entries])

  const add = () => {
    if (!source.trim() || !amount) return
    setEntries(p => [...p, { id: Date.now().toString(), source: source.trim(), amount: parseFloat(amount), date, recurring }])
    setSource(''); setAmount(''); setShowNew(false)
  }

  const remove = (id: string) => setEntries(p => p.filter(e => e.id !== id))
  const total = entries.reduce((s, e) => s + e.amount, 0)
  const monthly = entries.filter(e => e.recurring).reduce((s, e) => s + e.amount, 0)

  const byMonth: Record<string, number> = {}
  entries.forEach(e => { const m = e.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + e.amount })
  const months = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
  const maxVal = Math.max(...months.map(m => m[1]), 1)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp size={28} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text)]">Revenue</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center gap-2"><Plus size={16} /> Add Entry</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-[var(--accent)]">${total.toLocaleString()}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Monthly Recurring</p>
          <p className="text-2xl font-bold text-green-400">${monthly.toLocaleString()}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Entries</p>
          <p className="text-2xl font-bold text-[var(--text)]">{entries.length}</p>
        </div>
      </div>

      {months.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-4">Revenue by Month</h2>
          <div className="flex items-end gap-3 h-40">
            {months.map(([m, v]) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-[var(--accent)] rounded-t-lg transition-all" style={{ height: `${(v / maxVal) * 100}%`, minHeight: 4 }} />
                <span className="text-[10px] text-[var(--text-dim)]">{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNew && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input value={source} onChange={e => setSource(e.target.value)} placeholder="Source..." className="bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount..." className="bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
          </div>
          <div className="flex items-center gap-4">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] outline-none" />
            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} className="accent-[var(--accent)]" /> Recurring
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="bg-[var(--accent)] text-black font-semibold rounded-lg px-4 py-2 text-sm">Add</button>
            <button onClick={() => setShowNew(false)} className="text-[var(--text-muted)] text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {entries.sort((a, b) => b.date.localeCompare(a.date)).map(e => (
          <div key={e.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 group hover:bg-[var(--card-hover)] transition-colors">
            <DollarSign size={18} className="text-[var(--accent)]" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--text)]">{e.source}</h3>
              <p className="text-xs text-[var(--text-muted)]">{e.date} {e.recurring && '• Recurring'}</p>
            </div>
            <span className="text-sm font-bold text-green-400">${e.amount.toLocaleString()}</span>
            <button onClick={() => remove(e.id)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
