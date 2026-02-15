/**
 * Setup Assistant API
 * Fully scripted onboarding flow — no AI calls needed.
 * Fast, reliable, zero API cost.
 */

import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const INITIAL_MESSAGE = `Hey there! Welcome to ClawHQ — let's get your AI agent up and running.

How would you like to get started?

**1. Connect Existing** 🔗 — Already running OpenClaw? Link it here as your web/mobile interface.

**2. Cloud Hosted** ☁️ — We host everything. Pick a model, buy credits, live in 30 seconds.

**3. Download ClawHQ** 💻 — Install the desktop app on your PC. Run locally, bring your own keys or buy credits.

Which path is right for you?`

function detectPath(message: string): string | null {
  const m = message.toLowerCase()
  if (m.includes('connect') || m.includes('existing') || m.includes('link') || m === '1') return 'connector'
  if (m.includes('cloud') || m.includes('host') || m === '2') return 'cloud'
  if (m.includes('download') || m.includes('desktop') || m.includes('local') || m.includes('own machine') || m.includes('my pc') || m === '3') return 'desktop'
  return null
}

function detectModel(message: string): string | null {
  const m = message.toLowerCase()
  if (m.includes('sonnet') || (m.includes('claude') && !m.includes('haiku') && !m.includes('opus'))) return 'claude-sonnet-4-20250514'
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
  path?: string       // connector | cloud | desktop
  agentName?: string
  model?: string
  gatewayUrl?: string
  systemPrompt?: string
  os?: string
  apiChoice?: string  // credits | byok
  step: string
}

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
        return { reply: "I didn't catch that. Just pick a number:\n\n**1.** Connect Existing 🔗\n**2.** Cloud Hosted ☁️\n**3.** Download ClawHQ 💻" }
      }
      state.path = path

      if (path === 'connector') {
        state.step = 'connector_url'
        return { reply: "Great choice! 🔗 ClawHQ becomes your web & mobile interface for OpenClaw.\n\nWhat's your OpenClaw gateway URL? It usually looks like `http://localhost:18789` or `https://your-server.com:18789`." }
      }
      if (path === 'cloud') {
        state.step = 'cloud_name'
        return { reply: "Awesome! Cloud Hosted is the fastest way to get started. ☁️\n\nWhat would you like to name your agent?" }
      }
      if (path === 'desktop') {
        state.step = 'desktop_os'
        return { reply: "Nice choice! 💻 The ClawHQ desktop app runs OpenClaw right on your machine — no remote servers needed.\n\nWhat operating system are you on?\n- **Windows**\n- **Mac**\n- **Linux**" }
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
        reply: `Perfect! Here's what we're setting up:\n\n🔗 **Mode:** Connect Existing\n🌐 **Gateway:** ${state.gatewayUrl}\n🤖 **Agent Name:** ${state.agentName}\n\nLook good? Type **yes** to finish setup.`,
      }
    }

    // ── Cloud Path ──
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
        reply: `Here's your setup:\n\n☁️ **Mode:** Cloud Hosted\n🤖 **Agent:** ${state.agentName}\n🧠 **Model:** ${modelName}\n\nLook good? Type **yes** to deploy!`
      }
    }

    // ── Desktop Path ──
    case 'desktop_os': {
      const os = detectOS(m)
      if (!os) {
        return { reply: "Which OS? Just say **Windows**, **Mac**, or **Linux**." }
      }
      state.os = os
      state.step = 'desktop_download'
      const osLabel = os.charAt(0).toUpperCase() + os.slice(1)
      const downloadLinks: Record<string, string> = {
        windows: 'https://clawhq.dev/download/windows',
        mac: 'https://clawhq.dev/download/mac',
        linux: 'https://clawhq.dev/download/linux',
      }
      return {
        reply: `Here's your download link:\n\n📥 **[Download ClawHQ for ${osLabel}](${downloadLinks[os]})**\n\nInstall and launch the app — it'll set up OpenClaw locally in a container for you.\n\nWhile that installs, how would you like to handle API access?\n\n**1. Buy ClawHQ Credits** — All models included, one bill, no hassle\n**2. Bring Your Own Keys (BYOK)** — Use your own API keys\n\nOr type **skip** to decide later.`
      }
    }

    case 'desktop_download': {
      const lower = m.toLowerCase()
      if (lower.includes('credit') || lower.includes('buy') || lower === '1') {
        state.apiChoice = 'credits'
      } else if (lower.includes('byok') || lower.includes('own') || lower.includes('key') || lower === '2') {
        state.apiChoice = 'byok'
      } else if (lower === 'skip') {
        state.apiChoice = 'skip'
      } else {
        return { reply: "Just pick:\n**1.** Buy ClawHQ Credits\n**2.** Bring Your Own Keys (BYOK)\nOr type **skip** to decide later." }
      }
      state.step = 'desktop_name'
      return { reply: "What would you like to name your agent?" }
    }

    case 'desktop_name': {
      state.agentName = m
      state.step = 'confirm'
      const apiLabel = state.apiChoice === 'credits' ? '💳 ClawHQ Credits' : state.apiChoice === 'byok' ? '🔑 Bring Your Own Keys' : '⏭️ Decide later'
      return {
        reply: `Here's your setup:\n\n💻 **Mode:** Desktop App\n💿 **OS:** ${(state.os || 'unknown').charAt(0).toUpperCase() + (state.os || 'unknown').slice(1)}\n🔌 **API:** ${apiLabel}\n🤖 **Agent:** ${state.agentName}\n\nLook good? Type **yes** to finish!`
      }
    }

    // ── Confirmation ──
    case 'confirm': {
      if (m.toLowerCase().includes('yes') || m.toLowerCase().includes('confirm') || m.toLowerCase() === 'y') {
        const deployMode = state.path === 'cloud' ? 'CLOUD' : state.path === 'connector' ? 'CONNECTOR' : 'DESKTOP'
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
      state.step = 'path_select'
      return { reply: "No worries, let's start over!\n\nHow would you like to get started?\n\n**1.** Connect Existing 🔗\n**2.** Cloud Hosted ☁️\n**3.** Download ClawHQ 💻" }
    }
  }

  state.step = 'path_select'
  return { reply: "Let's get you set up! Pick an option:\n\n**1.** Connect Existing 🔗\n**2.** Cloud Hosted ☁️\n**3.** Download ClawHQ 💻" }
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
