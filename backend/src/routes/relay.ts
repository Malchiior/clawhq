import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { relayManager } from '../lib/relay'
import jwt from 'jsonwebtoken'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'clawhq-dev-secret-change-in-production'

// GET /api/relay/status - Get relay status for all user's agents
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const connectedAgents = relayManager.getConnectedAgents(userId)
    res.json({ connectedAgents })
  } catch (error) {
    console.error('Relay status error:', error)
    res.status(500).json({ error: 'Failed to get relay status' })
  }
})

// GET /api/relay/status/:agentId - Get relay status for a specific agent
router.get('/status/:agentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    const status = relayManager.getStatus(agentId)
    res.json(status)
  } catch (error) {
    console.error('Relay agent status error:', error)
    res.status(500).json({ error: 'Failed to get agent relay status' })
  }
})

// POST /api/relay/token - Generate a relay connection token for local OpenClaw
router.post('/token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    // Generate a relay-specific JWT valid for 7 days
    const relayToken = jwt.sign(
      { userId, purpose: 'relay' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    res.json({ 
      token: relayToken,
      expiresIn: '7d',
      wsUrl: `${process.env.NODE_ENV === 'production' ? 'wss' : 'ws'}://${process.env.API_HOST || 'localhost:3001'}/relay`,
    })
  } catch (error) {
    console.error('Relay token error:', error)
    res.status(500).json({ error: 'Failed to generate relay token' })
  }
})

// GET /api/relay/stats - Admin stats (could be restricted to admin users)
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stats = relayManager.getStats()
    res.json(stats)
  } catch (error) {
    console.error('Relay stats error:', error)
    res.status(500).json({ error: 'Failed to get relay stats' })
  }
})

export default router
