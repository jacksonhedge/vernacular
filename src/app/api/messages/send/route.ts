import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { stripPhone, normalize10, formatPhone } from '@/lib/phone';
import { createPage, NOTION_DBS } from '@/lib/notion';
import { findOrCreateContact, logContactActivity, updateEngagement } from '@/lib/contacts';
import { deductCredits } from '@/lib/credits';

// Notion config now in @/lib/notion

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
    } catch (err) {
      console.error('Outbound queue failed:', err instanceof Error ? err.message : err);
    }

    // 1b. Also write to Notion Message Queue (backwards compatibility for stations not yet on direct polling)
    let notionPageId: string | null = null;
    try {
      const result = await createPage(NOTION_DBS.MESSAGE_QUEUE, {
        'Message': { title: [{ text: { content: message } }] },
        'Contact Phone': { phone_number: `+1${n10}` },
        'Contact Name': { rich_text: [{ text: { content: contactName || '' } }] },
        'Station': { select: { name: station.name } },
        'Status': { select: { name: 'Queued' } },
        'Direction': { select: { name: 'Outbound' } },
        'Company': { rich_text: [{ text: { content: 'FraternityBase' } }] },
      });
      if (result.ok) notionPageId = result.pageId;
    } catch (err) {
      console.error('Notion write failed:', err instanceof Error ? err.message : err);
    }

    // 2. Find or create contact in Supabase (shared utility)
    const contactId = await findOrCreateContact(supabase, {
      phone: phoneNumber,
      full_name: contactName || undefined,
      source: 'conversation',
      source_system: system,
      organization_id: organizationId,
    });

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

    // 4. Create message record
    let messageId: string | null = null;
    if (convId) {
      const { data: msg } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          direction: 'outbound',
          body: message,
          status: 'queued',
          ai_generated: false,
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
      notionQueued: !!notionPageId,
      station: { name: station.name, phone: station.phone_number, status: station.status },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send' }, { status: 500 });
  }
}
