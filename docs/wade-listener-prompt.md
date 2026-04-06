# Wade Listener Setup Prompt
## Give this to Claude Code on your MacBook Air (Wade)

---

Run the Vernacular listener as a continuous background system. This handles heartbeats, outbound sending (with Notion fallback), and inbound capture. Start ALL of these NOW:

### 1. Heartbeat (every 30s):
```bash
while true; do curl -s -X POST "https://vernacular.chat/api/engine/ping" -H "Content-Type: application/json" -d '{"station":"Wade"}'; sleep 30; done &
```

### 2. Outbound Sender — Supabase primary, Notion fallback (every 5s):
```bash
while true; do
  # Try Supabase direct queue first (fast — 5s latency)
  MSGS=$(curl -s --max-time 5 "https://vernacular.chat/api/engine/poll-outbound?station=Wade" 2>/dev/null)
  
  if echo "$MSGS" | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if d.get('ok') else 1)" 2>/dev/null; then
    # Supabase is up — process messages
    echo "$MSGS" | python3 -c "
import json, sys, subprocess
data = json.load(sys.stdin)
for m in data.get('messages', []):
    phone, text, qid = m['phone'], m['message'], m['id']
    print(f'[Wade] 📤 Sending (Supabase): {text[:50]}...')
    r = subprocess.run(['osascript','-e',f'tell application \"Messages\" to send \"{text}\" to buddy \"{phone}\" of (1st account whose service type = iMessage)'], capture_output=True, text=True)
    ok = r.returncode == 0
    subprocess.run(['curl','-s','-X','POST','https://vernacular.chat/api/engine/confirm-sent','-H','Content-Type: application/json','-d',json.dumps({'queueId':qid,'success':ok,'error':r.stderr if not ok else None})], capture_output=True)
    print(f'[Wade] {chr(9989) if ok else chr(10060)} {\"Sent\" if ok else r.stderr}')
" 2>/dev/null
  else
    # Supabase/Vernacular down — fall back to Notion
    echo "[Wade] ⚠️ Supabase unavailable, falling back to Notion..."
    curl -s -X POST "https://api.notion.com/v1/databases/db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956/query" \
      -H "Authorization: Bearer ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw" \
      -H "Notion-Version: 2022-06-28" \
      -H "Content-Type: application/json" \
      -d '{"filter":{"and":[{"property":"Station","select":{"equals":"Wade"}},{"property":"Status","select":{"equals":"Queued"}},{"property":"Direction","select":{"equals":"Outbound"}}]},"page_size":5}' | python3 -c "
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
        print(f'[Wade] 📤 Sending (Notion fallback): {msg[:50]}...')
        r = subprocess.run(['osascript','-e',f'tell application \"Messages\" to send \"{msg}\" to buddy \"{send_phone}\" of (1st account whose service type = iMessage)'], capture_output=True, text=True)
        status = 'Sent' if r.returncode==0 else 'Failed'
        subprocess.run(['curl','-s','-X','PATCH',f'https://api.notion.com/v1/pages/{pid}','-H','Authorization: Bearer ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw','-H','Notion-Version: 2022-06-28','-H','Content-Type: application/json','-d',json.dumps({'properties':{'Status':{'select':{'name':status}}}})], capture_output=True)
        print(f'[Wade] {chr(9989) if status==\"Sent\" else chr(10060)} {status} (Notion)')
except: pass
" 2>/dev/null
  fi
  
  sleep 5
done &
```

### 3. Inbound Capture (every 30s):
```bash
while true; do
  LAST=$(cat ~/.vernacular-last-rowid 2>/dev/null || echo 0)
  sqlite3 ~/Library/Messages/chat.db "SELECT h.id, m.text, m.ROWID FROM message m JOIN chat_message_join cmj ON m.ROWID=cmj.message_id JOIN chat c ON cmj.chat_id=c.ROWID JOIN handle h ON m.handle_id=h.ROWID WHERE m.is_from_me=0 AND m.ROWID>$LAST AND m.text IS NOT NULL AND m.text!='' ORDER BY m.ROWID ASC LIMIT 10;" 2>/dev/null | while IFS='|' read -r phone text rowid; do
    echo "[Wade] 📥 Inbound from $phone: ${text:0:50}"
    # Write to Notion
    curl -s -X POST "https://api.notion.com/v1/pages" \
      -H "Authorization: Bearer ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw" \
      -H "Notion-Version: 2022-06-28" \
      -H "Content-Type: application/json" \
      -d "{\"parent\":{\"database_id\":\"db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956\"},\"properties\":{\"Message\":{\"title\":[{\"text\":{\"content\":\"$(echo $text | head -c 500)\"}}]},\"Contact Phone\":{\"phone_number\":\"$phone\"},\"Station\":{\"select\":{\"name\":\"Wade\"}},\"Status\":{\"select\":{\"name\":\"Received\"}},\"Direction\":{\"select\":{\"name\":\"Inbound\"}}}}" > /dev/null 2>&1
    # Also try Vernacular API directly
    curl -s -X POST "https://vernacular.chat/api/messages/inbound" \
      -H "Content-Type: application/json" \
      -d "{\"phoneNumber\":\"$phone\",\"message\":\"$(echo $text | head -c 500)\",\"stationId\":\"9ae1a138-10bb-435b-a397-b3e2637fa3af\",\"sourceSystem\":\"claude-cowork\"}" > /dev/null 2>&1
    echo "$rowid" > ~/.vernacular-last-rowid
    echo "[Wade] 📝 Logged to Notion + Vernacular"
  done
  sleep 30
done &
```

### 4. Confirm everything is running:
```bash
# Check heartbeat
curl -s "https://vernacular.chat/api/engine/ping" -X POST -H "Content-Type: application/json" -d '{"station":"Wade"}'
# Should return: {"ok":true}

# Check outbound poll
curl -s "https://vernacular.chat/api/engine/poll-outbound?station=Wade"
# Should return: {"ok":true,"station":"Wade","count":0,"messages":[]}
```

---

## Architecture

```
OUTBOUND (sending texts):
Dashboard → outbound_queue (Supabase) → Wade polls every 5s → AppleScript → blue iMessage
                                         ↓ (if Supabase down)
Dashboard → Notion Message Queue → Wade polls Notion → AppleScript → blue iMessage

INBOUND (receiving replies):
Someone texts → Messages.app → chat.db → Wade reads every 30s
  → Writes to Notion (primary)
  → Writes to Vernacular API (secondary)
  → poll-inbound picks up → Supabase → AI draft if enabled → dashboard

HEARTBEAT:
Wade → vernacular.chat/api/engine/ping every 30s → dashboard shows green dot
```

## Failover Matrix

| Component Down | What Happens |
|---------------|-------------|
| Supabase | Notion takes over outbound — messages still send |
| Notion | Supabase still works for outbound (primary path) |
| vernacular.chat | Notion accessible directly — outbound via Notion, inbound logged to Notion |
| Both Supabase + Notion | Messages queue, retry next cycle |
| Internet | Nothing sends, chat.db still captures inbound locally |
| Wade crashes | Heartbeat stops, dashboard shows offline in 10 min |

## Station Details
- **Station Name:** Wade
- **Phone:** (412) 512-8437
- **Apple ID:** jackson@fraternitybase.com
- **Machine:** MacBook Air
- **Station ID:** 9ae1a138-10bb-435b-a397-b3e2637fa3af
- **Notion DB:** db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956
- **Notion Token:** ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw
- **Vernacular API:** https://vernacular.chat
