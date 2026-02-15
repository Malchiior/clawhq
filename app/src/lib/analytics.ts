/**
 * ClawHQ Analytics — PostHog for product analytics, env-gated.
 *
 * Set VITE_POSTHOG_KEY and VITE_POSTHOG_HOST in .env to activate.
 * Without them, all calls are no-ops (zero runtime cost).
 */
import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com'

let initialized = false

export function initAnalytics() {
  if (!POSTHOG_KEY || initialized) return
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    loaded: (ph) => {
      // Respect Do-Not-Track
      if (navigator.doNotTrack === '1') ph.opt_out_capturing()
    },
  })
  initialized = true
}

/** Identify a logged-in user */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (!initialized) return
  posthog.identify(userId, traits)
}

/** Reset on logout */
export function resetUser() {
  if (!initialized) return
  posthog.reset()
}

/** Track a custom event */
export function track(event: string, properties?: Record<string, any>) {
  if (!initialized) return
  posthog.capture(event, properties)
}

/** Track page view (for SPA route changes) */
export function trackPageView(path?: string) {
  if (!initialized) return
  posthog.capture('$pageview', path ? { $current_url: path } : undefined)
}

export { posthog }
