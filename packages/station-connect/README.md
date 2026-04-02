# @hedgeinc/vernacular-station

Internal CLI tool that configures any Mac as a Vernacular iMessage station.

## Installation

```bash
npm install -g @hedgeinc/vernacular-station
```

Or via GitHub Packages:

```bash
npm install -g @hedgeinc/vernacular-station --registry=https://npm.pkg.github.com
```

## Usage

### Connect a station

```bash
vernacular-station connect +14125128437
vernacular-station connect "(412) 512-8437"
```

This will:
1. Check macOS permissions (Full Disk Access, Contacts, Automation)
2. Authenticate to Supabase
3. Look up or create the station record
4. Write config to `~/vernacular/.env`
5. Install watcher dependencies
6. Start the watcher via PM2

### Check status

```bash
vernacular-station status
```

Shows station config, PM2 process status, uptime, and memory usage.

### Stop the watcher

```bash
vernacular-station stop
```

Stops and removes the PM2 watcher process.

### View logs

```bash
pm2 logs vernacular-watcher
```

## How it works

The watcher (`~/vernacular/watcher.js`) runs as a PM2 process and does three things:

- **Heartbeat**: Pings `vernacular.chat/api/engine/ping` every 30 seconds
- **Outbound**: Polls Notion for queued messages assigned to this station, sends them via AppleScript
- **Inbound**: Reads `~/Library/Messages/chat.db` for new incoming messages, writes them to Notion

## Requirements

- macOS (Apple Silicon or Intel)
- Node.js 18+
- Full Disk Access (to read chat.db)
- Contacts access (to resolve names)
- Automation access for Messages.app (to send iMessages)
- PM2 (installed automatically if missing)

## Config

All config lives in `~/vernacular/.env`. Re-run `vernacular-station connect` to regenerate it.
