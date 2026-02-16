const API_URL = import.meta.env.VITE_API_URL || ''

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('clawhq_refresh_token')
  if (!refreshToken) return false

  // Deduplicate concurrent refresh attempts
  if (isRefreshing && refreshPromise) return refreshPromise

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return false
      const data = await res.json()
      if (data.accessToken) {
        localStorage.setItem('clawhq_token', data.accessToken)
        if (data.refreshToken) localStorage.setItem('clawhq_refresh_token', data.refreshToken)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function forceLogout() {
  localStorage.removeItem('clawhq_token')
  localStorage.removeItem('clawhq_refresh_token')
  window.location.href = '/login'
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('clawhq_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    // Try refreshing the token
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      // Retry with new token
      const newToken = localStorage.getItem('clawhq_token')
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${API_URL}${path}`, { ...options, headers })
      if (res.status === 401) {
        forceLogout()
        throw new Error('Unauthorized')
      }
    } else {
      forceLogout()
      throw new Error('Unauthorized')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(body.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export async function apiUpload(path: string, formData: FormData) {
  const token = localStorage.getItem('clawhq_token')
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (res.status === 401) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      const newToken = localStorage.getItem('clawhq_token')
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: formData })
      if (res.status === 401) {
        forceLogout()
        throw new Error('Unauthorized')
      }
    } else {
      forceLogout()
      throw new Error('Unauthorized')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(body.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export { API_URL }
