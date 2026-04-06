import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/engine/poll-outbound?station=Wade
// Stations call this every 5 seconds to get messages to send
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const station = searchParams.get('station') || 'Wade';

    const supabase = createServiceClient();

    // Get queued messages for this station
    const { data: messages, error } = await supabase
      .from('outbound_queue')
      .select('*')
      .eq('station_name', station)
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark them as 'sending' so they don't get picked up again
    if (messages && messages.length > 0) {
      const ids = messages.map(m => m.id);
      await supabase
        .from('outbound_queue')
        .update({ status: 'sending' })
        .in('id', ids);
    }

    return NextResponse.json({
      ok: true,
      station,
      count: messages?.length || 0,
      messages: (messages || []).map(m => ({
        id: m.id,
        phone: m.contact_phone,
        name: m.contact_name,
        message: m.message,
        aiGenerated: m.ai_generated,
        sourceSystem: m.source_system,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
