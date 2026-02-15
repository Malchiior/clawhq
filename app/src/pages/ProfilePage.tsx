import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import {
  Mail, Building2, Crown, Calendar, Edit3, Camera, Check, Loader2, Shield,
  BarChart3, Bot, MessageSquare, Clock, Palette, Globe, ExternalLink
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface ProfileData {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  businessName: string | null
  brandColor: string
  customDomain: string | null
  plan: string
  createdAt: string
  emailVerified: boolean
}

interface UsageStats {
  agents: number
  maxAgents: number
  channels: number
  messagesToday: number
  messagesLimit: number
  tokensThisMonth: number
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

const planConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  free: { label: 'Free', color: 'text-text-secondary', bg: 'bg-white/5', border: 'border-border' },
  pro: { label: 'Pro', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
  business: { label: 'Business', color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/30' },
  enterprise: { label: 'Enterprise', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', businessName: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      apiFetch('/api/users/profile').catch(() => ({ user: null })),
      apiFetch('/api/users/usage').catch(() => ({ usage: null })),
    ]).then(([profileData, usageData]) => {
      if (profileData.user) {
        setProfile(profileData.user)
        setForm({ name: profileData.user.name || '', businessName: profileData.user.businessName || '' })
      }
      if (usageData.usage) setUsage(usageData.usage)
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = await apiFetch('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(form),
      })
      setProfile(data.user)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* */ }
    setSaving(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const data = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('clawhq_token')}` },
        body: formData,
      }).then(r => r.json())
      if (data.avatarUrl) {
        setProfile(prev => prev ? { ...prev, avatarUrl: data.avatarUrl } : prev)
      }
    } catch { /* */ }
    setAvatarUploading(false)
  }

  const plan = planConfig[profile?.plan || 'free'] || planConfig.free

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const initials = (profile?.name || user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-6 page-enter">
      {/* Header Card */}
      <motion.div variants={item} className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Banner gradient */}
        <div className="h-28 bg-gradient-to-r from-primary/30 via-primary/10 to-accent/20 relative" />

        <div className="px-6 pb-6">
          {/* Avatar + Name */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl border-4 border-card bg-navy flex items-center justify-center text-2xl font-bold text-primary overflow-hidden shadow-lg">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {avatarUploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>

            <div className="flex-1 sm:pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                {editing ? (
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="text-xl font-bold text-text bg-navy/50 border border-border rounded-lg px-3 py-1 focus:outline-none focus:border-primary/50"
                    autoFocus
                  />
                ) : (
                  <h1 className="text-xl font-bold text-text">{profile?.name || 'Unnamed User'}</h1>
                )}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${plan.bg} ${plan.color} ${plan.border} border`}>
                  <Crown className="w-3 h-3 inline -mt-0.5 mr-1" />
                  {plan.label}
                </span>
                {saved && (
                  <span className="text-xs text-success flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-text-muted">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{profile?.email}</span>
                {profile?.emailVerified && (
                  <span className="flex items-center gap-1 text-success text-xs"><Shield className="w-3 h-3" /> Verified</span>
                )}
              </div>
            </div>

            <div className="flex gap-2 sm:pb-1">
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="text-sm text-text-muted hover:text-text px-3 py-1.5 rounded-lg border border-border transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="text-sm bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="text-sm text-text-secondary hover:text-text px-3 py-1.5 rounded-lg border border-border hover:border-border-light transition-colors flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 text-text-secondary mb-3">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Business</span>
          </div>
          {editing ? (
            <input
              type="text"
              value={form.businessName}
              onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
              placeholder="Your Company"
              className="w-full text-sm text-text bg-navy/50 border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50"
            />
          ) : (
            <p className="text-sm font-medium text-text">{profile?.businessName || <span className="text-text-muted italic">Not set</span>}</p>
          )}
        </motion.div>

        <motion.div variants={item} className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 text-text-secondary mb-3">
            <Palette className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Brand Color</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: profile?.brandColor || '#6366f1' }} />
            <span className="text-sm font-mono text-text">{profile?.brandColor || '#6366f1'}</span>
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 text-text-secondary mb-3">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Member Since</span>
          </div>
          <p className="text-sm font-medium text-text">{memberSince}</p>
        </motion.div>

        {profile?.customDomain && (
          <motion.div variants={item} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 text-text-secondary mb-3">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Custom Domain</span>
            </div>
            <a href={`https://${profile.customDomain}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline flex items-center gap-1.5">
              {profile.customDomain} <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>
        )}
      </div>

      {/* Usage Overview */}
      {usage && (
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-primary" /> Usage Overview
            </h2>
            <Link to="/usage" className="text-xs text-primary hover:text-primary-hover transition-colors">View Details →</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-navy/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <Bot className="w-3.5 h-3.5" />
                <span className="text-xs">Agents</span>
              </div>
              <p className="text-lg font-bold text-text">{usage.agents}<span className="text-sm font-normal text-text-muted">/{usage.maxAgents}</span></p>
              <div className="mt-2 h-1.5 bg-navy rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((usage.agents / usage.maxAgents) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="bg-navy/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-xs">Messages Today</span>
              </div>
              <p className="text-lg font-bold text-text">{usage.messagesToday.toLocaleString()}<span className="text-sm font-normal text-text-muted">/{usage.messagesLimit.toLocaleString()}</span></p>
              <div className="mt-2 h-1.5 bg-navy rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min((usage.messagesToday / usage.messagesLimit) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="bg-navy/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <Radio className="w-3.5 h-3.5" />
                <span className="text-xs">Channels</span>
              </div>
              <p className="text-lg font-bold text-text">{usage.channels}</p>
            </div>
            <div className="bg-navy/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">Tokens This Month</span>
              </div>
              <p className="text-lg font-bold text-text">{(usage.tokensThisMonth / 1000).toFixed(1)}k</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Links */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/settings" className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors group">
          <h3 className="text-sm font-medium text-text group-hover:text-primary transition-colors">Account Settings</h3>
          <p className="text-xs text-text-muted mt-1">Security, API keys, and more</p>
        </Link>
        <Link to="/billing" className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors group">
          <h3 className="text-sm font-medium text-text group-hover:text-primary transition-colors">Billing & Plans</h3>
          <p className="text-xs text-text-muted mt-1">Manage subscription and payments</p>
        </Link>
        <Link to="/branding" className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors group">
          <h3 className="text-sm font-medium text-text group-hover:text-primary transition-colors">Branding</h3>
          <p className="text-xs text-text-muted mt-1">Customize colors, logo, and domain</p>
        </Link>
      </motion.div>
    </motion.div>
  )
}

function Radio({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" /><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" /><circle cx="12" cy="12" r="2" />
    </svg>
  )
}
