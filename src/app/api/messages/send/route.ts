import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { stripPhone, normalize10, formatPhone, phoneOrFilter } from '@/lib/phone';
import { createPage, NOTION_DBS } from '@/lib/notion';

// Notion config now in @/lib/notion

export async function POST(request: Request) {
  try {
    const { phoneNumber, message, contactName, organizationId, conversationId, sourceSystem } = await request.json();
    const system = sourceSystem || 'vernacular-web';

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

    // 1. Write to Notion Message Queue
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

    // 2. Find or create contact in Supabase
    let contactId: string | null = null;
    // Use ilike on last 7 digits — most reliable across all phone formats
    const last7 = n10.slice(-7);
    const { data: existingContacts } = await supabase
      .from('contacts').select('id, full_name')
      .ilike('phone', `%${last7}%`)
      .limit(1);

    if (existingContacts && existingContacts.length > 0) {
      contactId = existingContacts[0].id;
    } else {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          phone: formattedPhone,
          full_name: contactName || null,
          source: 'conversation',
          import_source: 'conversation',
        })
        .select('id').single();
      contactId = newContact?.id || null;
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
