// ClawHQ Desktop — System Tray Manager
const { Tray, Menu, nativeImage } = require('electron')
const path = require('path')

class TrayManager {
  constructor(mainWindow, bridge) {
    this.mainWindow = mainWindow
    this.bridge = bridge
    this.tray = null
  }

  create() {
    try {
      const iconPath = path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png')
      this.tray = new Tray(iconPath)
      this.tray.setToolTip('ClawHQ Desktop')
      this.updateMenu()

      this.tray.on('click', () => {
        if (this.mainWindow) {
          if (this.mainWindow.isVisible()) {
            this.mainWindow.focus()
          } else {
            this.mainWindow.show()
          }
        }
      })

      // Update menu when bridge status changes
      this.bridge.on('status', () => this.updateMenu())
      this.bridge.on('health', () => this.updateMenu())
    } catch (err) {
      console.error('Tray creation failed:', err.message)
    }
  }

  updateMenu() {
    if (!this.tray) return

    const state = this.bridge.getState()
    const bridgeLabel = state.connected
      ? `✅ Bridge: Connected (${state.stats.messagesRelayed} messages)`
      : '❌ Bridge: Disconnected'
    const gatewayLabel = state.health.gatewayRunning
      ? `✅ Gateway: Running${state.health.clawVersion ? ` (${state.health.clawVersion})` : ''}`
      : state.health.installed
        ? '😴 Gateway: Stopped'
        : '📦 OpenClaw: Not Installed'

    const menu = Menu.buildFromTemplate([
      { label: 'Open ClawHQ', click: () => this.mainWindow?.show() },
      { type: 'separator' },
      { label: bridgeLabel, enabled: false },
      { label: gatewayLabel, enabled: false },
      { type: 'separator' },
      ...(state.health.installed && !state.health.gatewayRunning
        ? [{ label: '⚡ Start Gateway', click: () => this.bridge.startGateway() }]
        : []),
      ...(state.health.gatewayRunning
        ? [
            { label: '🔄 Restart Gateway', click: () => this.bridge.restartGateway() },
            { label: '⏹ Stop Gateway', click: () => this.bridge.stopGateway() },
          ]
        : []),
      ...(state.connected
        ? [{ label: '🔌 Disconnect Bridge', click: () => this.bridge.disconnect() }]
        : []),
      { type: 'separator' },
      { label: '⚙️ Settings', click: () => { this.mainWindow?.show(); this.mainWindow?.webContents.send('navigate', '/settings') } },
      { type: 'separator' },
      { label: 'Quit ClawHQ', click: () => { const { app } = require('electron'); app.isQuitting = true; app.quit() } },
    ])

    this.tray.setContextMenu(menu)

    // Update tooltip
    this.tray.setToolTip(`ClawHQ — ${state.connected ? 'Connected' : 'Disconnected'} | Gateway: ${state.health.gatewayRunning ? 'Running' : 'Off'}`)
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}

module.exports = { TrayManager }
