# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server (backend):** `npm run dev` — runs server with `--watch-path` on port 8083
- **Dev server (frontend):** `npm run ui` — runs Vite dev server with HMR
- **Build:** `npm run build` — builds React frontend (Vite) + typechecks server
- **Typecheck frontend only:** `npm run typecheck`
- **Typecheck server only:** `npm run typecheckServer`
- **Format:** `npm run prettier`
- **Update episode data:** `npm run updateEps`

Run both `npm run dev` and `npm run ui` simultaneously for local development. The frontend dev server proxies API calls to `localhost:8083`.

## Architecture

This is a multiplayer Jeopardy! web game with a Node.js/Hono backend and React frontend communicating via Socket.IO (websocket-only).

### Server (`server/`)

- **server.ts** — Hono HTTP server + Socket.IO setup. Creates rooms, serves static build, exposes `/stats`, `/metadata`, `/createRoom` endpoints. Loads persisted rooms from Redis on boot.
- **room.ts** — `Room` class: core game logic. Manages roster, game state, buzzing, judging, scoring, and all socket event handlers (`CMD:*` events). Handles serialization to/from Redis for persistence. This is the largest and most complex file.
- **gamestate.ts** — State shape definitions. `getGameState()` returns the full game state; `getPerQuestionState()` returns per-clue state. `PublicGameState` is the type sent to clients.
- **jData.ts** — Loads and periodically refreshes episode data from a gzipped JSON file (`jeopardy.json.gz`). In production, fetches latest from GitHub; in development (`NODE_ENV=development`), uses local file only.
- **openai.ts** — AI judge integration using OpenAI API to evaluate answer correctness.
- **aivoice.ts** — Text-to-speech for reading clues via OpenAI.
- **config.ts** — Loads `.env` file via `node:process.loadEnvFile()`, merges with defaults. Key env vars: `REDIS_URL`, `ANTHROPIC_API_KEY`, `PORT` (default 8083).
- **redis.ts** — Optional Redis client for room persistence and analytics counters.
- **moniker.ts** — Random room/user name generation from word lists in `words/`.

### Client (`src/`)

- **index.tsx** — Entry point, Mantine provider setup.
- **components/App/** — Main app shell. Handles room connection, name management, socket lifecycle.
- **components/Jeopardy/** — Game board UI, buzzing, answering, judging, scoring display.
- **components/Home/** — Landing page with room creation and game loading options.
- **components/Chat/** — In-game text chat.
- **components/TopBar/** — Navigation bar.
- **utils.ts** — Shared utilities. `serverPath` computes the backend URL (uses `VITE_SERVER_HOST` env var or derives from window location).

### Shared Types

`global.d.ts` defines shared interfaces (`User`, `ChatMessage`, `RawQuestion`, `Question`, `GameOptions`, `RoundName`) used by both server and client — no import needed (ambient declarations).

### Communication Pattern

Client and server communicate exclusively via Socket.IO events prefixed with `CMD:` (client→server) and `RPS:` (server→client). The server sends full public game state on each update via `RPS:gameState`.

## Environment Variables

- `REDIS_URL` — Redis connection for room persistence (optional; without it rooms are in-memory only)
- `ANTHROPIC_API_KEY` — Enables AI judge and AI voice features
- `PORT` — Server port (default: 8083)
- `SSL_KEY_FILE` / `SSL_CRT_FILE` — Optional HTTPS support
- `VITE_SERVER_HOST` — Override backend URL for frontend dev
- `NODE_ENV=development` — Skips remote episode data fetching

## Key Details

- Node 24 required (`engines` in package.json)
- ESM project (`"type": "module"` in package.json)
- Server runs TypeScript directly via Node's native TS support (no transpilation step)
- Vite builds frontend to `build/` directory, which the server serves as static files
- Game data comes from `jeopardy.json.gz` (parsed from j-archive.com via separate j-archive-parser project)
- Custom games can be loaded via CSV upload (parsed with PapaParse)
- UI uses Mantine v8 component library
