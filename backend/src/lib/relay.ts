/**
 * ClawHQ Relay — WebSocket tunnel for local OpenClaw agents.
 * 
 * Architecture:
 * 1. User's local OpenClaw opens a persistent WebSocket to ClawHQ: ws(s)://api.clawhq.dev/relay
 * 2. ClawHQ dashboard sends chat messages via REST API as normal
 * 3. Backend checks if agent has an active relay connection
 * 4. If yes, forwards the message through the WS tunnel to the local agent
 * 5. Local agent responds through the same tunnel
 * 6. Response is saved and returned to the dashboard
 * 
 * This means: zero port forwarding, zero webhook config, zero Docker.
 * User installs OpenClaw, logs in, agent appears in dashboard. Magic.
 */

import { WebSocket, WebSocketServer } from 'ws'
import { IncomingMessage } from 'http'
import { Server } from 'http'
import prisma from './prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'clawhq-dev-secret-change-in-production'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RelayConnection {
  ws: WebSocket
  userId: string
  agentId: string
  connectedAt: Date
  lastPing: Date
  pendingRequests: Map<string, {
    resolve: (response: RelayResponse) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }>
}

interface RelayRequest {
  id: string
  type: 'chat' | 'ping' | 'status' | 'restart'
  payload: any
}

interface RelayResponse {
  id: string
  type: 'chat_response' | 'pong' | 'status_response' | 'error'
  payload: any
}

interface RelayEvent {
  type: 'agent_connected' | 'agent_disconnected' | 'agent_heartbeat'
  agentId: string
  userId: string
  timestamp: string
}

// ─── Relay Manager ───────────────────────────────────────────────────────────

class RelayManager {
  private wss: WebSocketServer | null = null
  private connections: Map<string, RelayConnection> = new Map() // keyed by agentId
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Attach the relay WebSocket server to an existing HTTP server.
   */
  attach(server: Server): void {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/relay',
      maxPayload: 5 * 1024 * 1024, // 5MB max message
    })

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req)
    })

    // Heartbeat every 30s to detect dead connections
    this.heartbeatInterval = setInterval(() => this.pruneStaleConnections(), 30_000)

    console.log('🔌 Relay WebSocket server attached at /relay')
  }

  /**
   * Handle a new WebSocket connection from a local OpenClaw instance.
   * Auth: query param ?token=<JWT> or first message is { type: 'auth', token: '<JWT>', agentId: '<id>' }
   */
  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    const token = url.searchParams.get('token')
    const agentId = url.searchParams.get('agentId')

    if (token && agentId) {
      // Auth via query params (simpler for CLI)
      await this.authenticateAndRegister(ws, token, agentId)
    } else {
      // Wait for auth message
      const authTimeout = setTimeout(() => {
        ws.close(4001, 'Authentication timeout')
      }, 10_000)

      ws.once('message', async (data) => {
        clearTimeout(authTimeout)
        try {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'auth' && msg.token && msg.agentId) {
            await this.authenticateAndRegister(ws, msg.token, msg.agentId)
          } else {
            ws.close(4002, 'Invalid auth message')
          }
        } catch {
          ws.close(4003, 'Malformed auth message')
        }
      })
    }
  }

  private async authenticateAndRegister(ws: WebSocket, token: string, agentId: string): Promise<void> {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, JWT_SECRET) as any
      const userId = decoded.userId

      if (!userId) {
        ws.close(4004, 'Invalid token')
        return
      }

      // Verify agent belongs to user
      const agent = await prisma.agent.findFirst({
        where: { id: agentId, userId },
      })

      if (!agent) {
        ws.close(4005, 'Agent not found or not owned by user')
        return
      }

      // Close existing connection for this agent if any
      const existing = this.connections.get(agentId)
      if (existing) {
        existing.ws.close(4010, 'Replaced by new connection')
        this.connections.delete(agentId)
      }

      // Register connection
      const conn: RelayConnection = {
        ws,
        userId,
        agentId,
        connectedAt: new Date(),
        lastPing: new Date(),
        pendingRequests: new Map(),
      }
      this.connections.set(agentId, conn)

      // Update agent status
      await prisma.agent.update({
        where: { id: agentId },
        data: { 
          status: 'RUNNING',
          lastHeartbeat: new Date(),
        },
      })

      // Send ack
      ws.send(JSON.stringify({
        type: 'auth_ok',
        agentId,
        message: 'Connected to ClawHQ relay',
      }))

      console.log(`🔗 Relay: Agent ${agent.name} (${agentId}) connected for user ${userId}`)

      // Handle messages from local agent
      ws.on('message', (data) => {
        this.handleAgentMessage(conn, data.toString())
      })

      ws.on('close', async () => {
        this.connections.delete(agentId)
        // Mark agent as stopped only if this is still the active connection
        try {
          await prisma.agent.update({
            where: { id: agentId },
            data: { status: 'STOPPED' },
          })
        } catch { /* agent may have been deleted */ }
        console.log(`🔌 Relay: Agent ${agentId} disconnected`)
      })

      ws.on('error', (err) => {
        console.error(`❌ Relay: Agent ${agentId} error:`, err.message)
      })

      // Set up ping/pong for keepalive
      ws.on('pong', () => {
        conn.lastPing = new Date()
      })

    } catch (err: any) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        ws.close(4004, 'Invalid or expired token')
      } else {
        console.error('Relay auth error:', err)
        ws.close(4006, 'Authentication failed')
      }
    }
  }

  /**
   * Handle a message from the local OpenClaw agent.
   */
  private handleAgentMessage(conn: RelayConnection, raw: string): void {
    try {
      const msg: RelayResponse = JSON.parse(raw)

      // Handle heartbeat/pong from agent
      if (msg.type === 'pong') {
        conn.lastPing = new Date()
        return
      }

      // Route response to pending request
      const pending = conn.pendingRequests.get(msg.id)
      if (pending) {
        clearTimeout(pending.timer)
        conn.pendingRequests.delete(msg.id)
        if (msg.type === 'error') {
          pending.reject(new Error(msg.payload?.message || 'Agent error'))
        } else {
          pending.resolve(msg)
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }

  /**
   * Send a chat message to a locally connected agent and wait for response.
   * This is called by the chat route when an agent has an active relay.
   */
  async sendChatMessage(agentId: string, userMessage: string, attachments?: any[]): Promise<string> {
    const conn = this.connections.get(agentId)
    if (!conn || conn.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Agent not connected via relay')
    }

    const requestId = generateId()
    const request: RelayRequest = {
      id: requestId,
      type: 'chat',
      payload: {
        message: userMessage,
        attachments: attachments?.map(a => ({
          name: a.name,
          type: a.type,
          size: a.size,
          dataUri: a.dataUri,
        })),
      },
    }

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        conn.pendingRequests.delete(requestId)
        reject(new Error('Agent response timeout (60s)'))
      }, 60_000)

      conn.pendingRequests.set(requestId, {
        resolve: (response: RelayResponse) => {
          resolve(response.payload?.content || response.payload?.message || response.payload?.reply || 'No response from agent.')
        },
        reject,
        timer,
      })

      conn.ws.send(JSON.stringify(request))
    })
  }

  /**
   * Check if an agent has an active relay connection.
   */
  isConnected(agentId: string): boolean {
    const conn = this.connections.get(agentId)
    return !!conn && conn.ws.readyState === WebSocket.OPEN
  }

  /**
   * Get relay status for an agent.
   */
  getStatus(agentId: string): { connected: boolean; connectedAt?: string; lastPing?: string } {
    const conn = this.connections.get(agentId)
    if (!conn || conn.ws.readyState !== WebSocket.OPEN) {
      return { connected: false }
    }
    return {
      connected: true,
      connectedAt: conn.connectedAt.toISOString(),
      lastPing: conn.lastPing.toISOString(),
    }
  }

  /**
   * Get all connected agents for a user.
   */
  getConnectedAgents(userId: string): string[] {
    const agents: string[] = []
    for (const [agentId, conn] of this.connections) {
      if (conn.userId === userId && conn.ws.readyState === WebSocket.OPEN) {
        agents.push(agentId)
      }
    }
    return agents
  }

  /**
   * Get overall relay stats.
   */
  getStats(): { totalConnections: number; agents: { id: string; connectedAt: string }[] } {
    const agents: { id: string; connectedAt: string }[] = []
    for (const [agentId, conn] of this.connections) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        agents.push({ id: agentId, connectedAt: conn.connectedAt.toISOString() })
      }
    }
    return { totalConnections: agents.length, agents }
  }

  /**
   * Prune stale connections (no pong in 90s).
   */
  private pruneStaleConnections(): void {
    const now = Date.now()
    for (const [agentId, conn] of this.connections) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        // If no pong in 90s, terminate
        if (now - conn.lastPing.getTime() > 90_000) {
          console.log(`💀 Relay: Pruning stale connection for agent ${agentId}`)
          conn.ws.terminate()
          this.connections.delete(agentId)
        } else {
          // Send ping
          conn.ws.ping()
        }
      } else {
        this.connections.delete(agentId)
      }
    }
  }

  /**
   * Shut down the relay.
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    for (const [, conn] of this.connections) {
      conn.ws.close(1001, 'Server shutting down')
    }
    this.connections.clear()
    this.wss?.close()
  }
}

function generateId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Singleton
export const relayManager = new RelayManager()
export default relayManager
