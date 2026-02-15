import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  ChevronRight,
  Users,
  Route,
  FolderOpen,
  Zap,
  Settings2,
  Search,
  Plus,
  X,
  ClipboardList,
  Clock,
  Bell,
  ListTodo,
  Pencil,
  CheckCircle2,
  Map,
  Shield,
  Sparkles,
  Send,
  Trash2,
} from 'lucide-react'
import { apiFetch } from '../lib/api'

/* ────────────────────── types ────────────────────── */

interface Agent {
  id: string
  name: string
  model: string
  status: string
}

interface QuickTemplate {
  id: string
  label: string
  prompt: string
  icon?: string
}

interface CommandPanelProps {
  currentAgentId: string
  currentAgentName: string
  onSwitchAgent: (agentId: string) => void
  onInsertPrompt: (text: string) => void
  onRouteAction: (action: string, payload?: any) => void
}

/* ────────────────────── defaults ────────────────────── */

const DEFAULT_TEMPLATES: QuickTemplate[] = [
  { id: 'status', label: 'Status check', prompt: 'What is your current status? What are you working on?', icon: '📊' },
  { id: 'summarize', label: 'Summarize', prompt: 'Summarize our conversation so far in bullet points.', icon: '📝' },
  { id: 'plan', label: 'Create plan', prompt: 'Create a detailed plan for the following task:', icon: '🗺️' },
  { id: 'review', label: 'Review code', prompt: 'Review the code I\'m about to share. Check for bugs, security issues, and suggest improvements.', icon: '🔍' },
  { id: 'debug', label: 'Debug', prompt: 'Help me debug this issue:', icon: '🐛' },
  { id: 'explain', label: 'Explain', prompt: 'Explain the following in simple terms:', icon: '💡' },
]

const ROUTE_ACTIONS = [
  { id: 'checklist', label: 'Add to Checklist', icon: ClipboardList, description: 'Create a new checklist item' },
  { id: 'cron', label: 'Schedule Task', icon: Clock, description: 'Set up a recurring or one-time job' },
  { id: 'reminder', label: 'Set Reminder', icon: Bell, description: 'Remind me about something' },
  { id: 'queue', label: 'Add to Queue', icon: ListTodo, description: 'Queue a task for later' },
]

const MODE_OPTIONS = [
  { id: 'ask-before-edit', label: 'Ask Before Edits', description: 'Agent confirms before making changes', icon: Shield },
  { id: 'auto-edit', label: 'Auto Edit', description: 'Agent makes changes automatically', icon: Pencil },
  { id: 'plan-mode', label: 'Plan Mode', description: 'Agent plans before executing', icon: Map },
  { id: 'bypass-permissions', label: 'Bypass Permissions', description: 'Skip confirmation prompts', icon: Zap },
]

/* ────────────────────── component ────────────────────── */

export default function CommandPanel({
  currentAgentId,
  currentAgentName,
  onSwitchAgent,
  onInsertPrompt,
  onRouteAction,
}: CommandPanelProps) {
  /* ─── state ─── */
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [templates, setTemplates] = useState<QuickTemplate[]>(() => {
    const saved = localStorage.getItem('clawhq_templates')
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES
  })
  const [modes, setModes] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('clawhq_modes')
    return saved ? JSON.parse(saved) : { 'ask-before-edit': true }
  })
  const [contextTags, setContextTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('clawhq_context_tags')
    return saved ? JSON.parse(saved) : []
  })

  /* section collapse state */
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    agents: true,
    route: false,
    context: false,
    templates: true,
    modes: false,
  })

  /* sub-state */
  const [agentSearch, setAgentSearch] = useState('')
  const [newTag, setNewTag] = useState('')
  const [showAddTag, setShowAddTag] = useState(false)
  const [_editingTemplate, _setEditingTemplate] = useState<string | null>(null)
  const [newTemplateLabel, setNewTemplateLabel] = useState('')
  const [newTemplatePrompt, setNewTemplatePrompt] = useState('')
  const [showNewTemplate, setShowNewTemplate] = useState(false)

  /* ─── effects ─── */
  useEffect(() => {
    async function loadAgents() {
      try {
        const data = await apiFetch('/api/agents')
        setAgents(data.agents || [])
      } catch { /* silent */ }
      finally { setLoadingAgents(false) }
    }
    loadAgents()
  }, [])

  // persist templates & modes
  useEffect(() => { localStorage.setItem('clawhq_templates', JSON.stringify(templates)) }, [templates])
  useEffect(() => { localStorage.setItem('clawhq_modes', JSON.stringify(modes)) }, [modes])
  useEffect(() => { localStorage.setItem('clawhq_context_tags', JSON.stringify(contextTags)) }, [contextTags])

  /* ─── handlers ─── */
  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const toggleMode = useCallback((id: string) => {
    setModes(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const addTag = useCallback(() => {
    const tag = newTag.trim()
    if (tag && !contextTags.includes(tag)) {
      setContextTags(prev => [...prev, tag])
    }
    setNewTag('')
    setShowAddTag(false)
  }, [newTag, contextTags])

  const removeTag = useCallback((tag: string) => {
    setContextTags(prev => prev.filter(t => t !== tag))
  }, [])

  const addTemplate = useCallback(() => {
    if (!newTemplateLabel.trim() || !newTemplatePrompt.trim()) return
    setTemplates(prev => [...prev, {
      id: `custom-${Date.now()}`,
      label: newTemplateLabel.trim(),
      prompt: newTemplatePrompt.trim(),
      icon: '⚡',
    }])
    setNewTemplateLabel('')
    setNewTemplatePrompt('')
    setShowNewTemplate(false)
  }, [newTemplateLabel, newTemplatePrompt])

  const removeTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id))
  }, [])

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(agentSearch.toLowerCase())
  )

  /* ─── render helpers ─── */
  const SectionHeader = ({ id, icon: Icon, label, count }: { id: string; icon: any; label: string; count?: number }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-card-hover/50 transition-colors group"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary/70" />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted group-hover:text-text-secondary transition-colors">
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      <motion.div animate={{ rotate: expandedSections[id] ? 90 : 0 }} transition={{ duration: 0.15 }}>
        <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
      </motion.div>
    </button>
  )

  return (
    <div className="flex flex-col h-full bg-navy/50 border-l border-border overflow-hidden">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-border bg-card/30">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-text">Command Panel</h3>
        </div>
        <p className="text-[10px] text-text-muted mt-0.5">Control your agent session</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Agent Dispatch ── */}
        <SectionHeader id="agents" icon={Users} label="Agent Dispatch" count={agents.length} />
        <AnimatePresence>
          {expandedSections.agents && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-2">
                {agents.length > 3 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={agentSearch}
                      onChange={(e) => setAgentSearch(e.target.value)}
                      placeholder="Search agents..."
                      className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-primary/40"
                    />
                  </div>
                )}
                {loadingAgents ? (
                  <div className="text-xs text-text-muted text-center py-2">Loading agents...</div>
                ) : filteredAgents.length === 0 ? (
                  <div className="text-xs text-text-muted text-center py-2">No agents found</div>
                ) : (
                  filteredAgents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => onSwitchAgent(agent.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                        agent.id === currentAgentId
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-card-hover/50 border border-transparent'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        agent.id === currentAgentId ? 'bg-primary/20' : 'bg-card'
                      }`}>
                        <Bot className={`w-3.5 h-3.5 ${agent.id === currentAgentId ? 'text-primary' : 'text-text-muted'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-text truncate">{agent.name}</div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            agent.status === 'RUNNING' ? 'bg-success' : 'bg-text-muted'
                          }`} />
                          <span className="text-[10px] text-text-muted truncate">{agent.model}</span>
                        </div>
                      </div>
                      {agent.id === currentAgentId && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border-t border-border/50" />

        {/* ── Route To ── */}
        <SectionHeader id="route" icon={Route} label="Route To" />
        <AnimatePresence>
          {expandedSections.route && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-1">
                {ROUTE_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => onRouteAction(action.id)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-card-hover/50 transition-colors group text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <action.icon className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-text">{action.label}</div>
                      <div className="text-[10px] text-text-muted">{action.description}</div>
                    </div>
                    <Send className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border-t border-border/50" />

        {/* ── Project Context ── */}
        <SectionHeader id="context" icon={FolderOpen} label="Project Context" count={contextTags.length} />
        <AnimatePresence>
          {expandedSections.context && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-2">
                <p className="text-[10px] text-text-muted">Tag projects so your agent has context about what you're working on.</p>
                <div className="flex flex-wrap gap-1.5">
                  {contextTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-accent/10 text-accent text-[11px] px-2 py-1 rounded-full border border-accent/20"
                    >
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-error transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {!showAddTag ? (
                    <button
                      onClick={() => setShowAddTag(true)}
                      className="inline-flex items-center gap-1 bg-card text-text-muted text-[11px] px-2 py-1 rounded-full border border-border hover:border-primary/30 hover:text-primary transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add tag
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') setShowAddTag(false) }}
                        placeholder="Tag name..."
                        className="bg-card border border-border rounded-lg px-2 py-1 text-[11px] text-text w-24 focus:outline-none focus:border-primary/40"
                      />
                      <button onClick={addTag} className="text-primary hover:text-primary-hover transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setShowAddTag(false); setNewTag('') }} className="text-text-muted hover:text-error transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border-t border-border/50" />

        {/* ── Quick Templates ── */}
        <SectionHeader id="templates" icon={Sparkles} label="Quick Templates" count={templates.length} />
        <AnimatePresence>
          {expandedSections.templates && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-1">
                {templates.map(tmpl => (
                  <div key={tmpl.id} className="group flex items-center">
                    <button
                      onClick={() => onInsertPrompt(tmpl.prompt)}
                      className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-card-hover/50 transition-colors text-left"
                    >
                      <span className="text-sm shrink-0">{tmpl.icon || '⚡'}</span>
                      <span className="text-xs text-text-secondary group-hover:text-text transition-colors">{tmpl.label}</span>
                    </button>
                    <button
                      onClick={() => removeTemplate(tmpl.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-all"
                      title="Remove template"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {!showNewTemplate ? (
                  <button
                    onClick={() => setShowNewTemplate(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-card-hover/50 transition-colors text-left"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary/60" />
                    <span className="text-xs text-text-muted">Add template</span>
                  </button>
                ) : (
                  <div className="space-y-2 bg-card/50 rounded-lg p-2.5 border border-border">
                    <input
                      autoFocus
                      type="text"
                      value={newTemplateLabel}
                      onChange={(e) => setNewTemplateLabel(e.target.value)}
                      placeholder="Template name"
                      className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-primary/40"
                    />
                    <textarea
                      value={newTemplatePrompt}
                      onChange={(e) => setNewTemplatePrompt(e.target.value)}
                      placeholder="Prompt text..."
                      rows={2}
                      className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-primary/40 resize-none"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setShowNewTemplate(false); setNewTemplateLabel(''); setNewTemplatePrompt('') }}
                        className="text-xs text-text-muted hover:text-text transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addTemplate}
                        disabled={!newTemplateLabel.trim() || !newTemplatePrompt.trim()}
                        className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-30"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border-t border-border/50" />

        {/* ── Mode Toggles ── */}
        <SectionHeader id="modes" icon={Settings2} label="Mode Toggles" />
        <AnimatePresence>
          {expandedSections.modes && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-1">
                {MODE_OPTIONS.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => toggleMode(mode.id)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-card-hover/50 transition-colors text-left"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      modes[mode.id] ? 'bg-primary/15' : 'bg-card'
                    }`}>
                      <mode.icon className={`w-3.5 h-3.5 transition-colors ${modes[mode.id] ? 'text-primary' : 'text-text-muted'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-text">{mode.label}</div>
                      <div className="text-[10px] text-text-muted">{mode.description}</div>
                    </div>
                    {/* Toggle switch */}
                    <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors shrink-0 ${
                      modes[mode.id] ? 'bg-primary' : 'bg-border'
                    }`}>
                      <motion.div
                        className="w-3.5 h-3.5 rounded-full bg-white shadow-sm"
                        animate={{ x: modes[mode.id] ? 14 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Panel footer */}
      <div className="px-3 py-2 border-t border-border bg-card/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">Active: {currentAgentName}</span>
          <div className="flex items-center gap-1">
            {contextTags.length > 0 && (
              <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                {contextTags.length} tag{contextTags.length !== 1 ? 's' : ''}
              </span>
            )}
            {Object.values(modes).filter(Boolean).length > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {Object.values(modes).filter(Boolean).length} mode{Object.values(modes).filter(Boolean).length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
