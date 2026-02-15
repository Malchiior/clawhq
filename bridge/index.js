// ClawHQ Bridge — connects local OpenClaw to ClawHQ
const ioClient = require('socket.io-client')

// Config (from env or config file)
const CLAWHQ_URL = process.env.CLAWHQ_URL || 'https://clawhq-api-production-f6d7.up.railway.app'
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN || '' // JWT access token from ClawHQ login
const AGENT_ID = process.env.AGENT_ID || ''
const OPENCLAW_PORT = process.env.OPENCLAW_PORT || 18789
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '' // OpenClaw gateway token (optional for localhost)

if (!BRIDGE_TOKEN) {
  console.error('[Bridge] ERROR: BRIDGE_TOKEN is required. Use your ClawHQ JWT access token.')
  process.exit(1)
}
if (!AGENT_ID) {
  console.error('[Bridge] ERROR: AGENT_ID is required. Find it in your ClawHQ dashboard.')
  process.exit(1)
}

console.log('[ClawHQ Bridge] Connecting to ClawHQ...')
console.log(`  Server: ${CLAWHQ_URL}`)
console.log(`  Agent:  ${AGENT_ID}`)
console.log(`  OpenClaw: http://127.0.0.1:${OPENCLAW_PORT}`)

const socket = ioClient(CLAWHQ_URL, {
  auth: { token: BRIDGE_TOKEN },
  reconnection: true,
  reconnectionDelay: 5000,
  reconnectionAttempts: Infinity,
})

socket.on('connect', () => {
  console.log(`[Bridge] Connected to ClawHQ (${socket.id})`)
  socket.emit('bridge:register', { agentId: AGENT_ID })
})

socket.on('bridge:registered', () => {
  console.log('[Bridge] ✅ Registered successfully — ready to relay messages')
})

socket.on('bridge:error', (data) => {
  console.error(`[Bridge] ❌ Error: ${data.message}`)
})

socket.on('bridge:replaced', () => {
  console.warn('[Bridge] ⚠️ Another bridge connected for this agent. This one will stop receiving messages.')
})

socket.on('bridge:message', async (data) => {
  console.log(`[Bridge] 📨 Message from web: ${data.content?.substring(0, 100)}`)

  try {
    // Try OpenAI-compatible chat completions endpoint first
    const response = await fetch(`http://127.0.0.1:${OPENCLAW_PORT}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OPENCLAW_TOKEN ? { 'Authorization': `Bearer ${OPENCLAW_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        model: 'openclaw:main',
        messages: [{ role: 'user', content: data.content }],
        stream: false,
      }),
    })

    if (!response.ok) {
      // Fallback: try /hooks/wake (fire and forget)
      await fetch(`http://127.0.0.1:${OPENCLAW_PORT}/hooks/wake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(OPENCLAW_TOKEN ? { 'Authorization': `Bearer ${OPENCLAW_TOKEN}` } : {}),
        },
        body: JSON.stringify({ text: data.content, mode: 'now' }),
      })

      socket.emit('bridge:response', {
        agentId: AGENT_ID,
        messageId: data.messageId,
        content: '⚠️ Message sent to OpenClaw via webhook. Enable `gateway.http.endpoints.chatCompletions.enabled: true` in your OpenClaw config for real-time responses in ClawHQ.',
      })
      return
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || 'No response from OpenClaw'

    console.log(`[Bridge] 📤 OpenClaw replied: ${content.substring(0, 100)}...`)

    socket.emit('bridge:response', {
      agentId: AGENT_ID,
      messageId: data.messageId,
      content: content,
    })
  } catch (err) {
    console.error(`[Bridge] ❌ Error: ${err.message}`)
    socket.emit('bridge:response', {
      agentId: AGENT_ID,
      messageId: data.messageId,
      content: `❌ Bridge error: ${err.message}. Is OpenClaw running on port ${OPENCLAW_PORT}?`,
    })
  }
})

// Periodic heartbeat
setInterval(() => {
  if (socket.connected) {
    socket.emit('bridge:status', { agentId: AGENT_ID })
  }
}, 30000)

socket.on('disconnect', (reason) => {
  console.log(`[Bridge] Disconnected: ${reason}`)
})

socket.on('connect_error', (err) => {
  console.error(`[Bridge] Connection error: ${err.message}`)
})

console.log('[ClawHQ Bridge] Running.')
