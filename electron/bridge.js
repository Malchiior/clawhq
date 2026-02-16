// ClawHQ Desktop — Embedded Bridge Module
// Manages the Socket.io bridge + OpenClaw health monitoring

const { execSync, spawn } = require('child_process')
const { EventEmitter } = require('events')
const path = require('path')
const fs = require('fs')
const os = require('os')

class BridgeManager extends EventEmitter {
  constructor() {
    super()
    this.socket = null
    this.config = { url: '', token: '', agentId: '', port: 18789 }
    this.health = { status: 'unknown', installed: false, clawVersion: null, gatewayRunning: false }
    this.connected = false
    this.registered = false
    this.stats = { messagesRelayed: 0, lastMessage: null, connectedSince: null }
    this.healthInterval = null
    this.ocToken = ''
    this._detectGatewayToken()
  }

  _detectGatewayToken() {
    try {
      const cfgPath = path.join(os.homedir(), '.openclaw', 'openclaw.json')
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
      this.ocToken = cfg.gateway?.auth?.token || ''
    } catch {}
  }

  // ─── Health Checks ─────────────────────────────────────────────────────────
  checkInstalled() {
    try {
      const version = execSync('openclaw --version', { timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
      return { installed: true, version }
    } catch {
      // Check common locations
      const paths = process.platform === 'win32'
        ? [path.join(process.env.APPDATA || '', 'npm', 'openclaw.cmd')]
        : ['/usr/local/bin/openclaw', '/usr/bin/openclaw']
      for (const p of paths) {
        if (fs.existsSync(p)) return { installed: true, version: 'unknown' }
      }
      return { installed: false, version: null }
    }
  }

  async checkGateway() {
    try {
      const res = await fetch(`http://127.0.0.1:${this.config.port}/health`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        return { running: true, uptime: data.uptime || null, version: data.version || null }
      }
      return { running: false }
    } catch {
      return { running: false }
    }
  }

  async getFullHealth() {
    const install = this.checkInstalled()
    const gateway = await this.checkGateway()
    let status = 'not-installed'
    if (install.installed && gateway.running) status = 'running'
    else if (install.installed) status = 'installed-stopped'

    this.health = {
      status,
      installed: install.installed,
      clawVersion: install.version,
      gatewayRunning: gateway.running,
      gatewayUptime: gateway.uptime,
      gatewayVersion: gateway.version,
      platform: process.platform,
      nodeVersion: process.version,
    }
    this.emit('health', this.health)
    return this.health
  }

  // ─── OpenClaw Management ───────────────────────────────────────────────────
  async startGateway() {
    this.emit('log', 'Starting OpenClaw gateway...')
    try {
      const isWin = process.platform === 'win32'
      const child = spawn(isWin ? 'openclaw.cmd' : 'openclaw', ['gateway', 'start'], {
        detached: true, stdio: 'ignore', shell: isWin,
      })
      child.unref()

      // Wait and check
      await new Promise(r => setTimeout(r, 5000))
      let gw = await this.checkGateway()
      if (!gw.running) {
        await new Promise(r => setTimeout(r, 5000))
        gw = await this.checkGateway()
      }
      await this.getFullHealth()
      return { success: gw.running }
    } catch (err) {
      this.emit('log', `Failed to start: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  async stopGateway() {
    this.emit('log', 'Stopping OpenClaw gateway...')
    try {
      execSync('openclaw gateway stop', { timeout: 10000, stdio: 'pipe' })
      await new Promise(r => setTimeout(r, 2000))
      await this.getFullHealth()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async restartGateway() {
    await this.stopGateway()
    return this.startGateway()
  }

  async installOpenClaw() {
    this.emit('log', 'Installing OpenClaw...')
    try {
      execSync('npm install -g openclaw@latest', { timeout: 120000, stdio: 'inherit' })
      this._detectGatewayToken()
      await this.getFullHealth()
      return { success: this.health.installed }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // ─── Bridge Connection ─────────────────────────────────────────────────────
  async connect(config) {
    if (config) Object.assign(this.config, config)
    if (!this.config.url || !this.config.token || !this.config.agentId) {
      this.emit('error', 'Missing bridge configuration')
      return false
    }

    // Lazy-load socket.io-client
    const ioClient = require('socket.io-client')

    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
    }

    const health = await this.getFullHealth()

    this.socket = ioClient(this.config.url, {
      auth: { token: this.config.token },
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionAttempts: Infinity,
    })

    this.socket.on('connect', () => {
      this.connected = true
      this.stats.connectedSince = new Date()
      this.emit('status', 'connected')
      this.emit('log', 'Connected to ClawHQ server')
      this.socket.emit('bridge:register', { agentId: this.config.agentId, health })
    })

    this.socket.on('bridge:registered', () => {
      this.registered = true
      this.emit('status', 'registered')
      this.emit('log', 'Bridge registered — ready to relay messages')
    })

    this.socket.on('bridge:error', (data) => {
      this.emit('error', data.message)
    })

    this.socket.on('bridge:replaced', () => {
      this.emit('log', 'Another bridge connected — this one was replaced')
      this.registered = false
      this.emit('status', 'replaced')
    })

    // Handle commands from server
    this.socket.on('bridge:command', async (data) => {
      const { command, requestId } = data
      this.emit('log', `Command: ${command}`)
      let result
      try {
        switch (command) {
          case 'health-check': result = await this.getFullHealth(); break
          case 'start-gateway': result = { ...(await this.startGateway()), health: this.health }; break
          case 'install-openclaw': result = { ...(await this.installOpenClaw()), health: this.health }; break
          case 'restart-gateway': result = { ...(await this.restartGateway()), health: this.health }; break
          default: result = { error: `Unknown: ${command}` }
        }
      } catch (err) { result = { error: err.message } }
      this.socket.emit('bridge:command-result', { requestId, agentId: this.config.agentId, command, result })
    })

    // Relay messages
    this.socket.on('bridge:message', async (data) => {
      this.emit('log', `Message: ${data.content?.substring(0, 80)}`)
      this.stats.messagesRelayed++
      this.stats.lastMessage = new Date()
      this.emit('stats', this.stats)

      const sk = `clawhq:${this.config.agentId}`
      const hdrs = { 'Content-Type': 'application/json', 'x-openclaw-session-key': sk }
      if (this.ocToken) hdrs['Authorization'] = `Bearer ${this.ocToken}`

      try {
        const res = await fetch(`http://127.0.0.1:${this.config.port}/v1/chat/completions`, {
          method: 'POST', headers: hdrs,
          body: JSON.stringify({ model: 'openclaw:main', messages: [{ role: 'user', content: data.content }], stream: false }),
        })
        if (res.ok) {
          const j = await res.json()
          const content = j.choices?.[0]?.message?.content || 'No response'
          this.socket.emit('bridge:response', { agentId: this.config.agentId, messageId: data.messageId, content })
        } else {
          // Fallback to wake
          await fetch(`http://127.0.0.1:${this.config.port}/hooks/wake`, {
            method: 'POST', headers: hdrs,
            body: JSON.stringify({ text: data.content, mode: 'now' }),
          })
          this.socket.emit('bridge:response', { agentId: this.config.agentId, messageId: data.messageId, content: 'Sent via webhook.' })
        }
      } catch (err) {
        this.socket.emit('bridge:response', { agentId: this.config.agentId, messageId: data.messageId, content: `Error: ${err.message}` })
      }
    })

    this.socket.on('disconnect', (reason) => {
      this.connected = false
      this.registered = false
      this.emit('status', 'disconnected')
      this.emit('log', `Disconnected: ${reason}`)
    })

    this.socket.on('connect_error', (err) => {
      this.emit('error', `Connection error: ${err.message}`)
    })

    // Periodic health heartbeat
    this.healthInterval = setInterval(async () => {
      if (this.socket?.connected) {
        const h = await this.getFullHealth()
        this.socket.emit('bridge:status', { agentId: this.config.agentId, health: h })
      }
    }, 30000)

    return true
  }

  disconnect() {
    if (this.healthInterval) clearInterval(this.healthInterval)
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.connected = false
    this.registered = false
    this.emit('status', 'disconnected')
  }

  getState() {
    return {
      connected: this.connected,
      registered: this.registered,
      health: this.health,
      stats: this.stats,
      config: { url: this.config.url, agentId: this.config.agentId, port: this.config.port },
    }
  }
}

module.exports = { BridgeManager }
