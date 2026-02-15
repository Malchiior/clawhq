import { io, Socket } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || ''

let socket: Socket | null = null

export function getSocket(): Socket {
  if (socket) return socket

  const token = localStorage.getItem('clawhq_token')
  socket = io(API_URL || window.location.origin, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })

  socket.on('connect', () => {
    console.log('🔌 Socket.io connected')
  })

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket.io disconnected:', reason)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/** Reconnect with a fresh token (e.g. after login) */
export function reconnectSocket() {
  disconnectSocket()
  getSocket()
}
