import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/engine/confirm-sent
// Station calls this after sending a message via AppleScript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Support both field names: queueId (API) and messageId (Wade's outbound.sh)
    const queueId = body.queueId || body.messageId;
    const status = body.status || (body.success ? 'sent' : 'failed');
    const errorMsg = body.error || '';

    if (!queueId) {
      return NextResponse.json({ error: 'queueId or messageId required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const isSent = status === 'sent';

    // Update outbound_queue
    await supabase
      .from('outbound_queue')
      .update({
        status: isSent ? 'sent' : 'failed',
        ...(isSent ? { sent_at: new Date().toISOString() } : { error: errorMsg || 'Unknown error' }),
      })
      .eq('id', queueId);

    // Also update the messages table — find by queue's message_id
    const { data: queueRow } = await supabase
      .from('outbound_queue')
      .select('message_id')
      .eq('id', queueId)
      .single();

    if (queueRow?.message_id) {
      await supabase
        .from('messages')
        .update({ status: isSent ? 'Sent' : 'Failed' })
        .eq('id', queueRow.message_id);
    }

    console.log(`[engine] ${isSent ? '✅' : '❌'} Message ${queueId} ${isSent ? 'confirmed sent' : `failed: ${errorMsg}`}`);

    return NextResponse.json({ ok: true, queueId, status: isSent ? 'sent' : 'failed' });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
