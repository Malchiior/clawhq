# ClawHQ Desktop

Electron wrapper for ClawHQ dashboard.

## Development

```bash
cd electron
npm install
npm start -- --dev    # Points to localhost:5173
npm start             # Points to clawhq.dev
```

## Build

```bash
npm run build:win     # Windows (NSIS installer)
npm run build:mac     # macOS (DMG)
npm run build:linux   # Linux (AppImage)
```

Output goes to `electron/dist/`.

## Features

- System tray with minimize-to-tray
- Auto-updates via electron-updater
- Native menu bar
- External links open in system browser
- Dark background to match app theme
- Cross-platform (Windows, macOS, Linux)

## TODO

- [ ] Add app icon (icon.png - 512x512)
- [ ] Set up GitHub Releases for auto-updater
- [ ] Code signing for macOS/Windows
- [ ] Deep link protocol (clawhq://)
