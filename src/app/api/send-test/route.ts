import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { phoneNumber, organizationId } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Normalize phone number
    const normalized = phoneNumber.replace(/\D/g, '');
    if (normalized.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Find an available online station (prefer the org's station, fallback to any)
    let station;
    if (organizationId) {
      const { data } = await supabase
        .from('stations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('status', { ascending: false }) // online first
        .limit(1);
      station = data?.[0];
    }

    if (!station) {
      // Fallback: any station
      const { data } = await supabase
        .from('stations')
        .select('*')
        .order('status', { ascending: false })
        .limit(1);
      station = data?.[0];
    }

    if (!station) {
      return NextResponse.json({ error: 'No stations available' }, { status: 503 });
    }

    // Create a test conversation + message in the database
    // The station runner will pick this up and send via iMessage
    const testMessage = `Hey! This is a test from Vernacular. Your iMessage CRM is ready to go. 💬\n\nSent from your Vernacular number: ${station.phone_number}`;

    // Find or create contact
    let contactId: string | null = null;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', phoneNumber)
      .limit(1);

    if (existingContact && existingContact.length > 0) {
      contactId = existingContact[0].id;
    } else {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({ phone: phoneNumber, source: 'test-message', import_source: 'test' })
        .select('id')
        .single();
      contactId = newContact?.id || null;
    }

    // Create conversation
    const { data: conv } = await supabase
      .from('conversations')
      .insert({
        station_id: station.id,
        contact_id: contactId,
        status: 'active',
        last_message_at: new Date().toISOString(),
        last_message_preview: testMessage.substring(0, 100),
        unread_count: 0,
        flagged: false,
      })
      .select('id')
      .single();

    // Create the outbound message
    if (conv) {
      await supabase.from('messages').insert({
        conversation_id: conv.id,
        direction: 'outbound',
        body: testMessage,
        status: 'queued',
        ai_generated: false,
        sent_at: null,
      });
    }

    return NextResponse.json({
      success: true,
      stationName: station.name,
      stationPhone: station.phone_number,
      message: 'Test message queued! Check your phone for a blue iMessage.',
      note: station.status === 'offline'
        ? 'Station is currently offline. Message will be sent when the station comes online.'
        : 'Message is being sent now.',
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send test' }, { status: 500 });
  }
}
