# Vernacular — Product Roadmap

**Owner:** Jackson Fitzgerald, Hedge Inc.
**Last Updated:** April 2026

---

## Phase 1 — Core Platform (LIVE)

| Feature | Status |
|---------|--------|
| Web Dashboard (vernacular.chat) | ✅ Live |
| Supabase backend (contacts, conversations, messages, stations) | ✅ Live |
| Notion Message Queue (shared bus) | ✅ Live |
| Station pipeline (Wade — MacBook Air) | ✅ Live |
| 4-step onboarding (signup → test iMessage → number setup) | ✅ Live |
| AI Mode + Ghost agents (Blinky, Pinky, Inky, Clyde) | ✅ Live |
| Pac-Man theme (dot grid, fruits, ghost editor) | ✅ Live |
| Sound effects (send swoosh, receive tri-tone, click) | ✅ Live |
| Contact card + list views | ✅ Live |
| Phone normalization (shared @/lib/phone.ts) | ✅ Live |
| Notion client (shared @/lib/notion.ts) | ✅ Live |
| Source system tracking (vernacular-web, claude-cowork, etc.) | ✅ Live |
| Inbound message polling (Notion → Supabase) | ✅ Live |
| Heartbeat via /api/engine/ping | ✅ Live |
| Change password | ✅ Live |
| AI add-ons pricing ($1,000/mo each) | ✅ Live |

---

## Phase 2 — Multi-Platform + Widget (In Progress)

### NPM SDK (@vernacular/sdk)
- ✅ Scaffolded — VernacularClient with 7 API methods + onInbound listener
- [ ] Publish to npm
- [ ] API key auth system

### Website Chat Widget (widget.js)
- ✅ Embeddable script — chat bubble, iMessage handoff, Pac-Man typing
- [ ] Pre-chat form (name, email, order #)
- [ ] Business hours / offline mode
- [ ] Conversation history (localStorage)
- [ ] QR code iMessage handoff
- [ ] CSAT rating after conversation
- [ ] White-label option ($500/mo)
- [ ] Widget analytics dashboard

### Mac Desktop App (Electron)
- ✅ Scaffolded — Electron + React + better-sqlite3
- [ ] Connect to SDK
- [ ] Direct chat.db read (instant inbound, no polling)
- [ ] AppleScript send (instant outbound, no Notion relay)
- [ ] Menu bar tray with unread badge
- [ ] Native macOS notifications
- [ ] Code signing + DMG distribution
- [ ] Auto-updater

### Station Fleet
- [ ] Second station (Albus — Mac Mini)
- [ ] Station provisioning workflow
- [ ] Fleet health dashboard
- [ ] Auto-restart on crash

---

## Phase 3 — Integrations

| Priority | Integration | Purpose | Status |
|----------|-------------|---------|--------|
| P0 | **MCP Server (Claude Desktop)** | Config & control Vernacular from Claude | Not started |
| P0 | **Slack** | Human alerts + override triggers | UI built, no webhook |
| P1 | **Gmail** | Contact sync + inbound lead ingestion | Not started |
| P2 | **Webhooks / REST API** | General-purpose outbound events | Partial (internal routes) |
| P2 | **CRM (HubSpot / Salesforce)** | Bi-directional contact enrichment | UI shows "Coming Soon" |
| P3 | **Zapier / Make** | No-code automation layer | Not started |

### MCP Server Tools (Claude Desktop)
| Tool | Description |
|------|-------------|
| `get_station_status` | Online/offline, last heartbeat, model |
| `list_conversations` | Active conversations across stations |
| `get_thread` | Full message history for a contact |
| `send_message` | Trigger outbound from a station |
| `pause_station` | Disable auto-reply (human takeover) |
| `resume_station` | Re-enable auto-reply |
| `update_system_prompt` | Change station persona |
| `flag_conversation` | Mark for human review |

---

## Phase 4 — iMessage 2FA (Verification API)

**Concept:** Companies use Vernacular to send 2FA verification codes via iMessage (blue bubbles) instead of SMS.

**Why:**
- End-to-end encrypted (vs SMS SIM swap attacks)
- Blue bubble = trusted sender (vs spoofable green bubbles)
- Read receipts — know if user saw the code
- No carrier filtering or grey route delays

**Prerequisites:**
- [ ] Mac app fleet with sub-3-second delivery (no Notion relay)
- [ ] 99.99% uptime (redundant stations)
- [ ] SMS fallback for Android users
- [ ] Rate limiting (anti-abuse)

**API Design:**
```
POST /api/verify/send
{ "phone": "+14127351089", "template": "verification", "code": "847291", "ttl": 300 }
→ { "id": "ver_xxx", "status": "sent", "channel": "imessage" }

POST /api/verify/check
{ "phone": "+14127351089", "code": "847291" }
→ { "valid": true, "channel": "imessage" }
```

**Revenue:** $0.02-0.05 per verification. At 1M/month = $20-50K/month.

---

## Phase 5 — Mobile + Scale

### iOS App
- React Native or Swift
- Push notifications for inbound messages
- Quick reply from notification
- Contact sync with phone contacts
- Cannot send iMessage directly (Apple restriction) — uses Vernacular API

### Android App
- React Native
- "Blue bubble on Android" marketing angle
- Same API client as iOS
- SMS fallback when iMessage unavailable

### PC App (Windows/Linux)
- Electron (same codebase as Mac app minus chat.db)
- Dashboard-only (no local iMessage access)
- Relay through Mac stations

### Operations Center (25+ stations)
- [ ] Dedicated rack of Mac Minis
- [ ] Electrical + networking infrastructure
- [ ] Load balancer across stations
- [ ] Station health monitoring + auto-failover
- [ ] Per-station analytics

---

## Pricing

| Tier | Price | Includes |
|------|-------|----------|
| Professional | $2,000/seat/month | 1-3 seats, dedicated phone line, AI drafts, unlimited conversations |
| Business | $2,500/seat/month | 4-15 seats, all integrations, campaigns |
| Enterprise | Custom | Unlimited seats, all AI tools included |
| AI Add-ons | $1,000/mo each | AI Mode, Sentiment Analysis, Campaign Writer, Contact Enrichment, Conversation Summary |
| Widget White-label | $500/mo | Remove "Powered by Vernacular" |
| 2FA API | $0.02-0.05/verification | Volume pricing available |

---

## Key Decisions & Constraints
- **No per-message API cost** — local inference after hardware investment
- **One number per machine** — clean isolation, easy to debug
- **Supabase over self-hosted Postgres** — faster v1, Realtime built in
- **Vercel deployment** — zero-config, auto-deploy from main
- **Notion as message bus** — bridges Cowork proxy limitations
- **MCP over custom protocol** — standard, Claude-native, extensible
