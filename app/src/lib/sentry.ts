import * as Sentry from '@sentry/react'

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return // no-op if DSN not configured

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' | 'production'
    release: `clawhq-app@${import.meta.env.VITE_APP_VERSION || '0.1.0'}`,

    // Performance monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,

    // Session replay for debugging UI issues
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],

    // Don't send errors in local dev unless DSN is explicitly set
    enabled: !!dsn,

    // Scrub sensitive data
    beforeSend(event) {
      // Strip auth tokens from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => {
          if (bc.data?.url) {
            bc.data.url = bc.data.url.replace(/token=[^&]+/, 'token=[REDACTED]')
          }
          return bc
        })
      }
      return event
    },
  })
}

export function setSentryUser(user: { id: string; email?: string }) {
  Sentry.setUser({ id: user.id, email: user.email })
}

export function clearSentryUser() {
  Sentry.setUser(null)
}

export { Sentry }
