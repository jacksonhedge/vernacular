import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyEngineKey } from '@/lib/engine-auth';

// GET /api/engine/poll?station_id=xxx — Get pending outbound messages
// Returns messages with status 'sending' or scheduled messages whose send_at has passed
export async function GET(req: NextRequest) {
  try {
    const engineKey = await verifyEngineKey(req);
    if (!engineKey) {
      return NextResponse.json({ error: 'Invalid engine key' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const stationId = searchParams.get('station_id');

    if (!stationId) {
      return NextResponse.json(
        { error: 'station_id is required' },
        { status: 400 }
      );
    }

    // Verify station belongs to this org
    const supabase = createServiceClient();

    const { data: station } = await supabase
      .from('stations')
      .select('id, org_id')
      .eq('id', stationId)
      .eq('org_id', engineKey.org_id)
      .single();

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found or does not belong to this org' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Get messages that are ready to send:
    // 1. Status is 'sending' (queued for immediate send)
    // 2. Status is 'scheduled' and send_at has passed
    const { data: readyToSend, error: sendingError } = await supabase
      .from('messages')
      .select(`
        *,
        conversations (
          id,
          contacts (id, phone, first_name, last_name)
        )
      `)
      .eq('station_id', stationId)
      .eq('direction', 'outbound')
      .eq('status', 'sending')
      .order('created_at', { ascending: true })
      .limit(20);

    const { data: scheduled, error: scheduledError } = await supabase
      .from('messages')
      .select(`
        *,
        conversations (
          id,
          contacts (id, phone, first_name, last_name)
        )
      `)
      .eq('station_id', stationId)
      .eq('direction', 'outbound')
      .eq('status', 'scheduled')
      .lte('send_at', now)
      .order('send_at', { ascending: true })
      .limit(20);

    if (sendingError || scheduledError) {
      return NextResponse.json(
        { error: sendingError?.message || scheduledError?.message },
        { status: 500 }
      );
    }

    const messages = [...(readyToSend || []), ...(scheduled || [])];

    // Mark these messages as 'in_flight' so they don't get picked up again
    const messageIds = messages.map((m) => m.id);
    if (messageIds.length > 0) {
      await supabase
        .from('messages')
        .update({ status: 'in_flight' })
        .in('id', messageIds);
    }

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('GET /api/engine/poll error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
