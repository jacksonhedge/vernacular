# Vernacular Desktop

Electron + React desktop app for Vernacular iMessage CRM.

## Prerequisites

- macOS (required for iMessage integration)
- Node.js 20+
- Full Disk Access granted to the terminal/Electron app (System Settings > Privacy & Security > Full Disk Access)

## Setup

```bash
cd apps/desktop
npm install
```

## Development

```bash
npm run dev
```

This starts both the Vite dev server and Electron concurrently.

## Build

```bash
npm run build
```

Outputs a DMG and ZIP to `dist-build/`.

## Architecture

```
src/
  main/           # Electron main process
    index.ts      # Window creation, IPC handlers, app lifecycle
    imessage.ts   # Local chat.db reader + AppleScript sender
    tray.ts       # Menu bar tray icon and context menu
  preload/
    index.ts      # Context bridge (exposes vernacular API to renderer)
  renderer/       # React frontend (Vite)
    App.tsx        # Main layout (sidebar + conversations + messages)
    components/
      Sidebar.tsx          # Navigation, station status, sound toggle
      ConversationList.tsx # Searchable conversation list with fruit icons
      MessagePane.tsx      # Message bubbles, ghost AI toggle, send input
  shared/
    types.ts      # Shared TypeScript types
```

## iMessage Integration

The app reads `~/Library/Messages/chat.db` directly via `better-sqlite3` (read-only).
Messages are sent via AppleScript (`osascript`).

**Important:** You must grant Full Disk Access to the app for chat.db reading to work.

## Connecting to Backend

The app connects to `vernacular.chat` for:
- Contact sync (Notion integration)
- AI ghost drafting
- Multi-station coordination

Local chat.db is used for real-time message reading (faster than API polling).
