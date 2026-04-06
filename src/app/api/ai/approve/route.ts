import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { normalize10 } from '@/lib/phone';

// POST /api/ai/approve — Approve, edit, or reject an AI draft
export async function POST(request: Request) {
  try {
    const { messageId, action, editedText, contactPhone, contactName } = await request.json();

    if (!messageId || !action) {
      return NextResponse.json({ error: 'messageId and action required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    if (action === 'approve' || action === 'edit') {
      const finalText = action === 'edit' ? editedText : undefined;

      // Update message status to queued
      const updateData: Record<string, unknown> = { status: 'Queued' };
      if (finalText) updateData.message = finalText;

      await supabase.from('messages').update(updateData).eq('id', messageId);

      // Queue to outbound_queue for Wade to pick up via direct polling
      if (contactPhone) {
        const n10 = normalize10(contactPhone);
        const { data: msg } = await supabase
          .from('messages').select('message').eq('id', messageId).single();
        const messageText = finalText || msg?.message || '';

        await supabase.from('outbound_queue').insert({
          station_name: 'Wade',
          contact_phone: `+1${n10}`,
          contact_name: contactName || null,
          message: messageText,
          source_system: 'vernacular-ai',
        });
      }

      return NextResponse.json({
        success: true,
        action,
        messageId,
        status: 'queued_for_send',
      });
    } else if (action === 'reject') {
      await supabase.from('messages')
        .update({ status: 'rejected' })
        .eq('id', messageId);

      return NextResponse.json({
        success: true,
        action: 'rejected',
        messageId,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use: approve, edit, reject' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}
