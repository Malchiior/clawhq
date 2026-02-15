import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import healthMonitor from '../lib/health-monitor'
import prisma from '../lib/prisma'

const router = Router()
router.use(authenticate)

// Get health summary for all user's agents
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const summary = await healthMonitor.getHealthSummary(req.userId!)
    res.json({ summary })
  } catch (error) {
    console.error('❌ Failed to get health summary:', error)
    res.status(500).json({ error: 'Failed to get health summary' })
  }
})

// Get detailed health metrics for a specific agent
router.get('/agent/:agentId', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    
    // Verify user owns this agent
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    const result = await healthMonitor.checkAgentHealth(agentId)
    res.json(result)
  } catch (error) {
    console.error('❌ Failed to get agent health:', error)
    res.status(500).json({ error: 'Failed to get agent health' })
  }
})

// Server-Sent Events endpoint for real-time health monitoring
router.get('/stream', async (req: AuthRequest, res: Response) => {
  // Set headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  })

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`)

  // Add client to health monitor
  const client = {
    res,
    userId: req.userId!,
    agentId: typeof req.query.agentId === 'string' ? req.query.agentId : undefined
  }
  
  healthMonitor.addClient(client)

  // Keep connection alive with periodic heartbeat
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`)
    } catch (error) {
      // Client disconnected
      clearInterval(heartbeatInterval)
    }
  }, 30000) // Every 30 seconds

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval)
  })
})

// Trigger manual health check for specific agent
router.post('/check/:agentId', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    
    // Verify user owns this agent
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    const result = await healthMonitor.checkAgentHealth(agentId)
    
    // Update agent status if needed
    const newStatus = healthMonitor.mapStatusToAgentStatus(result.metrics.status)
    if (agent.status !== newStatus) {
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          status: newStatus as any, // Cast to avoid TypeScript enum issues
          lastActiveAt: result.metrics.lastActiveAt
        }
      })
    }

    res.json({ 
      success: true, 
      result,
      message: 'Health check completed'
    })
  } catch (error) {
    console.error('❌ Manual health check failed:', error)
    res.status(500).json({ error: 'Health check failed' })
  }
})

// Get auto-restart info for an agent
router.get('/restarts/:agentId', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: req.userId } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }

    const restartInfo = healthMonitor.getRestartInfo(agentId)
    
    // Also get restart-related logs
    const restartLogs = await prisma.agentLog.findMany({
      where: {
        agentId,
        message: { contains: 'restart' },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    res.json({
      restartInfo: restartInfo || { count: 0, lastAttempt: 0, nextAllowedAt: 0 },
      recentRestarts: restartLogs.map(l => ({
        timestamp: l.createdAt,
        level: l.level,
        message: l.message,
        metadata: l.metadata
      }))
    })
  } catch (error) {
    console.error('❌ Failed to get restart info:', error)
    res.status(500).json({ error: 'Failed to get restart info' })
  }
})

// Reset restart counter for an agent (manual intervention acknowledgment)
router.post('/restarts/:agentId/reset', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: req.userId } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }

    healthMonitor.resetRestarts(agentId)
    await prisma.agentLog.create({
      data: { agentId, level: 'info', message: 'Restart counter manually reset by user' }
    })

    res.json({ success: true, message: 'Restart counter reset — auto-restart re-enabled' })
  } catch (error) {
    console.error('❌ Failed to reset restarts:', error)
    res.status(500).json({ error: 'Failed to reset restart counter' })
  }
})

// Get health history/trends (last 24 hours)
router.get('/history/:agentId', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    
    // Verify user owns this agent
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    // Get health-related logs from the last 24 hours
    const healthLogs = await prisma.agentLog.findMany({
      where: {
        agentId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        },
        message: {
          contains: 'Health Monitor'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    res.json({ 
      healthLogs: healthLogs.map(log => ({
        timestamp: log.createdAt,
        level: log.level,
        message: log.message,
        metrics: log.metadata
      }))
    })
  } catch (error) {
    console.error('❌ Failed to get health history:', error)
    res.status(500).json({ error: 'Failed to get health history' })
  }
})

export default router