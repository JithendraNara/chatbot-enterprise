# MiniChat — Enterprise AI Chatbot

> A production-ready, cross-device AI chatbot powered by **MiniMax M2.7** — text, vision, speech, and search in one unified subscription.

## Features

| Capability | Description |
|---|---|
| **M2.7 Chat** | Streaming token-by-token responses with full conversation context |
| **Web Search** | Real-time web search via MiniMax MCP `web_search` tool |
| **Image Understanding** | Analyze images with `understand_image` MCP tool |
| **Text-to-Speech** | 40+ voices, 7 emotions, voice cloning via `speech-2.8-hd` |
| **Image Generation** | Photorealistic image generation via `image-01` model |
| **Cross-Device Sync** | Conversations sync in real-time across all your devices |
| **Offline PWA** | Works offline with queued messages and background sync |
| **Dark Theme** | Enterprise-grade dark UI on all platforms |

## Screenshots

> [!NOTE]
> Add screenshots by placing images in `docs/screenshots/` and referencing them here.

```
┌─────────────────────────────────────────────────────────────┐
│  MiniChat — M2.7 Enterprise Assistant                        │
│                                                             │
│  [Chat List]        [Conversation]         [Settings]        │
│                                                             │
│  ○ New Chat         ┌─────────────────────┐                  │
│                     │ Assistant          │                  │
│  ▌ Project Setup    │ What's the best    │                  │
│    "How do I set..." │ architecture for.. │                  │
│                     │                     │                  │
│  ▌ Code Review      │ ┌─────────────────┐│                  │
│    "Can you check..." │ I'd recommend a ││                  │
│                     │ microservices...  ││                  │
│  ▌ Debug Help       │                     │                  │
│    "Why is my API.." │ 🔍 Searching...   ││                  │
│                     └─────────────────────┘                  │
│                     │ Type a message...  [📎] [▶] │        │
└─────────────────────────────────────────────────────────────┘
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                                │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│  │  iOS   │  │Android │  │   Web  │  │Desktop │           │
│  │  React │  │ React  │  │  Vite  │  │  Tauri │           │
│  │  Native│  │ Native │  │   PWA  │  │  + Rust│           │
│  └────┬───┘  └────┬───┘  └────┬───┘  └────┬───┘           │
└───────┼──────────┼──────────┼──────────┼────────────────────┘
        │          │          │          │
        └──────────┴──────────┴──────────┘
                      │ HTTPS / WSS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Fastify)                     │
│  JWT Auth │ Rate Limiter │ WebSocket │ SSE Streaming       │
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌────────────────┐  ┌─────────────────────┐
│ MiniMax M2.7  │  │  MCP Tools     │  │  Multimodal APIs    │
│  (Streaming)  │  │ web_search     │  │  TTS │ Image Gen   │
│               │  │ understand_img │  │  Music │ Video       │
└───────────────┘  └────────────────┘  └─────────────────────┘
```

## Tech Stack

### Frontend
| Platform | Framework | Key Libraries |
|----------|-----------|---------------|
| iOS / Android | React Native + Expo | Zustand, TanStack Query, expo-* modules |
| Web | Vite + React + PWA | Tailwind CSS, Workbox, react-markdown |
| Desktop | Tauri 2.x + Rust | Native window, notifications, OS APIs |

### Backend
| Layer | Technology |
|------|-----------|
| Server | Node.js + Fastify 5 |
| Language | TypeScript (strict) |
| Auth | JWT with httpOnly cookies |
| Rate Limiting | Sliding window (4500 req / 5 hrs) |
| Context Store | In-memory (swap for Redis in prod) |

### MiniMax APIs
| API | Endpoint | Used For |
|-----|----------|----------|
| M2.7 (Anthropic-compatible) | `https://api.minimax.io/anthropic/v1/messages` | Chat streaming, function calling |
| Web Search MCP | Tool in M2.7 request | Real-time web queries |
| Image Understanding MCP | Tool in M2.7 request | Image analysis |
| TTS | `https://api.minimax.io/v1/t2a_v2` | Voice synthesis |
| Image Gen | `https://api.minimax.io/v1/image_generation` | Text-to-image |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (or npm)
- Rust 1.70+ (for desktop app)
- A MiniMax Token Plan subscription (Plus recommended)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/chatbot-enterprise.git
cd chatbot-enterprise

# Install root dependencies (if any)
# Install each subproject
(cd backend && npm install)
(cd web && npm install)
(cd mobile && npm install)
(cd desktop && npm install)
```

### 2. Configure Environment

```bash
# backend/.env
MINIMAX_API_KEY=sk-cp-your-key-here
MINIMAX_API_HOST=https://api.minimax.io
JWT_SECRET=generate-a-strong-random-secret-here
PORT=3000
```

> [!IMPORTANT]
> Never commit `.env` files. Each subproject has a `.env.example` — copy it and fill in real values.

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your MiniMax API key
```

### 3. Start the Backend

```bash
cd backend
npm install
npm run dev

# Server running at http://localhost:3000
# Health check: curl http://localhost:3000/health
```

### 4. Start the Web App

```bash
cd web
npm install
npm run dev

# Opens at http://localhost:5173
# (proxies /api/* and /ws to backend)
```

### 5. Run the Mobile App

```bash
cd mobile
npx expo start

# Opens Expo Dev Tools
# Press i for iOS Simulator, a for Android Emulator
# Scan QR code with your phone for device testing
```

### 6. Build the Desktop App

```bash
cd desktop
npm install
npm run tauri dev       # Development
npm run tauri build     # Production build (.exe/.dmg/.AppImage)
```

## Project Structure

```
chatbot-enterprise/
├── backend/              # Fastify API server
│   ├── src/
│   │   ├── index.ts           # Entry point, CORS, JWT, WebSocket
│   │   ├── routes/
│   │   │   ├── auth.ts         # Register, login, JWT
│   │   │   ├── chat.ts         # Core streaming chat endpoint
│   │   │   └── conversations.ts # CRUD for conversations
│   │   ├── lib/
│   │   │   ├── minimax.ts      # MiniMax API client (Anthropic-compatible)
│   │   │   ├── rate-limiter.ts  # 4500 req/5hr sliding window
│   │   │   └── conversation-store.ts
│   │   └── types.ts
│   └── .env.example
│
├── web/                 # PWA (Vite + React)
│   ├── src/
│   │   ├── pages/              # Login, Register, Chat, Settings
│   │   ├── components/          # ChatList, MessageBubble, ChatInput...
│   │   ├── stores/             # Zustand (auth + chat state)
│   │   ├── hooks/              # useStreamingChat, useWebSocket
│   │   ├── lib/                # api.ts, websocket.ts
│   │   └── service-worker.ts    # Workbox PWA
│   ├── public/                  # manifest.json, icons
│   └── dist/                   # Built output
│
├── mobile/              # React Native + Expo
│   ├── app/                   # Expo Router pages
│   │   ├── (auth)/             # Login, register screens
│   │   ├── (tabs)/             # Chat list, settings tabs
│   │   └── chat/[id].tsx       # Individual chat
│   ├── components/chat/        # MessageBubble, StreamingText, ToolCallCard
│   ├── stores/                 # Zustand + AsyncStorage persistence
│   ├── hooks/                  # useStreamingChat, useNativeCapabilities
│   ├── lib/                    # api.ts, websocket.ts
│   └── constants/              # Theme, voice catalog
│
└── desktop/             # Tauri 2.x + Rust
    ├── src-tauri/
    │   ├── src/main.rs          # Rust entry + plugins
    │   ├── tauri.conf.json      # Window, plugins, build config
    │   └── Cargo.toml            # Rust dependencies
    └── src/                     # Shared web frontend hooks
```

## API Reference

### Authentication

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/auth/register` | `{ email, password }` | JWT in httpOnly cookie |
| POST | `/api/auth/login` | `{ email, password }` | JWT in httpOnly cookie |
| POST | `/api/auth/refresh` | — | New JWT |
| POST | `/api/auth/logout` | — | Clears cookie |

### Conversations

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/conversations` | — | `Conversation[]` |
| POST | `/api/conversations` | `{ title? }` | `Conversation` |
| GET | `/api/conversations/:id` | — | `Conversation` with messages |
| DELETE | `/api/conversations/:id` | — | `204 No Content` |

### Chat

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/chat/message` | `{ conversationId, content, attachments? }` | `text/event-stream` |

**Streaming events:**
```
event: token
data: {"content": "Hello"}

event: tool_call
data: {"name": "web_search", "input": {"query": "..."}}

event: done
data: {"usage": {"input_tokens": 100, "output_tokens": 200}}
```

## Rate Limiting

Your **Plus plan** quota: **4,500 requests / 5 hours** (sliding window, per user).

The backend enforces this server-side. When exceeded:
```json
{ "error": "Rate limit exceeded", "retryAfter": 1234 }
```

## MiniMax Token Plan — What You Get

| Feature | Starter | Plus (Recommended) | Max |
|---------|---------|---------------------|-----|
| M2.7 requests / 5hrs | 1,500 | **4,500** | 9,000 |
| Image understanding MCP | ✅ | ✅ | ✅ |
| Web search MCP | ✅ | ✅ | ✅ |
| Image generation | ✅ | ✅ | ✅ |
| Speech synthesis | ✅ | ✅ | ✅ |
| Concurrent OpenClaw agents | — | **1-2** | 3+ |

**Your Plus plan ($200/year)** gives you 4,500 M2.7 requests every 5 hours — sufficient for active daily use across all your devices.

## Deployment

### Backend (Railway / Render / Fly.io)

```bash
# Set environment variables
MINIMAX_API_KEY=sk-cp-...
MINIMAX_API_HOST=https://api.minimax.io
JWT_SECRET=<generate-with-openssl-rand-base64-32>

# Deploy
cd backend && npm install && npm run build
```

### Web (Vercel / Cloudflare Pages / Netlify)

```bash
cd web && npm install && npm run build
# Deploy the `dist/` folder
```

### Mobile (EAS Build / TestFlight / Google Play)

```bash
cd mobile
eas login
eas build --platform ios     # iOS
eas build --platform android # Android
```

### Desktop (GitHub Releases / Homebrew)

```bash
cd desktop && npm run tauri build
# Outputs: .exe (Windows), .dmg (macOS), .AppImage (Linux)
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MINIMAX_API_KEY` | ✅ | From platform.minimax.io |
| `MINIMAX_API_HOST` | ✅ | `https://api.minimax.io` (global) or `https://api.minimaxi.com` (China) |
| `JWT_SECRET` | ✅ | Generate: `openssl rand -base64 32` |
| `PORT` | No | Default: `3000` |
| `HOST` | No | Default: `0.0.0.0` |

## Troubleshooting

### "Connection refused" on localhost:3000
The backend isn't running. Start it with `cd backend && npm run dev`.

### Streaming stops after a few seconds
Check your MiniMax API key is valid and the subscription is active at platform.minimax.io.

### Rate limit hit immediately
Another device or session is consuming your quota. The 4,500 req/5hr limit is shared across all clients.

### Web app CORS errors
Ensure the backend CORS config allows your frontend origin. Update `origin: true` in `backend/src/index.ts` to list your domain in production.

### Tauri build fails on macOS
Install Xcode Command Line Tools: `xcode-select --install`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit: `git commit -m 'feat: add something'`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

## License

MIT — see [LICENSE](LICENSE)

---

Built with **MiniMax Token Plan** · [platform.minimax.io](https://platform.minimax.io)
