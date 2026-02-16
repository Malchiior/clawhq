// ClawHQ Desktop — Preload (exposes safe APIs to renderer)
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('clawhq', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  // Bridge control
  bridge: {
    connect: (config) => ipcRenderer.invoke('bridge:connect', config),
    disconnect: () => ipcRenderer.invoke('bridge:disconnect'),
    getState: () => ipcRenderer.invoke('bridge:state'),
    checkHealth: () => ipcRenderer.invoke('bridge:health'),
    startGateway: () => ipcRenderer.invoke('bridge:start-gateway'),
    stopGateway: () => ipcRenderer.invoke('bridge:stop-gateway'),
    restartGateway: () => ipcRenderer.invoke('bridge:restart-gateway'),
    installOpenClaw: () => ipcRenderer.invoke('bridge:install-openclaw'),

    // Events from main process
    onStatus: (cb) => { ipcRenderer.on('bridge:status', (_e, data) => cb(data)); return () => ipcRenderer.removeAllListeners('bridge:status') },
    onHealth: (cb) => { ipcRenderer.on('bridge:health', (_e, data) => cb(data)); return () => ipcRenderer.removeAllListeners('bridge:health') },
    onStats: (cb) => { ipcRenderer.on('bridge:stats', (_e, data) => cb(data)); return () => ipcRenderer.removeAllListeners('bridge:stats') },
    onLog: (cb) => { ipcRenderer.on('bridge:log', (_e, data) => cb(data)); return () => ipcRenderer.removeAllListeners('bridge:log') },
    onError: (cb) => { ipcRenderer.on('bridge:error', (_e, data) => cb(data)); return () => ipcRenderer.removeAllListeners('bridge:error') },
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (config) => ipcRenderer.invoke('settings:set', config),
  },

  // Navigation from main process
  onNavigate: (cb) => { ipcRenderer.on('navigate', (_e, path) => cb(path)); return () => ipcRenderer.removeAllListeners('navigate') },

  // Update events
  onUpdateAvailable: (cb) => { ipcRenderer.on('update-available', () => cb()); return () => ipcRenderer.removeAllListeners('update-available') },
  onUpdateDownloaded: (cb) => { ipcRenderer.on('update-downloaded', () => cb()); return () => ipcRenderer.removeAllListeners('update-downloaded') },

  // Identify as desktop app
  isDesktop: true,
})
