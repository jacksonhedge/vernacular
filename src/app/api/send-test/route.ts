import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { Client } from '@notionhq/client';
import { stripPhone, normalize10, formatPhone, phoneOrFilter } from '@/lib/phone';

const NOTION_TOKEN = process.env.NOTION_TOKEN || 'ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw';
const MESSAGE_QUEUE_DB = 'db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956';

export async function POST(request: Request) {
  try {
    const { phoneNumber, organizationId, contactName, message: customMessage } = await request.json();

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
      const notion = new Client({ auth: NOTION_TOKEN });
      const notionPage = await notion.pages.create({
        parent: { database_id: MESSAGE_QUEUE_DB },
        properties: {
          'Message': { title: [{ text: { content: testMessage } }] },
          'Contact Phone': { phone_number: `+1${n10}` },
          'Contact Name': { rich_text: [{ text: { content: contactName || 'Test User' } }] },
          'Station': { select: { name: station.name } },
          'Status': { select: { name: 'Queued' } },
          'Direction': { select: { name: 'Outbound' } },
          'Company': { rich_text: [{ text: { content: 'FraternityBase' } }] },
        },
      });
      notionPageId = notionPage.id;
    } catch (notionErr) {
      console.error('Notion write failed:', notionErr instanceof Error ? notionErr.message : notionErr);
      // Continue — still write to Supabase as fallback
    }

    // 2. Also write to Supabase (for dashboard tracking)
    let contactId: string | null = null;
    const { data: existingContact } = await supabase
      .from('contacts').select('id').or(phoneOrFilter(phoneNumber)).limit(1);

    if (existingContact && existingContact.length > 0) {
      contactId = existingContact[0].id;
    } else {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({ phone: formattedPhone, full_name: contactName || null, source: 'test-message', import_source: 'test' })
        .select('id').single();
      contactId = newContact?.id || null;
    }

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
        conversation_id: conv.id, direction: 'outbound', body: testMessage,
        status: 'queued', ai_generated: false, sent_at: null,
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
