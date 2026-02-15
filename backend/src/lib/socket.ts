import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import prisma from './prisma'

let io: Server | null = null

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
      const payload = jwt.verify(token, secret) as { sessionId: string }

      // Look up session
      const session = await prisma.session.findUnique({
        where: { id: payload.sessionId },
      })
      if (!session || session.isRevoked || session.expiresAt < new Date()) {
        return next(new Error('Invalid session'))
      }

      // Attach userId to socket
      ;(socket as any).userId = session.userId
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

    socket.on('disconnect', () => {
      // Cleanup handled by socket.io
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
