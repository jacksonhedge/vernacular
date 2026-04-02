#!/usr/bin/env npx ts-node
/**
 * Vernacular Station Runner
 *
 * Runs on a Mac with iMessage configured. Polls the Vernacular API
 * for queued outbound messages and sends them via AppleScript.
 * Also sends heartbeats to keep the station status online.
 *
 * Usage:
 *   npx ts-node runner.ts --station-id=<uuid> --api-url=https://vernacular.chat
 *
 * Or set environment variables:
 *   STATION_ID=<uuid>
 *   API_URL=https://vernacular.chat
 *   SUPABASE_URL=https://miuyksnwzkhiyyilchjs.supabase.co
 *   SUPABASE_SERVICE_KEY=<key>
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://miuyksnwzkhiyyilchjs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const STATION_ID = process.env.STATION_ID || '';
const POLL_INTERVAL = 45000; // 45 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

if (!SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY is required');
  process.exit(1);
}
if (!STATION_ID) {
  console.error('ERROR: STATION_ID is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Send iMessage via AppleScript
function sendIMessage(phoneNumber: string, message: string): boolean {
  // Normalize phone number
  const normalized = phoneNumber.replace(/\D/g, '');
  const formatted = normalized.length === 10 ? `+1${normalized}` : `+${normalized}`;

  const script = `
    tell application "Messages"
      set targetService to 1st service whose service type = iMessage
      set targetBuddy to buddy "${formatted}" of targetService
      send "${message.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" to targetBuddy
    end tell
  `;

  try {
    execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { timeout: 15000 });
    console.log(`  ✓ Sent to ${formatted}`);
    return true;
  } catch (err) {
    // Fallback: try sending via buddy phone number without service specification
    try {
      const fallbackScript = `
        tell application "Messages"
          send "${message.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" to buddy "${formatted}" of (1st account whose service type = iMessage)
        end tell
      `;
      execSync(`osascript -e '${fallbackScript.replace(/'/g, "'\\''")}'`, { timeout: 15000 });
      console.log(`  ✓ Sent to ${formatted} (fallback)`);
      return true;
    } catch (err2) {
      console.error(`  ✗ Failed to send to ${formatted}:`, err2 instanceof Error ? err2.message : err2);
      return false;
    }
  }
}

// Poll for queued messages and send them
async function pollMessages() {
  try {
    // Find queued messages for conversations on this station
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, contact_id')
      .eq('station_id', STATION_ID);

    if (!conversations || conversations.length === 0) return;

    const convIds = conversations.map(c => c.id);

    // Get queued messages
    const { data: messages } = await supabase
      .from('messages')
      .select('id, conversation_id, body, direction, status')
      .in('conversation_id', convIds)
      .eq('status', 'queued')
      .eq('direction', 'outbound')
      .order('created_at', { ascending: true })
      .limit(10);

    if (!messages || messages.length === 0) return;

    console.log(`\n📬 Found ${messages.length} queued message(s)`);

    for (const msg of messages) {
      // Get contact phone number
      const conv = conversations.find(c => c.id === msg.conversation_id);
      if (!conv) continue;

      const { data: contact } = await supabase
        .from('contacts')
        .select('phone, full_name')
        .eq('id', conv.contact_id)
        .single();

      if (!contact?.phone) {
        console.log(`  ⚠ No phone for contact in conversation ${msg.conversation_id}`);
        await supabase.from('messages').update({ status: 'failed' }).eq('id', msg.id);
        continue;
      }

      console.log(`  → Sending to ${contact.full_name || contact.phone}: "${msg.body.substring(0, 50)}..."`);

      // Send via iMessage
      const success = sendIMessage(contact.phone, msg.body);

      // Update message status
      await supabase.from('messages').update({
        status: success ? 'sent' : 'failed',
        sent_at: success ? new Date().toISOString() : null,
      }).eq('id', msg.id);

      // Update conversation
      if (success) {
        await supabase.from('conversations').update({
          last_message_at: new Date().toISOString(),
          last_message_preview: msg.body.substring(0, 100),
        }).eq('id', msg.conversation_id);
      }

      // Small delay between messages to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (err) {
    console.error('Poll error:', err instanceof Error ? err.message : err);
  }
}

// Send heartbeat to keep station online
async function sendHeartbeat() {
  try {
    await supabase.from('stations').update({
      status: 'online',
      last_heartbeat: new Date().toISOString(),
    }).eq('id', STATION_ID);
  } catch (err) {
    console.error('Heartbeat error:', err instanceof Error ? err.message : err);
  }
}

// Set station offline on exit
async function shutdown() {
  console.log('\n🔴 Station going offline...');
  await supabase.from('stations').update({ status: 'offline' }).eq('id', STATION_ID);
  process.exit(0);
}

// Main
async function main() {
  console.log('🟢 Vernacular Station Runner');
  console.log(`   Station ID: ${STATION_ID}`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log(`   Poll interval: ${POLL_INTERVAL / 1000}s`);
  console.log(`   Heartbeat interval: ${HEARTBEAT_INTERVAL / 1000}s`);
  console.log('');

  // Set online immediately
  await sendHeartbeat();
  console.log('✓ Station is ONLINE\n');

  // Start polling
  setInterval(pollMessages, POLL_INTERVAL);
  setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

  // Handle shutdown
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Initial poll
  await pollMessages();

  console.log('Waiting for messages... (Ctrl+C to stop)\n');
}

main().catch(console.error);
