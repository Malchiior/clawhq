import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma'

const router = Router()

// Validate webhook token from container
async function validateWebhookToken(agentId: string, userId: string, token: string | undefined): Promise<boolean> {
  if (!token) return false
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
    select: { webhookToken: true }
  })
  if (!agent?.webhookToken) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(agent.webhookToken),
      Buffer.from(token)
    )
  } catch {
    return false
  }
}

// Webhook endpoint for agent containers to report status and events
router.post('/agent', async (req: Request, res: Response) => {
  try {
    const { agentId, userId, event, status, message, metadata } = req.body
    const webhookToken = req.headers['x-webhook-token'] as string | undefined

    if (!agentId || !userId || !event) {
      res.status(400).json({ error: 'Missing required fields: agentId, userId, event' })
      return
    }

    // Verify webhook token to prevent spoofing
    const valid = await validateWebhookToken(agentId, userId, webhookToken)
    if (!valid) {
      res.status(401).json({ error: 'Invalid webhook token' })
      return
    }

    // Log the event
    await prisma.agentLog.create({
      data: {
        agentId,
        level: event === 'error' ? 'error' : 'info',
        message: message || `Agent ${event}`,
        metadata: metadata || {}
      }
    })

    // Update agent status if provided
    if (status) {
      await prisma.agent.updateMany({
        where: { id: agentId, userId },
        data: { 
          status,
          lastActiveAt: new Date()
        }
      })
    }

    // Update usage statistics if provided
    if (metadata?.messages) {
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          totalMessages: { increment: metadata.messages },
          totalTokens: { increment: metadata.tokens || 0 }
        }
      })

      // Update daily usage record
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      await prisma.usageRecord.upsert({
        where: {
          userId_date: {
            userId,
            date: today
          }
        },
        update: {
          messages: { increment: metadata.messages },
          inputTokens: { increment: metadata.inputTokens || 0 },
          outputTokens: { increment: metadata.outputTokens || 0 },
          costUsd: { increment: metadata.cost || 0 }
        },
        create: {
          userId,
          date: today,
          messages: metadata.messages,
          inputTokens: metadata.inputTokens || 0,
          outputTokens: metadata.outputTokens || 0,
          costUsd: metadata.cost || 0
        }
      })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Health check endpoint for containers
router.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'clawhq-webhook'
  })
})

export default router