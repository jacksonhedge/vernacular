import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyEngineKey } from '@/lib/engine-auth';

// POST /api/engine/heartbeat — Called by local engine every 3 seconds
// Body: { runner_name, station_id }
export async function POST(req: NextRequest) {
  try {
    const engineKey = await verifyEngineKey(req);
    if (!engineKey) {
      return NextResponse.json({ error: 'Invalid engine key' }, { status: 401 });
    }

    const body = await req.json();
    const { runner_name, station_id } = body;

    if (!station_id) {
      return NextResponse.json(
        { error: 'station_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const now = new Date().toISOString();

    // Verify station belongs to this org
    const { data: station } = await supabase
      .from('stations')
      .select('id, org_id')
      .eq('id', station_id)
      .eq('org_id', engineKey.org_id)
      .single();

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found or does not belong to this org' },
        { status: 404 }
      );
    }

    // Update station heartbeat and status
    await supabase
      .from('stations')
      .update({
        last_heartbeat: now,
        status: 'online',
      })
      .eq('id', station_id);

    // Upsert runner record
    if (runner_name) {
      const { data: existingRunner } = await supabase
        .from('runners')
        .select('id')
        .eq('station_id', station_id)
        .eq('name', runner_name)
        .maybeSingle();

      if (existingRunner) {
        await supabase
          .from('runners')
          .update({ last_heartbeat: now, status: 'online' })
          .eq('id', existingRunner.id);
      } else {
        await supabase
          .from('runners')
          .insert({
            station_id,
            name: runner_name,
            last_heartbeat: now,
            status: 'online',
          });
      }
    }

    return NextResponse.json({ ok: true, timestamp: now });
  } catch (err) {
    console.error('POST /api/engine/heartbeat error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
