// ClawHQ Bridge — Smart local agent that manages OpenClaw connection
const ioClient = require('socket.io-client')
const { execSync, spawn } = require('child_process')

// Config
const CLAWHQ_URL = process.env.CLAWHQ_URL || 'https://clawhq-api-production-f6d7.up.railway.app'
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN || ''
const AGENT_ID = process.env.AGENT_ID || ''
const OPENCLAW_PORT = process.env.OPENCLAW_PORT || 18789
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || ''

if (!BRIDGE_TOKEN) { console.error('[Bridge] ERROR: BRIDGE_TOKEN required.'); process.exit(1) }
if (!AGENT_ID) { console.error('[Bridge] ERROR: AGENT_ID required.'); process.exit(1) }

// ─── Health Check Helpers ────────────────────────────────────────────────────
function checkInstalled() {
  try {
    const version = execSync('openclaw --version', { timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
    return { installed: true, version }
  } catch {
    // Check common install locations
    const fs = require('fs')
    const path = require('path')
    const possiblePaths = process.platform === 'win32'
      ? [path.join(process.env.APPDATA || '', 'npm', 'openclaw.cmd'), path.join(process.env.LOCALAPPDATA || '', 'npm', 'openclaw.cmd')]
      : ['/usr/local/bin/openclaw', '/usr/bin/openclaw', path.join(process.env.HOME || '', '.npm-global', 'bin', 'openclaw')]
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return { installed: true, version: 'unknown (not in PATH)' }
    }
    return { installed: false, version: null }
  }
}

async function checkGatewayRunning() {
  try {
    const res = await fetch(`http://127.0.0.1:${OPENCLAW_PORT}/health`, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { running: true, uptime: data.uptime || null, version: data.version || null }
    }
    return { running: false }
  } catch {
    return { running: false }
  }
}

function tryStartGateway() {
  return new Promise((resolve) => {
    console.log('[Bridge] 🔄 Attempting to start OpenClaw gateway...')
    try {
      const isWin = process.platform === 'win32'
      const child = spawn(isWin ? 'openclaw.cmd' : 'openclaw', ['gateway', 'start'], {
        detached: true,
        stdio: 'ignore',
        shell: isWin,
      })
      child.unref()

      // Wait a few seconds then check if it came up
      setTimeout(async () => {
        const status = await checkGatewayRunning()
        if (status.running) {
          console.log('[Bridge] ✅ Gateway started successfully!')
          resolve({ success: true })
        } else {
          // Try again after a bit more time
          setTimeout(async () => {
            const retry = await checkGatewayRunning()
            resolve({ success: retry.running, error: retry.running ? null : 'Gateway started but not responding' })
          }, 5000)
        }
      }, 5000)
    } catch (err) {
      console.error(`[Bridge] ❌ Failed to start gateway: ${err.message}`)
      resolve({ success: false, error: err.message })
    }
  })
}

function tryInstallOpenClaw() {
  return new Promise((resolve) => {
    console.log('[Bridge] 📦 Installing OpenClaw...')
    try {
      execSync('npm install -g openclaw@latest', { timeout: 120000, stdio: 'inherit' })
      const check = checkInstalled()
      resolve({ success: check.installed, version: check.version })
    } catch (err) {
      console.error(`[Bridge] ❌ Install failed: ${err.message}`)
      resolve({ success: false, error: err.message })
    }
  })
}

// ─── Full Health Check ───────────────────────────────────────────────────────
async function getFullHealth() {
  const install = checkInstalled()
  const gateway = await checkGatewayRunning()
  
  let status = 'not-installed'
  if (install.installed && gateway.running) status = 'running'
  else if (install.installed && !gateway.running) status = 'installed-stopped'

  return {
    status,
    installed: install.installed,
    clawVersion: install.version,
    gatewayRunning: gateway.running,
    gatewayUptime: gateway.uptime || null,
    gatewayVersion: gateway.version || null,
    platform: process.platform,
    nodeVersion: process.version,
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log('[ClawHQ Bridge] Starting...')
console.log(`  Server: ${CLAWHQ_URL}`)
console.log(`  Agent:  ${AGENT_ID}`)
console.log(`  OpenClaw: http://127.0.0.1:${OPENCLAW_PORT}`)

const socket = ioClient(CLAWHQ_URL, {
  auth: { token: BRIDGE_TOKEN },
  reconnection: true,
  reconnectionDelay: 5000,
  reconnectionAttempts: Infinity,
})

socket.on('connect', async () => {
  console.log(`[Bridge] Connected to ClawHQ (${socket.id})`)
  
  // Run health check and send with registration
  const health = await getFullHealth()
  console.log(`[Bridge] Health: ${health.status} (installed=${health.installed}, gateway=${health.gatewayRunning})`)
  
  socket.emit('bridge:register', { agentId: AGENT_ID, health })
})

socket.on('bridge:registered', (data) => {
  console.log('[Bridge] ✅ Registered successfully — ready to relay messages')
  console.log('')
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  ⚠️  DO NOT CLOSE THIS WINDOW!                  ║')
  console.log('║  The bridge must stay running for ClawHQ to     ║')
  console.log('║  communicate with your local OpenClaw agent.    ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log('')
})

socket.on('bridge:error', (data) => {
  console.error(`[Bridge] ❌ Error: ${data.message}`)
})

socket.on('bridge:replaced', () => {
  console.warn('[Bridge] ⚠️ Another bridge connected for this agent.')
})

// ─── Remote Commands from Server ─────────────────────────────────────────────
socket.on('bridge:command', async (data) => {
  const { command, requestId } = data
  console.log(`[Bridge] 🎮 Command received: ${command}`)

  try {
    switch (command) {
      case 'health-check': {
        const health = await getFullHealth()
        socket.emit('bridge:command-result', { requestId, agentId: AGENT_ID, command, result: health })
        break
      }
      case 'start-gateway': {
        const result = await tryStartGateway()
        const health = await getFullHealth()
        socket.emit('bridge:command-result', { requestId, agentId: AGENT_ID, command, result: { ...result, health } })
        break
      }
      case 'install-openclaw': {
        const result = await tryInstallOpenClaw()
        const health = await getFullHealth()
        socket.emit('bridge:command-result', { requestId, agentId: AGENT_ID, command, result: { ...result, health } })
        break
      }
      case 'restart-gateway': {
        console.log('[Bridge] 🔄 Restarting gateway...')
        try { execSync('openclaw gateway stop', { timeout: 10000, stdio: 'pipe' }) } catch {}
        await new Promise(r => setTimeout(r, 2000))
        const result = await tryStartGateway()
        const health = await getFullHealth()
        socket.emit('bridge:command-result', { requestId, agentId: AGENT_ID, command, result: { ...result, health } })
        break
      }
      default:
        socket.emit('bridge:command-result', { requestId, agentId: AGENT_ID, command, result: { error: `Unknown command: ${command}` } })
    }
  } catch (err) {
    socket.emit('bridge:command-result', { requestId, agentId: AGENT_ID, command, result: { error: err.message } })
  }
})

// ─── Message Relay ───────────────────────────────────────────────────────────
socket.on('bridge:message', async (data) => {
  console.log(`[Bridge] 📨 Message from web: ${data.content?.substring(0, 100)}`)

  try {
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
      await fetch(`http://127.0.0.1:${OPENCLAW_PORT}/hooks/wake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(OPENCLAW_TOKEN ? { 'Authorization': `Bearer ${OPENCLAW_TOKEN}` } : {}),
        },
        body: JSON.stringify({ text: data.content, mode: 'now' }),
      })
      socket.emit('bridge:response', {
        agentId: AGENT_ID, messageId: data.messageId,
        content: '⚠️ Message sent to OpenClaw via webhook. Enable `gateway.http.endpoints.chatCompletions.enabled: true` for real-time responses.',
      })
      return
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || 'No response from OpenClaw'
    console.log(`[Bridge] 📤 Reply: ${content.substring(0, 100)}...`)
    socket.emit('bridge:response', { agentId: AGENT_ID, messageId: data.messageId, content })
  } catch (err) {
    console.error(`[Bridge] ❌ Error: ${err.message}`)
    socket.emit('bridge:response', {
      agentId: AGENT_ID, messageId: data.messageId,
      content: `❌ Can't reach OpenClaw on port ${OPENCLAW_PORT}. Is the gateway running?`,
    })
  }
})

// ─── Periodic Health Heartbeat ───────────────────────────────────────────────
setInterval(async () => {
  if (!socket.connected) return
  const health = await getFullHealth()
  socket.emit('bridge:status', { agentId: AGENT_ID, health })
}, 30000)

socket.on('disconnect', (reason) => console.log(`[Bridge] Disconnected: ${reason}`))
socket.on('connect_error', (err) => console.error(`[Bridge] Connection error: ${err.message}`))

console.log('[ClawHQ Bridge] Running.')
