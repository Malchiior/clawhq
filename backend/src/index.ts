import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createServer } from 'http'
import passport from './lib/passport'
import { cleanupExpiredSessions } from './lib/session'

dotenv.config()

import { initSentry, Sentry } from './lib/sentry'
// Initialize Sentry early (no-op if SENTRY_DSN not set)
initSentry()

import authRoutes from './routes/auth'
import agentRoutes from './routes/agents'
import channelRoutes from './routes/channels'
import telegramRoutes from './routes/telegram'
import whatsappRoutes from './routes/whatsapp'
import discordRoutes from './routes/discord'
import slackRoutes from './routes/slack'
import imessageRoutes from './routes/imessage'
import billingRoutes from './routes/billing'
import userRoutes from './routes/users'
import waitlistRoutes from './routes/waitlist'
import webhookRoutes from './routes/webhooks'
import healthRoutes from './routes/health'
import apiKeyRoutes from './routes/api-keys'
import bundledApiRoutes from './routes/bundled-api'
import memoryRoutes from './routes/memory'
import inviteRoutes from './routes/invites'
import domainRoutes from './routes/domains'
import creditRoutes from './routes/credits'
import supportRoutes from './routes/support'
import chatRoutes from './routes/chat'
import relayRoutes from './routes/relay'
import setupRoutes from './routes/setup'
import pageRoutes from './routes/pages'
import projectRoutes from './routes/projects'
import machineRoutes from './routes/machines'
import healthMonitor from './lib/health-monitor'
import { containerOrchestrator } from './lib/containerOrchestrator'
import { relayManager } from './lib/relay'
import { initSocketIO } from './lib/socket'

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

// Trust proxy for Railway/Vercel (correct client IP behind reverse proxy)
app.set('trust proxy', 1)

app.use(helmet())
const corsOrigins: string[] = [
  'https://clawhq.dev',
  'https://clawhq-xi.vercel.app',
]
if (process.env.FRONTEND_URL) corsOrigins.push(process.env.FRONTEND_URL)
if (process.env.NODE_ENV !== 'production') corsOrigins.push('http://localhost:5173')

app.use(cors({
  origin: corsOrigins,
  credentials: true
}))

// Passport middleware
app.use(passport.initialize())

// Raw body for Stripe webhooks
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())

// Public health check (no auth — for load balancers, Railway, Fly.io, etc.)
app.get('/api/health/ping', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' })
})
// Legacy alias
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/telegram', telegramRoutes)
app.use('/api/whatsapp', whatsappRoutes)
app.use('/api/discord', discordRoutes)
app.use('/api/slack', slackRoutes)
app.use('/api/imessage', imessageRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/users', userRoutes)
app.use('/api/waitlist', waitlistRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/health', healthRoutes)
app.use('/api/api-keys', apiKeyRoutes)
app.use('/api/bundled-api', bundledApiRoutes)
app.use('/api/memory', memoryRoutes)
app.use('/api/invites', inviteRoutes)
app.use('/api/domains', domainRoutes)
app.use('/api/credits', creditRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/relay', relayRoutes)
app.use('/api/setup', setupRoutes)
app.use('/api/pages', pageRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/machines', machineRoutes)

// Sentry error handler — must be after all routes, before other error handlers
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app)
}

// Session cleanup on startup
cleanupExpiredSessions().then(count => {
  if (count > 0) {
    console.log(`🧹 Cleaned up ${count} expired sessions on startup`)
  }
}).catch(err => {
  console.error('❌ Session cleanup error on startup:', err)
})

// Periodic session cleanup (every 30 minutes)
setInterval(async () => {
  try {
    const cleanedCount = await cleanupExpiredSessions()
    if (cleanedCount > 0) {
      console.log(`🧹 Periodic cleanup: removed ${cleanedCount} expired sessions`)
    }
  } catch (err) {
    console.error('❌ Periodic session cleanup error:', err)
  }
}, 30 * 60 * 1000) // 30 minutes

const server = createServer(app)

// Attach WebSocket relay to the HTTP server
relayManager.attach(server)

// Initialize Socket.io for real-time updates
initSocketIO(server, corsOrigins)

server.listen(PORT, async () => {
  console.log(`🚀 ClawHQ API running on port ${PORT}`)
  console.log(`🔐 JWT Session management enabled`)
  console.log(`🔌 Relay WebSocket tunnel active at /relay`)
  
  // Start health monitoring service
  try {
    await healthMonitor.start()
    console.log(`🔍 Health monitoring service started`)
  } catch (error) {
    console.error(`❌ Failed to start health monitoring service:`, error)
  }
  
  // Initialize container orchestrator
  try {
    await containerOrchestrator.initialize()
    console.log(`🐳 Container orchestrator initialized`)
  } catch (error) {
    console.error(`❌ Failed to initialize container orchestrator:`, error)
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...')
  healthMonitor.stop()
  relayManager.shutdown()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...')
  healthMonitor.stop()
  relayManager.shutdown()
  process.exit(0)
})

export default app
