import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { initAnalytics } from './lib/analytics'
import { initSentry } from './lib/sentry'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'
import './index.css'

// Initialize error tracking (no-op if VITE_SENTRY_DSN not set)
initSentry()

// Initialize PostHog (no-op if VITE_POSTHOG_KEY not set)
initAnalytics()

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
