import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { Client } from '@notionhq/client';

const NOTION_TOKEN = process.env.NOTION_TOKEN || 'ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw';
const MESSAGE_QUEUE_DB = 'db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956';

export async function POST(request: Request) {
  try {
    const { phoneNumber, message, contactName, organizationId, conversationId } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json({ error: 'phoneNumber and message are required' }, { status: 400 });
    }

    const normalized = phoneNumber.replace(/\D/g, '');
    if (normalized.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

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
      const notion = new Client({ auth: NOTION_TOKEN });
      const page = await notion.pages.create({
        parent: { database_id: MESSAGE_QUEUE_DB },
        properties: {
          'Message': { title: [{ text: { content: message } }] },
          'Contact Phone': { phone_number: normalized.length === 10 ? `+1${normalized}` : `+${normalized}` },
          'Contact Name': { rich_text: [{ text: { content: contactName || '' } }] },
          'Station': { select: { name: station.name } },
          'Status': { select: { name: 'Queued' } },
          'Direction': { select: { name: 'Outbound' } },
          'Company': { rich_text: [{ text: { content: 'FraternityBase' } }] },
        },
      });
      notionPageId = page.id;
    } catch (err) {
      console.error('Notion write failed:', err instanceof Error ? err.message : err);
    }

    // 2. Find or create contact in Supabase
    let contactId: string | null = null;
    // Normalize: try raw, digits-only, +1 prefix, and formatted variants
    const n10 = normalized.length === 11 && normalized.startsWith('1') ? normalized.slice(1) : normalized;
    const formatted = n10.length === 10 ? `(${n10.slice(0,3)}) ${n10.slice(3,6)}-${n10.slice(6)}` : '';
    const searchVariants = [
      phoneNumber, normalized, `+1${n10}`, `+1 ${formatted}`,
      formatted, `1${n10}`, `+${normalized}`,
    ].filter(Boolean);
    const { data: existingContacts } = await supabase
      .from('contacts').select('id, full_name')
      .or(searchVariants.map(v => `phone.eq.${v}`).join(','))
      .limit(1);

    if (existingContacts && existingContacts.length > 0) {
      contactId = existingContacts[0].id;
    } else {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          phone: formatted || phoneNumber,
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
