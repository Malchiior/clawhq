import * as Sentry from '@sentry/node'

export function initSentry() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return // no-op if DSN not configured

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: `clawhq-backend@${process.env.npm_package_version || '0.1.0'}`,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Scrub sensitive data from events
    beforeSend(event) {
      // Remove auth headers from request data
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }
      return event
    },
  })
}

// Express error handler middleware — mount AFTER all routes
export function sentryErrorHandler() {
  return Sentry.setupExpressErrorHandler
    ? Sentry.setupExpressErrorHandler
    : (_err: any, _req: any, _res: any, next: any) => next(_err)
}

export { Sentry }
