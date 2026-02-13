import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

dotenv.config()

import authRoutes from './routes/auth'
import agentRoutes from './routes/agents'
import channelRoutes from './routes/channels'
import billingRoutes from './routes/billing'
import userRoutes from './routes/users'
import waitlistRoutes from './routes/waitlist'

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))

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

app.listen(PORT, () => {
  console.log(`🚀 ClawHQ API running on port ${PORT}`)
})

export default app
