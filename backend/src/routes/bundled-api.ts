import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { bundledApiService } from '../lib/bundled-api'

const router = Router()
router.use(authenticate)

// Get bundled API status and user limits
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    
    // Check user's limits and current usage
    const limitsCheck = await bundledApiService.checkUserLimits(userId)
    
    // Get available providers
    const availableProviders = bundledApiService.getAvailableProviders()
    
    // Get user's current API mode
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        apiMode: true,
        plan: true,
        dailyMsgLimit: true,
        maxAgents: true,
        maxChannels: true
      }
    })
    
    // Get pricing information
    const pricing = bundledApiService.getPricingInfo()
    
    res.json({
      user: user,
      limits: limitsCheck,
      availableProviders,
      pricing,
      bundledApiEnabled: availableProviders.length > 0
    })
  } catch (error) {
    console.error('Failed to get bundled API status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user's usage history
router.get('/usage', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { days = 30 } = req.query
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Number(days))
    startDate.setHours(0, 0, 0, 0)
    
    const usageRecords = await prisma.usageRecord.findMany({
      where: {
        userId,
        date: {
          gte: startDate
        }
      },
      orderBy: { date: 'desc' }
    })
    
    // Calculate totals
    const totals = usageRecords.reduce((acc, record) => ({
      messages: acc.messages + record.messages,
      inputTokens: acc.inputTokens + record.inputTokens,
      outputTokens: acc.outputTokens + record.outputTokens,
      costUsd: acc.costUsd + record.costUsd
    }), {
      messages: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0
    })
    
    res.json({
      usageRecords,
      totals,
      period: `Last ${days} days`
    })
  } catch (error) {
    console.error('Failed to get usage history:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Switch API mode between bundled and BYOK
router.post('/mode', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { mode } = req.body
    
    if (!['bundled', 'byok'].includes(mode)) {
      res.status(400).json({ error: 'Invalid API mode. Must be "bundled" or "byok"' })
      return
    }
    
    // If switching to bundled, check if user has a compatible plan
    if (mode === 'bundled') {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      // For now, allow all users to use bundled API, but with different limits
      // In the future, this could be restricted to paid plans only
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: { apiMode: mode }
    })
    
    res.json({
      success: true,
      mode,
      message: mode === 'bundled' 
        ? 'Switched to Bundled API - no API keys needed!'
        : 'Switched to Bring Your Own Key mode'
    })
  } catch (error) {
    console.error('Failed to update API mode:', error)
    res.status(500).json({ error: 'Failed to update API mode' })
  }
})

// Get API usage for a specific model (for cost estimation)
router.post('/estimate', async (req: AuthRequest, res: Response) => {
  try {
    const { model, inputTokens, outputTokens } = req.body
    
    if (!model || inputTokens == null || outputTokens == null) {
      res.status(400).json({ error: 'Missing required fields: model, inputTokens, outputTokens' })
      return
    }
    
    const pricing = bundledApiService.getPricingInfo()
    const modelPricing = pricing[model as keyof typeof pricing]
    
    if (!modelPricing) {
      res.status(400).json({ error: 'Unsupported model for pricing estimation' })
      return
    }
    
    const estimatedCost = (inputTokens * modelPricing.input + outputTokens * modelPricing.output) / 1000
    
    res.json({
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCostUsd: Number(estimatedCost.toFixed(6)),
      pricing: modelPricing
    })
  } catch (error) {
    console.error('Failed to estimate API cost:', error)
    res.status(500).json({ error: 'Failed to estimate cost' })
  }
})

// Record API usage (called by agent deployment service)
router.post('/record-usage', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { provider, model, inputTokens, outputTokens } = req.body
    
    if (!provider || !model || inputTokens == null || outputTokens == null) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }
    
    await bundledApiService.recordUsage(userId, provider, {
      inputTokens,
      outputTokens,
      model,
      timestamp: new Date()
    })
    
    res.json({ success: true, message: 'Usage recorded successfully' })
  } catch (error) {
    console.error('Failed to record usage:', error)
    res.status(500).json({ error: 'Failed to record usage' })
  }
})

// Admin endpoint to get bundled API key stats (requires admin role)
router.get('/admin/stats', async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Add admin role check
    const userId = req.userId!
    
    // For now, only allow if user email contains 'admin' or specific domains
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user?.email?.includes('clawhq') && !user?.email?.includes('admin')) {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Get today's bundled usage across all providers
    const todayUsage = await prisma.bundledUsage.findMany({
      where: {
        date: today
      }
    })
    
    // Get last 7 days of bundled usage
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const weeklyUsage = await prisma.bundledUsage.findMany({
      where: {
        date: {
          gte: weekAgo
        }
      },
      orderBy: { date: 'desc' }
    })
    
    // Get total users by API mode
    const userStats = await prisma.user.groupBy({
      by: ['apiMode'],
      _count: true
    })
    
    res.json({
      todayUsage,
      weeklyUsage,
      userStats,
      availableProviders: bundledApiService.getAvailableProviders()
    })
  } catch (error) {
    console.error('Failed to get admin stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router