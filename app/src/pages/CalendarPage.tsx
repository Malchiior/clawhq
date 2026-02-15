import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface Event { id: string; title: string; date: string; color: string }

const KEY = 'clawhq-calendar'
const COLORS = ['#FFC904', '#3B82F6', '#10B981', '#F43F5E', '#8B5CF6']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function load(): Event[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(e: Event[]) { localStorage.setItem(KEY, JSON.stringify(e)) }

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>(load)
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(COLORS[0])

  useEffect(() => { save(events) }, [events])

  const year = current.getFullYear(), month = current.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  const dateStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const add = () => {
    if (!title.trim() || !selected) return
    setEvents(p => [...p, { id: Date.now().toString(), title: title.trim(), date: selected, color }])
    setTitle(''); setShowAdd(false)
  }

  const remove = (id: string) => setEvents(p => p.filter(e => e.id !== id))

  const prev = () => setCurrent(new Date(year, month - 1, 1))
  const next = () => setCurrent(new Date(year, month + 1, 1))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays size={28} className="text-[var(--accent)]" />
        <h1 className="text-2xl font-bold text-[var(--text)]">Calendar</h1>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <button onClick={prev} className="text-[var(--text-muted)] hover:text-[var(--text)]"><ChevronLeft size={20} /></button>
          <h2 className="text-lg font-semibold text-[var(--text)]">{MONTHS[month]} {year}</h2>
          <button onClick={next} className="text-[var(--text-muted)] hover:text-[var(--text)]"><ChevronRight size={20} /></button>
        </div>

        <div className="grid grid-cols-7">
          {DAYS.map(d => <div key={d} className="p-2 text-center text-xs font-semibold text-[var(--text-dim)] uppercase border-b border-[var(--border)]">{d}</div>)}
          {cells.map((day, i) => {
            const ds = day ? dateStr(day) : ''
            const dayEvents = events.filter(e => e.date === ds)
            const isToday = ds === today
            const isSel = ds === selected
            return (
              <div
                key={i}
                onClick={() => day && setSelected(ds)}
                className={`min-h-[80px] p-1.5 border-b border-r border-[var(--border)] cursor-pointer transition-colors ${day ? 'hover:bg-[var(--card-hover)]' : ''} ${isSel ? 'bg-[var(--accent-dim)]' : ''}`}
              >
                {day && (
                  <>
                    <span className={`text-xs font-medium ${isToday ? 'bg-[var(--accent)] text-black w-6 h-6 rounded-full flex items-center justify-center' : 'text-[var(--text-muted)]'}`}>{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div key={ev.id} className="text-[10px] px-1 py-0.5 rounded truncate text-white" style={{ backgroundColor: ev.color + '80' }}>{ev.title}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <div className="mt-4 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[var(--text)]">{selected}</h3>
            <button onClick={() => setShowAdd(true)} className="bg-[var(--accent)] text-black font-semibold rounded-lg px-3 py-1.5 text-xs flex items-center gap-1"><Plus size={14} /> Add Event</button>
          </div>
          {showAdd && (
            <div className="flex gap-2 mb-3">
              <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Event title..." className="flex-1 bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
              {COLORS.map(c => <button key={c} onClick={() => setColor(c)} className="w-6 h-6 rounded-full border-2 flex-shrink-0" style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'transparent' }} />)}
              <button onClick={add} className="bg-[var(--accent)] text-black font-semibold rounded-lg px-3 py-1.5 text-xs">Add</button>
              <button onClick={() => setShowAdd(false)} className="text-[var(--text-muted)]"><X size={16} /></button>
            </div>
          )}
          <div className="space-y-1">
            {events.filter(e => e.date === selected).map(ev => (
              <div key={ev.id} className="flex items-center justify-between bg-[var(--card-hover)] rounded-lg px-3 py-2 group">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ev.color }} />
                  <span className="text-sm text-[var(--text)]">{ev.title}</span>
                </div>
                <button onClick={() => remove(ev.id)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
