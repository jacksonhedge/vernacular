import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { stripPhone, normalize10, formatPhone } from '@/lib/phone';
import { findOrCreateContact } from '@/lib/contacts';
import { createPage, NOTION_DBS } from '@/lib/notion';

export async function POST(request: Request) {
  try {
    const { phoneNumber, organizationId, contactName, message: customMessage } = await request.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId required' }, { status: 400 });
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const normalized = stripPhone(phoneNumber);
    const n10 = normalize10(phoneNumber);
    const formattedPhone = formatPhone(phoneNumber);
    if (normalized.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Find station with a real phone number (prefer online, then by phone number)
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

    const testMessage = customMessage || `Hey! This is a test from Vernacular. Your iMessage CRM is ready to go. 💬\n\nSent from your Vernacular number: ${station.phone_number}`;

    // 1. Write to Notion Message Queue (Wade listens to this)
    let notionPageId: string | null = null;
    try {
      const result = await createPage(NOTION_DBS.MESSAGE_QUEUE, {
        'Message': { title: [{ text: { content: testMessage } }] },
        'Contact Phone': { phone_number: `+1${n10}` },
        'Contact Name': { rich_text: [{ text: { content: contactName || 'Test User' } }] },
        'Station': { select: { name: station.name } },
        'Status': { select: { name: 'Queued' } },
        'Direction': { select: { name: 'Outbound' } },
        'Company': { rich_text: [{ text: { content: 'FraternityBase' } }] },
      });
      if (result.ok) notionPageId = result.pageId;
    } catch (notionErr) {
      console.error('Notion write failed:', notionErr instanceof Error ? notionErr.message : notionErr);
    }

    // 2. Also write to Supabase (for dashboard tracking)
    const contactId = await findOrCreateContact(supabase, {
      phone: phoneNumber,
      full_name: contactName || undefined,
      source: 'test-message',
      import_source: 'test',
      organization_id: organizationId,
    });

    const { data: conv } = await supabase
      .from('conversations')
      .insert({
        station_id: station.id, contact_id: contactId, status: 'active',
        last_message_at: new Date().toISOString(),
        last_message_preview: testMessage.substring(0, 100),
        unread_count: 0, flagged: false,
      })
      .select('id').single();

    if (conv) {
      await supabase.from('messages').insert({
        conversation_id: conv.id, direction: 'Outbound', message: testMessage,
        contact_phone: `+1${n10}`, station: station.name,
        status: 'Queued', source_system: 'test',
      });
    }

    return NextResponse.json({
      success: true,
      stationName: station.name,
      stationPhone: station.phone_number,
      message: 'Test message queued! Check your phone for a blue iMessage.',
      notionQueued: !!notionPageId,
      note: 'Message sent to Notion Message Queue. Wade will pick it up within 60 seconds.',
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send test' }, { status: 500 });
  }
}
