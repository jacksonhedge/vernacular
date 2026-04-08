# Vernacular Station Setup Guide

Universal setup for any new Mac station (Wade, Albus, Russell, etc.)

## Prerequisites
- Mac (MacBook, Mac Mini, etc.) with power connected
- Apple ID with iMessage enabled
- Phone number assigned to the Apple ID
- Internet connection (Ethernet preferred)
- Prevent sleep: `sudo pmset -a sleep 0 && sudo pmset -a displaysleep 0`

---

## Step 1: Clone the repo

```bash
cd ~/Projects
git clone https://github.com/jacksonhedge/vernacular.git
cd vernacular/station
```

**If the Mac already has a local `/Projects/vernacular` that isn't a git repo:**
```bash
# Back up local work first
cp -r ~/Projects/vernacular ~/Projects/vernacular-backup-local

# Clone fresh
cd ~/Projects
git clone https://github.com/jacksonhedge/vernacular.git vernacular-repo

# Copy any local-only files you want to keep
# cp ~/Projects/vernacular/some-local-file ~/Projects/vernacular-repo/

# Swap directories
mv ~/Projects/vernacular ~/Projects/vernacular-old
mv ~/Projects/vernacular-repo ~/Projects/vernacular
```

---

## Step 2: Configure station .env

```bash
cd ~/Projects/vernacular/station
cp .env.example .env
```

Edit `.env` with your station's values:
```env
SUPABASE_URL=https://miuyksnwzkhiyyilchjs.supabase.co
SUPABASE_KEY=<service role key>
STATION_NAME=<YourStationName>   # e.g., Wade, Albus, Russell
VERNACULAR_URL=https://vernacular.chat
SYNC_INTERVAL=30
POLL_INTERVAL=5
HEARTBEAT_INTERVAL=30
```

---

## Step 3: Kill any old scripts

```bash
pkill -f sync_complete.py
pkill -f wade_sync
pkill -f heartbeat
pkill -f outbound
```

---

## Step 4: Enable outbound sending

Edit `start.sh` — uncomment the 3 outbound lines:
```bash
nano start.sh
# Find these lines and remove the # at the start:
# echo "Starting outbound sender..."
# nohup bash "${SCRIPT_DIR}/outbound.sh" > "/tmp/${STATION_LOWER}_outbound.log" 2>&1 &
# echo "  PID: $! → /tmp/${STATION_LOWER}_outbound.log"
```

---

## Step 5: Start the station

```bash
cd ~/Projects/vernacular/station
./start.sh
```

This starts 3 processes:
1. **sync.py** — inbound + outbound message sync (every 30s)
2. **heartbeat.sh** — pings vernacular.chat every 30s (keeps station online)
3. **outbound.sh** — polls outbound_queue every 5s, sends via AppleScript

---

## Step 6: Verify

```bash
# Check all 3 processes
ps aux | grep -E "sync.py|heartbeat|outbound" | grep -v grep

# Check logs
STATION=$(echo $STATION_NAME | tr '[:upper:]' '[:lower:]')
tail -5 /tmp/${STATION}_sync.log
tail -5 /tmp/${STATION}_heartbeat.log
tail -5 /tmp/${STATION}_outbound.log
```

---

## Step 7: Prevent Mac from sleeping

```bash
sudo pmset -a sleep 0
sudo pmset -a displaysleep 0
sudo pmset -a disksleep 0
sudo pmset -c sleep 0
sudo pmset -a womp 1
defaults -currentHost write com.apple.screensaver idleTime 0
defaults write com.apple.screensaver askForPassword -int 0
```

---

## Step 8: Test

1. Go to vernacular.chat/dashboard
2. Open a conversation
3. Send a test message
4. Check: `tail -f /tmp/<station>_outbound.log`
5. Verify the message arrives as a blue iMessage

---

## What the scripts do

| Script | Interval | Purpose |
|--------|----------|---------|
| `sync.py` | 30s | Reads chat.db, syncs inbound + outbound messages to Supabase |
| `heartbeat.sh` | 30s | Pings /api/engine/ping to keep station showing "online" |
| `outbound.sh` | 5s | Polls outbound_queue, sends via AppleScript, confirms sent |

## Features in sync.py

- Inbound message sync (text column)
- Outbound message sync (BLOB extraction from attributedBody)
- Real timestamps (sent_at from chat.db date column)
- Attachment detection (PDF, image, video, audio → placeholder text)
- BLOB prefix stripping (+X artifacts)
- Dedup via `Prefer: resolution=ignore-duplicates` header
- Spam filtering (short codes, 555 numbers, emails)
- State tracking via `~/.{station}-inbound-last` and `~/.{station}-outbound-last`

## Stopping the station

```bash
cd ~/Projects/vernacular/station
./stop.sh
```

## Updating

```bash
cd ~/Projects/vernacular
git pull
cd station
./stop.sh && ./start.sh
```
