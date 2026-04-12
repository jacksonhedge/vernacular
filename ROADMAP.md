# Vernacular — Product Roadmap

**Owner:** Jackson Fitzgerald, Hedge Inc.
**Last Updated:** 2026-04-12

---

## 🚧 Current Sprint

### TestFlight Submission (Hedge, Inc. developer account)
Goal: install Vernacular on Jackson's phone via TestFlight, under the Hedge Inc. Apple Developer account.

**Blockers (must fix before build succeeds):**
- [ ] Set Hedge Inc. Team ID in Xcode Signing & Capabilities
- [ ] Generate signing certificate + provisioning profile via Apple Developer portal

**Required for App Store Connect upload:**
- [ ] Create `VernacularApp/PrivacyInfo.xcprivacy` manifest
  - Declare: Supabase networking, LocalAuthentication (Face ID), Keychain access
- [ ] Remove `NSAllowsArbitraryLoads: true` from Info.plist OR whitelist only Supabase/vernacular.chat domains
- [ ] Rename bundle ID: `com.coverpay.vernacular` → `com.hedge.vernacular` (or `com.hedgeinc.vernacular`)
- [ ] Move hardcoded Supabase anon key out of `SupabaseService.swift` (use Info.plist or build config)
- [ ] Generate app icons at all required sizes (iPhone @2x/@3x, iPad if applicable) — currently only 1024×1024
- [ ] Create branded launch screen (currently blank white default)

**App Store Connect steps:**
- [ ] Create app record in App Store Connect under Hedge Inc. team
- [ ] Fill out App Privacy questionnaire (what data is collected, how used)
- [ ] Write app description + keywords
- [ ] Upload screenshots (6.5" and 6.7" iPhone sizes minimum)
- [ ] Add Jackson + any testers to TestFlight internal testing group
- [ ] Archive + upload build from Xcode (Product → Archive → Distribute)

**After approval:**
- [ ] Install TestFlight on Jackson's phone
- [ ] Accept tester invite email
- [ ] Install Vernacular build
- [ ] Test core flows on device: login, send message, view contacts, Craig chat

---

## ⭐ Next Up (High Priority)

### iOS TestFlight Release
Get Vernacular iOS app approved for TestFlight so external testers can install.
- [ ] Set Apple Developer Team ID in Xcode (blocks build)
- [ ] Create `PrivacyInfo.xcprivacy` manifest (required Spring 2024+)
- [ ] Remove `NSAllowsArbitraryLoads: true` from Info.plist
- [ ] Generate app icons at all required sizes (currently only 1024×1024)
- [ ] Create branded launch screen
- [ ] Rename bundle ID from `com.coverpay.vernacular` to `com.hedge.vernacular`
- [ ] Move hardcoded Supabase key out of source code

### Settings Page Migration
Port from `page.old.tsx` — still a "coming soon" placeholder.
- [ ] Org settings form (company name, AI defaults)
- [ ] Quiet hours configuration (timezone-aware)
- [ ] Rate limits (max messages/day, max AI drafts/day, max blast recipients)
- [ ] Notification preferences
- [ ] Slack webhook configuration

### Local LLM Integration (when M4 Max arrives)
Mac fleet ordered (~$13,200). Pre-wire Craig for local model support.
- [ ] Add "Local" as 4th option in Craig's model selector
- [ ] `OLLAMA_API_URL` env var in Vercel
- [ ] Route handler in `/api/ai/chat` detects `model === 'local'` and proxies to Ollama
- [ ] Tailscale setup on M4 Max
- [ ] Pull 3 models: Mistral Nemo 12B, Mistral Large 123B Q4, Qwen 32B Q5
- [ ] Fine-tune LoRA on ~10K sent messages (tone matching)

### Dashboard Placeholder Pages
All currently show "coming soon" — need full migration from monolith.
- [ ] Integrations page (Notion/Slack/AI providers)
- [ ] Team page (member list + invite flow)
- [ ] Stations detail view (test messaging pipeline)
- [ ] Initiatives detail view (memories/instructions/examples editor)
- [ ] Schedule calendar week view
- [ ] Profile editing + password change

---

## ✅ Recently Shipped

### 2026-04-12
- **Craig auto-reset after 2min idle** (`96a52cd`) — fresh chat each panel-open if stale
- **Craig deep polish** (`0ccd1b9`) — adaptive bubble widths, message grouping, timestamps, day separators, markdown rendering, action tag chips with icons, 3-stage loading, scroll-to-bottom FAB, copy button per message
- **Pac-Man character everywhere** (`c756471`, `7ced1df`) — replaced robot icon across sidebar, panel, FAB, in-column buttons, matrix modal
- **Streams button layout** (`7ced1df`) — refresh button moved to far left, "Ask Craig" moved right of New Chat
- **Refresh button for Mac-sent messages** (`dcca511`) — calls poll-inbound + re-fetches, shows toast with sync count
- **Pulsing yellow "Ask Craig" button** (`7f479a8`) — prominent gold gradient next to Unread First
- **Full Contacts page** (`b73aa0a`) — list/card views, VCF + CSV import with column mapping, VCF + CSV export, contact detail sidebar

### 2026-04-11
- **Craig AI access points** (`5acfb3d`) — floating FAB, stream column headers, in-input shortcut, matrix modal
- **Matrix: 4-corner tile layout** (`4037130`) — status dot, org/state badge, message count, age/direction, split time bar
- **Matrix: editable contact modal** (`4037130`) — Conversation + Contact Details tabs with inline editing
- **Matrix: prominent org logo badges** — 28×28px colored shield badges per Greek org
- **Matrix: initiative dropdown** — replaced multi-select buttons with single dropdown
- **Enterprise dashboard redesign** (`335aa1d`) — broke 11K-line monolith into sub-routes, dark sidebar, Craig panel, DashboardContext

### 2026-04-09
- Craig model default to Sonnet 4.6, casual tone, action tags
- Matrix view with initiative staging + LAUNCH
- Initiative contacts loaded via service-role API
- Delivery status simplified to Delivered / Not Delivered
- CSV upload creates initiatives via Craig
- 62 NJ contacts imported + linked to Testers in NJ

---

## 🔄 How This File Works (Option 4 — filesystem sync workflow)

1. **Every commit that ships something meaningful** → Claude appends to "Recently Shipped" with SHA + description
2. **Every new priority from conversation** → Claude adds to "Current Sprint" or "Next Up"
3. **When you want to refresh your Claude project** → Drag `VERNACULAR_CAPABILITIES_YYYY-MM-DD.md` + `ROADMAP.md` into your Claude project knowledge
4. **Capabilities file is dated** — new ones get created after major architecture changes; old versions serve as historical snapshots
5. **Don't manually edit during active sessions** — let Claude own these files. Edit between sessions freely.
6. **The "Phase 1-5" product vision below** is the long-term North Star — slower-changing, edit when strategic direction shifts.

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
| Platform pricing ($899/mo + usage-based AI credits) | ✅ Live |

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
| First Seat | $899/mo | Dedicated phone line, AI drafts, all features |
| Additional Seats | $333/mo each | Same features, shared station |
| Setup (first line) | $899 one-time | Number provisioning, Apple ID, Mac station, onboarding |
| Setup (additional) | $301 one-time | Per additional line |
| Annual Billing | 12% discount | $899 × 12 × 0.88 = $9,494/yr |
| Customer Support | Per-ticket ($1.25) | No monthly minimum |
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
