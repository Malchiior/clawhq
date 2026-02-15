import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { relayManager } from '../lib/relay'
import { proxyChatForUser } from '../lib/ai-proxy'
import { emitChatMessage, isBridgeConnected, sendBridgeMessage } from '../lib/socket'
import multer from 'multer'

const router = Router()

// Multer config: 10MB max for images, memory storage
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})

// File upload config: 25MB max, common file types
const ALLOWED_FILE_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text/Code
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
  'text/xml',
  'application/x-yaml',
  'text/yaml',
  // Archives
  'application/zip',
  'application/gzip',
  'application/x-tar',
  // Images (also allowed as files)
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Audio/Video
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
])

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_FILE_TYPES.has(file.mimetype) || file.mimetype.startsWith('text/')) {
      cb(null, true)
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported`))
    }
  },
})

// GET /api/chat/:agentId/messages - Get chat history
router.get('/:agentId/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    const userId = req.userId!
    const cursor = req.query.cursor as string | undefined
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    })
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    const where: any = { agentId, userId }
    if (cursor) {
      where.createdAt = { lt: new Date(cursor) }
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    messages.reverse()

    const hasMore = messages.length === limit
    const oldestCursor = messages.length > 0 ? messages[0].createdAt.toISOString() : null

    res.json({ messages, hasMore, cursor: oldestCursor })
  } catch (error) {
    console.error('Chat history error:', error)
    res.status(500).json({ error: 'Failed to fetch chat history' })
  }
})

// GET /api/chat/:agentId/poll - Poll for new messages since timestamp
router.get('/:agentId/poll', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    const userId = req.userId!
    const since = req.query.since as string

    if (!since) {
      res.status(400).json({ error: 'Missing "since" parameter' })
      return
    }

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    })
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        agentId,
        userId,
        createdAt: { gt: new Date(since) },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    res.json({ messages })
  } catch (error) {
    console.error('Chat poll error:', error)
    res.status(500).json({ error: 'Failed to poll messages' })
  }
})

// POST /api/chat/:agentId/upload - Upload images for chat
router.post('/:agentId/upload', authenticate, imageUpload.array('images', 5), async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    const userId = req.userId!

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }

    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) { res.status(400).json({ error: 'No images provided' }); return }

    const attachments = files.map(f => ({
      name: f.originalname,
      type: f.mimetype,
      size: f.size,
      dataUri: `data:${f.mimetype};base64,${f.buffer.toString('base64')}`,
    }))

    res.json({ attachments })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Failed to upload images' })
  }
})

// POST /api/chat/:agentId/upload-files - Upload any supported file for chat
router.post('/:agentId/upload-files', authenticate, fileUpload.array('files', 10), async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    const userId = req.userId!

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }

    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) { res.status(400).json({ error: 'No files provided' }); return }

    const attachments = files.map(f => {
      const isImage = f.mimetype.startsWith('image/')
      const isText = f.mimetype.startsWith('text/') || ['application/json', 'application/xml', 'application/x-yaml'].includes(f.mimetype)
      
      const attachment: any = {
        name: f.originalname,
        type: f.mimetype,
        size: f.size,
        category: isImage ? 'image' : isText ? 'text' : 'binary',
      }

      if (isImage) {
        attachment.dataUri = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`
      } else if (isText && f.size <= 500 * 1024) {
        // Include text preview for text files under 500KB
        attachment.textPreview = f.buffer.toString('utf-8').substring(0, 2000)
        attachment.dataUri = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`
      } else {
        attachment.dataUri = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`
      }

      return attachment
    })

    res.json({ attachments })
  } catch (error) {
    console.error('File upload error:', error)
    res.status(500).json({ error: 'Failed to upload files' })
  }
})

// POST /api/chat/:agentId/save - Save a message without AI generation (for CONNECTOR mode)
router.post('/:agentId/save', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    const userId = req.userId!
    const { role, content, metadata } = req.body

    if (!role || !['user', 'assistant'].includes(role)) {
      res.status(400).json({ error: 'Valid role (user/assistant) required' })
      return
    }

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }

    const message = await prisma.chatMessage.create({
      data: {
        role,
        content: content || '',
        metadata: metadata || undefined,
        agentId,
        userId,
      },
    })

    emitChatMessage(agentId, message)

    await prisma.agent.update({
      where: { id: agentId },
      data: { totalMessages: { increment: 1 }, lastActiveAt: new Date() },
    })

    res.json({ message })
  } catch (error) {
    console.error('Chat save error:', error)
    res.status(500).json({ error: 'Failed to save message' })
  }
})

// POST /api/chat/:agentId/messages - Send a message to agent
router.post('/:agentId/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    const userId = req.userId!
    const { content, attachments } = req.body

    const hasContent = content && typeof content === 'string' && content.trim().length > 0
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0

    if (!hasContent && !hasAttachments) {
      res.status(400).json({ error: 'Message content or attachments required' })
      return
    }

    if (hasContent && content.length > 10000) {
      res.status(400).json({ error: 'Message too long (max 10,000 characters)' })
      return
    }

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    })
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    // Save user message with optional attachments
    const messageContent = hasContent ? content.trim() : ''
    const userMetadata: any = {}
    if (hasAttachments) {
      userMetadata.attachments = attachments.map((a: any) => ({
        name: a.name,
        type: a.type,
        size: a.size,
        dataUri: a.dataUri,
      }))
    }

    const userMessage = await prisma.chatMessage.create({
      data: {
        role: 'user',
        content: messageContent,
        metadata: Object.keys(userMetadata).length > 0 ? userMetadata : undefined,
        agentId,
        userId,
      },
    })

    // Generate AI response (pass attachments for vision context)
    const assistantContent = await generateAgentResponse(agent, messageContent, hasAttachments ? attachments : undefined)

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        role: 'assistant',
        content: assistantContent,
        agentId,
        userId,
        metadata: {
          model: agent.model,
          generatedAt: new Date().toISOString(),
        },
      },
    })

    // Emit real-time messages via Socket.io
    emitChatMessage(agentId, userMessage)
    emitChatMessage(agentId, assistantMessage)

    // Update agent stats
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        totalMessages: { increment: 2 },
        lastActiveAt: new Date(),
      },
    })

    res.json({ userMessage, assistantMessage })
  } catch (error) {
    console.error('Chat send error:', error)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// DELETE /api/chat/:agentId/messages - Clear chat history
router.delete('/:agentId/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    const userId = req.userId!

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    })
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    const deleted = await prisma.chatMessage.deleteMany({
      where: { agentId, userId },
    })

    res.json({ deleted: deleted.count })
  } catch (error) {
    console.error('Chat clear error:', error)
    res.status(500).json({ error: 'Failed to clear chat history' })
  }
})

// GET /api/chat/:agentId/bridge-status - Check if bridge is connected
router.get('/:agentId/bridge-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string
    const userId = req.userId!

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }

    res.json({ connected: isBridgeConnected(agentId) })
  } catch (error) {
    console.error('Bridge status error:', error)
    res.status(500).json({ error: 'Failed to check bridge status' })
  }
})

// Helper: Generate agent response
async function generateAgentResponse(agent: any, userMessage: string, attachments?: any[]): Promise<string> {
  // 0. Try bridge (Socket.io bridge for CONNECTOR agents)
  if (isBridgeConnected(agent.id)) {
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      return await sendBridgeMessage(agent.id, messageId, userMessage, attachments)
    } catch (err: any) {
      console.error(`Bridge chat error for agent ${agent.id}:`, err.message)
      // Fall through to other methods
    }
  }

  // 1. Try relay tunnel (local OpenClaw connected via WebSocket)
  if (relayManager.isConnected(agent.id)) {
    try {
      return await relayManager.sendChatMessage(agent.id, userMessage, attachments)
    } catch (err: any) {
      console.error(`Relay chat error for agent ${agent.id}:`, err.message)
      // Fall through to container or bundled API
    }
  }

  // 2. Try Docker container (cloud deploy)
  if (agent.status === 'RUNNING' && agent.containerId && agent.containerPort) {
    try {
      const response = await fetch(`http://localhost:${agent.containerPort}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${agent.webhookToken}`,
        },
        body: JSON.stringify({ message: userMessage }),
      })
      if (response.ok) {
        const data = await response.json() as any
        return data.reply || data.message || data.content || 'No response from agent.'
      }
    } catch {
      // Fall through to bundled API
    }
  }

  // 3. Try bundled API proxy (ClawHQ-managed AI keys)
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  if (user?.apiMode === 'bundled') {
    try {
      // Build conversation context (last 20 messages for context window)
      const recentMessages = await prisma.chatMessage.findMany({
        where: { agentId: agent.id, userId: agent.userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      recentMessages.reverse()

      const conversationMessages = recentMessages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      // Add current user message
      conversationMessages.push({ role: 'user' as const, content: userMessage })

      const systemPrompt = agent.systemPrompt || 'You are a helpful AI assistant.'
      const model = agent.model || 'claude-sonnet-4-20250514'

      const result = await proxyChatForUser(
        agent.userId,
        model,
        systemPrompt,
        conversationMessages,
        attachments
      )

      return result.content
    } catch (err: any) {
      console.error(`Bundled API error for agent ${agent.id}:`, err.message)
      // If it's a limit error, return it as the response so the user sees it
      if (err.message.includes('limit') || err.message.includes('Usage')) {
        return `⚠️ ${err.message}\n\nYou can upgrade your plan in Settings → Billing for higher limits.`
      }
      // Fall through to demo
    }
  }

  // 4. Try BYOK (user's own API keys)
  if (user?.apiMode === 'byok') {
    try {
      // Find user's API key for the agent's model provider
      const model = agent.model || 'claude-sonnet-4-20250514'
      let provider = 'ANTHROPIC'
      if (model.startsWith('gpt-') || model.startsWith('o1-') || model.startsWith('o3-')) provider = 'OPENAI'
      else if (model.startsWith('gemini-')) provider = 'GOOGLE'
      else if (model.startsWith('deepseek-')) provider = 'DEEPSEEK'
      else if (model.startsWith('grok-')) provider = 'GROK'

      const userKey = await prisma.apiKey.findFirst({
        where: { userId: agent.userId, provider: provider as any, isActive: true },
      })

      if (userKey) {
        // Use the same proxy but with user's own key
        const { proxyAiRequest } = await import('../lib/ai-proxy')
        
        const recentMessages = await prisma.chatMessage.findMany({
          where: { agentId: agent.id, userId: agent.userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
        recentMessages.reverse()

        const conversationMessages = recentMessages.map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
        conversationMessages.push({ role: 'user' as const, content: userMessage })

        const result = await proxyAiRequest({
          model,
          systemPrompt: agent.systemPrompt || 'You are a helpful AI assistant.',
          messages: conversationMessages,
          attachments,
        })

        return result.content
      }
    } catch (err: any) {
      console.error(`BYOK API error for agent ${agent.id}:`, err.message)
    }
  }

  // 5. Demo fallback (no API keys available)
  const systemPrompt = agent.systemPrompt || 'You are a helpful AI assistant.'
  const agentName = agent.name || 'Agent'

  return `I'm **${agentName}**, but I'm not connected to an AI model yet.\n\nTo get real responses, you have two options:\n\n🚀 **Bundled API** (recommended) — Switch to Bundled mode in Settings → API Keys. No setup needed!\n\n🔑 **Bring Your Own Key** — Add your own API key for ${agent.model || 'your preferred model'} in Settings → API Keys.\n\nOnce configured, I'll use **${agent.model || 'Claude Sonnet'}** with my system prompt to give you real AI-powered responses. 🤖`
}

export default router
