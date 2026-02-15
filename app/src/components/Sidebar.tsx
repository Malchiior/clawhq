import { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageCircle, Bot, CheckSquare, FolderKanban,
  StickyNote, CalendarDays, TrendingUp, Wallet, Image, Shield,
  Zap, Target, Lightbulb, Clock, Settings, LogOut,
  GripVertical, Sun, Moon, Plus, X, RotateCcw, FileText,
  Users, BarChart3, Lock, Archive
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard, MessageCircle, Bot, CheckSquare, FolderKanban,
  StickyNote, CalendarDays, TrendingUp, Wallet, Image, Shield,
  Zap, Target, Lightbulb, Clock, Settings, FileText,
  Users, BarChart3, Lock, Archive
}

interface PageConfig {
  id: string
  slug: string
  label: string
  icon: string
  pinned: boolean
  archived: boolean
  sortOrder: number
  templateId?: string
}

// Templates available for adding new pages
const PAGE_TEMPLATES = [
  { slug: 'tasks', label: 'Tasks', icon: 'CheckSquare', desc: 'Kanban boards & task lists' },
  { slug: 'projects', label: 'Projects', icon: 'FolderKanban', desc: 'Project management' },
  { slug: 'notes', label: 'Notes', icon: 'StickyNote', desc: 'Quick notes & documents' },
  { slug: 'calendar', label: 'Calendar', icon: 'CalendarDays', desc: 'Events & scheduling' },
  { slug: 'finances', label: 'Finances', icon: 'Wallet', desc: 'Budget & expense tracking' },
  { slug: 'automations', label: 'Automations', icon: 'Zap', desc: 'Workflow automations' },
  { slug: 'gallery', label: 'Gallery', icon: 'Image', desc: 'Image & media gallery' },
  { slug: 'contacts', label: 'Contacts', icon: 'Users', desc: 'CRM & contact management' },
  { slug: 'analytics', label: 'Analytics', icon: 'BarChart3', desc: 'Data & analytics dashboards' },
  { slug: 'vault', label: 'Vault', icon: 'Shield', desc: 'Secure notes & credentials' },
  { slug: 'strategy', label: 'Strategy', icon: 'Target', desc: 'Goals & strategy planning' },
  { slug: 'ideas', label: 'Ideas', icon: 'Lightbulb', desc: 'Idea capture & brainstorming' },
  { slug: 'revenue', label: 'Revenue', icon: 'TrendingUp', desc: 'Revenue & sales tracking' },
  { slug: 'timeline', label: 'Timeline', icon: 'Clock', desc: 'Activity timeline' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { logout: authLogout } = useAuth()
  const [pages, setPages] = useState<PageConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const editRef = useRef<HTMLInputElement>(null)

  const fetchPages = useCallback(async () => {
    try {
      const data = await apiFetch('/api/pages')
      setPages(data)
    } catch (err) {
      console.error('Failed to fetch pages:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPages() }, [fetchPages])
  useEffect(() => { if (editRef.current) editRef.current.focus() }, [editIdx])

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', idx.toString())
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '0.5'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '1'
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const next = [...pages]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(overIdx, 0, moved)
      const reordered = next.map((p, i) => ({ ...p, sortOrder: i }))
      setPages(reordered)
      // Persist to backend
      apiFetch('/api/pages/reorder', {
        method: 'PUT',
        body: JSON.stringify({ order: reordered.map(p => ({ id: p.id, sortOrder: p.sortOrder })) }),
      }).catch(console.error)
    }
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIdx(idx)
  }

  const handleDoubleClick = (idx: number) => {
    if (pages[idx].pinned) return
    setEditIdx(idx)
    setEditValue(pages[idx].label)
  }

  const commitRename = async () => {
    if (editIdx === null) return
    const val = editValue.trim()
    if (val && val !== pages[editIdx].label) {
      try {
        await apiFetch(`/api/pages/${pages[editIdx].id}`, {
          method: 'PATCH',
          body: JSON.stringify({ label: val }),
        })
        setPages(prev => {
          const next = [...prev]
          next[editIdx] = { ...next[editIdx], label: val }
          return next
        })
      } catch (err) {
        console.error('Failed to rename:', err)
      }
    }
    setEditIdx(null)
  }

  const handleAddPage = async (template: typeof PAGE_TEMPLATES[0]) => {
    try {
      const page = await apiFetch('/api/pages', {
        method: 'POST',
        body: JSON.stringify({
          slug: template.slug,
          label: template.label,
          icon: template.icon,
          templateId: template.slug,
        }),
      })
      setPages(prev => [...prev, page])
      setShowTemplates(false)
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        // Page already in sidebar, just close
        setShowTemplates(false)
      } else {
        console.error('Failed to add page:', err)
      }
    }
  }

  const handleRemovePage = async (idx: number) => {
    const page = pages[idx]
    if (page.pinned) return
    try {
      await apiFetch(`/api/pages/${page.id}`, { method: 'DELETE' })
      setPages(prev => prev.filter((_, i) => i !== idx))
    } catch (err) {
      console.error('Failed to remove page:', err)
    }
  }

  const handleLogout = () => {
    authLogout()
    navigate('/login')
  }

  // Which template slugs are already active
  const activeSlugs = new Set(pages.map(p => p.slug))

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
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {pages.map((page, idx) => {
              const Icon = iconMap[page.icon] || FileText
              const isOver = overIdx === idx && dragIdx !== idx
              return (
                <div
                  key={page.id}
                  draggable={editIdx !== idx}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => { e.preventDefault() }}
                  className="group relative"
                  style={{
                    borderTop: isOver && dragIdx !== null && dragIdx > idx ? '2px solid var(--accent)' : '2px solid transparent',
                    borderBottom: isOver && dragIdx !== null && dragIdx < idx ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <NavLink
                    to={page.slug === 'dashboard' ? '/dashboard' : `/${page.slug}`}
                    end={page.slug === 'dashboard'}
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
                      <span
                        className="flex-1 truncate"
                        onDoubleClick={(e) => { e.preventDefault(); handleDoubleClick(idx) }}
                      >
                        {page.label}
                      </span>
                    )}
                    {page.pinned && (
                      <Lock size={10} className="text-[var(--text-dim)] opacity-30 flex-shrink-0" />
                    )}
                  </NavLink>
                  {/* Remove button (non-pinned only) */}
                  {!page.pinned && editIdx !== idx && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemovePage(idx) }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-[var(--text-dim)] hover:text-red-400 transition-all"
                      title="Remove page"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )
            })}

            {/* Add Page Button */}
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[12px] font-medium
                text-[var(--text-dim)] hover:text-[var(--accent)] hover:bg-[var(--card-hover)]
                transition-all duration-150 mt-2 border border-dashed border-[var(--border)] hover:border-[var(--accent)]"
            >
              <Plus size={14} />
              Add Page
            </button>

            {/* Template Picker */}
            {showTemplates && (
              <div className="mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Page Templates</span>
                  <button onClick={() => setShowTemplates(false)} className="text-[var(--text-dim)] hover:text-[var(--text)]">
                    <X size={14} />
                  </button>
                </div>
                <div className="max-h-[280px] overflow-y-auto py-1">
                  {PAGE_TEMPLATES.filter(t => !activeSlugs.has(t.slug)).map(template => {
                    const TIcon = iconMap[template.icon] || FileText
                    return (
                      <button
                        key={template.slug}
                        onClick={() => handleAddPage(template)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-[var(--card-hover)] transition-colors"
                      >
                        <TIcon size={15} className="text-[var(--accent)] flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium text-[var(--text)]">{template.label}</div>
                          <div className="text-[10px] text-[var(--text-dim)] truncate">{template.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                  {PAGE_TEMPLATES.filter(t => !activeSlugs.has(t.slug)).length === 0 && (
                    <div className="px-3 py-4 text-center text-[11px] text-[var(--text-dim)]">
                      All templates added! ✨
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
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
