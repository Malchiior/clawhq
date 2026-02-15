/**
 * Setup Assistant API
 * Fully scripted onboarding flow — no AI calls needed.
 * Fast, reliable, zero API cost.
 */

import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const INITIAL_MESSAGE = `Hey there! Welcome to ClawHQ - let's get your AI agent up and running.

How would you like to set up?

**1. Connect Existing OpenClaw** - Already running OpenClaw? Link it here.

**2. Cloud Deploy** - We host everything. Pick a model and you're live in 30 seconds.

**3. Download OpenClaw** - Free! Run it on your own machine with your own API keys.

Which sounds right for you?`

// Scripted response trees
const SCRIPTED_FLOWS: Record<string, { reply: string; nextStep: string }> = {}

function detectPath(message: string): string | null {
  const m = message.toLowerCase()
  if (m.includes('connect') || m.includes('existing') || m.includes('link') || m === '1') return 'connector'
  if (m.includes('cloud') || m.includes('host') || m === '2') return 'cloud'
  if (m.includes('download') || m.includes('local') || m.includes('own machine') || m === '3') return 'download'
  return null
}

function detectModel(message: string): string | null {
  const m = message.toLowerCase()
  if (m.includes('sonnet') || m.includes('claude') && !m.includes('haiku') && !m.includes('opus')) return 'claude-sonnet-4-20250514'
  if (m.includes('haiku')) return 'claude-3-haiku-20240307'
  if (m.includes('opus')) return 'claude-opus-4-6'
  if (m.includes('gpt') || m.includes('openai') || m.includes('4o')) return 'gpt-4o'
  if (m.includes('gemini') || m.includes('google') || m.includes('flash')) return 'gemini-1.5-flash'
  if (m.includes('deepseek')) return 'deepseek-chat'
  if (m.includes('grok')) return 'grok-beta'
  if (m === '1' || m.includes('recommend')) return 'claude-sonnet-4-20250514'
  if (m === '2') return 'claude-3-haiku-20240307'
  if (m === '3') return 'gpt-4o'
  if (m === '4') return 'gemini-1.5-flash'
  return null
}

function detectOS(message: string): string | null {
  const m = message.toLowerCase()
  if (m.includes('windows') || m.includes('win')) return 'windows'
  if (m.includes('mac') || m.includes('macos') || m.includes('apple')) return 'mac'
  if (m.includes('linux') || m.includes('ubuntu') || m.includes('debian')) return 'linux'
  return null
}

interface SetupState {
  path?: string       // connector | cloud | download
  agentName?: string
  model?: string
  gatewayUrl?: string
  systemPrompt?: string
  os?: string
  step: string        // path_select | connector_url | connector_name | cloud_purpose | cloud_name | cloud_model | cloud_personality | download_os | download_url | download_name | confirm
}

// In-memory setup states (per user)
const setupStates: Map<string, SetupState> = new Map()

function getState(userId: string): SetupState {
  if (!setupStates.has(userId)) {
    setupStates.set(userId, { step: 'path_select' })
  }
  return setupStates.get(userId)!
}

function processMessage(userId: string, message: string): { reply: string; setupComplete?: boolean; setupData?: any } {
  const state = getState(userId)
  const m = message.trim()

  switch (state.step) {
    case 'path_select': {
      const path = detectPath(m)
      if (!path) {
        return { reply: "I didn't catch that. Just pick a number:\n\n**1.** Connect Existing OpenClaw\n**2.** Cloud Deploy\n**3.** Download OpenClaw" }
      }
      state.path = path

      if (path === 'connector') {
        state.step = 'connector_url'
        return { reply: "Great choice! 🔗\n\nWhat's your OpenClaw gateway URL? It usually looks like `http://localhost:18789` or `https://your-server.com:18789`." }
      }
      if (path === 'cloud') {
        state.step = 'cloud_name'
        return { reply: "Awesome! Cloud Deploy is the fastest way to get started. ☁️\n\nWhat would you like to name your agent?" }
      }
      if (path === 'download') {
        state.step = 'download_os'
        return { reply: "Nice, the DIY route! 💻\n\nWhat operating system are you on?\n- **Windows**\n- **Mac**\n- **Linux**" }
      }
      break
    }

    // ── Connector Path ──
    case 'connector_url': {
      if (!m.includes('http') && !m.includes('localhost')) {
        return { reply: "That doesn't look like a URL. Your gateway URL usually looks like `http://localhost:18789`. What is it?" }
      }
      state.gatewayUrl = m
      state.step = 'connector_name'
      return { reply: "Got it! Now, what would you like to name your agent? Something like \"My Assistant\" or \"Support Bot\"." }
    }

    case 'connector_name': {
      state.agentName = m
      state.step = 'confirm'
      return {
        reply: `Perfect! Here's what we're setting up:\n\n🔗 **Mode:** Connect to Existing OpenClaw\n🌐 **Gateway:** ${state.gatewayUrl}\n🤖 **Agent Name:** ${state.agentName}\n\nLook good? Type **yes** to finish setup.`,
      }
    }

    // ── Cloud Path ──
    case 'cloud_purpose': {
      state.systemPrompt = `You are ${m}. Be helpful, concise, and friendly.`
      state.step = 'cloud_name'
      return { reply: `Love it! What would you like to name your agent?` }
    }

    case 'cloud_name': {
      state.agentName = m
      state.step = 'cloud_model'
      return {
        reply: "Now pick your AI model:\n\n**1. Claude Sonnet** ⭐ (recommended) — Smart, fast, great all-rounder\n**2. Claude Haiku** — Lightning fast, super cheap\n**3. GPT-4o** — OpenAI's flagship\n**4. Gemini Flash** — Google's fastest\n\nWhich one?"
      }
    }

    case 'cloud_model': {
      const model = detectModel(m)
      if (!model) {
        return { reply: "Just pick a number (1-4) or say the model name:\n1. Claude Sonnet ⭐\n2. Claude Haiku\n3. GPT-4o\n4. Gemini Flash" }
      }
      state.model = model
      state.step = 'confirm'
      const modelName = model.includes('sonnet') ? 'Claude Sonnet' : model.includes('haiku') ? 'Claude Haiku' : model.includes('gpt') ? 'GPT-4o' : model.includes('gemini') ? 'Gemini Flash' : model
      return {
        reply: `Here's your setup:\n\n☁️ **Mode:** Cloud Deploy\n🤖 **Agent:** ${state.agentName}\n🧠 **Model:** ${modelName}\n\nLook good? Type **yes** to deploy!`
      }
    }

    // ── Download Path ──
    case 'download_os': {
      const os = detectOS(m)
      if (!os) {
        return { reply: "Which OS? Just say **Windows**, **Mac**, or **Linux**." }
      }
      state.os = os
      state.step = 'download_install'
      const installCmd = os === 'windows'
        ? "```\nnpm install -g openclaw\nopenclaw init\nopenclaw start\n```"
        : "```bash\nnpm install -g openclaw\nopenclaw init\nopenclaw start\n```"
      return {
        reply: `Here's how to install OpenClaw on ${os.charAt(0).toUpperCase() + os.slice(1)}:\n\n**Requires Node.js 18+** — [Download Node.js](https://nodejs.org)\n\nThen run:\n${installCmd}\n\nOnce it's running, come back and paste your gateway URL (shown in the terminal). Or type **skip** to set it up later.`
      }
    }

    case 'download_install': {
      if (m.toLowerCase() === 'skip') {
        state.step = 'download_name'
        return { reply: "No problem! You can connect it later from the dashboard.\n\nWhat would you like to name your agent?" }
      }
      if (m.includes('http') || m.includes('localhost')) {
        state.gatewayUrl = m
        state.step = 'download_name'
        return { reply: `Got your gateway at ${m}! What would you like to name your agent?` }
      }
      return { reply: "Paste your gateway URL once OpenClaw is running (looks like `http://localhost:18789`), or type **skip** to set it up later." }
    }

    case 'download_name': {
      state.agentName = m
      state.step = 'confirm'
      return {
        reply: `Here's your setup:\n\n💻 **Mode:** Local (Download)\n${state.gatewayUrl ? `🌐 **Gateway:** ${state.gatewayUrl}\n` : ''}🤖 **Agent:** ${state.agentName}\n\nLook good? Type **yes** to finish!`
      }
    }

    // ── Confirmation ──
    case 'confirm': {
      if (m.toLowerCase().includes('yes') || m.toLowerCase().includes('confirm') || m.toLowerCase() === 'y') {
        const deployMode = state.path === 'cloud' ? 'CLOUD' : state.path === 'connector' ? 'LOCAL' : 'LOCAL'
        return {
          reply: `🎉 **Your agent "${state.agentName}" is ready!** Redirecting you to your dashboard...`,
          setupComplete: true,
          setupData: {
            deployMode,
            agentName: state.agentName || 'My Agent',
            model: state.model || 'claude-sonnet-4-20250514',
            gatewayUrl: state.gatewayUrl || null,
            systemPrompt: state.systemPrompt || 'You are a helpful AI assistant.',
          }
        }
      }
      // They want to change something
      state.step = 'path_select'
      return { reply: "No worries, let's start over!\n\nHow would you like to set up?\n\n**1.** Connect Existing OpenClaw\n**2.** Cloud Deploy\n**3.** Download OpenClaw" }
    }
  }

  // Fallback
  state.step = 'path_select'
  return { reply: "Let's get you set up! Pick an option:\n\n**1.** Connect Existing OpenClaw\n**2.** Cloud Deploy\n**3.** Download OpenClaw" }
}

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
    const { message } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' })
    }

    const result = processMessage(userId, message)

    if (result.setupComplete && result.setupData) {
      const data = result.setupData
      const agent = await prisma.agent.create({
        data: {
          name: data.agentName || 'My Agent',
          model: data.model || 'claude-sonnet-4-20250514',
          systemPrompt: data.systemPrompt || 'You are a helpful AI assistant.',
          deployMode: data.deployMode || 'CLOUD',
          status: 'STOPPED',
          userId,
        }
      })

      await prisma.user.update({
        where: { id: userId },
        data: { setupComplete: true, setupStep: 'complete' }
      })

      // Clean up state
      setupStates.delete(userId)

      return res.json({
        reply: result.reply,
        setupComplete: true,
        agentId: agent.id,
        agentName: agent.name,
      })
    }

    res.json({ reply: result.reply, setupComplete: false })
  } catch (err: any) {
    console.error('Setup error:', err)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

// POST /api/setup/skip
router.post('/skip', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.userId! }, data: { setupComplete: true, setupStep: 'skipped' } })
    setupStates.delete(req.userId!)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/setup/complete
router.post('/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.userId! }, data: { setupComplete: true, setupStep: 'complete' } })
    setupStates.delete(req.userId!)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/setup/reset (for testing)
router.post('/reset', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.userId! }, data: { setupComplete: false, setupStep: null } })
    setupStates.delete(req.userId!)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
