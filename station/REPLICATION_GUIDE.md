# Vernacular Station Replication Guide

How to set up any of the 20 named stations from scratch. This is what Wade has, replicated exactly.

---

## What Each Station Needs

### Hardware
- Mac (MacBook Air/Pro, Mac Mini, Mac Studio)
- Power adapter (always plugged in)
- Ethernet adapter recommended (WiFi works but less reliable)
- Lid closed OK for MacBooks (clamshell mode)

### Software Already on macOS
- Messages.app (built-in)
- Python 3 (built-in on macOS 14+)
- SQLite3 (built-in)
- AppleScript/osascript (built-in)

### What Gets Downloaded
```
~/Projects/vernacular/          ← git clone (the repo)
  station/
    sync.py                     ← message sync (inbound + outbound)
    heartbeat.sh                ← keeps station "online"
    outbound.sh                 ← sends queued messages via AppleScript
    start.sh                    ← starts all 3 processes
    stop.sh                     ← stops all processes
    .env                        ← station-specific config (not in git)
    .env.example                ← template
    SETUP.md                    ← step-by-step guide
```

### What Gets Created at Runtime
```
~/.{station}-inbound-last       ← last synced inbound ROWID
~/.{station}-outbound-last      ← last synced outbound ROWID
/tmp/{station}_sync.log         ← sync process log
/tmp/{station}_heartbeat.log    ← heartbeat log
/tmp/{station}_outbound.log     ← outbound sender log
```

### What macOS Provides (read-only)
```
~/Library/Messages/chat.db      ← iMessage database (SQLite)
~/Library/Contacts/             ← Contacts database (future)
```

---

## Full Setup Sequence (per station)

### Phase 1: Apple Account (5 min)
```
1. Go to appleid.apple.com → Create Apple ID
2. Use the station's dedicated phone number for verification
3. Set a strong password → save in password manager
4. Name format: "Vernacular [StationName]" (e.g., "Vernacular Leonidas")
```

### Phase 2: Mac Configuration (10 min)
```
1. Sign into the Mac with the Apple ID
2. Open Messages.app → sign in with Apple ID
3. Send a test iMessage to your phone → verify BLUE bubble
4. System Settings → Lock Screen → Turn display off: Never
5. System Settings → Energy Saver → Prevent sleep: Yes
6. Run in terminal:
   sudo pmset -a sleep 0 && sudo pmset -a displaysleep 0
   defaults -currentHost write com.apple.screensaver idleTime 0
```

### Phase 3: Station Software (5 min)
```bash
# Install git if needed
xcode-select --install

# Clone repo
cd ~/Projects
git clone https://github.com/jacksonhedge/vernacular.git

# Configure station
cd vernacular/station
cp .env.example .env
nano .env
# Set:
#   SUPABASE_URL=https://miuyksnwzkhiyyilchjs.supabase.co
#   SUPABASE_KEY=<service role key>
#   STATION_NAME=Leonidas  (or whatever this station is named)
#   VERNACULAR_URL=https://vernacular.chat

# Enable outbound sending
nano start.sh
# Uncomment the 3 outbound lines

# Start
./start.sh
```

### Phase 4: Supabase Registration (2 min)
```sql
-- Run in Supabase SQL editor or via API
UPDATE stations 
SET phone_number = '(412) xxx-xxxx',
    organization_id = 'org-uuid-here',
    solution_type = 'app_testing'  -- or sales_outreach, vip_manager, customer_support
WHERE name = 'Leonidas';
```

### Phase 5: Verification (2 min)
```bash
# On the station Mac:
ps aux | grep -E "sync.py|heartbeat|outbound" | grep -v grep
# Should show 3 processes

# Check logs
tail -5 /tmp/leonidas_sync.log
tail -5 /tmp/leonidas_heartbeat.log
tail -5 /tmp/leonidas_outbound.log

# On vernacular.chat/dashboard:
# Station should show ● Online with fresh heartbeat
```

### Phase 6: Test Message (1 min)
```
1. Go to vernacular.chat/dashboard → Conversations
2. Start Conversation → enter a phone number
3. Send "Test from Leonidas"
4. Verify: message arrives as BLUE iMessage
5. Reply from phone → verify reply appears in dashboard
```

---

## Total Time Per Station: ~25 minutes

| Phase | Time | What |
|-------|------|------|
| Apple Account | 5 min | Create Apple ID with station phone number |
| Mac Config | 10 min | Sign in, Messages.app, prevent sleep |
| Software | 5 min | Clone repo, configure .env, start scripts |
| Supabase | 2 min | Update phone number + org assignment |
| Verify | 2 min | Check processes, logs, dashboard status |
| Test | 1 min | Send + receive test message |

---

## Station Fleet Roster

| # | Name | Status | Phone | Org | Solution |
|---|------|--------|-------|-----|----------|
| 1 | Wade | ● Online | (412) 512-8437 | FraternityBase | App Testing |
| 2 | Albus | ○ Ready | TBD | FraternityBase | Sales |
| 3 | Leonidas | ○ Available | TBD | — | — |
| 4 | Augustus | ○ Available | TBD | — | — |
| 5 | Achilles | ○ Available | TBD | — | — |
| 6 | Perseus | ○ Available | TBD | — | — |
| 7 | Hector | ○ Available | TBD | — | — |
| 8 | Trajan | ○ Available | TBD | — | — |
| 9 | Lincoln | ○ Available | TBD | — | — |
| 10 | Teddy | ○ Available | TBD | — | — |
| 11 | Benedict | ○ Available | TBD | — | — |
| 12 | Spartacus | ○ Available | TBD | — | — |
| 13 | Maximus | ○ Available | TBD | — | — |
| 14 | Cicero | ○ Available | TBD | — | — |
| 15 | Romulus | ○ Available | TBD | — | — |
| 16 | Nero | ○ Available | TBD | — | — |
| 17 | Hadrian | ○ Available | TBD | — | — |
| 18 | Constantine | ○ Available | TBD | — | — |
| 19 | Jefferson | ○ Available | TBD | — | — |
| 20 | Clement | ○ Available | TBD | — | — |

---

## Updating All Stations

When code changes are pushed to GitHub:
```bash
# SSH into each station (or run locally):
cd ~/Projects/vernacular
git pull
cd station
./stop.sh && ./start.sh
```

Future: The Vernacular Station macOS app (VernacularStation/) will replace these scripts with a native menu bar app that auto-updates.
