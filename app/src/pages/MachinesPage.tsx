import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Loader2, Wifi, WifiOff, Trash2, Bot, Edit2, Check, X, Copy, Server } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { Link } from 'react-router-dom'

interface Machine {
  id: string
  name: string
  platform: string | null
  openclawVersion: string | null
  nodeVersion: string | null
  isOnline: boolean
  lastSeen: string | null
  bridgeToken: string | null
  createdAt: string
  agents: { id: string; name: string; status: string; model: string }[]
}

const platformIcons: Record<string, string> = {
  win32: '🪟',
  darwin: '🍎',
  linux: '🐧',
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showToken, setShowToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchMachines = async () => {
    try {
      const data = await apiFetch('/api/machines')
      setMachines(data.machines)
    } catch {}
  }

  useEffect(() => {
    fetchMachines().finally(() => setLoading(false))
  }, [])

  const addMachine = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const data = await apiFetch('/api/machines', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim() }),
      })
      setMachines(prev => [data.machine, ...prev])
      setShowAdd(false)
      setNewName('')
      setShowToken(data.machine.id)
    } catch {}
    setAdding(false)
  }

  const renameMachine = async (id: string) => {
    if (!editName.trim()) { setEditingId(null); return }
    try {
      await apiFetch(`/api/machines/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim() }),
      })
      setMachines(prev => prev.map(m => m.id === id ? { ...m, name: editName.trim() } : m))
    } catch {}
    setEditingId(null)
  }

  const deleteMachine = async (id: string) => {
    try {
      await apiFetch(`/api/machines/${id}`, { method: 'DELETE' })
      setMachines(prev => prev.filter(m => m.id !== id))
    } catch {}
    setDeleteConfirm(null)
  }

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Machines</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your connected computers running OpenClaw</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Machine
        </button>
      </div>

      {/* Add Machine Form */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-primary/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-3">Add a new machine</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMachine()}
              placeholder="Machine name (e.g., Mac Mini Office, Gaming PC...)"
              className="flex-1 bg-navy/40 border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50"
              autoFocus
            />
            <button onClick={addMachine} disabled={adding || !newName.trim()} className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
            <button onClick={() => { setShowAdd(false); setNewName('') }} className="text-text-muted hover:text-text text-sm px-3 py-2 transition-colors">Cancel</button>
          </div>
          <p className="text-xs text-text-muted mt-2">After creating, you'll get a bridge token to connect this machine.</p>
        </motion.div>
      )}

      {/* Machines Grid */}
      {machines.length === 0 && !showAdd ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Server className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">No machines connected</h3>
          <p className="text-sm text-text-secondary mb-6">Add a machine to manage your OpenClaw instances from one dashboard.</p>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Your First Machine
          </button>
        </div>
      ) : (
        <motion.div variants={container} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {machines.map(machine => (
            <motion.div key={machine.id} variants={item} className="bg-card border border-border rounded-xl p-5 hover:border-border-light transition-all">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                    {machine.platform ? platformIcons[machine.platform] || '💻' : '💻'}
                  </div>
                  <div>
                    {editingId === machine.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameMachine(machine.id); if (e.key === 'Escape') setEditingId(null) }}
                          className="bg-navy/40 border border-border rounded px-2 py-0.5 text-sm text-text focus:outline-none focus:border-primary/50 w-32"
                          autoFocus
                        />
                        <button onClick={() => renameMachine(machine.id)} className="p-0.5 text-success hover:bg-success/10 rounded"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingId(null)} className="p-0.5 text-text-muted hover:bg-white/5 rounded"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <h3 className="font-semibold text-text flex items-center gap-1.5">
                        {machine.name}
                        <button onClick={() => { setEditingId(machine.id); setEditName(machine.name) }} className="p-0.5 text-text-muted hover:text-text opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-3 h-3" /></button>
                      </h3>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {machine.isOnline ? (
                        <><Wifi className="w-3 h-3 text-success" /><span className="text-xs text-success">Online</span></>
                      ) : (
                        <><WifiOff className="w-3 h-3 text-text-muted" /><span className="text-xs text-text-muted">Offline</span></>
                      )}
                      {machine.openclawVersion && <span className="text-xs text-text-muted">· v{machine.openclawVersion}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {deleteConfirm === machine.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteMachine(machine.id)} className="text-xs bg-error/10 text-error px-2 py-1 rounded hover:bg-error/20">Delete</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs text-text-muted px-2 py-1">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(machine.id)} className="p-1.5 text-text-muted hover:text-error hover:bg-error/5 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bridge Token (shown after creation) */}
              {showToken === machine.id && machine.bridgeToken && (
                <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-primary font-medium mb-2">🔑 Bridge Token (save this!):</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[10px] text-text-muted break-all select-all bg-navy/40 px-2 py-1 rounded">{machine.bridgeToken.slice(0, 40)}...</code>
                    <button onClick={() => copyToken(machine.bridgeToken!)} className="p-1 text-primary hover:bg-primary/10 rounded transition-colors">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted mt-2">Use this token in your bridge config or download the bridge script below.</p>
                  <button onClick={() => setShowToken(null)} className="text-[10px] text-primary hover:underline mt-1">Dismiss</button>
                </div>
              )}

              {/* Agents on this machine */}
              <div className="space-y-2">
                <p className="text-xs text-text-muted font-medium">{machine.agents.length} agent{machine.agents.length !== 1 ? 's' : ''}</p>
                {machine.agents.map(agent => (
                  <Link key={agent.id} to={`/agents/${agent.id}`} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <Bot className="w-4 h-4 text-primary" />
                    <span className="text-sm text-text flex-1">{agent.name}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'RUNNING' ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
                  </Link>
                ))}
                {machine.agents.length === 0 && (
                  <p className="text-xs text-text-muted italic py-2">No agents assigned yet</p>
                )}
              </div>

              {/* Last seen */}
              {machine.lastSeen && (
                <p className="text-[10px] text-text-muted mt-3">
                  Last seen: {new Date(machine.lastSeen).toLocaleString()}
                </p>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
