# Wade Station Architecture & Setup Guide

## Overview

Wade is a **stateless iMessage relay station** — a Mac that bridges your personal phone line (+14125128437) to the Vernacular backend (vernacular.chat). The station doesn't run AI inference locally. Instead, it:
1. **Captures inbound** messages from Messages.app
2. **Sends outbound** messages via AppleScript
3. **Reports status** to the cloud
4. **Writes to two fallback queues** (Supabase primary, Notion secondary) for resilience

The actual AI response crafting happens on vernacular.chat (`/api/ai/respond`), not on the machine.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VERNACULAR BACKEND                          │
│                    (vernacular.chat / Supabase)                      │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Ping Endpoint│  │ Poll Outbound│  │ Ingest API   │               │
│  │  /api/ping   │  │/api/poll-out │  │/api/messages │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│           ▲              ▲                    ▲                      │
│           │              │                    │                      │
└───────────┼──────────────┼────────────────────┼──────────────────────┘
            │              │                    │
            │              │                    │
        [Heartbeat]    [Outbound Queue]    [Inbound Ingest]
            │              │                    │
            │              │                    │
┌───────────┼──────────────┼────────────────────┼──────────────────────┐
│           │              │                    │      WADE (Mac)      │
│  ┌────────┴──────────────┴─┐  ┌──────────────┴───────┐              │
│  │   Bash Loops            │  │  Messages.app (local)│              │
│  │  (3 persistent loops)   │  │  ~/Library/Messages/ │              │
│  │                         │  │        chat.db       │              │
│  │ 1. Heartbeat (30s)      │  │                      │              │
│  │    → vernacular.chat    │  │  ROWID tracking:     │              │
│  │       /api/ping         │  │  ~/.vernacular-      │              │
│  │                         │  │  last-rowid          │              │
│  │ 2. Outbound (5s)        │  │                      │              │
│  │    → poll queue         │  │ ┌──────────────────┐ │              │
│  │    → AppleScript send   │◄─┤│ Notion Database  │ │              │
│  │    → confirm delivery   │  │ │ (Fallback Queue) │ │              │
│  │                         │  │ │ (db0fb0b...)     │ │              │
│  │ 3. Inbound (30s)        │  │ └──────────────────┘ │              │
│  │    → poll chat.db       │                         │              │
│  │    → log to Notion      │                         │              │
│  │    → ingest to API      │                         │              │
│  └─────────────────────────┘                         │              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## What Changed: Wade Machine Setup

### Before
- Running Node.js watcher.js with local Claude API integration
- Single point of failure (if node crashes, nothing runs)
- Heartbeat not sending correctly (wrong JSON format)
- No fallback queue mechanism

### After
Three independent bash loops (more resilient, simpler):

#### 1. Heartbeat Loop
**File**: Runs in background (logged to `/tmp/wade-heartbeat.log`)  
**Interval**: Every 30 seconds  
**What it does**:
```bash
while true; do 
  curl -s -X POST "https://vernacular.chat/api/engine/ping" \
    -H "Content-Type: application/json" \
    -d '{"station":"Wade"}' 
  sleep 30
done &
```

**API Contract** (`/api/engine/ping`):
- **Request**: `POST /api/engine/ping { "station": "Wade" }`
- **Response**: `{ "ok": true, "station": "Wade", "timestamp": "2026-04-06T07:01:48.910Z" }`
- **Effect**: Updates Supabase `stations` table:
  - Sets `status = 'online'`
  - Sets `last_heartbeat = NOW()`
- **Failure**: If curl fails, loop continues; no retry. Dashboard will show offline after ~10 min of no heartbeat.

#### 2. Outbound Sender Loop
**File**: Runs in background (logged to `/tmp/wade-outbound.log`)  
**Interval**: Every 5 seconds  
**What it does**:

**Primary Path (Supabase):**
1. Polls `https://vernacular.chat/api/engine/poll-outbound?station=Wade`
2. Gets JSON: `{ "ok": true, "messages": [{ "id": "qid", "phone": "+14127351089", "message": "text" }] }`
3. For each message:
   - Sends via AppleScript: `tell application "Messages" to send "{text}" to buddy "{phone}"...`
   - Confirms with `POST /api/engine/confirm-sent { "queueId": "qid", "success": true }`
   - Logs result to `/tmp/wade-outbound.log`

**Fallback Path (Notion, if Supabase down):**
1. Queries Notion database: `https://api.notion.com/v1/databases/db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956/query`
2. Filters for:
   - `Station` select = "Wade"
   - `Status` select = "Queued"
   - `Direction` select = "Outbound"
3. For each page:
   - Reads `Message` property (rich_text title)
   - Reads `Contact Phone` property
   - Sends via AppleScript
   - Updates page: `PATCH /pages/{id}` with `Status = "Sent"` or `"Failed"`

**AppleScript Command**:
```applescript
tell application "Messages"
  send "{escaped_text}" to buddy "{phone}" of (1st account whose service type = iMessage)
end tell
```

**Requirements**:
- macOS System Preferences → Security & Privacy → Full Disk Access: Terminal (for osascript)
- Messages.app running
- Phone number in Contacts (recommended, else use +1XXXXXXXXXX format)

#### 3. Inbound Capture Loop
**File**: Runs in background (logged to `/tmp/wade-inbound.log`)  
**Interval**: Every 30 seconds  
**State File**: `~/.vernacular-last-rowid` (tracks last processed message ROWID)  
**What it does**:

1. **Read from chat.db**:
```sql
SELECT h.id, m.text, m.ROWID 
FROM message m
JOIN chat_message_join cmj ON m.ROWID=cmj.message_id
JOIN chat c ON cmj.chat_id=c.ROWID
JOIN handle h ON m.handle_id=h.ROWID
WHERE m.is_from_me=0 
  AND m.ROWID>$LAST 
  AND m.text IS NOT NULL 
ORDER BY m.ROWID ASC 
LIMIT 10
```

2. **For each new inbound message**:
   - **Write to Notion** (primary): 
     ```
     POST /v1/pages
     {
       "parent": {"database_id": "db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956"},
       "properties": {
         "Message": {"title": [{"text": {"content": "message text"}}]},
         "Contact Phone": {"phone_number": "+14127351089"},
         "Station": {"select": {"name": "Wade"}},
         "Status": {"select": {"name": "Received"}},
         "Direction": {"select": {"name": "Inbound"}}
       }
     }
     ```
   
   - **Write to Vernacular API** (secondary):
     ```
     POST /api/messages/inbound
     {
       "phoneNumber": "+14127351089",
       "message": "message text",
       "stationId": "9ae1a138-10bb-435b-a397-b3e2637fa3af",
       "sourceSystem": "wade-listener"
     }
     ```

3. **Update state**:
   - Write ROWID to `~/.vernacular-last-rowid`
   - Next cycle only processes messages newer than this ROWID

**Requirements**:
- Full Disk Access for `~/Library/Messages/chat.db`
- Valid Notion API token
- Database schema must exist with correct properties

---

## Database Schemas & Integration Points

### Supabase (Primary)

**Table: `stations`**
```sql
CREATE TABLE stations (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,
  phone_number TEXT,
  status TEXT DEFAULT 'offline',  -- 'online' | 'offline'
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  apple_id TEXT,
  machine_name TEXT
);
```

**Table: `messages` (inbound/outbound queue)**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  station_id UUID REFERENCES stations(id),
  direction TEXT,  -- 'inbound' | 'outbound'
  phone_number TEXT,
  body TEXT,
  status TEXT,  -- 'queued' | 'sent' | 'failed' | 'received'
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP
);
```

**Inbound flow**:
- Wade's inbound loop POSTs to `/api/messages/inbound`
- API inserts row into `messages` with `direction='inbound'`, `status='received'`
- Dashboard reads via Supabase Realtime

**Outbound flow**:
- Dashboard creates row in `messages` with `direction='outbound'`, `status='queued'`
- Wade's outbound loop polls `/api/engine/poll-outbound?station=Wade`
- API returns rows where `status='queued'`
- Wade sends, then POSTs to `/api/engine/confirm-sent` to update `status='sent'`

### Notion Database

**Database ID**: `db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956`  
**API Token**: `ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw`

**Properties** (required for Wade):
```
- Message: Title (rich_text)
- Contact Phone: Phone number field
- Station: Select (single)
  Options: "Wade", "Albus", etc.
- Status: Select (single)
  Options: "Queued", "Sent", "Failed", "Received"
- Direction: Select (single)
  Options: "Inbound", "Outbound"
```

**Rows created by Wade**:
- **Inbound**: When someone texts Wade, loop creates page with `Direction=Inbound`, `Status=Received`
- **Outbound** (fallback): Dashboard can manually queue messages by creating pages with `Direction=Outbound`, `Status=Queued`; Wade's fallback loop picks them up

**Why Notion?**
- Human-readable fallback queue if Supabase/vernacular.chat is down
- Can manually queue messages by creating Notion pages
- Can track message history manually
- Database survives API failures

---

## Failover Matrix

| Scenario | Heartbeat | Outbound | Inbound |
|----------|-----------|----------|---------|
| **All systems up** | ✅ vernacular.chat | ✅ Supabase queue | ✅ Both Notion + API |
| **vernacular.chat down** | ❌ Fails (no alternate) | ✅ Notion fallback | ✅ Notion + local |
| **Supabase down** | ✅ (heartbeat is direct HTTP) | ✅ Notion fallback | ✅ Notion (API will retry) |
| **Notion down** | ✅ | ✅ Supabase works | ✅ API still works |
| **Internet down** | ❌ All loops fail | ❌ Messages queue locally | ✅ Messages stay in chat.db |
| **Wade crashes** | ❌ After 10m timeout | ❌ Queue backs up | ❌ Nothing captured |

**Key insight**: Notion is the ultimate fallback. If vernacular.chat + Supabase both down, messages can still be manually sent via Notion queue.

---

## API Endpoints Contract

### Heartbeat

**Endpoint**: `POST https://vernacular.chat/api/engine/ping`

**Request**:
```json
{
  "station": "Wade"
}
```

**Response** (200):
```json
{
  "ok": true,
  "station": "Wade",
  "timestamp": "2026-04-06T07:01:48.910Z"
}
```

**Side effects**:
- Supabase: Updates `stations` SET `status='online'`, `last_heartbeat=NOW()` WHERE `name='Wade'`

---

### Poll Outbound

**Endpoint**: `GET https://vernacular.chat/api/engine/poll-outbound?station=Wade`

**Response** (200):
```json
{
  "ok": true,
  "station": "Wade",
  "count": 1,
  "messages": [
    {
      "id": "queue-uuid",
      "phone": "+14127351089",
      "message": "Hey, how's it going?",
      "createdAt": "2026-04-06T07:00:00Z"
    }
  ]
}
```

**Behavior**:
- Returns messages from `messages` table WHERE `station_id=(Wade's id)` AND `direction='outbound'` AND `status='queued'`
- Does NOT automatically mark as sent; Wade must confirm via `/confirm-sent`
- If queue is empty, returns `count=0, messages=[]`

---

### Confirm Sent

**Endpoint**: `POST https://vernacular.chat/api/engine/confirm-sent`

**Request**:
```json
{
  "queueId": "queue-uuid",
  "success": true,
  "error": null
}
```

**Response** (200):
```json
{
  "ok": true,
  "updated": true
}
```

**Side effects**:
- If `success=true`: Sets `messages.status='sent'`, `messages.sent_at=NOW()`
- If `success=false`: Sets `messages.status='failed'`, `messages.error=error_message`

---

### Ingest Inbound

**Endpoint**: `POST https://vernacular.chat/api/messages/inbound`

**Request**:
```json
{
  "phoneNumber": "+14127351089",
  "message": "received message text",
  "stationId": "9ae1a138-10bb-435b-a397-b3e2637fa3af",
  "sourceSystem": "wade-listener"
}
```

**Response** (201):
```json
{
  "ok": true,
  "id": "message-uuid"
}
```

**Side effects**:
- Creates row in `messages` table: `direction='inbound'`, `status='received'`, `station_id=Wade's id`
- Triggers Supabase Realtime notification (dashboard sees new message immediately)

---

## Setup for Future Machines

### Checklist for New Station (e.g., "Albus")

#### 1. Prerequisites
```bash
# Verify Full Disk Access
ls -la ~/Library/Messages/chat.db

# Have ready:
# - Station name (e.g., "Albus")
# - Phone number (e.g., "+15551234567")
# - Apple ID (the iCloud account on this Mac)
# - Notion API token
# - Supabase credentials (from vernacular.chat admin)
```

#### 2. Register in Supabase
Insert new row into `stations` table:
```sql
INSERT INTO stations (id, name, phone_number, apple_id, machine_name, status)
VALUES (
  gen_random_uuid(),
  'Albus',
  '+15551234567',
  'albus@example.com',
  'MacBook-Pro-2023',
  'offline'
);
```

#### 3. Create Notion Database (or reuse shared)
- **Option A**: Reuse Wade's database (add "Albus" to Station select options)
  - Edit Notion database → Properties → Station → Add "Albus" option
  - Cost: free, shared queue
  
- **Option B**: Create new database per station
  - Copy Wade's database schema
  - Create new database ID
  - Update API token if different owner

#### 4. Set up macOS Permissions
```bash
# Grant Full Disk Access to Terminal/Node
System Preferences → Security & Privacy → Full Disk Access
→ + → Select /Applications/Utilities/Terminal.app

# Verify
sqlite3 ~/Library/Messages/chat.db "SELECT COUNT(*) FROM message;"
# Should return: [number]
```

#### 5. Create start script

**File**: `/Users/albus/vernacular/start-station.sh`
```bash
#!/bin/bash

STATION_NAME="Albus"
STATION_PHONE="+15551234567"
STATION_ID="[from Supabase]"
NOTION_DB="db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956"
NOTION_TOKEN="ntn_..."

# Kill any existing loops
pkill -f "heartbeat\|outbound\|inbound" 2>/dev/null

# 1. Heartbeat (every 30s)
while true; do 
  curl -s -X POST "https://vernacular.chat/api/engine/ping" \
    -H "Content-Type: application/json" \
    -d "{\"station\":\"$STATION_NAME\"}" | grep -q "ok" && echo "[$(date +'%H:%M:%S')] ♥️  Heartbeat" || echo "[$(date +'%H:%M:%S')] ❌ Heartbeat failed"
  sleep 30
done > /tmp/${STATION_NAME}-heartbeat.log 2>&1 &

# 2. Outbound (every 5s)
# ... [copy from Wade's script, replace STATION_NAME, endpoints]

# 3. Inbound (every 30s)
# ... [copy from Wade's script, replace NOTION_DB, NOTION_TOKEN, STATION_ID]

echo "✓ $STATION_NAME station started"
echo "  Logs: /tmp/${STATION_NAME}-*.log"
```

#### 6. Verify
```bash
# Heartbeat working
curl -s -X POST "https://vernacular.chat/api/engine/ping" \
  -H "Content-Type: application/json" \
  -d '{"station":"Albus"}'
# Should return: {"ok": true, ...}

# Check Supabase
# Should see Albus with status='online', fresh last_heartbeat

# Check Notion
# Should see inbound messages from Albus appearing in database
```

---

## Configuration Per Machine

Each station needs these env vars OR hardcoded in start script:

| Variable | Example | Source | Notes |
|----------|---------|--------|-------|
| `STATION_NAME` | "Wade" | Supabase `stations.name` | Must match exactly |
| `STATION_PHONE` | "+14125128437" | Supabase `stations.phone_number` | For logging/reference |
| `STATION_ID` | "9ae1a138-..." | Supabase `stations.id` | UUID for API calls |
| `NOTION_DB` | "db0fb0b9-..." | Notion database link | Fallback queue |
| `NOTION_TOKEN` | "ntn_kP36..." | Notion API settings | Shared or per-station |
| `VERNACULAR_API` | "https://vernacular.chat" | Fixed | Could be dev/prod URL |
| `POLL_INTERVAL_INBOUND` | 30 (seconds) | Configurable | How often to read chat.db |
| `POLL_INTERVAL_OUTBOUND` | 5 (seconds) | Configurable | How often to check queue |
| `HEARTBEAT_INTERVAL` | 30 (seconds) | Configurable | How often to ping |

---

## Monitoring & Troubleshooting

### Check Loop Status
```bash
ps aux | grep -E "heartbeat|outbound|inbound" | grep -v grep
```

### Watch Logs in Real-time
```bash
tail -f /tmp/wade-*.log
```

### Manually Poll Queue
```bash
# Check if messages waiting
curl -s "https://vernacular.chat/api/engine/poll-outbound?station=Wade" | jq .

# Check Notion queue (if Supabase down)
curl -s -X POST "https://api.notion.com/v1/databases/db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956/query" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"filter":{"and":[{"property":"Direction","select":{"equals":"Outbound"}},{"property":"Status","select":{"equals":"Queued"}}]}}' | jq .
```

### Check Chat.db Manually
```bash
# Last 5 inbound
sqlite3 ~/Library/Messages/chat.db "
SELECT h.id, m.text, datetime(m.date/1000000000 + 978307200, 'unixepoch') 
FROM message m 
JOIN handle h ON m.handle_id=h.ROWID 
WHERE m.is_from_me=0 
ORDER BY m.date DESC 
LIMIT 5
"

# Last 5 outbound
sqlite3 ~/Library/Messages/chat.db "
SELECT h.id, m.text, datetime(m.date/1000000000 + 978307200, 'unixepoch') 
FROM message m 
JOIN handle h ON m.handle_id=h.ROWID 
WHERE m.is_from_me=1 
ORDER BY m.date DESC 
LIMIT 5
"
```

### Restart All Loops
```bash
pkill -f "heartbeat\|outbound\|inbound" 2>/dev/null
sleep 1
# Then run start script again
```

---

## Summary

**Wade Machine = Dumb Relay**
- No AI, no complex logic
- Just capture + send + report
- Three simple bash loops, resilient to failures
- Falls back to Notion if cloud unreachable
- AI lives on vernacular.chat backend

**For Future Machines**:
1. Register in Supabase `stations` table
2. Add station name to Notion database (or create new one)
3. Grant Full Disk Access to terminal
4. Run three bash loops (heartbeat, outbound, inbound)
5. Monitor via `/tmp/{STATION_NAME}-*.log`
6. Dashboard at vernacular.chat shows all station status + messages

**Key Insight**: This architecture scales to 25 stations without performance penalty. Each machine is independent, Notion provides human-accessible fallback, Supabase is the system of record.
