import { useState, useEffect } from 'react'
import { Brain, Save, RotateCcw as Restore, Download, Upload, File, Folder, Clock, Edit } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface MemoryFile {
  filePath: string
  fileSize: number
  updatedAt: string
}

interface MemorySnapshot {
  id: string
  snapshotType: string
  description?: string
  files: Array<{
    filePath: string
    content: string
    checksum: string
  }>
  createdAt: string
}

interface MemoryManagerProps {
  agentId: string
}

export default function MemoryManager({ agentId }: MemoryManagerProps) {
  const [files, setFiles] = useState<MemoryFile[]>([])
  const [snapshots, setSnapshots] = useState<MemorySnapshot[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [totalSize, setTotalSize] = useState(0)
  const [action, setAction] = useState<string | null>(null)

  const fetchMemoryFiles = async () => {
    try {
      const response = await apiFetch(`/memory/agents/${agentId}/memory`)
      setFiles(response.files)
      setTotalSize(response.totalSize)
    } catch (error) {
      console.error('Failed to fetch memory files:', error)
    }
  }

  const fetchSnapshots = async () => {
    try {
      const response = await apiFetch(`/memory/agents/${agentId}/memory/snapshots`)
      setSnapshots(response.snapshots)
    } catch (error) {
      console.error('Failed to fetch snapshots:', error)
    }
  }

  const fetchFileContent = async (filePath: string) => {
    try {
      setLoading(true)
      const response = await apiFetch(`/memory/agents/${agentId}/memory/${encodeURIComponent(filePath)}`)
      setFileContent(response.content)
      setSelectedFile(filePath)
    } catch (error) {
      console.error('Failed to fetch file content:', error)
      setFileContent('')
    } finally {
      setLoading(false)
    }
  }

  const saveFileContent = async () => {
    if (!selectedFile) return

    try {
      setSaving(true)
      await apiFetch(`/memory/agents/${agentId}/memory/${encodeURIComponent(selectedFile)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent })
      })
      setIsEditing(false)
      await fetchMemoryFiles() // Refresh file list
    } catch (error) {
      console.error('Failed to save file:', error)
    } finally {
      setSaving(false)
    }
  }

  const createSnapshot = async () => {
    try {
      setAction('snapshot')
      await apiFetch(`/memory/agents/${agentId}/memory/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          snapshotType: 'manual',
          description: `Manual snapshot - ${new Date().toLocaleString()}`
        })
      })
      await fetchSnapshots()
    } catch (error) {
      console.error('Failed to create snapshot:', error)
    } finally {
      setAction(null)
    }
  }

  const restoreSnapshot = async (snapshotId: string) => {
    try {
      setAction(`restore-${snapshotId}`)
      await apiFetch(`/memory/agents/${agentId}/memory/snapshots/${snapshotId}/restore`, {
        method: 'POST'
      })
      await fetchMemoryFiles()
      setSelectedFile(null)
      setFileContent('')
    } catch (error) {
      console.error('Failed to restore snapshot:', error)
    } finally {
      setAction(null)
    }
  }

  const syncFromFileSystem = async () => {
    try {
      setAction('sync-from')
      await apiFetch(`/memory/agents/${agentId}/memory/sync-from-filesystem`, {
        method: 'POST'
      })
      await fetchMemoryFiles()
    } catch (error) {
      console.error('Failed to sync from filesystem:', error)
    } finally {
      setAction(null)
    }
  }

  const syncToFileSystem = async () => {
    try {
      setAction('sync-to')
      await apiFetch(`/memory/agents/${agentId}/memory/sync-to-filesystem`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Failed to sync to filesystem:', error)
    } finally {
      setAction(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  useEffect(() => {
    fetchMemoryFiles()
    fetchSnapshots()
  }, [agentId])

  useEffect(() => {
    setLoading(false)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text">Memory Management</h3>
          <p className="text-sm text-text-muted">Manage agent memory files and snapshots</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Brain className="w-4 h-4" />
          {files.length} files • {formatFileSize(totalSize)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted rounded-lg">
        <button
          onClick={createSnapshot}
          disabled={action === 'snapshot'}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {action === 'snapshot' ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Create Snapshot
        </button>

        <button
          onClick={syncFromFileSystem}
          disabled={action === 'sync-from'}
          className="flex items-center gap-2 bg-card border border-border text-text px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {action === 'sync-from' ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Sync From Container
        </button>

        <button
          onClick={syncToFileSystem}
          disabled={action === 'sync-to'}
          className="flex items-center gap-2 bg-card border border-border text-text px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {action === 'sync-to' ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Sync To Container
        </button>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Files */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border">
            <h4 className="font-semibold text-text flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Memory Files
            </h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {files.length === 0 ? (
              <div className="p-4 text-center text-text-muted">
                <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No memory files found</p>
              </div>
            ) : (
              files.map((file) => (
                <button
                  key={file.filePath}
                  onClick={() => fetchFileContent(file.filePath)}
                  className={`w-full p-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0 ${
                    selectedFile === file.filePath ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text truncate">{file.filePath}</div>
                      <div className="text-xs text-text-muted">
                        {formatFileSize(file.fileSize)} • {formatDate(file.updatedAt)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Memory Snapshots */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border">
            <h4 className="font-semibold text-text flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Memory Snapshots
            </h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {snapshots.length === 0 ? (
              <div className="p-4 text-center text-text-muted">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No snapshots found</p>
              </div>
            ) : (
              snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="p-3 border-b border-border last:border-b-0 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text">
                        {snapshot.snapshotType} snapshot
                      </div>
                      <div className="text-xs text-text-muted">
                        {formatDate(snapshot.createdAt)} • {snapshot.files.length} files
                      </div>
                      {snapshot.description && (
                        <div className="text-xs text-text-muted mt-1">{snapshot.description}</div>
                      )}
                    </div>
                    <button
                      onClick={() => restoreSnapshot(snapshot.id)}
                      disabled={action === `restore-${snapshot.id}`}
                      className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors"
                    >
                      {action === `restore-${snapshot.id}` ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Restore className="w-3 h-3" />
                      )}
                      Restore
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* File Content Viewer/Editor */}
      {selectedFile && (
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h4 className="font-semibold text-text flex items-center gap-2">
              <File className="w-4 h-4" />
              {selectedFile}
            </h4>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      fetchFileContent(selectedFile) // Reset content
                    }}
                    className="text-sm text-text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveFileContent}
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-card border border-border text-text px-3 py-1 rounded text-sm font-medium hover:bg-muted"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {isEditing ? (
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="w-full h-64 p-3 bg-muted border border-border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="File content..."
                  />
                ) : (
                  <pre className="bg-muted p-3 rounded-lg text-sm overflow-auto max-h-64 whitespace-pre-wrap">
                    {fileContent || <span className="text-text-muted italic">Empty file</span>}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}