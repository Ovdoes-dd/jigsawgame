# Jigsaw Game

A desktop-ready puzzle game built with JavaScript. It follows a layered architecture of Scene + Local Store + Utility Modules, supports offline play, and persists progress/settings via localStorage with JSON import/export.

## Features
- Layered design: Scene orchestration, runtime Store, and Utilities
- Offline-first: assets cached; game runs without network
- Persistent data: leaderboard, level progress, audio settings, free mode saves
- JSON import/export for backups and sharing
- Keyboard/mouse/touch input, responsive UI

## Tech Stack
- JavaScript (100%)
- Rendering & game flow: Phaser 3 (if present) or custom canvas/DOM loop
- State management: lightweight local Store (event-driven)
- Persistence: localStorage, JSON export/import
- Optional desktop packaging: Electron

## Getting Started
### Prerequisites
- Node.js ≥ 18 (for dev tooling/electron)
- Git and a modern browser

### Clone & Run (Web)
```bash
git clone https://github.com/Ovdoes-dd/jigsawgame.git
cd jigsawgame
# If a dev server script exists:
npm install
npm run dev
# Or open index.html directly with a local server:
npx serve .
```

### Run (Electron, optional)
```bash
npm install
npm run electron:dev
# Package app:
npm run electron:build
```

## Project Structure
```
jigsawgame/
├─ index.html           # Entry (web)
├─ src/
│  ├─ scenes/           # Game scenes: Menu, Gameplay, Settings
│  ├─ store/            # Local runtime store (state, events)
│  ├─ utils/            # Helpers: RNG, storage, timers, loaders
│  ├─ assets/           # Images/audio/data
│  └─ main.js           # Bootstrap, scene routing
├─ electron/            # Electron main/packaging (optional)
├─ styles/              # CSS styles
└─ README.md
```
