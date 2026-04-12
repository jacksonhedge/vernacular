# Vernacular — Capabilities & Status Report
**Last updated:** 2026-04-12
**Product:** iMessage-as-a-service CRM platform
**Owner:** Jackson Fitzgerald / Hedge, Inc.
**Live URL:** https://vernacular.chat
**GitHub:** jacksonhedge/vernacular

---

## What Vernacular Is

Vernacular is an enterprise messaging CRM that lets businesses send and receive **real iMessage blue bubbles** (not SMS) through dedicated Mac relay stations, with AI-powered response drafting. It's built for sales teams, VIP managers, support orgs, and app testing operations that need the credibility of iMessage specifically — customers open blue bubbles at 3-5x the rate of SMS.

**Positioning:** Not a chat app. It's a B2B infrastructure tool — Intercom/Front/HubSpot level of polish, priced for enterprise ($899/mo per seat).

---

## Architecture

```
Dashboard (vernacular.chat, Next.js 15, Vercel)
    ↓↑
Supabase (Postgres + Auth + Realtime + Storage)
    ↓↑
outbound_queue → Mac Relay Station → AppleScript → iMessage → Recipient
                       ↑
                   chat.db → sync.py → Supabase (inbound capture)
```

### Stack
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind v4
- **Database:** Supabase (project ID: `miuyksnwzkhiyyilchjs`)
- **AI:** Claude Sonnet 4.6 (Craig copilot), Haiku 3.5 (fast path), Opus (quality)
- **Deploy:** Vercel (auto-deploy from main)
- **Relay:** Python + AppleScript on dedicated MacBook Pros

---

## Dashboard — Views & Features

### Sidebar (dark enterprise nav)
- Organization selector + sound toggle
- **Station status** — live phone line indicator (online/idle/DND/offline)
- **Credit usage bar** — current month spend vs. monthly minimum
- **Craig AI button** — toggles slide-out copilot panel
- **Unread count badge** on Conversations nav item

### `/dashboard` — Home
- 4 metric cards: Messages Sent, Response Rate, Active Conversations, AI Drafts
- Recent activity feed (inbound/outbound with direction arrows)
- Phone lines panel with heartbeat status

### `/dashboard/streams` — The Hero View
- **Horizontal scroll of iMessage-style conversation columns** (340px each)
- Left panel: searchable contact list with unread/draft indicators
- **Initiative filter bar** — narrow streams to specific campaigns
- **Refresh button** (far left) — manually syncs messages sent from your physical Mac (last 24h), calls `/api/engine/poll-inbound` to link unlinked chat.db entries
- Sort modes: Unread First, Most Recent, By Name, Most Messages
- Per-column: Craig draft button, close button, message context menus (copy/resend)
- AI Draft approval bubbles with Send/Edit/Dismiss actions
- 30-second polling + Supabase Realtime for instant inbound messages
- **"Ask Craig" button** (yellow pulsing, Pac-Man icon, right of New Chat)

### `/dashboard/matrix` — Command Center
- 10×10 disco grid, one tile per contact (100 tiles total)
- **4-corner tile layout:**
  - Top-left: Status dot + label (REPLY / DRAFT / QUEUE / FAIL)
  - Top-right: **Large Greek org badge or state abbreviation** (colored by org — ΣΧ navy, ΔΖ green, ΘΧ amber, etc.)
  - Center: First name (big, bold)
  - Bottom-left: Message count
  - Bottom-right: Age or direction indicator
  - Bottom bar: Split time (absolute + relative)
- **Initiative dropdown** to stage entire campaigns of contacts
- **Ghost squad** (8 named AI agents — Blinky, Pinky, Inky, Clyde, Sue, Funky, Spooky, Shadow) that float above tiles when working
- **LAUNCH button** for bulk send with message templates (`{name}` interpolation)
- **Tile modal** with two tabs:
  - Conversation — last 25 messages with iMessage bubbles
  - Contact Details — editable fields (name, email, company, state, greek org, school, LinkedIn, Instagram, Venmo, tags, notes)
  - "Ask Craig" button to analyze that specific contact

### `/dashboard/messages` — Timeline
- Chronological feed of all messages
- Time filter: 24h / 48h / 72h / 1w / 2w
- Per-message: direction icon, contact name, preview, AI-generated tag

### `/dashboard/summary` — Table View
- Sortable table: Contact | Phone | Last Message | Total | Response Rate | Status
- Auto-sorts "Awaiting Reply" to top
- Initiative filter applies

### `/dashboard/contacts` — Full Contact Management
- **List view** (table) and **Card view** (grid)
- Search by name, phone, email, company, school
- **Add Contact** inline form (name, phone, email, company, title, LinkedIn, tags, notes)
- **Import dropdown:**
  - VCF import (parses vCard files, bulk adds)
  - CSV import (auto-maps common columns, manual override UI)
- **Export dropdown:**
  - Export VCF (vCard 3.0, works with Apple Contacts/Google/Outlook)
  - Export CSV (all fields, quoted)
- Contact detail sidebar with all fields, tags, notes, quick VCF export, delete

### `/dashboard` — Coming Soon Placeholders
Still being migrated from the 11K-line monolith:
- Settings (org config, quiet hours, AI defaults)
- Stations (detail view with test pipeline)
- Team (member list + invites)
- Integrations (Notion, Slack, AI providers)
- Initiatives (full detail with memories/instructions/examples)
- Schedule (calendar week view)
- Profile (editing + password change)

---

## Craig AI Copilot

### Personality
Casual, dry humor, short responses (1-2 sentences max). Never introduces himself, never reveals the model. Lowercase, sounds like a text message.

### Models
Selectable: Haiku / Sonnet / Opus (default: Sonnet 4.6)

### What Craig Can Do
| Action Tag | Function |
|-----------|----------|
| `[SEND:name:msg]` | Creates AI Draft in conversation stream |
| `[BULK_SEND:initiative:msg]` | Bulk send to initiative contacts |
| `[LOOKUP:history:name]` | Full message history from DB |
| `[LOOKUP:search:term]` | Search all contacts |
| `[LOOKUP:initiative:name]` | Initiative details + contacts |
| `[LOOKUP:activity:days]` | Recent activity across conversations |
| `[INITIATIVE:name\|type\|desc]` | Create new initiative |
| `[SCHEDULE:contact\|title\|datetime]` | Create calendar event |
| `[UPDATE:phone:field:value]` | Update contact field |

### Chat UI Features
- **Pac-Man character** (yellow body, black eye, static open mouth)
- **Online indicator** (green dot on avatar)
- **Streaming text** — words appear at 18ms/word with yellow blink cursor
- **3-stage loading:**
  1. Dots + "Craig is thinking..." (0-500ms)
  2. Pac-Man breathing glow + "Almost there..." (500ms+)
  3. Streaming text + "Writing..." header
- **Message grouping** — consecutive same-role messages share avatar
- **Adaptive bubble widths** — inline pills for short, full-width for long
- **Timestamps** — per-run (last message only), day separators, time gap chips for >30min gaps
- **Markdown rendering** — **bold**, `code`, bullet lists, blockquotes, code blocks
- **Action tag chips** — SEND/LOOKUP/SCHEDULE each get emoji + color
- **Copy button** on every Craig response
- **Scroll-to-bottom FAB** when scrolled up
- **Auto-reset after 2 minutes of inactivity** — fresh chat each time
- **Access points:** sidebar nav, floating FAB (bottom-right), stream column headers, in-input Pac-Man, matrix modal, streams top-bar "Ask Craig" (pulsing gold)

### Context Craig Sees
- 30 most recent conversations + last 3 messages each
- All initiatives (names only, can look up details)
- Org knowledge (tone profile, memories, instructions)
- Global Craig knowledge (product docs, action tag reference)
- Chat history persists to `ai_chat_sessions` table

---

## Initiatives System

Initiatives = named campaigns with shared goals, tone, AI knowledge, and contact lists.

**Structure** (in `org_knowledge` table, category = 'initiative'):
- Memories (what Craig remembers about this campaign)
- Instructions (how Craig should behave)
- Good examples (desired tone)
- Bad examples (what to avoid)
- Shared link (for geo-fenced apps with state restrictions)

**Matrix integration:** Select an initiative from the dropdown → its contacts appear as blue staged tiles → set 1-2 message templates with `{name}` interpolation → hit LAUNCH → bulk send to all.

**Current initiatives:** Testers in NJ (141 contacts), Prediction Market testing (209 contacts), VIP Re-engagement, Form 1.

---

## Pricing (Enterprise SaaS)

| Item | Cost |
|------|------|
| First seat | $899/mo |
| Additional seats | $333/mo each |
| Setup fee (first line) | $899 (doesn't count as month 1) |
| Setup fee (additional lines) | $301 each |
| Annual discount | 12% off |

### Usage Credits (separate from platform fee)
| Action | Cost |
|--------|------|
| New conversation | $0.99 |
| Text sent (human) | $0.001 |
| Text received | Free |
| AI draft approved & sent | $0.17 |
| AI auto-response | $0.25 |
| Support ticket resolved | $1.25 |
| Contact import | $0.07 |
| Widget handoff to iMessage | $0.50 |
| Bulk blast per recipient | $0.05 |
| Craig chat | $0.10 |
| Tone analysis | $0.50 |

---

## Relay Stations (Mac Hardware)

### Active
- **Wade** — MacBook Air, (412) 512-8437, runs sync.py + outbound.sh + heartbeat.sh
- **Albus** — Mac Mini (offline, awaiting setup for FraternityBase sales outreach)

### Planned Fleet (~$13,200 confirmed build)
| Unit | Model | Specs | Purpose |
|------|-------|-------|---------|
| Station 1-4 | MBP 14" M4 Pro | 24GB / 512GB | Client relays + local AI fallback |
| AI Beast | MBP 16" M4 Max | 128GB / 2TB | Ollama + Llama 70B / Mistral Large / Qwen 32B |

### AI Infrastructure Plan
Local LLMs via Ollama on the M4 Max:
- **Mistral Nemo 12B** → Craig's fast-path drafts (<500ms)
- **Mistral Large 123B** → structured extraction / JSON tasks
- **Qwen 32B Q5** → long-context analysis (128K window)
- **Fine-tuned LoRA** on ~10K sent messages for tone matching
- Exposed to Vercel via **Tailscale** mesh network

---

## Known Issues / Limitations

- **Image sending** — AppleScript returns 0 but iMessage silently rejects POSIX file transfers (macOS permission issue, not a script bug)
- **Multi-line messages** — shell escaping breaks in outbound.sh, plan is temp file approach
- **Security** — most API routes lack auth middleware (works for solo owner use, blocker before onboarding clients)
- **Mobile responsiveness** — desktop-first, chat options poorly adapted to mobile
- **outbound.sh v3** with attachment support is on main but untested on Wade (backup version runs)

---

## Complementary Products (same stack / owner)

- **Bankroll** — sports betting deposits iOS app (separate Supabase)
- **Hedge Payments** — Coinflow white-label (separate Supabase)
- **FraternityBase** — Greek org CRM (will be Albus's customer)
- **CoverPay** — BNPL aggregator + stablecoin on Base (completely separate)
- **SideBet** — CoinFlow-integrated bet aggregator (separate Supabase)

---

## Next Priorities

1. **iOS TestFlight prep** — bundle ID rename, privacy manifest, launch screen, icon sizes, remove `NSAllowsArbitraryLoads`
2. **Settings page migration** — org config, quiet hours, AI defaults
3. **Integrations page** — Notion/Slack/AI provider config
4. **Local LLM wiring** — add "Local" as 4th model option in Craig when M4 Max arrives
5. **Contact → Organization data model** — group contacts by fraternity/business/school
6. **Multi-line message support** — temp file approach in outbound.sh
