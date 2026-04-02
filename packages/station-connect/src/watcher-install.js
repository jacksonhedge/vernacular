import chalk from 'chalk';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const PREFIX = chalk.bold.cyan('[Vernacular]');
const VERNACULAR_DIR = path.join(homedir(), 'vernacular');
const WATCHER_PATH = path.join(VERNACULAR_DIR, 'watcher.js');
const PM2_NAME = 'vernacular-watcher';

/**
 * Install watcher dependencies in ~/vernacular/
 */
export async function installDependencies(spinner) {
  mkdirSync(VERNACULAR_DIR, { recursive: true });

  // Write a minimal package.json if it doesn't exist
  const pkgPath = path.join(VERNACULAR_DIR, 'package.json');
  writeFileSync(
    pkgPath,
    JSON.stringify(
      {
        name: 'vernacular-watcher',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: {
          '@supabase/supabase-js': '^2.101.0',
          dotenv: '^16.4.0',
          'better-sqlite3': '^11.0.0',
          'node-fetch': '^3.3.2',
        },
      },
      null,
      2
    ),
    'utf-8'
  );

  execSync('npm install --production', {
    cwd: VERNACULAR_DIR,
    stdio: 'ignore',
    timeout: 120000,
  });
}

/**
 * Write the watcher script to ~/vernacular/watcher.js
 */
export function createWatcherScript() {
  const script = `#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import fetch from 'node-fetch';

// --- Config from .env ---
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  NOTION_TOKEN,
  NOTION_DB,
  VERNACULAR_API,
  STATION_NAME,
  STATION_PHONE,
  STATION_ID,
  AUTO_REPLY,
  POLL_INTERVAL_MS,
} = process.env;

const POLL_MS = parseInt(POLL_INTERVAL_MS, 10) || 5000;
const HEARTBEAT_MS = 30000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const chatDbPath = path.join(homedir(), 'Library', 'Messages', 'chat.db');
let lastRowId = 0;

// ===== Heartbeat =====
async function sendHeartbeat() {
  try {
    await fetch(\`\${VERNACULAR_API}/api/engine/ping\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        station_id: STATION_ID,
        station_name: STATION_NAME,
        phone: STATION_PHONE,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error('[heartbeat] Failed:', err.message);
  }
}

// ===== Outbound: Poll Notion for messages to send =====
async function pollOutbound() {
  try {
    const res = await fetch(\`https://api.notion.com/v1/databases/\${NOTION_DB}/query\`, {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${NOTION_TOKEN}\`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          and: [
            { property: 'Status', select: { equals: 'queued' } },
            { property: 'Station', rich_text: { equals: STATION_PHONE } },
          ],
        },
      }),
    });

    const data = await res.json();
    if (!data.results) return;

    for (const page of data.results) {
      const props = page.properties;
      const to = props['To']?.phone_number || props['To']?.rich_text?.[0]?.plain_text;
      const body = props['Body']?.rich_text?.[0]?.plain_text;

      if (!to || !body) continue;

      try {
        // Send via AppleScript
        const escaped = body.replace(/"/g, '\\\\"').replace(/'/g, "'\\\\''");
        execSync(\`osascript -e 'tell application "Messages" to send "\${escaped}" to buddy "\${to}" of (first service whose service type is iMessage)'\`, {
          timeout: 15000,
        });

        // Mark as sent in Notion
        await fetch(\`https://api.notion.com/v1/pages/\${page.id}\`, {
          method: 'PATCH',
          headers: {
            Authorization: \`Bearer \${NOTION_TOKEN}\`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: {
              Status: { select: { name: 'sent' } },
            },
          }),
        });

        console.log(\`[outbound] Sent to \${to}: \${body.substring(0, 50)}...\`);
      } catch (err) {
        console.error(\`[outbound] Failed to send to \${to}:\`, err.message);
      }
    }
  } catch (err) {
    console.error('[outbound] Poll failed:', err.message);
  }
}

// ===== Inbound: Read chat.db for new messages =====
function pollInbound() {
  try {
    const db = new Database(chatDbPath, { readonly: true });

    const rows = db
      .prepare(\`
        SELECT
          m.ROWID,
          m.text,
          m.date,
          m.is_from_me,
          h.id AS handle_id
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        WHERE m.ROWID > ? AND m.is_from_me = 0
        ORDER BY m.ROWID ASC
        LIMIT 50
      \`)
      .all(lastRowId);

    db.close();

    for (const row of rows) {
      lastRowId = row.ROWID;

      if (!row.text || !row.handle_id) continue;

      // Write inbound to Notion
      writeInboundToNotion(row.handle_id, row.text).catch((err) =>
        console.error('[inbound] Notion write failed:', err.message)
      );

      console.log(\`[inbound] From \${row.handle_id}: \${row.text.substring(0, 50)}...\`);
    }
  } catch (err) {
    console.error('[inbound] chat.db read failed:', err.message);
  }
}

async function writeInboundToNotion(from, body) {
  await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${NOTION_TOKEN}\`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DB },
      properties: {
        From: { rich_text: [{ text: { content: from } }] },
        Body: { rich_text: [{ text: { content: body } }] },
        Station: { rich_text: [{ text: { content: STATION_PHONE } }] },
        Status: { select: { name: 'received' } },
        Direction: { select: { name: 'inbound' } },
      },
    }),
  });
}

// ===== Initialize =====
function initLastRowId() {
  try {
    const db = new Database(chatDbPath, { readonly: true });
    const row = db.prepare('SELECT MAX(ROWID) as maxId FROM message').get();
    db.close();
    lastRowId = row?.maxId || 0;
    console.log(\`[init] Starting from message ROWID \${lastRowId}\`);
  } catch (err) {
    console.error('[init] Could not read chat.db:', err.message);
  }
}

// ===== Main Loop =====
console.log(\`[vernacular] Station "\${STATION_NAME}" (\${STATION_PHONE}) starting...\`);
initLastRowId();

// Heartbeat every 30s
sendHeartbeat();
setInterval(sendHeartbeat, HEARTBEAT_MS);

// Poll loop
setInterval(() => {
  pollOutbound();
  pollInbound();
}, POLL_MS);

console.log(\`[vernacular] Watcher running. Poll interval: \${POLL_MS}ms\`);
`;

  writeFileSync(WATCHER_PATH, script, 'utf-8');
}

/**
 * Start the watcher via PM2
 */
export function startWithPM2() {
  // Ensure pm2 is available
  try {
    execSync('which pm2', { stdio: 'ignore' });
  } catch {
    console.log(`${PREFIX} Installing PM2 globally...`);
    execSync('npm install -g pm2', { stdio: 'ignore', timeout: 60000 });
  }

  // Stop existing instance if running
  try {
    execSync(`pm2 delete ${PM2_NAME}`, { stdio: 'ignore' });
  } catch {
    // Not running, that's fine
  }

  execSync(`pm2 start "${WATCHER_PATH}" --name ${PM2_NAME}`, {
    cwd: VERNACULAR_DIR,
    stdio: 'ignore',
    timeout: 15000,
  });

  // Save PM2 process list so it survives reboots
  try {
    execSync('pm2 save', { stdio: 'ignore' });
  } catch {
    // Non-critical
  }
}

/**
 * Stop the watcher PM2 process
 */
export async function stopWatcher() {
  try {
    execSync(`pm2 stop ${PM2_NAME}`, { stdio: 'ignore' });
    execSync(`pm2 delete ${PM2_NAME}`, { stdio: 'ignore' });
    console.log(`${PREFIX} ${chalk.green('Watcher stopped.')}`);
  } catch {
    console.log(`${PREFIX} ${chalk.yellow('Watcher is not running.')}`);
  }
}

/**
 * Get PM2 process status
 */
export function getStatus() {
  try {
    const output = execSync('pm2 jlist 2>/dev/null', { encoding: 'utf-8', timeout: 5000 });
    const processes = JSON.parse(output);
    return processes.find((p) => p.name === PM2_NAME) || null;
  } catch {
    return null;
  }
}
