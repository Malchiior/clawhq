import { motion } from 'framer-motion'
import { Palette, Upload, Eye, Trash2, Loader2, Check, Image, Type, Globe, Sparkles } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '../lib/api'

interface BrandSettings {
  businessName: string
  brandColor: string
  logoUrl: string | null
  customDomain: string | null
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function generatePalette(hex: string) {
  const [h, s] = hexToHsl(hex)
  return {
    primary: hex,
    primaryLight: `hsl(${h}, ${Math.min(s + 10, 100)}%, 65%)`,
    primaryDark: `hsl(${h}, ${s}%, 35%)`,
    primaryBg: `hsl(${h}, ${Math.min(s, 40)}%, 8%)`,
    primaryBgHover: `hsl(${h}, ${Math.min(s, 40)}%, 12%)`,
    accent: `hsl(${(h + 30) % 360}, ${s}%, 55%)`,
  }
}

const presetColors = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Slate', hex: '#64748b' },
]

export default function BrandingPage() {
  const [brand, setBrand] = useState<BrandSettings>({
    businessName: '', brandColor: '#6366f1', logoUrl: null, customDomain: null,
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiFetch('/api/users/profile').then(data => {
      if (data.user) {
        setBrand({
          businessName: data.user.businessName || '',
          brandColor: data.user.brandColor || '#6366f1',
          logoUrl: data.user.logoUrl || null,
          customDomain: data.user.customDomain || null,
        })
        if (data.user.logoUrl) setLogoPreview(data.user.logoUrl)
      }
    }).finally(() => setLoading(false))
  }, [])

  const palette = generatePalette(brand.brandColor)

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 2 * 1024 * 1024) { alert('Logo must be under 2MB'); return }

    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUri = reader.result as string
      setLogoPreview(dataUri)
      try {
        await apiFetch('/api/users/profile/logo', {
          method: 'POST',
          body: JSON.stringify({ logo: dataUri }),
        })
        setBrand(b => ({ ...b, logoUrl: dataUri }))
      } catch { /* */ }
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }, [])

  const removeLogo = async () => {
    try {
      await apiFetch('/api/users/profile/logo', { method: 'DELETE' })
      setBrand(b => ({ ...b, logoUrl: null }))
      setLogoPreview(null)
    } catch { /* */ }
  }

  const saveBrand = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          businessName: brand.businessName,
          brandColor: brand.brandColor,
          customDomain: brand.customDomain,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* */ }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" /> White-Label Branding
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Customize how your agents appear to your end users. Your brand, your identity.
          </p>
        </div>
        <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors">
          <Eye className="w-4 h-4" /> {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1 max-w-2xl'}`}>
        {/* Settings Panel */}
        <div className={`space-y-5 ${showPreview ? 'lg:col-span-3' : ''}`}>
          {/* Logo */}
          <motion.div variants={item} className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-text">Logo</h2>
            </div>
            <div className="flex items-center gap-5">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors overflow-hidden bg-navy/30 shrink-0"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Upload className="w-6 h-6 text-text-muted" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-text">
                  {logoPreview ? 'Logo uploaded' : 'Upload your logo'}
                </p>
                <p className="text-xs text-text-muted">PNG, JPG, or SVG. Max 2MB. Recommended: 256x256px square.</p>
                <div className="flex gap-2">
                  <button onClick={() => fileRef.current?.click()} className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-md transition-colors">
                    {logoPreview ? 'Replace' : 'Upload'}
                  </button>
                  {logoPreview && (
                    <button onClick={removeLogo} className="text-xs bg-error/10 hover:bg-error/20 text-error px-3 py-1 rounded-md transition-colors flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </div>
          </motion.div>

          {/* Business Name */}
          <motion.div variants={item} className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-text">Business Identity</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Business Name</label>
                <input
                  type="text"
                  value={brand.businessName}
                  onChange={e => setBrand(b => ({ ...b, businessName: e.target.value }))}
                  placeholder="Your Company Name"
                  className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50 placeholder:text-text-muted"
                />
                <p className="text-xs text-text-muted mt-1">This appears in your agent chat headers, emails, and branded pages.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  <Globe className="w-3.5 h-3.5 inline mr-1" />Custom Domain
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-muted">https://</span>
                  <input
                    type="text"
                    value={brand.customDomain || ''}
                    onChange={e => setBrand(b => ({ ...b, customDomain: e.target.value || null }))}
                    placeholder="agents.yourdomain.com"
                    className="flex-1 bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50 placeholder:text-text-muted"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">Point a CNAME record to <code className="text-primary/80">custom.clawhq.dev</code> to use your domain.</p>
              </div>
            </div>
          </motion.div>

          {/* Brand Color */}
          <motion.div variants={item} className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-text">Brand Color</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brand.brandColor}
                  onChange={e => setBrand(b => ({ ...b, brandColor: e.target.value }))}
                  className="w-12 h-12 rounded-xl border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={brand.brandColor}
                  onChange={e => setBrand(b => ({ ...b, brandColor: e.target.value }))}
                  className="w-32 bg-navy/50 border border-border rounded-lg px-3 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <p className="text-xs text-text-muted mb-2">Quick presets</p>
                <div className="flex flex-wrap gap-2">
                  {presetColors.map(c => (
                    <button
                      key={c.hex}
                      onClick={() => setBrand(b => ({ ...b, brandColor: c.hex }))}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${brand.brandColor === c.hex ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-2">Generated palette</p>
                <div className="flex gap-2">
                  {Object.entries(palette).map(([key, val]) => (
                    <div key={key} className="text-center">
                      <div className="w-10 h-10 rounded-lg border border-white/10" style={{ backgroundColor: val }} />
                      <p className="text-[10px] text-text-muted mt-1">{key.replace('primary', '').replace(/([A-Z])/g, ' $1').trim() || 'Base'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Save */}
          <motion.div variants={item}>
            <button
              onClick={saveBrand}
              disabled={saving}
              className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Branding'}
            </button>
          </motion.div>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <motion.div variants={item} className="lg:col-span-2 space-y-4">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Live Preview</p>

            {/* Chat Widget Preview */}
            <div className="rounded-xl border border-border overflow-hidden" style={{ backgroundColor: palette.primaryBg }}>
              {/* Header */}
              <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: brand.brandColor }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                    {(brand.businessName || 'C')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-white text-sm font-semibold">{brand.businessName || 'Your Company'}</p>
                  <p className="text-white/70 text-[10px]">AI Assistant</p>
                </div>
                <div className="ml-auto w-2 h-2 rounded-full bg-green-400" />
              </div>

              {/* Messages */}
              <div className="p-4 space-y-3 min-h-[200px]">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: brand.brandColor }}>
                    {(brand.businessName || 'C')[0].toUpperCase()}
                  </div>
                  <div className="rounded-lg rounded-tl-sm px-3 py-2 text-xs max-w-[80%]" style={{ backgroundColor: palette.primaryBgHover, color: '#e2e8f0' }}>
                    Hi! I'm your {brand.businessName || 'Company'} assistant. How can I help you today?
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-lg rounded-tr-sm px-3 py-2 text-xs text-white max-w-[80%]" style={{ backgroundColor: brand.brandColor }}>
                    I need help with my account
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: brand.brandColor }}>
                    {(brand.businessName || 'C')[0].toUpperCase()}
                  </div>
                  <div className="rounded-lg rounded-tl-sm px-3 py-2 text-xs max-w-[80%]" style={{ backgroundColor: palette.primaryBgHover, color: '#e2e8f0' }}>
                    Of course! Let me pull up your details. One moment...
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="px-4 pb-4">
                <div className="rounded-lg px-3 py-2 text-xs flex items-center justify-between" style={{ backgroundColor: palette.primaryBgHover, border: `1px solid ${brand.brandColor}30` }}>
                  <span style={{ color: '#94a3b8' }}>Type a message...</span>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: brand.brandColor }}>
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </div>
                </div>
                <p className="text-center mt-2" style={{ color: '#475569', fontSize: '9px' }}>
                  Powered by {brand.businessName || 'ClawHQ'}
                </p>
              </div>
            </div>

            {/* Email Preview */}
            <div className="rounded-xl border border-border overflow-hidden bg-white">
              <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: '#e2e8f0' }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="w-6 h-6 rounded object-contain" />
                ) : (
                  <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: brand.brandColor }}>
                    {(brand.businessName || 'C')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-semibold" style={{ color: '#1e293b' }}>{brand.businessName || 'Your Company'}</span>
              </div>
              <div className="p-4">
                <p className="text-[11px] text-gray-700 mb-2">Welcome aboard! Your AI agent is ready.</p>
                <div className="rounded-md px-3 py-2 text-[10px] text-white text-center font-medium" style={{ backgroundColor: brand.brandColor }}>
                  Go to Dashboard →
                </div>
              </div>
              <div className="px-4 py-2 text-center" style={{ backgroundColor: '#f8fafc' }}>
                <p className="text-[9px] text-gray-400">
                  {brand.customDomain ? `https://${brand.customDomain}` : `${(brand.businessName || 'company').toLowerCase().replace(/\s+/g, '')}.clawhq.dev`}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
