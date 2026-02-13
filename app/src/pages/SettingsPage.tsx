import { motion } from 'framer-motion'
import { User, Key, Users, Shield, Copy, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

const apiKeys = [
  { id: '1', name: 'Production', key: 'clw_live_****************************a3f2', lastUsed: '2 hours ago', created: 'Jan 15, 2026' },
  { id: '2', name: 'Development', key: 'clw_test_****************************b8e1', lastUsed: '5 days ago', created: 'Feb 1, 2026' },
]

const teamMembers = [
  { id: '1', name: 'You', email: 'admin@example.com', role: 'Owner', avatar: 'Y' },
  { id: '2', name: 'Sarah Chen', email: 'sarah@example.com', role: 'Admin', avatar: 'S' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'Member', avatar: 'M' },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function SettingsPage() {
  const [tab, setTab] = useState<'profile' | 'api' | 'team' | 'security'>('profile')

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'api' as const, label: 'API Keys', icon: Key },
    { id: 'team' as const, label: 'Team', icon: Users },
    { id: 'security' as const, label: 'Security', icon: Shield },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Tab Nav */}
        <div className="w-48 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text hover:bg-white/5'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {tab === 'profile' && (
            <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h2 className="font-semibold text-text">Profile Settings</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">U</div>
                <button className="text-sm text-primary hover:text-primary-hover transition-colors">Change avatar</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
                  <input type="text" defaultValue="John Doe" className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                  <input type="email" defaultValue="john@example.com" className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Business Name</label>
                  <input type="text" defaultValue="Acme AI" className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Custom Domain</label>
                  <input type="text" placeholder="agents.yourdomain.com" className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <button className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Save Changes</button>
            </motion.div>
          )}

          {tab === 'api' && (
            <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-text">API Keys</h2>
                <button className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" /> New Key
                </button>
              </div>
              <div className="space-y-3">
                {apiKeys.map(k => (
                  <div key={k.id} className="bg-navy/50 border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-text text-sm">{k.name}</span>
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-text-muted hover:text-text transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                        <button className="p-1 text-text-muted hover:text-error transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <p className="text-xs font-mono text-text-muted">{k.key}</p>
                    <div className="flex gap-4 mt-2 text-[10px] text-text-muted">
                      <span>Last used: {k.lastUsed}</span>
                      <span>Created: {k.created}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'team' && (
            <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-text">Team Members</h2>
                <button className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Invite
                </button>
              </div>
              <div className="divide-y divide-border">
                {teamMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">{m.avatar}</div>
                      <div>
                        <p className="text-sm font-medium text-text">{m.name}</p>
                        <p className="text-xs text-text-muted">{m.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${m.role === 'Owner' ? 'bg-accent/20 text-accent' : m.role === 'Admin' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-text-muted'}`}>{m.role}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'security' && (
            <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h2 className="font-semibold text-text">Security</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Current Password</label>
                  <input type="password" className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
                  <input type="password" className="w-full bg-navy/50 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50" placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢" />
                </div>
                <button className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Update Password</button>
              </div>
              <div className="pt-4 border-t border-border">
                <h3 className="font-medium text-text text-sm mb-2">Two-Factor Authentication</h3>
                <p className="text-xs text-text-muted mb-3">Add an extra layer of security to your account</p>
                <button className="bg-card border border-border text-text text-sm px-4 py-2 rounded-lg hover:border-border-light transition-colors">Enable 2FA</button>
              </div>
              <div className="pt-4 border-t border-border">
                <h3 className="font-medium text-error text-sm mb-2">Danger Zone</h3>
                <button className="bg-error/10 border border-error/20 text-error text-sm px-4 py-2 rounded-lg hover:bg-error/20 transition-colors">Delete Account</button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
