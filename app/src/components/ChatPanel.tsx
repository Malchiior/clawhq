import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Trash2, Bot, User, AlertCircle, ChevronDown, Sparkles, MessageSquare, ImagePlus, Paperclip, X, ZoomIn, FileText, FileCode, FileSpreadsheet, File, Download, Eye, Search, ChevronUp } from 'lucide-react'
import { apiFetch, apiUpload } from '../lib/api'
import { getSocket } from '../lib/socket'
// GatewayClient removed — CONNECTOR mode now uses bridge via backend
import MessageContent from './MessageContent'

interface Attachment {
  name: string
  type: string
  size: number
  dataUri: string
  category?: 'image' | 'text' | 'binary'
  textPreview?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    attachments?: Attachment[]
    [key: string]: any
  }
  createdAt: string
}

interface ChatPanelProps {
  agentId: string
  agentName: string
  agentStatus: string
  agentModel: string
  deployMode?: string
  sessionMode?: string
}

export interface ChatPanelHandle {
  insertPrompt: (text: string) => void
}

const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(function ChatPanel({ agentId, agentName, agentStatus, agentModel, deployMode, sessionMode }, ref) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bridgeConnected, setBridgeConnected] = useState<boolean | null>(null)

  const isConnectorMode = deployMode === 'CONNECTOR'
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [pendingImages, setPendingImages] = useState<Attachment[]>([])
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResultIndex, setSearchResultIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const generalFileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messagesRef2 = useRef<ChatMessage[]>([])

  useImperativeHandle(ref, () => ({
    insertPrompt: (text: string) => {
      setInput(text)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }), [])

  // Check bridge status for CONNECTOR mode
  useEffect(() => {
    if (!isConnectorMode) {
      setBridgeConnected(null)
      return
    }

    const checkBridge = async () => {
      try {
        const data = await apiFetch(`/api/chat/${agentId}/bridge-status`)
        setBridgeConnected(data.connected)
      } catch {
        setBridgeConnected(false)
      }
    }
    checkBridge()
    const interval = setInterval(checkBridge, 15000)
    return () => clearInterval(interval)
  }, [isConnectorMode, agentId])

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  // Keep messages ref in sync
  useEffect(() => { messagesRef2.current = messages }, [messages])

  // Load chat history
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await apiFetch(`/api/chat/${agentId}/messages?limit=50`)
        if (mounted) {
          setMessages(data.messages)
          setLoading(false)
          setTimeout(() => scrollToBottom(false), 50)
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message)
          setLoading(false)
        }
      }
    }
    load()
    return () => { mounted = false }
  }, [agentId, scrollToBottom])

  // Real-time messages via Socket.io (with polling fallback)
  useEffect(() => {
    const socket = getSocket()
    socket.emit('join:agent', agentId)

    const handleMessage = (msg: ChatMessage) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        // If this is a real user message arriving via socket, remove any temp optimistic message
        const filtered = msg.role === 'user'
          ? prev.filter(m => !(m.id.startsWith('temp-') && m.role === 'user'))
          : prev
        return [...filtered, msg]
      })
      scrollToBottom()
    }

    socket.on('chat:message', handleMessage)

    // Fallback polling every 10s in case WebSocket disconnects
    pollRef.current = setInterval(async () => {
      if (socket.connected) return // Skip polling when socket is live
      try {
        const lastMsg = messagesRef2.current[messagesRef2.current.length - 1]
        if (!lastMsg) return
        const data = await apiFetch(`/api/chat/${agentId}/poll?since=${lastMsg.createdAt}`)
        if (data.messages?.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id))
            const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id))
            if (newMsgs.length === 0) return prev
            return [...prev, ...newMsgs]
          })
          scrollToBottom()
        }
      } catch {
        // Silent poll failure
      }
    }, 10000)

    return () => {
      socket.off('chat:message', handleMessage)
      socket.emit('leave:agent', agentId)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, scrollToBottom]) // Removed messages.length — was causing re-subscription and duplicate handlers

  // Scroll detection for "scroll to bottom" button
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Search logic
  const searchResults = searchQuery.trim()
    ? messages
        .map((msg, idx) => ({ msg, idx }))
        .filter(({ msg }) => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  const activeSearchMsgId = searchResults.length > 0 ? searchResults[searchResultIndex]?.msg.id : null

  const scrollToMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`chat-msg-${msgId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const navigateSearch = useCallback((direction: 'prev' | 'next') => {
    if (searchResults.length === 0) return
    const newIdx = direction === 'next'
      ? (searchResultIndex + 1) % searchResults.length
      : (searchResultIndex - 1 + searchResults.length) % searchResults.length
    setSearchResultIndex(newIdx)
    scrollToMessage(searchResults[newIdx].msg.id)
  }, [searchResults, searchResultIndex, scrollToMessage])

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    setSearchQuery('')
    setSearchResultIndex(0)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResultIndex(0)
  }, [])

  // When search query changes, reset index and scroll to first result
  useEffect(() => {
    setSearchResultIndex(0)
  }, [searchQuery])

  useEffect(() => {
    if (activeSearchMsgId) scrollToMessage(activeSearchMsgId)
  }, [activeSearchMsgId, scrollToMessage])

  // Ctrl+F to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        openSearch()
      }
      if (e.key === 'Escape' && searchOpen) {
        closeSearch()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen, openSearch, closeSearch])

  const sendMessage = async () => {
    const text = input.trim()
    const hasImages = pendingImages.length > 0
    const hasFiles = pendingFiles.length > 0
    const hasAttachments = hasImages || hasFiles
    if ((!text && !hasAttachments) || sending) return

    const currentImages = [...pendingImages]
    const currentFiles = [...pendingFiles]
    const allAttachments = [...currentImages, ...currentFiles]
    setInput('')
    setPendingImages([])
    setPendingFiles([])
    setSending(true)
    setError(null)

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      metadata: hasAttachments ? { attachments: allAttachments } : undefined,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMsg])
    scrollToBottom()

    try {
      // All modes (including CONNECTOR) now go through the backend
      const body: any = {}
      if (text) body.content = text
      if (hasAttachments) body.attachments = allAttachments

      const data = await apiFetch(`/api/chat/${agentId}/messages`, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      // Replace temp message with real ones (dedup against socket-delivered messages)
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMsg.id && m.id !== data.userMessage.id && m.id !== data.assistantMessage.id)
        return [...filtered, data.userMessage, data.assistantMessage]
      })
      scrollToBottom()
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to send message'
      setError(errorMsg)
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
      setPendingImages(currentImages)
      setPendingFiles(currentFiles)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = async () => {
    try {
      await apiFetch(`/api/chat/${agentId}/messages`, { method: 'DELETE' })
      setMessages([])
      setClearConfirm(false)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
  }

  // Image upload handling
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const allFiles = Array.from(files)
    const imageFiles = allFiles.filter(f => f.type.startsWith('image/'))
    const nonImageFiles = allFiles.filter(f => !f.type.startsWith('image/'))

    // Upload images
    if (imageFiles.length > 0) {
      if (pendingImages.length + imageFiles.length > 5) {
        setError('Maximum 5 images per message')
        return
      }
      setUploading(true)
      setError(null)
      try {
        const formData = new FormData()
        imageFiles.forEach(f => formData.append('images', f))
        const data = await apiUpload(`/api/chat/${agentId}/upload`, formData)
        setPendingImages(prev => [...prev, ...data.attachments].slice(0, 5))
      } catch (err: any) {
        setError(err.message || 'Failed to upload images')
      }
    }

    // Upload non-image files
    if (nonImageFiles.length > 0) {
      if (pendingFiles.length + nonImageFiles.length > 10) {
        setError('Maximum 10 files per message')
        return
      }
      setUploading(true)
      setError(null)
      try {
        const formData = new FormData()
        nonImageFiles.forEach(f => formData.append('files', f))
        const data = await apiUpload(`/api/chat/${agentId}/upload-files`, formData)
        setPendingFiles(prev => [...prev, ...data.attachments].slice(0, 10))
      } catch (err: any) {
        setError(err.message || 'Failed to upload files')
      }
    }

    setUploading(false)
  }, [agentId, pendingImages.length, pendingFiles.length])

  const removePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index))
  }

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files)
    e.target.value = ''
  }

  const handleGeneralFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files)
    e.target.value = ''
  }

  // Paste file support (images + files)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    const pastedFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile()
        if (file) pastedFiles.push(file)
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault()
      handleFiles(pastedFiles)
    }
  }, [handleFiles])

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false) }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px] max-h-[70vh]">
      {/* Chat header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-navy/30 rounded-t-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-medium text-text">{agentName}</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${agentStatus === 'RUNNING' ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
              <span className="text-[11px] text-text-muted">{agentModel}</span>
              {sessionMode && (
                <span className="text-[10px] text-text-muted ml-1">
                  {sessionMode === 'shared' ? '🔗 Shared' : '🔀 Separate'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openSearch}
            disabled={messages.length === 0}
            className="p-1.5 text-text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Search messages (Ctrl+F)"
          >
            <Search className="w-4 h-4" />
          </button>
          {!clearConfirm ? (
            <button
              onClick={() => setClearConfirm(true)}
              disabled={messages.length === 0}
              className="p-1.5 text-text-muted hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-error">Clear all?</span>
              <button onClick={clearChat} className="text-xs bg-error/10 text-error px-2 py-0.5 rounded hover:bg-error/20 transition-colors">Yes</button>
              <button onClick={() => setClearConfirm(false)} className="text-xs text-text-muted hover:text-text transition-colors">No</button>
            </div>
          )}
        </div>
      </div>

      {/* Bridge connection banner for CONNECTOR mode */}
      {isConnectorMode && (
        <BridgeBanner connected={bridgeConnected} agentId={agentId} />
      )}

      {/* Search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-b border-border bg-card/80 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 px-4 py-2">
              <Search className="w-4 h-4 text-text-muted shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    navigateSearch(e.shiftKey ? 'prev' : 'next')
                  }
                  if (e.key === 'Escape') closeSearch()
                }}
                placeholder="Search messages..."
                className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
              />
              {searchQuery && (
                <span className="text-xs text-text-muted shrink-0 tabular-nums">
                  {searchResults.length > 0
                    ? `${searchResultIndex + 1} of ${searchResults.length}`
                    : 'No results'}
                </span>
              )}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => navigateSearch('prev')}
                  disabled={searchResults.length === 0}
                  className="p-1 text-text-muted hover:text-text transition-colors disabled:opacity-30"
                  title="Previous (Shift+Enter)"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateSearch('next')}
                  disabled={searchResults.length === 0}
                  className="p-1 text-text-muted hover:text-text transition-colors disabled:opacity-30"
                  title="Next (Enter)"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={closeSearch}
                className="p-1 text-text-muted hover:text-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold text-text mb-1">Chat with {agentName}</h3>
            <p className="text-sm text-text-muted max-w-sm">
              Send a message to start a conversation. Your agent will respond based on its configuration and connected model.
            </p>
            <div className="flex flex-wrap gap-2 mt-5 justify-center">
              {['Hello! 👋', 'What can you do?', 'Who are you?'].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion)
                    inputRef.current?.focus()
                  }}
                  className="text-xs bg-primary/5 border border-primary/20 text-primary px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors"
                >
                  <Sparkles className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isSearchMatch = searchQuery && msg.content.toLowerCase().includes(searchQuery.toLowerCase())
              const isActiveMatch = msg.id === activeSearchMsgId
              return (
              <motion.div
                key={msg.id}
                id={`chat-msg-${msg.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${isActiveMatch ? 'ring-2 ring-primary/50 rounded-2xl' : isSearchMatch ? 'ring-1 ring-primary/20 rounded-2xl' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-navy/60 border border-border text-text-secondary rounded-bl-md'
                  }`}
                >
                  {/* Attachments */}
                  {msg.metadata?.attachments && msg.metadata.attachments.length > 0 && (
                    <div className={`flex flex-col gap-1.5 ${msg.content ? 'mb-2' : ''}`}>
                      {/* Image attachments */}
                      {msg.metadata.attachments.filter(a => a.type.startsWith('image/')).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.metadata.attachments.filter(a => a.type.startsWith('image/')).map((att, i) => (
                            <button
                              key={`img-${i}`}
                              onClick={() => setLightboxImage(att.dataUri)}
                              className="relative group rounded-lg overflow-hidden cursor-zoom-in"
                            >
                              <img
                                src={att.dataUri}
                                alt={att.name}
                                className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* File attachments */}
                      {msg.metadata.attachments.filter(a => !a.type.startsWith('image/')).map((att, i) => (
                        <div
                          key={`file-${i}`}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                            msg.role === 'user'
                              ? 'bg-white/10'
                              : 'bg-navy/40 border border-border/50'
                          }`}
                        >
                          <FileTypeIcon type={att.type} className={`w-5 h-5 shrink-0 ${msg.role === 'user' ? 'text-white/70' : 'text-primary'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${msg.role === 'user' ? 'text-white' : 'text-text'}`}>
                              {att.name}
                            </p>
                            <p className={`text-[10px] ${msg.role === 'user' ? 'text-white/50' : 'text-text-muted'}`}>
                              {formatFileSize(att.size)} · {getFileTypeLabel(att.type)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {att.textPreview && (
                              <button
                                onClick={() => setPreviewFile(att)}
                                className={`p-1 rounded transition-colors ${
                                  msg.role === 'user' ? 'hover:bg-white/10 text-white/60' : 'hover:bg-navy/60 text-text-muted'
                                }`}
                                title="Preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <a
                              href={att.dataUri}
                              download={att.name}
                              className={`p-1 rounded transition-colors ${
                                msg.role === 'user' ? 'hover:bg-white/10 text-white/60' : 'hover:bg-navy/60 text-text-muted'
                              }`}
                              title="Download"
                              onClick={e => e.stopPropagation()}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.content && (
                    <div className="break-words">
                      <MessageContent content={msg.content} isUser={msg.role === 'user'} />
                    </div>
                  )}
                  <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-white/50' : 'text-text-muted'}`}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-accent" />
                  </div>
                )}
              </motion.div>
            )})}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        {sending && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-navy/60 border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full p-2 shadow-lg hover:bg-navy/80 transition-colors z-10"
          >
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-3 py-2 text-xs text-error">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-error/60 hover:text-error transition-colors">&times;</button>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={lightboxImage}
              alt="Full size"
              className="max-w-full max-h-full rounded-lg object-contain shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 cursor-pointer"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileTypeIcon type={previewFile.type} className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-text truncate">{previewFile.name}</span>
                  <span className="text-[10px] text-text-muted">{formatFileSize(previewFile.size)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewFile.dataUri}
                    download={previewFile.name}
                    className="p-1.5 text-text-muted hover:text-primary transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="p-1.5 text-text-muted hover:text-text transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {previewFile.textPreview}
                  {previewFile.textPreview && previewFile.size > 2000 && (
                    <span className="text-text-muted italic block mt-2">... truncated (showing first 2KB of {formatFileSize(previewFile.size)})</span>
                  )}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div
        className={`border-t px-4 py-3 bg-navy/20 rounded-b-lg transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Pending images preview */}
        {pendingImages.length > 0 && (
          <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative group shrink-0">
                <img
                  src={img.dataUri}
                  alt={img.name}
                  className="w-14 h-14 rounded-lg object-cover border border-border"
                />
                <button
                  onClick={() => removePendingImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-2">
            {pendingFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-card/60 border border-border rounded-lg px-3 py-1.5 group">
                <FileTypeIcon type={file.type} className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-text truncate flex-1">{file.name}</span>
                <span className="text-[10px] text-text-muted shrink-0">{formatFileSize(file.size)}</span>
                <button
                  onClick={() => removePendingFile(i)}
                  className="p-0.5 text-text-muted hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            <span className="text-xs text-text-muted">Uploading...</span>
          </div>
        )}

        {/* Drag overlay hint */}
        {dragOver && (
          <div className="flex items-center justify-center py-3 mb-2 border-2 border-dashed border-primary/40 rounded-xl bg-primary/5">
            <Paperclip className="w-5 h-5 text-primary mr-2" />
            <span className="text-sm text-primary">Drop files here</span>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* File attachment button */}
          <button
            onClick={() => generalFileInputRef.current?.click()}
            disabled={sending || uploading}
            className="p-2.5 text-text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            title="Attach files (PDF, docs, code, etc.)"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={generalFileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.html,.css,.js,.ts,.jsx,.tsx,.json,.xml,.yaml,.yml,.zip,.gz,.tar,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp3,.wav,.ogg,.mp4,.webm,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.sh,.bat,.ps1,.sql,.env,.log,.ini,.toml,.cfg"
            className="hidden"
            onChange={handleGeneralFileSelect}
          />
          {/* Image upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploading || pendingImages.length >= 5}
            className="p-2.5 text-text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            title="Attach images (max 5)"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={agentStatus === 'RUNNING' ? `Message ${agentName}...` : `Message ${agentName} (demo mode)...`}
              rows={1}
              disabled={sending}
              className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50 resize-none transition-colors disabled:opacity-50 max-h-[150px]"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={(!input.trim() && pendingImages.length === 0) || sending}
            className="bg-primary hover:bg-primary-hover disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl p-2.5 transition-all shrink-0"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-1.5 text-center">
          Enter to send · Shift+Enter new line · Paste or drag files
          {agentStatus !== 'RUNNING' && <span className="text-accent"> · Demo mode</span>}
        </p>
      </div>
    </div>
  )
})

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  if (isToday) return time
  if (isYesterday) return `Yesterday ${time}`
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileTypeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/vnd.ms-powerpoint': 'PowerPoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
    'text/plain': 'Text',
    'text/csv': 'CSV',
    'text/markdown': 'Markdown',
    'text/html': 'HTML',
    'text/css': 'CSS',
    'text/javascript': 'JavaScript',
    'application/json': 'JSON',
    'application/xml': 'XML',
    'application/zip': 'ZIP',
    'application/gzip': 'GZIP',
    'audio/mpeg': 'MP3',
    'audio/wav': 'WAV',
    'video/mp4': 'MP4',
    'video/webm': 'WebM',
  }
  return map[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'File'
}

function BridgeBanner({ connected, agentId }: { connected: boolean | null; agentId: string }) {
  const [health, setHealth] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch health with status
  useEffect(() => {
    if (connected !== true && connected !== false) return
    apiFetch(`/api/chat/${agentId}/bridge-status`)
      .then(data => { if (data.health) setHealth(data.health) })
      .catch(() => {})
  }, [connected, agentId])

  const sendCommand = async (cmd: string) => {
    setActionLoading(true)
    try {
      const res = await apiFetch(`/api/chat/${agentId}/bridge-command`, {
        method: 'POST', body: JSON.stringify({ command: cmd })
      })
      if (res.result?.health) setHealth(res.result.health)
    } catch {}
    setActionLoading(false)
  }

  if (connected === true && health?.gatewayRunning) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 text-xs border-b border-border bg-success/5 text-success">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        🔗 Connected via bridge {health.clawVersion ? `· OpenClaw ${health.clawVersion}` : ''}
        <button onClick={() => sendCommand('restart-gateway')} disabled={actionLoading}
          className="ml-auto text-[10px] bg-warning/10 text-warning px-2.5 py-0.5 rounded-md hover:bg-warning/20 transition-colors disabled:opacity-50 font-medium"
          title="Reset OpenClaw gateway (fixes freezes after updates or token issues)">
          {actionLoading ? '🔄 Restarting...' : '🔄 Reset Gateway'}
        </button>
      </div>
    )
  }

  if (connected === true && health?.status === 'installed-stopped') {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 text-xs border-b border-border bg-warning/5 text-warning">
        <div className="w-1.5 h-1.5 rounded-full bg-warning" />
        😴 OpenClaw is sleeping
        <button onClick={() => sendCommand('start-gateway')} disabled={actionLoading}
          className="ml-auto text-[10px] bg-warning/20 px-2 py-0.5 rounded hover:bg-warning/30 transition-colors disabled:opacity-50">
          {actionLoading ? 'Starting...' : '⚡ Wake Up'}
        </button>
      </div>
    )
  }

  if (connected === true && health?.status === 'not-installed') {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 text-xs border-b border-border bg-error/5 text-error">
        <div className="w-1.5 h-1.5 rounded-full bg-error" />
        📦 OpenClaw not installed
        <button onClick={() => sendCommand('install-openclaw')} disabled={actionLoading}
          className="ml-auto text-[10px] bg-error/20 px-2 py-0.5 rounded hover:bg-error/30 transition-colors disabled:opacity-50">
          {actionLoading ? 'Installing...' : '📥 Install Now'}
        </button>
      </div>
    )
  }

  if (connected === false || connected === null) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 text-xs border-b border-border bg-warning/5 text-warning">
        <div className={`w-1.5 h-1.5 rounded-full ${connected === false ? 'bg-warning' : 'bg-text-muted'}`} />
        {connected === false
          ? '🔌 Bridge not connected. Is the bridge script running on your PC?'
          : '⏳ Checking bridge status...'}
      </div>
    )
  }

  return null
}

function FileTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type.startsWith('text/') || type === 'application/json' || type === 'application/xml') {
    if (type === 'text/javascript' || type === 'text/css' || type === 'text/html' || type === 'application/json' || type === 'application/xml') {
      return <FileCode className={className} />
    }
    return <FileText className={className} />
  }
  if (type === 'text/csv' || type.includes('spreadsheet') || type.includes('excel')) {
    return <FileSpreadsheet className={className} />
  }
  if (type === 'application/pdf' || type.includes('word') || type.includes('document')) {
    return <FileText className={className} />
  }
  return <File className={className} />
}

export default ChatPanel
