import { useState, useEffect } from 'react'
import { CheckSquare, Plus, Trash2, GripVertical, X } from 'lucide-react'

interface Task { id: string; title: string; desc: string; column: string }

const COLS = ['To Do', 'In Progress', 'Done']
const KEY = 'clawhq-tasks'

function load(): Task[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(t: Task[]) { localStorage.setItem(KEY, JSON.stringify(t)) }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(load)
  const [adding, setAdding] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [dragTask, setDragTask] = useState<string | null>(null)

  useEffect(() => { save(tasks) }, [tasks])

  const add = (col: string) => {
    if (!title.trim()) return
    setTasks(p => [...p, { id: Date.now().toString(), title: title.trim(), desc: '', column: col }])
    setTitle('')
    setAdding(null)
  }

  const remove = (id: string) => setTasks(p => p.filter(t => t.id !== id))

  const onDrop = (col: string, e: React.DragEvent) => {
    e.preventDefault()
    if (dragTask) setTasks(p => p.map(t => t.id === dragTask ? { ...t, column: col } : t))
    setDragTask(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <CheckSquare size={28} className="text-[var(--accent)]" />
        <h1 className="text-2xl font-bold text-[var(--text)]">Tasks</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[60vh]">
        {COLS.map(col => (
          <div
            key={col}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col"
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(col, e)}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[var(--text)] text-sm uppercase tracking-wide">{col}</h2>
              <span className="text-xs text-[var(--text-dim)] bg-[var(--border)] rounded-full px-2 py-0.5">
                {tasks.filter(t => t.column === col).length}
              </span>
            </div>
            <div className="flex-1 space-y-2">
              {tasks.filter(t => t.column === col).map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragTask(task.id)}
                  className="bg-[var(--card-hover)] border border-[var(--border)] rounded-lg p-3 cursor-grab group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <GripVertical size={14} className="text-[var(--text-dim)] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-[var(--text)]">{task.title}</span>
                    </div>
                    <button onClick={() => remove(task.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {adding === col ? (
              <div className="mt-3 space-y-2">
                <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && add(col)}
                  placeholder="Task title..."
                  className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]"
                />
                <div className="flex gap-2">
                  <button onClick={() => add(col)} className="bg-[var(--accent)] text-black font-semibold rounded-lg px-3 py-1.5 text-xs">Add</button>
                  <button onClick={() => { setAdding(null); setTitle('') }} className="text-[var(--text-muted)] text-xs"><X size={14} /></button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAdding(col)} className="mt-3 flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--accent)] text-sm transition-colors">
                <Plus size={16} /> Add task
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
