import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { stripPhone, normalize10, formatPhone } from '@/lib/phone';
import { findOrCreateContact, logContactActivity, updateEngagement } from '@/lib/contacts';
import { deductCredits } from '@/lib/credits';

export async function POST(request: Request) {
  try {
    const { phoneNumber, message, contactName, organizationId, conversationId, sourceSystem } = await request.json();
    const system = sourceSystem || 'vernacular-web';

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId required' }, { status: 400 });
    }

    if (!phoneNumber || !message) {
      return NextResponse.json({ error: 'phoneNumber and message are required' }, { status: 400 });
    }

    const normalized = stripPhone(phoneNumber);
    if (normalized.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }
    const n10 = normalize10(phoneNumber);
    const formattedPhone = formatPhone(phoneNumber);

    const supabase = createServiceClient();

    // Find the best station (prefer online, skip TBD numbers)
    let station;
    if (organizationId) {
      const { data } = await supabase
        .from('stations').select('*').eq('organization_id', organizationId)
        .neq('phone_number', 'TBD').neq('phone_number', '')
        .order('status', { ascending: false }).limit(1);
      station = data?.[0];
    }
    if (!station) {
      const { data } = await supabase
        .from('stations').select('*')
        .neq('phone_number', 'TBD').neq('phone_number', '')
        .order('status', { ascending: false }).limit(1);
      station = data?.[0];
    }
    if (!station) {
      return NextResponse.json({ error: 'No stations available' }, { status: 503 });
    }

    // 1a. Queue to outbound_queue (direct station communication — 5s polling)
    let queueId: string | null = null;
    try {
      const { data: queued } = await supabase.from('outbound_queue').insert({
        station_name: station.name,
        contact_phone: `+1${n10}`,
        contact_name: contactName || null,
        message,
        source_system: system,
        organization_id: organizationId,
      }).select('id').single();
      queueId = queued?.id || null;
      // Messages table write happens in step 4 below (with conversation_id)
    } catch (err) {
      console.error('Outbound queue failed:', err instanceof Error ? err.message : err);
    }

    // Notion removed — all messaging goes through Supabase outbound_queue now

    // 2. Find or create contact in Supabase (shared utility)
    // Auto-detect name from outbound message if no contactName provided
    let detectedName = contactName;
    if (!detectedName && message) {
      // Match patterns like "Hey Sean", "Hi Kyle", "Yo Jonah", "What's up Brady"
      const nameMatch = message.match(/^(?:hey|hi|hello|yo|sup|what'?s up|howdy|hiya)\s+([A-Z][a-z]+)/i);
      if (nameMatch) {
        detectedName = `(Maybe) ${nameMatch[1]}`;
      }
    }

    const contactId = await findOrCreateContact(supabase, {
      phone: phoneNumber,
      full_name: detectedName || undefined,
      source: 'conversation',
      source_system: system,
      organization_id: organizationId,
    });

    // If we detected a name and the contact exists but has no name, update it
    if (detectedName && contactId) {
      const { data: existingContact } = await supabase
        .from('contacts').select('full_name').eq('id', contactId).single();
      if (existingContact && (!existingContact.full_name || existingContact.full_name.startsWith('+1') || existingContact.full_name === 'Unknown')) {
        await supabase.from('contacts').update({ full_name: detectedName }).eq('id', contactId);
      }
    }

    // Log activity + update engagement
    if (contactId) {
      await logContactActivity(supabase, contactId, 'messaged', `Sent: "${message.substring(0, 50)}"`, undefined, organizationId);
      await updateEngagement(supabase, contactId, 'sent');
    }

    // 3. Find or create conversation
    let convId = conversationId;
    if (!convId && contactId) {
      // Check for existing conversation with this contact on this station
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('station_id', station.id)
        .eq('contact_id', contactId)
        .eq('status', 'active')
        .limit(1);

      if (existingConv && existingConv.length > 0) {
        convId = existingConv[0].id;
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            station_id: station.id,
            contact_id: contactId,
            status: 'active',
            last_message_at: new Date().toISOString(),
            last_message_preview: message.substring(0, 100),
            unread_count: 0,
            flagged: false,
            source_system: system,
          })
          .select('id').single();
        convId = newConv?.id || null;
      }
    }

    // 4. Create message record (with conversation_id link + correct column names)
    let messageId: string | null = null;
    if (convId) {
      const { data: msg } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          direction: 'Outbound',
          message,
          contact_phone: `+1${n10}`,
          station: station.name,
          status: 'Queued',
          source_system: system,
        })
        .select('id').single();
      messageId = msg?.id || null;

      // Update conversation
      await supabase.from('conversations').update({
        last_message_at: new Date().toISOString(),
        last_message_preview: message.substring(0, 100),
      }).eq('id', convId);
    }

    // Deduct credits
    if (organizationId) {
      await deductCredits(supabase, organizationId, 'send_imessage', `To: ${contactName || phoneNumber}`, contactId || undefined, messageId || undefined);
    }

    return NextResponse.json({
      success: true,
      messageId,
      conversationId: convId,
      contactId,
      notionQueued: false,
      station: { name: station.name, phone: station.phone_number, status: station.status },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send' }, { status: 500 });
  }
}
