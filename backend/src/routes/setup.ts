/**
 * Setup Assistant API
 * Chat-based onboarding flow for new users.
 * Lightweight model, rate limited, scripted flow.
 */

import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { proxyAiRequest } from '../lib/ai-proxy'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const sessionCounts: Map<string, { messages: number; lastReset: number }> = new Map()

const SETUP_SYSTEM_PROMPT = `You are the ClawHQ Setup Assistant. Your ONLY job is to help users set up their AI agent. You are friendly, concise, and helpful.

## Your Flow

1. GREET the user warmly and ask how they'd like to deploy their agent. Present exactly 3 options:

   Option 1: Connect Existing OpenClaw - For users who already have OpenClaw running. You'll need their gateway URL.
   Option 2: Cloud Deploy - We host everything. Pick a model, we spin up a Docker container in 30 seconds. Uses ClawHQ API credits.
   Option 3: Download OpenClaw - Free! Download and run on your own machine. Bring your own API keys.

2. Based on their choice, walk them through:

   Path 1 (Connect Existing):
   - Ask for their OpenClaw gateway URL
   - Ask for their agent name
   - Confirm and complete setup
   
   Path 2 (Cloud Deploy):
   - Ask what they want their agent to do
   - Ask for an agent name
   - Let them pick a model: Claude Sonnet (recommended), Claude Haiku (fast & cheap), GPT-4o (OpenAI), Gemini Flash (Google)
   - Ask if they want to customize the personality or keep default
   - Confirm and complete setup
   
   Path 3 (Download):
   - Ask their OS (Windows/Mac/Linux)
   - Provide: npm install -g openclaw (requires Node.js 18+)
   - Walk through: install, openclaw init, openclaw start
   - Ask for gateway URL once running
   - Ask for agent name
   - Confirm and complete setup

3. When setup is ready to complete, respond with a JSON block at the END of your message:
\`\`\`json
{"setupComplete": true, "deployMode": "CLOUD", "agentName": "...", "model": "...", "gatewayUrl": "...", "systemPrompt": "..."}
\`\`\`
deployMode must be one of: CLOUD, LOCAL, CONNECTOR

## RULES
- NEVER go off-topic. If user asks random questions, say: "Let's get your agent set up first! Then your agent can help with anything."
- Keep responses SHORT (2-4 sentences max unless providing instructions).
- If user seems confused, suggest Cloud Deploy as the easiest path.
- Don't mention pricing unless asked.
- NEVER output the setupComplete JSON until all required info is collected.`

const INITIAL_MESSAGE = `Hey there! Welcome to ClawHQ - let's get your AI agent up and running.

How would you like to set up?

**1. Connect Existing OpenClaw** - Already running OpenClaw? Link it here.

**2. Cloud Deploy** - We host everything. Pick a model and you're live in 30 seconds.

**3. Download OpenClaw** - Free! Run it on your own machine with your own API keys.

Which sounds right for you?`

// GET /api/setup/status
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { setupComplete: true, setupStep: true } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({
      setupRequired: !user.setupComplete,
      currentStep: user.setupStep,
      initialMessage: !user.setupComplete ? INITIAL_MESSAGE : null,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/setup/message
router.post('/message', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { message, history } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Rate limiting
    const now = Date.now()
    let counts = sessionCounts.get(userId)
    if (!counts || now - counts.lastReset > 86400000) {
      counts = { messages: 0, lastReset: now }
    }
    if (counts.messages >= 20) {
      return res.status(429).json({ error: 'Setup session limit reached. Try manual setup.', redirect: '/agents/new' })
    }
    counts.messages++
    sessionCounts.set(userId, counts)

    // Build conversation
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content })
        }
      }
    }
    messages.push({ role: 'user', content: message })

    const result = await proxyAiRequest({
      model: 'claude-haiku-3-20240307',
      systemPrompt: SETUP_SYSTEM_PROMPT,
      messages,
      maxTokens: 500,
      temperature: 0.7,
    })

    // Check for setup completion JSON
    let setupData = null
    const jsonMatch = result.content.match(/```json\n(\{[\s\S]*?"setupComplete"[\s\S]*?\})\n```/)
    if (jsonMatch) {
      try { setupData = JSON.parse(jsonMatch[1]) } catch {}
    }

    if (setupData?.setupComplete) {
      const agent = await prisma.agent.create({
        data: {
          name: setupData.agentName || 'My Agent',
          model: setupData.model || 'claude-sonnet-4-20250514',
          systemPrompt: setupData.systemPrompt || 'You are a helpful AI assistant.',
          deployMode: setupData.deployMode || 'DASHBOARD',
          status: setupData.deployMode === 'CLOUD' ? 'deploying' : 'stopped',
          userId,
          config: JSON.stringify({ gatewayUrl: setupData.gatewayUrl || null, temperature: 0.7, maxTokens: 4096 }),
        }
      })

      await prisma.user.update({
        where: { id: userId },
        data: { setupComplete: true, setupStep: 'complete' }
      })

      const cleanContent = result.content.replace(/```json\n\{[\s\S]*?\}\n```/, '').trim()
      return res.json({
        reply: cleanContent || "Your agent is ready! Redirecting you to your dashboard...",
        setupComplete: true,
        agentId: agent.id,
        agentName: agent.name,
      })
    }

    res.json({ reply: result.content, setupComplete: false })
  } catch (err: any) {
    console.error('Setup chat error:', err)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

// POST /api/setup/skip
router.post('/skip', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.userId! }, data: { setupComplete: true, setupStep: 'skipped' } })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/setup/complete
router.post('/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.userId! }, data: { setupComplete: true, setupStep: 'complete' } })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
