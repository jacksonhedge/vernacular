import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// Simple heartbeat endpoint — no auth required
// Wade calls: POST https://vernacular.chat/api/engine/ping { "station": "Wade" }
export async function POST(request: Request) {
  try {
    const { station } = await request.json();
    if (!station) {
      return NextResponse.json({ error: 'station name required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('stations')
      .update({ status: 'online', last_heartbeat: now })
      .eq('name', station);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, station, timestamp: now });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'vernacular-ping' });
}
