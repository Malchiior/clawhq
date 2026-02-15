import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import prisma from './prisma'
let io: Server | null = null

// ─── Bridge Registry ─────────────────────────────────────────────────────────
// Maps agentId → socket.id for connected bridges
const bridgeSockets: Map<string, string> = new Map()
// Maps socket.id → agentId for cleanup on disconnect
const socketToAgent: Map<string, string> = new Map()
// Maps agentId → latest health report from bridge
const bridgeHealth: Map<string, any> = new Map()
// Maps requestId → { resolve, timer } for bridge commands
const pendingCommands: Map<string, { resolve: (result: any) => void; timer: ReturnType<typeof setTimeout> }> = new Map()

// Pending bridge responses: messageId → { resolve, reject, timer }
const pendingBridgeResponses: Map<string, {
  resolve: (content: string) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}> = new Map()

export function isBridgeConnected(agentId: string): boolean {
  const socketId = bridgeSockets.get(agentId)
  if (!socketId || !io) return false
  const socket = io.sockets.sockets.get(socketId)
  return !!socket?.connected
}

export function getBridgeHealth(agentId: string): any {
  return bridgeHealth.get(agentId) || null
}

export function sendBridgeCommand(agentId: string, command: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const socketId = bridgeSockets.get(agentId)
    if (!socketId || !io) return reject(new Error('Bridge not connected'))
    const socket = io.sockets.sockets.get(socketId)
    if (!socket?.connected) return reject(new Error('Bridge not connected'))

    const requestId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const timer = setTimeout(() => {
      pendingCommands.delete(requestId)
      reject(new Error('Command timeout (60s)'))
    }, 60_000)

    pendingCommands.set(requestId, { resolve, timer })
    socket.emit('bridge:command', { command, requestId })
  })
}

export function sendBridgeMessage(agentId: string, messageId: string, content: string, attachments?: any[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const socketId = bridgeSockets.get(agentId)
    if (!socketId || !io) {
      return reject(new Error('Bridge not connected'))
    }
    const socket = io.sockets.sockets.get(socketId)
    if (!socket?.connected) {
      bridgeSockets.delete(agentId)
      socketToAgent.delete(socketId)
      return reject(new Error('Bridge not connected'))
    }

    const timer = setTimeout(() => {
      pendingBridgeResponses.delete(messageId)
      reject(new Error('Bridge response timeout (120s)'))
    }, 120_000)

    pendingBridgeResponses.set(messageId, { resolve, reject, timer })

    socket.emit('bridge:message', { agentId, messageId, content, attachments })
  })
}

export function initSocketIO(httpServer: HttpServer, corsOrigins: string[]) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  })

  // Auth middleware — verify JWT from handshake
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string
      if (!token) return next(new Error('Authentication required'))

      const secret = process.env.JWT_SECRET || 'dev-secret'
      const payload = jwt.verify(token, secret) as { sessionId?: string; userId?: string; jti?: string; type?: string }

      // Support both session-based tokens and access tokens
      if (payload.userId && payload.type === 'access') {
        // Access token — verify user exists
        const user = await prisma.user.findUnique({ where: { id: payload.userId } })
        if (!user) return next(new Error('Invalid user'))
        ;(socket as any).userId = payload.userId
      } else if (payload.sessionId) {
        // Session-based token
        const session = await prisma.session.findUnique({
          where: { id: payload.sessionId },
        })
        if (!session || session.isRevoked || session.expiresAt < new Date()) {
          return next(new Error('Invalid session'))
        }
        ;(socket as any).userId = session.userId
      } else {
        return next(new Error('Invalid token format'))
      }
      next()
    } catch {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string
    // Join user's personal room
    socket.join(`user:${userId}`)

    // Join specific agent chat rooms
    socket.on('join:agent', (agentId: string) => {
      socket.join(`agent:${agentId}`)
    })

    socket.on('leave:agent', (agentId: string) => {
      socket.leave(`agent:${agentId}`)
    })

    // ─── Bridge Events ─────────────────────────────────────────────────
    socket.on('bridge:register', async (data: { agentId: string; health?: any }) => {
      try {
        const { agentId, health } = data
        if (!agentId) {
          socket.emit('bridge:error', { message: 'agentId required' })
          return
        }

        // Verify agent belongs to this user
        const agent = await prisma.agent.findFirst({
          where: { id: agentId, userId },
        })
        if (!agent) {
          socket.emit('bridge:error', { message: 'Agent not found or not owned by user' })
          return
        }

        // Close existing bridge for this agent if any
        const existingSocketId = bridgeSockets.get(agentId)
        if (existingSocketId && existingSocketId !== socket.id) {
          const existingSocket = io!.sockets.sockets.get(existingSocketId)
          if (existingSocket) {
            existingSocket.emit('bridge:replaced', { message: 'Another bridge connected' })
          }
          socketToAgent.delete(existingSocketId)
        }

        // Register bridge
        bridgeSockets.set(agentId, socket.id)
        socketToAgent.set(socket.id, agentId)

        // Update agent status
        await prisma.agent.update({
          where: { id: agentId },
          data: { status: 'RUNNING', lastHeartbeat: new Date() },
        })

        // Store health if provided
        if (health) {
          bridgeHealth.set(agentId, { ...health, updatedAt: new Date().toISOString() })
        }

        socket.emit('bridge:registered', { agentId })
        // Notify frontend watchers about bridge health
        io!.to(`agent:${agentId}`).emit('bridge:health', { agentId, connected: true, health: bridgeHealth.get(agentId) })
        console.log(`🌉 Bridge registered for agent ${agent.name} (${agentId}) [${health?.status || 'unknown'}]`)
      } catch (err: any) {
        console.error('Bridge register error:', err.message)
        socket.emit('bridge:error', { message: 'Registration failed' })
      }
    })

    socket.on('bridge:response', async (data: { agentId: string; messageId: string; content: string }) => {
      const { messageId, content, agentId } = data
      if (!messageId || !content) return

      // Resolve pending request
      const pending = pendingBridgeResponses.get(messageId)
      if (pending) {
        clearTimeout(pending.timer)
        pendingBridgeResponses.delete(messageId)
        pending.resolve(content)
      }
    })

    socket.on('bridge:status', async (data: { agentId: string; health?: any }) => {
      // Heartbeat from bridge with health data
      const agentId = data?.agentId || socketToAgent.get(socket.id)
      if (agentId) {
        if (data.health) {
          bridgeHealth.set(agentId, { ...data.health, updatedAt: new Date().toISOString() })
          // Push health update to frontend watchers
          io!.to(`agent:${agentId}`).emit('bridge:health', { agentId, connected: true, health: data.health })
        }
        try {
          await prisma.agent.update({
            where: { id: agentId },
            data: { lastHeartbeat: new Date() },
          })
        } catch { /* ignore */ }
      }
    })

    socket.on('bridge:command-result', (data: { requestId: string; agentId: string; command: string; result: any }) => {
      const { requestId, agentId, result } = data
      // Update health if included
      if (result?.health) {
        bridgeHealth.set(agentId, { ...result.health, updatedAt: new Date().toISOString() })
        io!.to(`agent:${agentId}`).emit('bridge:health', { agentId, connected: true, health: result.health })
      }
      // Resolve pending command
      const pending = pendingCommands.get(requestId)
      if (pending) {
        clearTimeout(pending.timer)
        pendingCommands.delete(requestId)
        pending.resolve(result)
      }
    })

    socket.on('disconnect', async () => {
      // Cleanup bridge registration
      const agentId = socketToAgent.get(socket.id)
      if (agentId) {
        bridgeSockets.delete(agentId)
        socketToAgent.delete(socket.id)
        bridgeHealth.delete(agentId)
        // Notify frontend
        io!.to(`agent:${agentId}`).emit('bridge:health', { agentId, connected: false, health: null })
        try {
          await prisma.agent.update({
            where: { id: agentId },
            data: { status: 'STOPPED' },
          })
        } catch { /* agent may have been deleted */ }
        console.log(`🌉 Bridge disconnected for agent ${agentId}`)
      }
    })
  })

  console.log('🔌 Socket.io initialized')
  return io
}

/** Emit a new chat message to everyone watching an agent */
export function emitChatMessage(agentId: string, message: any) {
  if (!io) return
  io.to(`agent:${agentId}`).emit('chat:message', message)
}

/** Emit agent status change to the owning user */
export function emitAgentStatus(userId: string, agentId: string, status: string) {
  if (!io) return
  io.to(`user:${userId}`).emit('agent:status', { agentId, status })
}

/** Emit agent log entry */
export function emitAgentLog(agentId: string, log: any) {
  if (!io) return
  io.to(`agent:${agentId}`).emit('agent:log', log)
}

export function getIO() {
  return io
}
