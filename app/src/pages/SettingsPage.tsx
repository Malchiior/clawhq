import { motion } from 'framer-motion'
import { User, Key, Users, Shield, Bell, Copy, Plus, Trash2, Loader2, Check, Eye, EyeOff, Sun, Moon, CreditCard, ExternalLink, AlertTriangle, RotateCcw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'

interface UserProfile {
  id: string
  name: string
  email: string
  businessName: string | null
  brandColor: string | null
  customDomain: string | null
  plan: string
}

interface ApiKeyItem {
  id: string
  name: string
  key: string
  lastUsedAt: string | null
  createdAt: string
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function SettingsPage() {
  const [tab, setTab] = useState<'account' | 'notifications' | 'api' | 'team' | 'security'>('account')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileForm, setProfileForm] = useState({ name: '', businessName: '', customDomain: '', brandColor: '' })
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null)
  const [showNewKey, setShowNewKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(true)
  const [notifications, setNotifications] = useState({
    emailDigest: true,
    agentErrors: true,
    usageAlerts: true,
    productUpdates: false,
    weeklyReport: true,
  })

  useEffect(() => {
    Promise.all([
      apiFetch('/api/users/profile').catch(() => ({ user: null })),
      apiFetch('/api/users/api-keys').catch(() => ({ keys: [] })),
    ]).then(([profileData, keysData]) => {
      if (profileData.user) {
        setProfile(profileData.user)
        setProfileForm({
          name: profileData.user.name || '',
          businessName: profileData.user.businessName || '',
          customDomain: profileData.user.customDomain || '',
          brandColor: profileData.user.brandColor || '#6366f1',
        })
      }
      setApiKeys(keysData.keys || [])
    }).finally(() => setLoading(false))
  }, [])

  const saveProfile = async () => {
    setProfileStatus('saving')
    try {
      const data = await apiFetch('/api/users/profile', { method: 'PATCH', body: JSON.stringify(profileForm) })
      setProfile(data.user)
      setProfileStatus('saved')
      setTimeout(() => setProfileStatus('idle'), 2000)
    } catch {
      setProfileStatus('error')
      setTimeout(() => setProfileStatus('idle'), 3000)
    }
  }

  const createApiKey = async () => {
    try {
      const data = await apiFetch('/api/users/api-keys', { method: 'POST', body: JSON.stringify({ name: newKeyName || 'Unnamed Key' }) })
      setNewKeyResult(data.apiKey.key)
      setNewKeyName('')
      const keysData = await apiFetch('/api/users/api-keys')
      setApiKeys(keysData.keys)
    } catch { /* */ }
  }

  const deleteApiKey = async (id: string) => {
    try {
      await apiFetch(`/api/users/api-keys/${id}`, { method: 'DELETE' })
      setApiKeys(prev => prev.filter(k => k.id !== id))
    } catch { /* */ }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full relative transition-colors ${checked ? 'bg-primary' : 'bg-border'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${checked ? 'left-5' : 'left-1'}`} />
    </button>
  )

  const tabs = [
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'api' as const, label: 'API Keys', icon: Key },
    { id: 'team' as const, label: 'Team', icon: Users },
    { id: 'security' as const, label: 'Security', icon: Shield },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        <div className="w-48 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${tab === t.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text hover:bg-white/5'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}

          {/* Quick links */}
          <div className="pt-3 mt-3 border-t border-border space-y-1">
            <Link to="/billing" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text hover:bg-white/5 transition-colors">
              <CreditCard className="w-4 h-4" /> Billing
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </Link>
            <Link to="/api-keys" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text hover:bg-white/5 transition-colors">
              <Key className="w-4 h-4" /> API Keys Page
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </Link>
          </div>
        </div>

        <div className="flex-1">
          {tab === 'account' && (
            <motion.div variants={item} className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                <h2 className="font-semibold text-text">Account Settings</h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                    {(profile?.name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{profile?.email}</p>
                    <p className="text-xs text-text-muted capitalize">{profile?.plan || 'free'} plan</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
                    <input type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                    <input type="email" value={profile?.email || ''} disabled className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text-muted focus:outline-none cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Business Name</label>
                    <input type="text" value={profileForm.businessName} onChange={e => setProfileForm(p => ({ ...p, businessName: e.target.value }))} className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" placeholder="Your Company" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Brand Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={profileForm.brandColor} onChange={e => setProfileForm(p => ({ ...p, brandColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                      <input type="text" value={profileForm.brandColor} onChange={e => setProfileForm(p => ({ ...p, brandColor: e.target.value }))} className="flex-1 bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-primary/50" />
                    </div>
                  </div>
                </div>
                <button onClick={saveProfile} disabled={profileStatus === 'saving'} className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                  {profileStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {profileStatus === 'saved' ? <><Check className="w-4 h-4" /> Saved!</> : profileStatus === 'error' ? 'Error — Try Again' : 'Save Changes'}
                </button>
              </div>

              {/* Theme Toggle */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold text-text mb-4">Appearance</h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-accent" />}
                    <div>
                      <p className="text-sm font-medium text-text">{darkMode ? 'Dark Mode' : 'Light Mode'}</p>
                      <p className="text-xs text-text-muted">Toggle between dark and light themes</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={darkMode} onChange={setDarkMode} />
                </div>
              </div>

              {/* Setup */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <RotateCcw className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-text">Setup</h2>
                </div>
                <p className="text-sm text-text-muted mb-4">Re-run the setup wizard to change your deployment mode or reconfigure your agent.</p>
                <button
                  onClick={async () => {
                    if (!confirm('This will reset your setup and take you back to the setup wizard. Continue?')) return
                    try {
                      await apiFetch('/api/setup/reset', { method: 'POST' })
                      window.location.href = '/setup'
                    } catch {}
                  }}
                  className="bg-primary/10 border border-primary/20 text-primary text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Re-run Setup Wizard
                </button>
              </div>

              {/* Danger Zone */}
              <div className="bg-card border border-error/20 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-error" />
                  <h2 className="font-semibold text-error">Danger Zone</h2>
                </div>
                <p className="text-sm text-text-muted mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                <button className="bg-error/10 border border-error/20 text-error text-sm font-medium px-4 py-2 rounded-lg hover:bg-error/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Delete Account
                </button>
              </div>
            </motion.div>
          )}

          {tab === 'notifications' && (
            <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h2 className="font-semibold text-text">Notification Preferences</h2>
              <p className="text-sm text-text-muted">Choose what notifications you'd like to receive.</p>
              <div className="space-y-4">
                {[
                  { key: 'emailDigest' as const, label: 'Daily Email Digest', desc: 'Get a daily summary of agent activity' },
                  { key: 'agentErrors' as const, label: 'Agent Error Alerts', desc: 'Get notified when an agent encounters an error' },
                  { key: 'usageAlerts' as const, label: 'Usage Alerts', desc: 'Alerts when approaching plan limits' },
                  { key: 'weeklyReport' as const, label: 'Weekly Report', desc: 'Weekly summary of performance metrics' },
                  { key: 'productUpdates' as const, label: 'Product Updates', desc: 'News about new features and improvements' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-text">{n.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{n.desc}</p>
                    </div>
                    <ToggleSwitch
                      checked={notifications[n.key]}
                      onChange={(v) => setNotifications(prev => ({ ...prev, [n.key]: v }))}
                    />
                  </div>
                ))}
              </div>
              <button className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
                Save Preferences
              </button>
            </motion.div>
          )}

          {tab === 'api' && (
            <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-text">API Keys</h2>
              </div>

              <div className="bg-navy/50 border border-border rounded-lg p-4">
                <p className="text-sm font-medium text-text mb-3">Create New API Key</p>
                <div className="flex gap-2">
                  <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name (e.g., Production)" className="flex-1 bg-navy border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50" />
                  <button onClick={createApiKey} className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-3 py-2 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <Plus className="w-3.5 h-3.5" /> Create
                  </button>
                </div>
                {newKeyResult && (
                  <div className="mt-3 p-3 bg-success/5 border border-success/20 rounded-lg">
                    <p className="text-xs text-success mb-2">Key created! Copy it now — you won't see it again.</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono text-text bg-navy/50 px-2 py-1 rounded overflow-x-auto">
                        {showNewKey ? newKeyResult : newKeyResult.slice(0, 12) + '•'.repeat(20)}
                      </code>
                      <button onClick={() => setShowNewKey(!showNewKey)} className="p-1 text-text-muted hover:text-text transition-colors">
                        {showNewKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => { copyToClipboard(newKeyResult, 'new'); }} className="p-1 text-text-muted hover:text-text transition-colors">
                        {copiedId === 'new' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-text-muted">No API keys yet. Create one to get started.</p>
                  </div>
                ) : (
                  apiKeys.map(k => (
                    <div key={k.id} className="bg-navy/50 border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-text text-sm">{k.name}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => copyToClipboard(k.key, k.id)} className="p-1 text-text-muted hover:text-text transition-colors">
                            {copiedId === k.id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => deleteApiKey(k.id)} className="p-1 text-text-muted hover:text-error transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-text-muted">{k.key}</p>
                      <div className="flex gap-4 mt-2 text-[10px] text-text-muted">
                        <span>Last used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</span>
                        <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {tab === 'team' && (
            <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-text">Team Members</h2>
                <button className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <Plus className="w-3.5 h-3.5" /> Invite
                </button>
              </div>
              <div className="divide-y divide-border">
                {profile && (
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">{(profile.name || 'U')[0].toUpperCase()}</div>
                      <div>
                        <p className="text-sm font-medium text-text">{profile.name || 'You'}</p>
                        <p className="text-xs text-text-muted">{profile.email}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">Owner</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-text-muted">Team management is available on the Business plan and above.</p>
            </motion.div>
          )}

          {tab === 'security' && (
            <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h2 className="font-semibold text-text">Security</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Current Password</label>
                  <input type="password" className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
                  <input type="password" className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" placeholder="••••••••" />
                </div>
                <button className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]">Update Password</button>
              </div>
              <div className="pt-4 border-t border-border">
                <h3 className="font-medium text-text text-sm mb-2">Active Sessions</h3>
                <p className="text-xs text-text-muted mb-3">Manage your active sessions across devices</p>
                <button className="bg-card border border-border text-text text-sm px-4 py-2 rounded-lg hover:border-error/30 hover:text-error transition-all hover:scale-[1.02] active:scale-[0.98]">Revoke All Other Sessions</button>
              </div>
              <div className="pt-4 border-t border-border">
                <h3 className="font-medium text-text text-sm mb-2">Two-Factor Authentication</h3>
                <p className="text-xs text-text-muted mb-3">Add an extra layer of security to your account</p>
                <button className="bg-card border border-border text-text text-sm px-4 py-2 rounded-lg hover:border-border-light transition-all hover:scale-[1.02] active:scale-[0.98]">Enable 2FA</button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
