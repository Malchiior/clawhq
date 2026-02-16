# ClawHQ Desktop

Full desktop application with embedded bridge, system tray, and auto-update.

## Features
- **System Tray** — Runs in background, shows bridge/gateway status
- **Embedded Bridge** — No separate terminal window needed
- **OpenClaw Management** — Start/stop/restart gateway from UI or tray
- **Auto-Install** — Can install OpenClaw with one click if not found
- **Auto-Connect** — Remembers bridge config, reconnects on launch
- **Auto-Update** — Checks GitHub releases for updates
- **Minimize to Tray** — Closing the window keeps the app running

## Development

```bash
cd electron
npm install
npm run dev
```

## Building

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Output goes to `electron/dist/`.

## Config

Stored at `~/.clawhq/config.json`:
```json
{
  "bridge": {
    "url": "https://clawhq-api-production-f6d7.up.railway.app",
    "token": "your-jwt",
    "agentId": "your-agent-id",
    "port": 18789
  },
  "autoStart": true,
  "startMinimized": false
}
```

## Architecture

```
main.js          — Electron main process (window, menu, IPC)
bridge.js        — Bridge module (Socket.io relay + OpenClaw management)
tray-manager.js  — System tray with dynamic context menu
preload.js       — Safe IPC bridge to renderer (window.clawhq)
```

The renderer (clawhq.dev web app) can detect desktop mode via `window.clawhq.isDesktop` and use the bridge APIs directly instead of the web-based bridge flow.
