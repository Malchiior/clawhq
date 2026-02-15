import { useEffect, useCallback } from 'react'
import { getSocket } from '../lib/socket'

interface ChatMessage {
  id: string
  role: string
  content: string
  createdAt: string
  metadata?: any
}

/**
 * Subscribe to real-time chat messages for an agent.
 * Calls onMessage for each new message received via Socket.io.
 */
export function useRealtimeChat(agentId: string | undefined, onMessage: (msg: ChatMessage) => void) {
  const stableOnMessage = useCallback(onMessage, [onMessage])

  useEffect(() => {
    if (!agentId) return

    const socket = getSocket()
    socket.emit('join:agent', agentId)

    const handler = (msg: ChatMessage) => {
      stableOnMessage(msg)
    }

    socket.on('chat:message', handler)

    return () => {
      socket.off('chat:message', handler)
      socket.emit('leave:agent', agentId)
    }
  }, [agentId, stableOnMessage])
}

/**
 * Subscribe to agent status changes.
 */
export function useAgentStatus(onStatus: (data: { agentId: string; status: string }) => void) {
  useEffect(() => {
    const socket = getSocket()
    socket.on('agent:status', onStatus)
    return () => { socket.off('agent:status', onStatus) }
  }, [onStatus])
}
