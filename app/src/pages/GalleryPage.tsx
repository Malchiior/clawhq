import { useState, useEffect } from 'react'
import { Image as ImageIcon, Plus, Trash2, X, ExternalLink } from 'lucide-react'

interface MediaItem { id: string; url: string; title: string; tags: string[]; addedAt: string }

const KEY = 'clawhq-gallery'
function load(): MediaItem[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function save(m: MediaItem[]) { localStorage.setItem(KEY, JSON.stringify(m)) }

export default function GalleryPage() {
  const [items, setItems] = useState<MediaItem[]>(load)
  const [showNew, setShowNew] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => { save(items) }, [items])

  const add = () => {
    if (!url.trim()) return
    setItems(p => [...p, { id: Date.now().toString(), url: url.trim(), title: title.trim() || 'Untitled', tags: tags.split(',').map(t => t.trim()).filter(Boolean), addedAt: new Date().toISOString() }])
    setUrl(''); setTitle(''); setTags(''); setShowNew(false)
  }

  const remove = (id: string) => setItems(p => p.filter(i => i.id !== id))
  const allTags = [...new Set(items.flatMap(i => i.tags))]
  const filtered = filter ? items.filter(i => i.tags.includes(filter)) : items

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ImageIcon size={28} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text)]">Gallery</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-semibold rounded-lg px-4 py-2 text-sm flex items-center gap-2"><Plus size={16} /> Add Media</button>
      </div>

      {allTags.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setFilter('')} className={`px-3 py-1 rounded-full text-xs ${!filter ? 'bg-[var(--accent)] text-black font-semibold' : 'bg-[var(--card)] text-[var(--text-muted)] border border-[var(--border)]'}`}>All</button>
          {allTags.map(t => <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1 rounded-full text-xs ${filter === t ? 'bg-[var(--accent)] text-black font-semibold' : 'bg-[var(--card)] text-[var(--text-muted)] border border-[var(--border)]'}`}>{t}</button>)}
        </div>
      )}

      {showNew && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6 space-y-4">
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Image URL..." className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title..." className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma separated)..." className="w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-[var(--accent)]" />
          <div className="flex gap-2">
            <button onClick={add} className="bg-[var(--accent)] text-black font-semibold rounded-lg px-4 py-2 text-sm">Add</button>
            <button onClick={() => setShowNew(false)} className="text-[var(--text-muted)] text-sm">Cancel</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <ImageIcon size={48} className="mx-auto text-[var(--text-dim)] mb-4" />
          <p className="text-[var(--text-muted)]">No media yet. Add images via URL.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden group">
              <div className="aspect-square relative cursor-pointer" onClick={() => setPreview(item.url)}>
                <img src={item.url} alt={item.title} className="w-full h-full object-cover" onError={e => (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="25" font-size="40">🖼️</text></svg>'} />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink className="text-white" size={24} />
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--text)] truncate">{item.title}</h3>
                  <button onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 size={14} /></button>
                </div>
                {item.tags.length > 0 && <div className="flex gap-1 mt-1 flex-wrap">{item.tags.map(t => <span key={t} className="text-[10px] bg-[var(--border)] text-[var(--text-dim)] px-1.5 py-0.5 rounded">{t}</span>)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 text-white"><X size={24} /></button>
          <img src={preview} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  )
}
