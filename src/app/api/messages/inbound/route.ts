import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { findOrCreateContact, logContactActivity, updateEngagement } from '@/lib/contacts';

export async function POST(request: Request) {
  try {
    const { phoneNumber, message, stationId, sourceSystem } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json({ error: 'phoneNumber and message required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Find or create contact (shared utility)
    const contactId = await findOrCreateContact(supabase, {
      phone: phoneNumber,
      source: 'inbound',
      import_source: 'imessage',
      source_system: sourceSystem || 'claude-cowork',
    });

    if (!contactId) {
      return NextResponse.json({ error: 'Failed to find or create contact' }, { status: 500 });
    }

    // Find existing conversation with this contact
    const sid = stationId || '9ae1a138-10bb-435b-a397-b3e2637fa3af'; // default to Wade
    const { data: convs } = await supabase
      .from('conversations').select('id')
      .eq('contact_id', contactId)
      .eq('station_id', sid)
      .order('last_message_at', { ascending: false })
      .limit(1);

    let convId = convs?.[0]?.id;

    if (!convId) {
      // Create new conversation
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          station_id: sid, contact_id: contactId, status: 'active',
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 100),
          unread_count: 1, flagged: false,
        })
        .select('id').single();
      convId = newConv?.id;
    }

    if (!convId) {
      return NextResponse.json({ error: 'Failed to find or create conversation' }, { status: 500 });
    }

    // Insert inbound message
    const { data: msg } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        direction: 'inbound',
        body: message,
        status: 'delivered',
        ai_generated: false,
        sent_at: new Date().toISOString(),
      })
      .select('id').single();

    // Update conversation
    await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(),
      last_message_preview: message.substring(0, 100),
      unread_count: 1,
    }).eq('id', convId);

    // Log activity + update engagement
    await logContactActivity(supabase, contactId, 'replied', `Inbound: "${message.substring(0, 50)}"`);
    await updateEngagement(supabase, contactId, 'received_reply');

    return NextResponse.json({ success: true, messageId: msg?.id, conversationId: convId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
