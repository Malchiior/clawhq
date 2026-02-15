import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageCircle, Bot, CheckSquare, FolderKanban,
  StickyNote, CalendarDays, TrendingUp, Wallet, Image, Shield,
  Zap, Target, Lightbulb, Clock, Settings, LogOut,
  GripVertical, Sun, Moon
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard, MessageCircle, Bot, CheckSquare, FolderKanban,
  StickyNote, CalendarDays, TrendingUp, Wallet, Image, Shield,
  Zap, Target, Lightbulb, Clock, Settings
}

interface NavItem {
  to: string
  icon: string
  label: string
  customLabel?: string
}

const defaultLinks: NavItem[] = [
  { to: '/dashboard', icon: 'LayoutDashboard', label: 'Command Center' },
  { to: '/chat', icon: 'MessageCircle', label: 'Chat' },
  { to: '/agents', icon: 'Bot', label: 'Agents' },
  { to: '/tasks', icon: 'CheckSquare', label: 'Tasks' },
  { to: '/projects', icon: 'FolderKanban', label: 'Projects' },
  { to: '/notes', icon: 'StickyNote', label: 'Notes' },
  { to: '/calendar', icon: 'CalendarDays', label: 'Calendar' },
  { to: '/automations', icon: 'Zap', label: 'Automations' },
  { to: '/ideas', icon: 'Lightbulb', label: 'Ideas' },
  { to: '/strategy', icon: 'Target', label: 'Strategy' },
  { to: '/revenue', icon: 'TrendingUp', label: 'Revenue' },
  { to: '/finances', icon: 'Wallet', label: 'Finances' },
  { to: '/gallery', icon: 'Image', label: 'Gallery' },
  { to: '/vault', icon: 'Shield', label: 'Vault' },
  { to: '/timeline', icon: 'Clock', label: 'Timeline' },
  { to: '/settings', icon: 'Settings', label: 'Settings' },
]

function loadSidebar(): NavItem[] {
  try {
    const saved = localStorage.getItem('clawhq-sidebar')
    if (!saved) return defaultLinks
    const data: { order: string[], labels: Record<string, string> } = JSON.parse(saved)
    const byTo: Record<string, NavItem> = {}
    defaultLinks.forEach(l => byTo[l.to] = { ...l })
    // Apply custom labels
    Object.entries(data.labels || {}).forEach(([to, label]) => {
      if (byTo[to]) byTo[to].customLabel = label
    })
    const ordered: NavItem[] = []
    ;(data.order || []).forEach(to => {
      if (byTo[to]) { ordered.push(byTo[to]); delete byTo[to] }
    })
    Object.values(byTo).forEach(l => ordered.push(l))
    return ordered
  } catch { return defaultLinks }
}

function saveSidebar(links: NavItem[]) {
  const order = links.map(l => l.to)
  const labels: Record<string, string> = {}
  links.forEach(l => { if (l.customLabel) labels[l.to] = l.customLabel })
  localStorage.setItem('clawhq-sidebar', JSON.stringify({ order, labels }))
}

export default function Sidebar() {
  const navigate = useNavigate()
  const { logout: authLogout } = useAuth()
  const [links, setLinks] = useState<NavItem[]>(loadSidebar)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [darkMode, setDarkMode] = useState(true)
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => { saveSidebar(links) }, [links])
  useEffect(() => { if (editRef.current) editRef.current.focus() }, [editIdx])

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', idx.toString())
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '0.5'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '1'
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIdx(idx)
  }

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx) return
    setLinks(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(dropIdx, 0, moved)
      return next
    })
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleDoubleClick = (idx: number) => {
    setEditIdx(idx)
    setEditValue(links[idx].customLabel || links[idx].label)
  }

  const commitRename = () => {
    if (editIdx === null) return
    const val = editValue.trim()
    if (val) {
      setLinks(prev => {
        const next = [...prev]
        next[editIdx] = { ...next[editIdx], customLabel: val === next[editIdx].label ? undefined : val }
        return next
      })
    }
    setEditIdx(null)
  }

  const handleLogout = () => {
    authLogout()
    navigate('/login')
  }

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[220px] z-50 flex flex-col bg-[var(--card)] border-r border-[var(--border)]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border)]">
        <Zap size={20} className="text-[var(--accent)]" />
        <h1 className="text-[14px] font-extrabold text-[var(--accent)] tracking-[1.5px]">
          CLAWHQ
        </h1>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {links.map((link, idx) => {
          const Icon = iconMap[link.icon] || LayoutDashboard
          const isOver = overIdx === idx && dragIdx !== idx
          const displayLabel = link.customLabel || link.label
          return (
            <div
              key={link.to}
              draggable={editIdx !== idx}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              style={{
                borderTop: isOver && dragIdx !== null && dragIdx > idx ? '2px solid var(--accent)' : '2px solid transparent',
                borderBottom: isOver && dragIdx !== null && dragIdx < idx ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'border-color 0.15s',
              }}
            >
              <NavLink
                to={link.to}
                end={link.to === '/dashboard'}
                className={({ isActive }) => `
                  flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium
                  transition-all duration-150 no-underline
                  ${isActive
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-l-[3px] border-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text)] border-l-[3px] border-transparent'
                  }
                `}
                onClick={(e) => { if (editIdx === idx) e.preventDefault() }}
              >
                <GripVertical size={11} className="text-[var(--text-dim)] opacity-40 cursor-grab flex-shrink-0" />
                <Icon size={16} />
                {editIdx === idx ? (
                  <input
                    ref={editRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditIdx(null) }}
                    className="bg-transparent border-b border-[var(--accent)] text-[var(--accent)] text-[13px] font-medium outline-none w-full"
                    onClick={(e) => e.preventDefault()}
                  />
                ) : (
                  <span onDoubleClick={(e) => { e.preventDefault(); handleDoubleClick(idx) }}>
                    {displayLabel}
                  </span>
                )}
              </NavLink>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-[var(--border)] mt-auto">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:bg-[var(--card-hover)] border border-[var(--border)] mb-1.5 transition-all"
        >
          {darkMode ? <Sun size={14} className="text-[#FFC904]" /> : <Moon size={14} />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <LogOut size={14} /> Logout
        </button>
        <p className="text-[10px] text-[var(--text-dim)] mt-1.5 px-1">ClawHQ v1.0</p>
      </div>
    </aside>
  )
}
