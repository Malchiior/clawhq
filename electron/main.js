// ClawHQ Desktop — Main Process
const { app, BrowserWindow, Menu, shell, ipcMain, nativeTheme } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { autoUpdater } = require('electron-updater')
const { BridgeManager } = require('./bridge')
const { TrayManager } = require('./tray-manager')

const APP_URL = 'https://clawhq.dev'
const DEV_URL = 'http://localhost:5173'
const isDev = process.argv.includes('--dev')
const CONFIG_DIR = path.join(os.homedir(), '.clawhq')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

let mainWindow = null
let trayManager = null
const bridge = new BridgeManager()

// ─── Config Persistence ──────────────────────────────────────────────────────
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    }
  } catch {}
  return { bridge: {}, autoStart: true, startMinimized: false }
}

function saveConfig(config) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  } catch (err) {
    console.error('Config save error:', err.message)
  }
}

// ─── Window ──────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'ClawHQ',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0a0b0f',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
    show: false,
  })

  mainWindow.loadURL(isDev ? DEV_URL : APP_URL)

  mainWindow.once('ready-to-show', () => {
    const config = loadConfig()
    if (!config.startMinimized) {
      mainWindow.show()
    }
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL) && !url.startsWith(DEV_URL) && !url.startsWith('http://localhost')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

// ─── Menu ────────────────────────────────────────────────────────────────────
function setupMenu() {
  const template = [
    ...(process.platform === 'darwin'
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        }]
      : []),
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Bridge',
      submenu: [
        { label: 'Check Health', click: () => bridge.getFullHealth() },
        { type: 'separator' },
        { label: 'Start Gateway', click: () => bridge.startGateway() },
        { label: 'Stop Gateway', click: () => bridge.stopGateway() },
        { label: 'Restart Gateway', click: () => bridge.restartGateway() },
        { type: 'separator' },
        { label: 'Disconnect Bridge', click: () => bridge.disconnect() },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin'
          ? [{ type: 'separator' }, { role: 'front' }]
          : [{ role: 'close' }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Documentation', click: () => shell.openExternal('https://docs.clawhq.dev') },
        { label: 'Discord Community', click: () => shell.openExternal('https://discord.gg/clawhq') },
        { type: 'separator' },
        { label: `Version ${app.getVersion()}`, enabled: false },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ─── Auto-Updater ────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-available', () => mainWindow?.webContents.send('update-available'))
  autoUpdater.on('update-downloaded', () => mainWindow?.webContents.send('update-downloaded'))
  if (!isDev) autoUpdater.checkForUpdatesAndNotify().catch(() => {})
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────
// App info
ipcMain.handle('get-version', () => app.getVersion())
ipcMain.handle('get-platform', () => process.platform)
ipcMain.handle('get-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
ipcMain.handle('install-update', () => autoUpdater.quitAndInstall())

// Bridge control
ipcMain.handle('bridge:connect', async (_event, config) => {
  const result = await bridge.connect(config)
  // Save config for auto-reconnect
  const saved = loadConfig()
  saved.bridge = { url: config.url, token: config.token, agentId: config.agentId, port: config.port || 18789 }
  saveConfig(saved)
  return result
})
ipcMain.handle('bridge:disconnect', () => { bridge.disconnect(); return true })
ipcMain.handle('bridge:state', () => bridge.getState())
ipcMain.handle('bridge:health', () => bridge.getFullHealth())
ipcMain.handle('bridge:start-gateway', () => bridge.startGateway())
ipcMain.handle('bridge:stop-gateway', () => bridge.stopGateway())
ipcMain.handle('bridge:restart-gateway', () => bridge.restartGateway())
ipcMain.handle('bridge:install-openclaw', () => bridge.installOpenClaw())

// Settings
ipcMain.handle('settings:get', () => loadConfig())
ipcMain.handle('settings:set', (_event, config) => { saveConfig(config); return true })

// ─── Bridge Events → Renderer ────────────────────────────────────────────────
bridge.on('status', (status) => mainWindow?.webContents.send('bridge:status', status))
bridge.on('health', (health) => mainWindow?.webContents.send('bridge:health', health))
bridge.on('stats', (stats) => mainWindow?.webContents.send('bridge:stats', stats))
bridge.on('log', (msg) => mainWindow?.webContents.send('bridge:log', msg))
bridge.on('error', (err) => mainWindow?.webContents.send('bridge:error', err))

// ─── App Lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createWindow()
  setupMenu()
  setupAutoUpdater()

  // Create tray after window
  trayManager = new TrayManager(mainWindow, bridge)
  trayManager.create()

  // Auto-connect bridge if config exists
  const config = loadConfig()
  if (config.bridge?.token && config.bridge?.agentId) {
    console.log('[Desktop] Auto-connecting bridge...')
    bridge.connect({
      url: config.bridge.url || 'https://clawhq-api-production-f6d7.up.railway.app',
      token: config.bridge.token,
      agentId: config.bridge.agentId,
      port: config.bridge.port || 18789,
    })
  }

  // Initial health check
  bridge.getFullHealth()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  app.isQuitting = true
  bridge.disconnect()
  trayManager?.destroy()
})
