import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyEngineKey } from '@/lib/engine-auth';

const OPT_OUT_KEYWORDS = ['stop', 'unsubscribe', 'opt out', 'optout', 'cancel', 'quit', 'end'];

interface InboundMessage {
  phone: string;
  body: string;
  imessage_guid: string;
  sent_at: string;
}

// POST /api/engine/ingest — Ingest inbound messages from the local engine
// Body: { station_id, messages: [{ phone, body, imessage_guid, sent_at }] }
export async function POST(req: NextRequest) {
  try {
    const engineKey = await verifyEngineKey(req);
    if (!engineKey) {
      return NextResponse.json({ error: 'Invalid engine key' }, { status: 401 });
    }

    const body = await req.json();
    const { station_id, messages } = body as {
      station_id: string;
      messages: InboundMessage[];
    };

    if (!station_id || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'station_id and messages array are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify station belongs to this org
    const { data: station } = await supabase
      .from('stations')
      .select('id, org_id')
      .eq('id', station_id)
      .eq('org_id', engineKey.org_id)
      .single();

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found or does not belong to this org' },
        { status: 404 }
      );
    }

    const results: { conversation_id: string; message_id: string; opt_out: boolean }[] = [];

    for (const msg of messages) {
      try {
        const result = await processInboundMessage(
          supabase,
          station_id,
          engineKey.org_id,
          msg
        );
        results.push(result);
      } catch (err) {
        console.error(`Error processing message ${msg.imessage_guid}:`, err);
        // Continue processing other messages
      }
    }

    // Return conversation IDs so the engine can trigger AI drafting
    const conversationIds = [...new Set(results.map((r) => r.conversation_id))];

    return NextResponse.json({
      processed: results.length,
      conversation_ids: conversationIds,
      results,
    });
  } catch (err) {
    console.error('POST /api/engine/ingest error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processInboundMessage(
  supabase: ReturnType<typeof createServiceClient>,
  stationId: string,
  orgId: string,
  msg: InboundMessage
): Promise<{ conversation_id: string; message_id: string; opt_out: boolean }> {
  const phone = normalizePhone(msg.phone);

  // 1. Find or create contact
  let { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone', phone)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!contact) {
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert({
        phone,
        org_id: orgId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create contact: ${error.message}`);
    contact = newContact;
  }

  // 2. Find or create conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('contact_id', contact.id)
    .eq('station_id', stationId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!conversation) {
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({
        contact_id: contact.id,
        station_id: stationId,
        org_id: orgId,
        status: 'active',
        last_message_at: msg.sent_at,
        unread_count: 1,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);
    conversation = newConversation;
  }

  // 3. Check for duplicate (by imessage_guid)
  if (msg.imessage_guid) {
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('imessage_guid', msg.imessage_guid)
      .maybeSingle();

    if (existing) {
      return {
        conversation_id: conversation.id,
        message_id: existing.id,
        opt_out: false,
      };
    }
  }

  // 4. Insert the message
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      station_id: stationId,
      direction: 'inbound',
      body: msg.body,
      imessage_guid: msg.imessage_guid || null,
      sent_at: msg.sent_at,
      status: 'delivered',
    })
    .select()
    .single();

  if (msgError) throw new Error(`Failed to insert message: ${msgError.message}`);

  // 5. Update conversation last_message_at and unread_count
  await supabase
    .from('conversations')
    .update({
      last_message_at: msg.sent_at,
      unread_count: (conversation.unread_count || 0) + 1,
    })
    .eq('id', conversation.id);

  // 6. Check for opt-out keywords
  let optOut = false;
  const bodyLower = msg.body.trim().toLowerCase();
  if (OPT_OUT_KEYWORDS.some((kw) => bodyLower === kw)) {
    // Create opt_out record
    const { data: existingOptOut } = await supabase
      .from('opt_outs')
      .select('id')
      .eq('contact_id', contact.id)
      .eq('org_id', orgId)
      .is('opted_back_in_at', null)
      .maybeSingle();

    if (!existingOptOut) {
      await supabase.from('opt_outs').insert({
        contact_id: contact.id,
        org_id: orgId,
        keyword: bodyLower,
        message_id: message.id,
      });
      optOut = true;
    }
  }

  return {
    conversation_id: conversation.id,
    message_id: message.id,
    opt_out: optOut,
  };
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
}
