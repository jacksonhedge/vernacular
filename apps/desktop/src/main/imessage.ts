import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface LocalMessage {
  rowId: number;
  phone: string;
  text: string;
  isFromMe: boolean;
  timestamp: number;
}

const CHAT_DB_PATH = path.join(os.homedir(), 'Library/Messages/chat.db');

let lastRowId = 0;

function openDB(): Database.Database {
  return new Database(CHAT_DB_PATH, { readonly: true, fileMustExist: true });
}

/**
 * Read recent messages from the local iMessage database.
 * If sinceRowId is provided, only returns messages after that row.
 */
export function readRecentMessages(sinceRowId?: number): LocalMessage[] {
  const db = openDB();

  try {
    const query = `
      SELECT
        m.ROWID as rowId,
        COALESCE(h.id, '') as phone,
        COALESCE(m.text, '') as text,
        m.is_from_me as isFromMe,
        m.date as timestamp
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      WHERE m.ROWID > ?
      ORDER BY m.date DESC
      LIMIT 200
    `;

    const rows = db.prepare(query).all(sinceRowId ?? 0) as any[];

    return rows.map((row) => ({
      rowId: row.rowId,
      phone: row.phone,
      text: row.text,
      isFromMe: row.isFromMe === 1,
      // iMessage stores dates as nanoseconds since 2001-01-01
      // Convert to Unix timestamp in milliseconds
      timestamp: Math.floor(row.timestamp / 1_000_000) + 978307200000,
    }));
  } finally {
    db.close();
  }
}

/**
 * Send an iMessage via AppleScript/osascript.
 */
export async function sendMessage(phone: string, text: string): Promise<void> {
  const script = `
    tell application "Messages"
      set targetService to 1st account whose service type = iMessage
      set targetBuddy to participant "${phone}" of targetService
      send "${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" to targetBuddy
    end tell
  `;

  await execFileAsync('osascript', ['-e', script]);
}

/**
 * Poll chat.db for new messages at the given interval.
 * Calls the callback with any new messages found.
 */
export function watchForNewMessages(
  callback: (messages: LocalMessage[]) => void,
  intervalMs: number = 5000,
): NodeJS.Timeout {
  // Initialize lastRowId to the most recent message
  try {
    const recent = readRecentMessages(0);
    if (recent.length > 0) {
      lastRowId = Math.max(...recent.map((m) => m.rowId));
    }
  } catch {
    // chat.db may not be accessible yet
  }

  return setInterval(() => {
    try {
      const newMessages = readRecentMessages(lastRowId);
      if (newMessages.length > 0) {
        lastRowId = Math.max(...newMessages.map((m) => m.rowId));
        callback(newMessages);
      }
    } catch {
      // Silently retry next interval
    }
  }, intervalMs);
}
