# Vernacular — Repo Context for Claude

## What Is Vernacular?
Vernacular is an iMessage-as-a-service CRM platform built by Hedge, Inc. Businesses send/receive real blue bubble iMessages through dedicated Mac relay stations, with AI-powered response drafting and contact management.

**Standalone Hedge product — separate from Bankroll, SideBet, FraternityBase.**

Owner: Jackson Fitzgerald | Pittsburgh, PA | github.com/jacksonhedge/vernacular

---

## Architecture (Live)

```
Dashboard (vernacular.chat) → Supabase → outbound_queue → Wade (Mac) → AppleScript → iMessage
iMessage → chat.db → sync.py → Supabase → Realtime → Dashboard
```

### Stack
- **Framework**: Next.js 15 (App Router), React 19
- **Database**: Supabase (Postgres + Auth + Realtime + Storage)
- **AI**: Claude Sonnet 4.6 (Craig copilot), Claude Haiku 3.5 (fallback)
- **Deployment**: Vercel (auto-deploy from main)
- **Supabase Project**: `miuyksnwzkhiyyilchjs`

### Key Files
```
src/app/dashboard/page.tsx    ← Main dashboard (~11,000 lines, monolith)
src/app/page.tsx              ← Landing page
src/app/api/                  ← ~35 API routes
src/lib/supabase.ts           ← Client + service role clients
src/lib/credits.ts            ← Billing/pricing constants
src/lib/contacts.ts           ← Contact CRUD helpers
station/sync.py               ← Mac station: inbound + outbound sync
station/outbound.sh           ← Mac station: send via AppleScript
station/heartbeat.sh          ← Mac station: heartbeat ping
craig/*.md                    ← Craig AI knowledge files
```

---

## CRITICAL RULES (things that WILL break the system)

### Message Deduplication — REPLACE not APPEND
When merging messages from API poll into local state, ALWAYS replace the message list with fresh API data. NEVER append. The old APPEND pattern caused double messages.
```
// CORRECT:
const localOnly = existing.messages.filter(m => m.id.startsWith('m-') || (m.isAIDraft && m.id.startsWith('ai-draft-')));
messages: [...fresh.messages, ...localOnly]

// WRONG — causes duplicates:
messages: [...existing.messages, ...newMsgs]
```

### Outbound Queue — guard_duplicate_send trigger
The `guard_duplicate_send` trigger on `outbound_queue`:
- Blocks changing status from 'sending'/'sent' back to 'queued'
- Blocks re-claiming messages with `send_attempts > 0`
- Stuck messages at 'sending' are **unrecoverable** — must DELETE and re-INSERT
- The trigger fires on UPDATE only, not INSERT

### Confirm-Sent — update BOTH tables
The `/api/engine/confirm-sent` endpoint must update BOTH `outbound_queue` AND `messages` tables. Wade sends `messageId` (not `queueId`). The `outbound_queue.message_id` FK links them.

### Phone Number Formats — normalize before matching
- `contacts` table: `(XXX) XXX-XXXX`
- `messages`/`outbound_queue`: `+1XXXXXXXXXX`
- NEVER use exact match — always normalize to 10 digits before comparing
- Last-4-digit matching is dangerous (birthday paradox collision)

### AI Drafts — persist across poll refresh
AI draft messages (id starts with `ai-draft-`) are local-only (not in DB). The 30-second poll refresh MUST preserve them. Use `setColumns(prev => ...)` callback, never stale closure on `columns`.

### outbound.sh — DO NOT use IFS pipe parsing
The pipe-delimited `IFS='|' read` approach breaks when `ATT_URL` is empty. Use separate temp files per field or JSON parsing. Wade currently runs the backup outbound.sh (no attachment support). The v3 with temp files is on main but untested on Wade.

### Image Sending via AppleScript
`send POSIX file "/path"` returns exit code 0 but iMessage silently rejects the delivery. This is a macOS Automation permission issue, not a script bug. Image sending is NOT working.

---

## Craig AI (Vernacular AI Copilot)

### Personality
- Casual, dry humor, short responses (1-2 sentences max)
- Never introduces himself, never reveals model
- Never says "I'll be happy to assist", "Understood", "Let me know if you need anything"
- Uses lowercase, sounds like a text message

### Actions Craig Can Take
| Tag | What it does |
|-----|-------------|
| `[SEND:name_or_phone:message]` | Creates AI Draft in conversation stream |
| `[BULK_SEND:initiative:msg1\|\|\|msg2]` | Bulk send to initiative contacts |
| `[UPDATE:phone:field:value]` | Update contact field |
| `[LOOKUP:history:name]` | Full message history from DB |
| `[LOOKUP:search:term]` | Search contacts |
| `[LOOKUP:initiative:name]` | Initiative details + contacts |
| `[LOOKUP:activity:days]` | Recent activity across all conversations |
| `[INITIATIVE:name\|type\|desc\|instructions]` | Create initiative |
| `[SCHEDULE:contact\|title\|datetime\|status]` | Create calendar event |
| Navigate: "Navigating to streams..." | Switches dashboard tab/view |

### Important Craig Rules
- `[SEND:]` creates drafts in conversation Streams (NOT approval cards in Craig's chat)
- Conversations with pending drafts sort to the LEFT in Streams
- Craig only sees 30 contacts + last 3 messages per conversation in his prompt
- For contacts not in the prompt, Craig uses `[LOOKUP:search:name]` to search the DB
- Chat history persists to `ai_chat_sessions` table in Supabase
- Answer questions FIRST, don't take action until explicitly told

---

## Pricing (credits.ts)

| Action | Cost |
|--------|------|
| New conversation | $0.99 |
| Text sent | $0.001 |
| Text received | Free |
| AI draft approved & sent | $0.17 |
| AI auto-response | $0.25 |
| Support ticket resolved | $1.25 |
| Contact import | $0.07 |
| Widget handoff | $0.50 |
| Bulk blast per recipient | $0.05 |

Platform: $899/mo first seat, $333/mo additional seats. Setup: $899 first line (doesn't count as month 1), $301 additional lines. Annual: 12% discount. AI usage billed separately.

---

## Dashboard Views (inside Conversations tab)

| View | Description |
|------|-------------|
| **Matrix** | 10x10 disco grid, one tile per contact, color-coded by status, ghost squad, initiative staging + LAUNCH |
| **Streams** | Horizontal scroll of iMessage-style conversation columns |
| **Messages** | Timeline of all messages across conversations |
| **Summary** | Table view with contact, last message, status, response rate |
| **Schedule** | Calendar view (not heavily used yet) |

All views support **initiative filter** — toggle buttons at the top filter to only contacts in that initiative.

Matrix is the **default view**. View mode, sort mode, and initiative filter persist to localStorage.

---

## Initiatives

Initiatives = groups of contacts with shared goals, tone, and AI knowledge.
- Stored in `org_knowledge` table (category = 'initiative')
- Contacts linked via `initiative_contacts` junction table
- Each initiative can have memories, instructions, examples, files
- Craig can create initiatives from CSV uploads (📄 button in copilot)
- Matrix can stage entire initiatives for bulk texting

Current initiatives:
- Testers in NJ (141 contacts)
- Prediction Market testing (209 contacts)
- VIP Re-engagement
- Form 1 (from CSV imports)

---

## Stations

| Station | Machine | Phone | Status |
|---------|---------|-------|--------|
| Wade | MacBook Air | (412) 512-8437 | Online |
| Albus | Mac Mini | TBD | Offline |

Wade runs: `sync.py` (inbound + outbound, 5s), `heartbeat.sh` (30s), `outbound.sh` (backup version, 5s poll)

---

## Security Issues (from audit)

**CRITICAL — most API routes have NO authentication.** Any route using `createServiceClient()` without `getAuthUser()` is completely open. This includes `/api/messages/send`, `/api/ai/chat`, `/api/contacts/*`, `/api/billing`, etc.

**20 Supabase tables have RLS disabled** — anon key can read/write freely.

**No rate limiting** on any endpoint.

**No CORS configuration.**

Priority: Add auth middleware before onboarding any client.

---

## Known Issues / Bugs

- Image sending: AppleScript POSIX file returns 0 but iMessage rejects (macOS permission)
- Multi-line messages: shell escaping breaks in outbound.sh (plan: use temp files + AppleScript `read POSIX file`)
- outbound.sh v3 (with attachment support) is on main but NOT deployed to Wade — Wade runs backup
- Dashboard is 11K lines monolith — needs splitting into components
- `messages_dedup_idx` is too aggressive — blocks sending same text to same person EVER (should include time window)
- Some "Form 1" initiative duplicates in the header

---

## Legal Pages (live)
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy (CCPA/CPRA)
- `/acceptable-use` — Acceptable Use Policy

---

## Development & Deployment

### Local Dev
```bash
npm install
npm run dev          # localhost:3000
```

### Push to Production
```bash
# 1. Check for type errors FIRST (Vercel is stricter than local)
npx tsc --noEmit

# 2. If clean, commit and push — Vercel auto-deploys from main
git add <files>
git commit -m "description"
git push origin main

# 3. Deploy takes ~1-2 minutes. User tests on vernacular.chat directly.
# 4. Hard refresh (Cmd+Shift+R) to see changes.
```

**ALWAYS push after frontend changes** — the user tests on production (vernacular.chat), not localhost.

**ALWAYS run `npx tsc --noEmit` before pushing** — Vercel will reject builds with type errors.

### Vercel
- **Project**: Vernacular
- **Auto-deploy**: every push to `main`
- **Domain**: vernacular.chat
- **Env vars**: Set in Vercel dashboard (Settings → Environment Variables)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (had a trailing newline issue — `%0A` in WebSocket URL — re-paste cleanly if WebSocket errors appear)
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ANTHROPIC_API_KEY`
  - `ADMIN_PASSWORD`

### Wade Station (Mac Relay)
Wade runs on a MacBook Air. To update station scripts:
```bash
# SSH or screen-share into Wade, then:
cd ~/vernacular
cp station/outbound.sh station/outbound.sh.backup   # ALWAYS backup first
git pull origin main
./station/stop.sh && sleep 2 && ./station/start.sh

# If it breaks, revert immediately:
cp station/outbound.sh.backup station/outbound.sh
./station/stop.sh && sleep 2 && ./station/start.sh
```

**NEVER update Wade's outbound.sh without testing the full send flow first.**
**ALWAYS keep .backup files.**

### Supabase
- **Project ID**: `miuyksnwzkhiyyilchjs`
- **URL**: `https://miuyksnwzkhiyyilchjs.supabase.co`
- **MCP tool**: `mcp__supabase__execute_sql` for direct SQL
- **Schema reference**: See memory file `reference_vernacular_schema.md`

### Git Tags
- `v1.0-stable` — Known-good baseline from April 8, 2026. Rollback: `git reset --hard v1.0-stable`
