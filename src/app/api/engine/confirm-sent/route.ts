import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/engine/confirm-sent
// Station calls this after sending a message via AppleScript
export async function POST(request: Request) {
  try {
    const { queueId, success, error: errorMsg } = await request.json();

    if (!queueId) {
      return NextResponse.json({ error: 'queueId required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    if (success) {
      await supabase
        .from('outbound_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', queueId);

      console.log(`[engine] ✅ Message ${queueId} confirmed sent`);
    } else {
      await supabase
        .from('outbound_queue')
        .update({
          status: 'failed',
          error: errorMsg || 'Unknown error',
        })
        .eq('id', queueId);

      console.log(`[engine] ❌ Message ${queueId} failed: ${errorMsg}`);
    }

    return NextResponse.json({ ok: true, queueId, status: success ? 'sent' : 'failed' });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
