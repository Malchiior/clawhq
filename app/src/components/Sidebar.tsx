import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Bot, Radio, CreditCard, Settings, BookOpen, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/channels', icon: Radio, label: 'Channels' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/docs', icon: BookOpen, label: 'Docs' },
]

export default function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 bg-card border-r border-border flex flex-col"
    >
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text tracking-tight">ClawHQ</h1>
            <p className="text-[10px] text-text-muted uppercase tracking-widest">Agent Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:text-text hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-xs font-medium text-primary">Free Plan</p>
          <p className="text-[11px] text-text-muted mt-0.5">1 agent · 100 msgs/day</p>
          <button className="mt-2 w-full text-xs bg-primary hover:bg-primary-hover text-white py-1.5 rounded-md transition-colors font-medium">
            Upgrade
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
