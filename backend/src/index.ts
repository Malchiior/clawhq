import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import passport from './lib/passport'
import { cleanupExpiredSessions } from './lib/session'

dotenv.config()

import authRoutes from './routes/auth'
import agentRoutes from './routes/agents'
import channelRoutes from './routes/channels'
import billingRoutes from './routes/billing'
import userRoutes from './routes/users'
import waitlistRoutes from './routes/waitlist'
import webhookRoutes from './routes/webhooks'

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

app.use(helmet())
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5173', 'https://clawhq.dev', 'https://clawhq-xi.vercel.app'],
  credentials: true
}))

// Passport middleware
app.use(passport.initialize())

// Raw body for Stripe webhooks
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/users', userRoutes)
app.use('/api/waitlist', waitlistRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

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

app.listen(PORT, () => {
  console.log(`🚀 ClawHQ API running on port ${PORT}`)
  console.log(`🔐 JWT Session management enabled`)
})

export default app
