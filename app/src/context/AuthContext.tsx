import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { resetUser } from '../lib/analytics'

const API_URL = import.meta.env.VITE_API_URL || ''

interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  plan: string
  businessName: string | null
  brandColor: string
  setupComplete?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ needsVerification?: boolean }>
  signup: (email: string, password: string, name: string, inviteCode?: string) => Promise<{ needsVerification?: boolean }>
  loginWithGoogle: () => void
  logout: () => void
  verifyEmail: (token: string) => Promise<void>
  resendVerification: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function getTokens() {
  return {
    accessToken: localStorage.getItem('clawhq_token'),
    refreshToken: localStorage.getItem('clawhq_refresh_token'),
  }
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('clawhq_token', accessToken)
  localStorage.setItem('clawhq_refresh_token', refreshToken)
}

function clearTokens() {
  localStorage.removeItem('clawhq_token')
  localStorage.removeItem('clawhq_refresh_token')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshingRef = useRef(false)

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshingRef.current) return null
    refreshingRef.current = true
    try {
      const { refreshToken } = getTokens()
      if (!refreshToken) return null
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) { clearTokens(); return null }
      const data = await res.json()
      setTokens(data.accessToken, data.refreshToken)
      return data.accessToken
    } catch {
      clearTokens()
      return null
    } finally {
      refreshingRef.current = false
    }
  }, [])

  const checkAuth = useCallback(async () => {
    const { accessToken } = getTokens()
    if (!accessToken) { setUser(null); setIsLoading(false); return }

    try {
      let res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      // If 401, try refreshing
      if (res.status === 401) {
        const newToken = await refreshAccessToken()
        if (newToken) {
          res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${newToken}` },
          })
        }
      }

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        clearTokens()
        setUser(null)
      }
    } catch {
      clearTokens()
      setUser(null)
    }
    setIsLoading(false)
  }, [refreshAccessToken])

  useEffect(() => {
    checkAuth()
    const handleStorage = () => checkAuth()
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [checkAuth])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (data.needsVerification) return { needsVerification: true }
      throw new Error(data.error || 'Invalid credentials')
    }
    // Handle both old (token) and new (accessToken/refreshToken) formats
    if (data.accessToken) {
      setTokens(data.accessToken, data.refreshToken)
    } else if (data.token) {
      localStorage.setItem('clawhq_token', data.token)
    }
    setUser(data.user)
    return {}
  }, [])

  const signup = useCallback(async (email: string, password: string, name: string, inviteCode?: string) => {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, inviteCode }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Signup failed')
    // New flow: signup requires email verification
    if (data.needsVerification) return { needsVerification: true }
    if (data.accessToken) {
      setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
    }
    return {}
  }, [])

  const verifyEmail = useCallback(async (token: string) => {
    const res = await fetch(`${API_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Verification failed')
    if (data.accessToken) {
      setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
    }
  }, [])

  const resendVerification = useCallback(async (email: string) => {
    const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to resend')
    }
  }, [])

  const loginWithGoogle = useCallback(() => {
    window.location.href = `${API_URL}/api/auth/google`
  }, [])

  const logout = useCallback(async () => {
    const { accessToken } = getTokens()
    // Best-effort server logout
    if (accessToken) {
      fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {})
    }
    clearTokens()
    setUser(null)
    resetUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, signup, loginWithGoogle, logout, verifyEmail, resendVerification }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
