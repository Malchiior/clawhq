import * as Sentry from '@sentry/react'
import { useRouteError, isRouteErrorResponse } from 'react-router-dom'

function FallbackUI() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="text-gray-400">
          An unexpected error occurred. Our team has been notified and is looking into it.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
        >
          Reload Page
        </button>
      </div>
    </div>
  )
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary fallback={<FallbackUI />}>
      {children}
    </Sentry.ErrorBoundary>
  )
}

/** Route-level error boundary for react-router */
export function RouteErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-5xl">🔍</div>
            <h1 className="text-2xl font-bold text-white">Page Not Found</h1>
            <p className="text-gray-400">The page you're looking for doesn't exist.</p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
            >
              Go Home
            </a>
          </div>
        </div>
      )
    }
  }

  // Capture non-404 errors in Sentry
  Sentry.captureException(error)

  return <FallbackUI />
}
