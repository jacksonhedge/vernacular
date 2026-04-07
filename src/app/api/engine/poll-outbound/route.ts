import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/engine/poll-outbound?station=Wade
// Stations call this every 5 seconds to get messages to send
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const station = searchParams.get('station') || 'Wade';

    const supabase = createServiceClient();

    // Atomically claim queued messages: set status='sending' and return them
    // Only pick up messages with status='Queued' (case-insensitive) and send_attempts=0
    const { data: messages, error } = await supabase
      .from('outbound_queue')
      .select('*')
      .eq('station_name', station)
      .in('status', ['queued', 'Queued'])
      .eq('send_attempts', 0)
      .order('created_at', { ascending: true })
      .limit(5);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark them as 'sending' and increment send_attempts so they can't be picked up again
    if (messages && messages.length > 0) {
      const ids = messages.map(m => m.id);
      await supabase
        .from('outbound_queue')
        .update({ status: 'sending', send_attempts: 1 })
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
