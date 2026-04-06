# Wade Listener Setup Prompt
## Give this to Claude Code on your MacBook Air (Wade)

---

Run the Vernacular listener as a continuous background loop. Start all three of these NOW:

### 1. Heartbeat (keep running forever):
```bash
while true; do curl -s -X POST "https://vernacular.chat/api/engine/ping" -H "Content-Type: application/json" -d '{"station":"Wade"}'; sleep 30; done &
```

### 2. Full listener loop (every 60 seconds):
```bash
while true; do
  echo "[Wade] 🔄 Checking at $(date +%H:%M:%S)..."
  
  # Check for outbound messages in Notion
  QUEUED=$(curl -s -X POST "https://api.notion.com/v1/databases/db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956/query" \
    -H "Authorization: Bearer ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d '{"filter":{"and":[{"property":"Station","select":{"equals":"Wade"}},{"property":"Status","select":{"equals":"Queued"}},{"property":"Direction","select":{"equals":"Outbound"}}]},"page_size":5}')
  
  echo "$QUEUED" | python3 -c "
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
        print(f'[Wade] 📤 Sending to {send_phone}: {msg[:50]}...')
        r = subprocess.run(['osascript','-e',f'tell application \"Messages\" to send \"{msg}\" to buddy \"{send_phone}\" of (1st account whose service type = iMessage)'], capture_output=True, text=True)
        status = 'Sent' if r.returncode==0 else 'Failed'
        subprocess.run(['curl','-s','-X','PATCH',f'https://api.notion.com/v1/pages/{pid}','-H','Authorization: Bearer ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw','-H','Notion-Version: 2022-06-28','-H','Content-Type: application/json','-d',json.dumps({'properties':{'Status':{'select':{'name':status}}}})], capture_output=True)
        print(f'[Wade] {chr(10004) if status==\"Sent\" else chr(10060)} {status}')
except: pass
" 2>/dev/null
  
  # Check for inbound messages from chat.db
  LAST=$(cat ~/.vernacular-last-rowid 2>/dev/null || echo 0)
  sqlite3 ~/Library/Messages/chat.db "SELECT h.id, m.text, m.ROWID FROM message m JOIN chat_message_join cmj ON m.ROWID=cmj.message_id JOIN chat c ON cmj.chat_id=c.ROWID JOIN handle h ON m.handle_id=h.ROWID WHERE m.is_from_me=0 AND m.ROWID>$LAST AND m.text IS NOT NULL AND m.text!='' ORDER BY m.ROWID ASC LIMIT 10;" 2>/dev/null | while IFS='|' read -r phone text rowid; do
    echo "[Wade] 📥 Inbound from $phone: ${text:0:50}"
    curl -s -X POST "https://api.notion.com/v1/pages" \
      -H "Authorization: Bearer ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw" \
      -H "Notion-Version: 2022-06-28" \
      -H "Content-Type: application/json" \
      -d "{\"parent\":{\"database_id\":\"db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956\"},\"properties\":{\"Message\":{\"title\":[{\"text\":{\"content\":\"$(echo $text | head -c 500)\"}}]},\"Contact Phone\":{\"phone_number\":\"$phone\"},\"Station\":{\"select\":{\"name\":\"Wade\"}},\"Status\":{\"select\":{\"name\":\"Received\"}},\"Direction\":{\"select\":{\"name\":\"Inbound\"}}}}" > /dev/null 2>&1
    echo "$rowid" > ~/.vernacular-last-rowid
    echo "[Wade] 📝 Logged to Notion"
  done
  
  sleep 60
done &
```

### 3. Confirm it's running:
```bash
# Check heartbeat
curl -s "https://vernacular.chat/api/engine/ping" -X POST -H "Content-Type: application/json" -d '{"station":"Wade"}'
# Should return: {"ok":true}
```

### What this does:
- **Heartbeat** every 30s → dashboard shows Wade as Online (green dot)
- **Outbound** every 60s → checks Notion for queued messages → sends via AppleScript as blue iMessage → updates Notion status to Sent
- **Inbound** every 60s → reads chat.db for new replies → writes to Notion → Vernacular poll-inbound picks up → AI draft generated if conversation is in Draft mode

### Station details:
- Station Name: Wade
- Phone: (412) 512-8437
- Notion DB: db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956
- Notion Token: ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw
- Vernacular API: https://vernacular.chat
