# MiniChat Desktop

Enterprise AI Chatbot Desktop Application built with Tauri 2.x

## Prerequisites

- Rust 1.70+
- Node.js 18+
- npm or pnpm

## Development

```bash
cd desktop
npm install
npm run tauri dev
```

## Production Build

```bash
npm run tauri build
```

Output binaries:
- Windows: `.exe` in `src-tauri/target/release/bundle/nsis/`
- macOS: `.dmg` in `src-tauri/target/release/bundle/dmg/`
- Linux: `.AppImage` in `src-tauri/target/release/bundle/appimage/`

## Desktop Features

The desktop app wraps the web frontend (`../web/`) with native OS integration:

- **Native Notifications**: Uses `tauri-plugin-notification` for system notifications
- **Shell Integration**: Uses `tauri-plugin-shell` for opening external links
- **OS Detection**: Uses `tauri-plugin-os` for platform-specific behavior

## Project Structure

```
desktop/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs          # Binary entry point
│   │   └── lib.rs            # Library with Tauri builder
│   ├── Cargo.toml            # Rust dependencies
│   ├── tauri.conf.json       # Tauri configuration
│   ├── capabilities/
│   │   └── default.json      # Security permissions
│   └── icons/                # App icons
├── src/
│   └── hooks/
│       ├── useDesktopNative.ts   # Native OS APIs
│       └── useTauriCommands.ts   # Custom Tauri commands
└── package.json
```

## Web Frontend

The desktop app reuses the web frontend at `../web/`. During development:
- `beforeDevCommand` runs `cd ../web && npm run dev`
- `devUrl` is set to `http://localhost:5173`
- On build, `beforeBuildCommand` builds the web app to `../web/dist`

## Environment Variables

The desktop app inherits environment variables from the system. The web frontend should already have access to:
- `MINIMAX_API_KEY`
- `MINIMAX_API_HOST`
