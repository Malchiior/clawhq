import { useState, useEffect } from 'react'
import { Wallet, Plus, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface Transaction { id: string; desc: string; amount: number; type: 'income' | 'expense'; category: string; date: string }

const KEY = 'clawhq-finances'
const CATEGORIES = ['Revenue', 'Salary', 'Software', 'Marketing', 'Infrastructure', 'Other']

function load(): Transaction[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(t: Transaction[]) { localStorage.setItem(KEY, JSON.stringify(t)) }

export default function FinancesPage() {
  const [txns, setTxns] = useState<Transaction[]>(load)
  const [showNew, setShowNew] = useState(false)
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => { save(txns) }, [txns])

  const add = () => {
    if (!desc.trim() || !amount) return
    setTxns(p => [...p, { id: Date.now().toString(), desc: desc.trim(), amount: parseFloat(amount), type, category, date }])
    setDesc(''); setAmount(''); setShowNew(false)
  }

  const remove = (id: string) => setTxns(p => p.filter(t => t.id !== id))
  const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expenses

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet size={28} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text)]">Finances</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center gap-2"><Plus size={16} /> Add Transaction</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Income</p>
          <p className="text-2xl font-bold text-green-400">${income.toLocaleString()}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Expenses</p>
          <p className="text-2xl font-bold text-red-400">${expenses.toLocaleString()}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Balance</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>${balance.toLocaleString()}</p>
        </div>
      </div>

      {showNew && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6 space-y-4">
          <div className="flex gap-2 mb-2">
            {(['income', 'expense'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${type === t ? 'bg-[var(--accent)] text-black' : 'bg-[var(--card-hover)] text-[var(--text-muted)]'}`}>
                {t === 'income' ? '↑ Income' : '↓ Expense'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description..." className="bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount..." className="bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
          </div>
          <div className="flex gap-4">
            <select value={category} onChange={e => setCategory(e.target.value)} className="bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] outline-none">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="bg-[var(--accent)] text-black font-semibold rounded-lg px-4 py-2 text-sm">Add</button>
            <button onClick={() => setShowNew(false)} className="text-[var(--text-muted)] text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {txns.sort((a, b) => b.date.localeCompare(a.date)).map(t => (
          <div key={t.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 group hover:bg-[var(--card-hover)] transition-colors">
            {t.type === 'income' ? <ArrowUpRight size={18} className="text-green-400" /> : <ArrowDownRight size={18} className="text-red-400" />}
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--text)]">{t.desc}</h3>
              <p className="text-xs text-[var(--text-muted)]">{t.category} • {t.date}</p>
            </div>
            <span className={`text-sm font-bold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}</span>
            <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
