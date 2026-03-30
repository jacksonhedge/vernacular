/**
 * Vernacular Station Engine
 *
 * Runs locally on a Mac. Reads iMessages from chat.db,
 * writes to Supabase via the API, and sends outbound messages via AppleScript.
 *
 * Usage: STATION_ID=xxx ENGINE_KEY=xxx npx tsx engine/station.ts
 */

import { homedir } from 'os';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://miuyksnwzkhiyyilchjs.supabase.co';
const ENGINE_KEY = process.env.ENGINE_KEY!;
const STATION_ID = process.env.STATION_ID!;
const POLL_INTERVAL = 3000; // 3 seconds
const API_BASE = process.env.API_BASE || 'https://vernacular.chat';
const RUNNER_NAME = process.env.STATION_NAME || `runner-${STATION_ID?.substring(0, 8)}`;

const CHAT_DB_PATH = join(homedir(), 'Library', 'Messages', 'chat.db');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InboundMessage {
  phone: string;
  body: string;
  imessage_guid: string;
  sent_at: string;
}

interface OutboundMessage {
  id: string;
  body: string;
  conversations: {
    id: string;
    contacts: {
      id: string;
      phone: string;
      first_name: string | null;
      last_name: string | null;
    };
  };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let lastRowId = 0;
let running = true;

// ---------------------------------------------------------------------------
// chat.db Reader
// ---------------------------------------------------------------------------

/**
 * Reads new inbound messages from chat.db since the last known ROWID.
 *
 * Uses better-sqlite3 in readonly mode to query the Messages database.
 * Returns an array of InboundMessage objects and updates lastRowId.
 */
function readNewMessages(): InboundMessage[] {
  // TODO: Implement chat.db reading
  // 1. Open chat.db with better-sqlite3 in readonly mode:
  //    const db = new Database(CHAT_DB_PATH, { readonly: true });
  //
  // 2. Query for new messages:
  //    SELECT
  //      m.ROWID,
  //      m.guid,
  //      m.text,
  //      m.date,
  //      m.is_from_me,
  //      h.id AS handle_id
  //    FROM message m
  //    LEFT JOIN handle h ON m.handle_id = h.ROWID
  //    WHERE m.ROWID > ? AND m.is_from_me = 0
  //    ORDER BY m.ROWID ASC
  //
  // 3. Convert Apple epoch (nanoseconds since 2001-01-01) to ISO string
  //    const APPLE_EPOCH_OFFSET = 978307200;
  //    const unixTimestamp = (appleDate / 1_000_000_000) + APPLE_EPOCH_OFFSET;
  //
  // 4. Update lastRowId to the highest ROWID seen
  //
  // 5. Return array of InboundMessage

  console.log(`[chat.db] Checking for messages after ROWID ${lastRowId}...`);
  return [];
}

// ---------------------------------------------------------------------------
// iMessage Sender (AppleScript)
// ---------------------------------------------------------------------------

/**
 * Sends an iMessage via AppleScript.
 */
function sendImessage(phone: string, text: string): boolean {
  // TODO: Implement AppleScript sending
  // const script = `
  //   tell application "Messages"
  //     set targetService to 1st account whose service type = iMessage
  //     set targetBuddy to participant "${phone}" of targetService
  //     send "${text.replace(/"/g, '\\"')}" to targetBuddy
  //   end tell
  // `;
  // try {
  //   execSync(`osascript -e '${script}'`);
  //   return true;
  // } catch (err) {
  //   console.error(`[send] Failed to send to ${phone}:`, err);
  //   return false;
  // }

  console.log(`[send] Would send to ${phone}: ${text.substring(0, 50)}...`);
  return true;
}

// ---------------------------------------------------------------------------
// API Helpers
// ---------------------------------------------------------------------------

const headers = {
  'Content-Type': 'application/json',
  'x-engine-key': ENGINE_KEY,
};

/**
 * POST inbound messages to /api/engine/ingest
 */
async function postInbound(messages: InboundMessage[]): Promise<{ conversation_ids: string[] }> {
  if (messages.length === 0) return { conversation_ids: [] };

  const response = await fetch(`${API_BASE}/api/engine/ingest`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      station_id: STATION_ID,
      messages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Ingest failed (${response.status}): ${errBody}`);
  }

  return response.json();
}

/**
 * GET pending outbound messages from /api/engine/poll
 */
async function getPendingOutbound(): Promise<OutboundMessage[]> {
  const response = await fetch(
    `${API_BASE}/api/engine/poll?station_id=${STATION_ID}`,
    { method: 'GET', headers }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Poll failed (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  return data.messages || [];
}

/**
 * POST heartbeat to /api/engine/heartbeat
 */
async function sendHeartbeat(): Promise<void> {
  const response = await fetch(`${API_BASE}/api/engine/heartbeat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      runner_name: RUNNER_NAME,
      station_id: STATION_ID,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[heartbeat] Failed (${response.status}): ${errBody}`);
  }
}

/**
 * Report message delivery status back to the API.
 * Updates the message status to 'delivered' or 'failed'.
 */
async function reportDelivery(
  messageId: string,
  success: boolean
): Promise<void> {
  // TODO: Create a /api/engine/ack endpoint for this
  // For now, log it
  console.log(`[ack] Message ${messageId}: ${success ? 'delivered' : 'failed'}`);
}

// ---------------------------------------------------------------------------
// Main Loop
// ---------------------------------------------------------------------------

async function runCycle(): Promise<void> {
  try {
    // 1. Send heartbeat
    await sendHeartbeat();

    // 2. Read new inbound messages from chat.db
    const inbound = readNewMessages();
    if (inbound.length > 0) {
      console.log(`[inbound] Found ${inbound.length} new message(s)`);
      const result = await postInbound(inbound);
      console.log(
        `[inbound] Ingested. Conversation IDs: ${result.conversation_ids.join(', ')}`
      );
    }

    // 3. Poll for outbound messages
    const outbound = await getPendingOutbound();
    if (outbound.length > 0) {
      console.log(`[outbound] ${outbound.length} message(s) to send`);
      for (const msg of outbound) {
        const phone = msg.conversations?.contacts?.phone;
        if (!phone) {
          console.error(`[outbound] No phone for message ${msg.id}`);
          await reportDelivery(msg.id, false);
          continue;
        }

        const success = sendImessage(phone, msg.body);
        await reportDelivery(msg.id, success);
      }
    }
  } catch (err) {
    console.error('[cycle] Error:', err);
  }
}

async function main(): Promise<void> {
  // Validate required env vars
  if (!ENGINE_KEY) {
    console.error('ERROR: ENGINE_KEY environment variable is required');
    process.exit(1);
  }
  if (!STATION_ID) {
    console.error('ERROR: STATION_ID environment variable is required');
    process.exit(1);
  }

  console.log('=== Vernacular Station Engine ===');
  console.log(`Station ID: ${STATION_ID}`);
  console.log(`Runner:     ${RUNNER_NAME}`);
  console.log(`API Base:   ${API_BASE}`);
  console.log(`chat.db:    ${CHAT_DB_PATH}`);
  console.log(`Poll every: ${POLL_INTERVAL}ms`);
  console.log('');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[engine] Shutting down...');
    running = false;
  });
  process.on('SIGTERM', () => {
    console.log('\n[engine] Shutting down...');
    running = false;
  });

  // Initial heartbeat
  await sendHeartbeat();
  console.log('[engine] Online. Starting poll loop...\n');

  // Poll loop
  while (running) {
    await runCycle();
    await sleep(POLL_INTERVAL);
  }

  console.log('[engine] Stopped.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start
main().catch((err) => {
  console.error('[engine] Fatal error:', err);
  process.exit(1);
});
