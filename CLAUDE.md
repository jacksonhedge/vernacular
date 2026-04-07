# Vernacular — Repo Context for Claude

## What Is Vernacular?
Vernacular is a closed-loop iMessage operations platform built by Hedge, Inc. Each physical
Mac station corresponds to one dedicated phone number and Apple ID. A local LLM processes
inbound messages and generates responses. All activity flows into a central database and
surfaces through the Vernacular web UI.

**Standalone Hedge product — separate from Bankroll, SideBet, Hedge Connect, FraternityBase.**

Owner: Jackson Fitzgerald | Pittsburgh, PA | github.com/jacksonhedge/vernacular

---

## Current Architecture (Phase 1 — Live)

```
iMessage on each Mac station
         ↓
  [Mac app — not yet built, see Phase 2]
         ↓
  Supabase (source of truth)
         ↓
  Vernacular Web UI (Next.js 15 / Vercel)
```

### Web App Stack
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19
- **Database**: Supabase (Postgres + Auth + Realtime)
- **Integrations**: Notion SDK
- **Analytics**: Vercel Analytics
- **Deployment**: Vercel (auto-deploy from main)

### Repo Structure
```
/                          ← Next.js app root
├── app/                   ← App Router pages & layouts
├── components/            ← React components
├── lib/                   ← Supabase client, utilities
├── vernacular-mcp/        ← Per-station MCP server (TypeScript) — Phase 2
└── CLAUDE.md              ← This file
```

---

## Phase 2 — Mac App + iMessage MCP Server (Upcoming)

When the native Mac app is built, each station will run a local MCP server that exposes
iMessage as a set of tools Claude can call. The web UI will connect to stations via the
MCP protocol.

### MCP Server (vernacular-mcp/)
Already scaffolded. Per-station Node.js/TypeScript server that:
- Reads `~/Library/Messages/chat.db` (SQLite, read-only)
- Exposes 5 MCP tools over SSE transport
- Sends replies via AppleScript → Messages.app
- Runs as a launchd service on each Mac

**Known issues to fix before Phase 2 activates:**
- `uuid` and `chokidar` missing from `vernacular-mcp/package.json`
- `startScheduler()` and `startDbWatcher()` not called in `index.ts`
- `send_message` AppleScript shell escaping breaks on single-quote bodies

### MCP Tools
| Tool | Description |
|------|-------------|
| `send_message` | Send iMessage/SMS, supports scheduling + attachments |
| `read_conversation` | Message history with a contact |
| `search_messages` | Full-text search with date filters |
| `list_conversations` | Recent threads with unread counts |
| `get_station_health` | iMessage status, blue/green delivery rate |

### Station Model
- **1 station = 1 phone number = 1 Apple ID = 1 MacBook**
- Local model: Llama 3.3 70B via Ollama (primary), Claude API (fallback)
- Always-on, lid-closed, ethernet-connected
- Writes to shared Supabase instance

---

## Supabase Schema (Core Tables)

```sql
stations       -- phone_number, apple_id, machine_name, is_active
contacts       -- phone_number, display_name, tags, metadata
conversations  -- station_id, contact_id, thread_id, status, last_message_at
messages       -- conversation_id, direction, body, model_used, imessage_guid, sent_at
```

`imessage_guid` is the dedup key — sourced from `chat.db`.

---

## Pricing
- **Team**: $333/seat/month (minimum 3 seats, 50K credits/seat)
- **Growth**: $299/seat/month (5+ seats, 75K credits/seat)
- **Enterprise**: $249/seat/month (10+ seats, 150K credits/seat)
- **Credit Packs**: 100K/$79, 500K/$349, 1M/$599

---

## Development

```bash
# Web app
npm install
npm run dev          # localhost:3000

# MCP server (Phase 2)
cd vernacular-mcp
npm install
npm run dev          # localhost:3000 (separate port TBD)
```

### Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Notion
NOTION_API_KEY=

# MCP server (per station)
STATION_ID=station-01
PHONE_NUMBER=+14125550001
API_KEY=
RELAY_URL=
```

---

## Key Decisions & Constraints
- **No per-message API cost** — local inference after hardware investment
- **One number per machine** — clean isolation, easy to debug
- **Supabase over self-hosted Postgres** — faster v1, Realtime built in
- **Vercel deployment** — zero-config, auto-deploy from main
- **MCP over custom protocol** — standard, Claude-native, extensible

---

## Roadmap

### Phase 1 — Web Platform (LIVE)
- [x] Web UI on Vercel (vernacular.chat/dashboard)
- [x] Supabase backend (messages, conversations, contacts, stations)
- [x] Station sync scripts (station/sync.py — inbound + outbound with BLOB extraction)
- [x] Heartbeat + outbound queue polling
- [x] AI response drafting (Claude Haiku) with Approve/Edit/Dismiss
- [x] Credit-based billing system
- [x] Conversation Goal field per thread

### Phase 2 — macOS Station Manager App
Native SwiftUI app that runs on each Mac station, replacing the Python scripts.

**Status Dashboard:**
- Real-time status for each station (online/offline, last heartbeat, message counts)
- Overview of all stations from any machine (pull from Supabase stations table)
- Green/yellow/red health indicators per station
- Message throughput graphs (sent/received per hour)

**Station Controls:**
- Start/stop sync, heartbeat, outbound sender from the app
- View live sync logs in-app
- Configure station name, phone number, sync interval
- Toggle outbound auto-sending on/off

**iMessage Integration:**
- Direct chat.db access (replace Python sqlite3 with Swift SQLite)
- Native NSAttributedString decoding (no more BLOB extraction hacks)
- Real-time file watcher on chat.db (instant sync vs 30s polling)
- AppleScript sending with delivery confirmation

**System Tray / Menu Bar:**
- Persistent menu bar icon showing station status
- Quick stats: messages synced today, queue depth, last heartbeat
- Click to open full dashboard
- Notifications for failed syncs or station going offline

**Multi-Station View:**
- See all stations (Wade, Albus, Russell, etc.) in one window
- Remote health monitoring — any station can see all others
- Alert when a station goes offline for >5 minutes

**Tech Stack:**
- SwiftUI + Swift 5.9
- SQLite.swift for chat.db access
- Supabase Swift SDK for backend
- Combine for reactive data flow
- launchd integration for auto-start on boot

### Phase 3 — Operations Center (25+ stations)
- [ ] Electrical + networking infrastructure for rack of MacBooks
- [ ] Centralized monitoring dashboard (web + macOS)
- [ ] Auto-provisioning: plug in a Mac → auto-configure station
- [ ] Load balancing: route outbound messages to available stations
- [ ] Failover: if a station dies, redistribute its conversations
