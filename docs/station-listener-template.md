# Vernacular Station Listener — Universal Template
## For ANY new station (Wade, Albus, Russell, or future machines)

> **CHANGELOG:**
> - v3 (April 6, 2026): Added Supabase direct polling (5s) with Notion fallback (60s). Dual-write inbound.
> - v2 (April 2, 2026): Moved from direct Supabase heartbeat to vernacular.chat/api/engine/ping (Cowork proxy fix).
> - v1 (March 31, 2026): Original Notion-only listener with 60s polling.

---

## Before You Start — Replace These Variables

Every station needs these values. Replace `<PLACEHOLDER>` with real values:

| Variable | Description | Example |
|----------|-------------|---------|
| `<STATION_NAME>` | Name registered in Supabase | `Wade`, `Albus`, `Russell` |
| `<STATION_ID>` | UUID from Supabase stations table | `9ae1a138-10bb-435b-a397-b3e2637fa3af` |
| `<PHONE_NUMBER>` | The iMessage number on this Mac | `+14125128437` |
| `<NOTION_TOKEN>` | Shared Notion API token | `ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw` |
| `<NOTION_DB>` | Notion Message Queue database ID | `db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956` |

---

## 1. Heartbeat (every 30s)

> **What it does:** Tells the Vernacular dashboard this station is alive. Dashboard shows green dot if heartbeat < 10 min old.
> **Changed in v2:** Now goes through vernacular.chat instead of direct Supabase (Cowork proxy blocks Supabase).

```bash
while true; do
  curl -s -X POST "https://vernacular.chat/api/engine/ping" \
    -H "Content-Type: application/json" \
    -d '{"station":"<STATION_NAME>"}' > /dev/null 2>&1
  echo "[<STATION_NAME>] 💓 Heartbeat $(date +%H:%M:%S)"
  sleep 30
done &
```

---

## 2. Outbound Sender (every 5s) — Supabase primary, Notion fallback

> **What it does:** Checks for messages queued by the dashboard. Sends them as blue iMessages via AppleScript.
> **Changed in v3:** Now polls vernacular.chat/api/engine/poll-outbound (Supabase, 5s latency) first. Falls back to Notion API (60s) if Supabase is unavailable.
> **Why dual-source:** If Supabase goes down, Notion still has the messages. Redundancy = messages always get sent.

```bash
while true; do
  # PRIMARY: Poll Supabase via Vernacular API (5s latency)
  MSGS=$(curl -s --max-time 5 "https://vernacular.chat/api/engine/poll-outbound?station=<STATION_NAME>" 2>/dev/null)
  
  if echo "$MSGS" | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if d.get('ok') else 1)" 2>/dev/null; then
    echo "$MSGS" | python3 -c "
import json, sys, subprocess
data = json.load(sys.stdin)
for m in data.get('messages', []):
    phone, text, qid = m['phone'], m['message'], m['id']
    print(f'[<STATION_NAME>] 📤 Sending (Supabase): {text[:50]}...')
    r = subprocess.run(['osascript','-e',f'tell application \"Messages\" to send \"{text}\" to buddy \"{phone}\" of (1st account whose service type = iMessage)'], capture_output=True, text=True)
    ok = r.returncode == 0
    subprocess.run(['curl','-s','-X','POST','https://vernacular.chat/api/engine/confirm-sent','-H','Content-Type: application/json','-d',json.dumps({'queueId':qid,'success':ok,'error':r.stderr if not ok else None})], capture_output=True)
    print(f'[<STATION_NAME>] {chr(9989) if ok else chr(10060)} {\"Sent\" if ok else r.stderr}')
" 2>/dev/null
  else
    # FALLBACK: Poll Notion directly (works even if vernacular.chat is down)
    echo "[<STATION_NAME>] ⚠️ Supabase unavailable, falling back to Notion..."
    curl -s -X POST "https://api.notion.com/v1/databases/<NOTION_DB>/query" \
      -H "Authorization: Bearer <NOTION_TOKEN>" \
      -H "Notion-Version: 2022-06-28" \
      -H "Content-Type: application/json" \
      -d '{"filter":{"and":[{"property":"Station","select":{"equals":"<STATION_NAME>"}},{"property":"Status","select":{"equals":"Queued"}},{"property":"Direction","select":{"equals":"Outbound"}}]},"page_size":5}' | python3 -c "
import json, sys, subprocess
try:
    data = json.load(sys.stdin)
    for page in data.get('results', []):
        pid = page['id']
        props = page['properties']
        msg = ''.join([p.get('plain_text','') for p in props.get('Message',{}).get('title',[])])
        phone = props.get('Contact Phone',{}).get('phone_number','')
        if not msg or not phone: continue
        digits = ''.join(c for c in phone if c.isdigit())
        if len(digits)==11 and digits[0]=='1': digits=digits[1:]
        send_phone = '+1' + digits
        print(f'[<STATION_NAME>] 📤 Sending (Notion fallback): {msg[:50]}...')
        r = subprocess.run(['osascript','-e',f'tell application \"Messages\" to send \"{msg}\" to buddy \"{send_phone}\" of (1st account whose service type = iMessage)'], capture_output=True, text=True)
        status = 'Sent' if r.returncode==0 else 'Failed'
        subprocess.run(['curl','-s','-X','PATCH',f'https://api.notion.com/v1/pages/{pid}','-H','Authorization: Bearer <NOTION_TOKEN>','-H','Notion-Version: 2022-06-28','-H','Content-Type: application/json','-d',json.dumps({'properties':{'Status':{'select':{'name':status}}}})], capture_output=True)
        print(f'[<STATION_NAME>] {chr(9989) if status==\"Sent\" else chr(10060)} {status} (Notion)')
except: pass
" 2>/dev/null
  fi
  
  sleep 5
done &
```

---

## 3. Inbound Capture (every 30s)

> **What it does:** Reads new incoming iMessages from ~/Library/Messages/chat.db. Logs them to both Notion (for poll-inbound) and Vernacular API directly.
> **Changed in v3:** Now dual-writes to both Notion AND Vernacular API. If AI mode is enabled on the conversation, Vernacular triggers Claude to draft a response.
> **Requires:** Full Disk Access granted to Terminal/Claude Code in System Settings → Privacy.

```bash
while true; do
  LAST=$(cat ~/.vernacular-last-rowid 2>/dev/null || echo 0)
  sqlite3 ~/Library/Messages/chat.db "SELECT h.id, m.text, m.ROWID FROM message m JOIN chat_message_join cmj ON m.ROWID=cmj.message_id JOIN chat c ON cmj.chat_id=c.ROWID JOIN handle h ON m.handle_id=h.ROWID WHERE m.is_from_me=0 AND m.ROWID>$LAST AND m.text IS NOT NULL AND m.text!='' ORDER BY m.ROWID ASC LIMIT 10;" 2>/dev/null | while IFS='|' read -r phone text rowid; do
    echo "[<STATION_NAME>] 📥 Inbound from $phone: ${text:0:50}"
    # Write to Notion (primary — poll-inbound reads this)
    curl -s -X POST "https://api.notion.com/v1/pages" \
      -H "Authorization: Bearer <NOTION_TOKEN>" \
      -H "Notion-Version: 2022-06-28" \
      -H "Content-Type: application/json" \
      -d "{\"parent\":{\"database_id\":\"<NOTION_DB>\"},\"properties\":{\"Message\":{\"title\":[{\"text\":{\"content\":\"$(echo $text | head -c 500)\"}}]},\"Contact Phone\":{\"phone_number\":\"$phone\"},\"Station\":{\"select\":{\"name\":\"<STATION_NAME>\"}},\"Status\":{\"select\":{\"name\":\"Received\"}},\"Direction\":{\"select\":{\"name\":\"Inbound\"}}}}" > /dev/null 2>&1
    # Also write to Vernacular API (triggers AI draft if enabled)
    curl -s -X POST "https://vernacular.chat/api/messages/inbound" \
      -H "Content-Type: application/json" \
      -d "{\"phoneNumber\":\"$phone\",\"message\":\"$(echo $text | head -c 500)\",\"stationId\":\"<STATION_ID>\",\"sourceSystem\":\"claude-cowork\"}" > /dev/null 2>&1
    echo "$rowid" > ~/.vernacular-last-rowid
    echo "[<STATION_NAME>] 📝 Logged to Notion + Vernacular"
  done
  sleep 30
done &
```

---

## 4. Verify Everything Works

```bash
# Test heartbeat
curl -s "https://vernacular.chat/api/engine/ping" -X POST -H "Content-Type: application/json" -d '{"station":"<STATION_NAME>"}'
# Expected: {"ok":true}

# Test outbound poll
curl -s "https://vernacular.chat/api/engine/poll-outbound?station=<STATION_NAME>"
# Expected: {"ok":true,"station":"<STATION_NAME>","count":0,"messages":[]}

# Test chat.db access
sqlite3 ~/Library/Messages/chat.db "SELECT COUNT(*) FROM message;" 2>/dev/null
# Expected: a number (not an error)
```

---

## Architecture

```
OUTBOUND (5s latency, 60s fallback):
  Dashboard → outbound_queue (Supabase) → Station polls /api/engine/poll-outbound
                                           ↓ confirms via /api/engine/confirm-sent
                                          AppleScript → blue iMessage → delivered
  
  If Supabase down:
  Dashboard → Notion Queue → Station polls Notion API → AppleScript → delivered

INBOUND (30s capture):
  Reply arrives → Messages.app → chat.db → Station reads every 30s
    → Notion (Direction=Inbound)
    → Vernacular API (/api/messages/inbound)
    → poll-inbound syncs to Supabase
    → if ai_mode=draft: Claude generates reply → yellow bubble in dashboard
    → if ai_mode=auto: Claude generates + auto-sends via outbound queue

HEARTBEAT (30s):
  Station → /api/engine/ping → Supabase stations.last_heartbeat
  Dashboard reads: < 3 min = Online, 3-10 min = Idle, > 10 min = Offline
```

---

## Adding a New Station

1. Register in Supabase: `INSERT INTO stations (name, phone_number, apple_id, machine_name, organization_id) VALUES ('<NAME>', '<PHONE>', '<APPLE_ID>', '<MACHINE>', '<ORG_ID>');`
2. Copy this template, replace all `<PLACEHOLDER>` values
3. Run the three loops on the Mac
4. Verify with the test commands above
5. Dashboard should show the station as Online within 30 seconds

---

## Known Issues & Fixes

| Issue | Fix |
|-------|-----|
| Cowork proxy blocks Supabase | Use vernacular.chat endpoints instead (already done in this template) |
| `osascript` fails with single quotes | Escape `'` in message text: `msg.replace("'", "'\\''")` |
| chat.db locked | Wait 5 seconds and retry — Messages.app briefly locks during writes |
| Duplicate messages in Notion | Track last ROWID in `~/.vernacular-last-rowid` — already handled |
| Phone format mismatch | Always send as `+1XXXXXXXXXX` to Notion, `(XXX) XXX-XXXX` to Supabase |
