import { Bell, Search, LogOut, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface TopBarProps {
  onMenuToggle?: () => void
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button onClick={onMenuToggle} className="lg:hidden p-1.5 text-text-secondary hover:text-text transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search agents, channels..."
            className="w-48 md:w-72 bg-navy/50 border border-border rounded-lg pl-9 pr-4 py-1.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button className="relative p-2 text-text-secondary hover:text-text transition-colors">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => navigate('/profile')} className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
              {user?.name?.[0] || user?.email?.[0] || 'U'}
            </div>
            <div className="hidden sm:block text-sm text-left">
              <p className="font-medium text-text leading-tight">{user?.name || 'User'}</p>
              <p className="text-[11px] text-text-muted">{user?.email}</p>
            </div>
          </button>
          <button onClick={logout} className="p-1.5 text-text-muted hover:text-error transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
