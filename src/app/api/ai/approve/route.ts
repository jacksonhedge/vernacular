import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createPage, NOTION_DBS } from '@/lib/notion';
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
      const updateData: Record<string, unknown> = { status: 'queued' };
      if (finalText) updateData.body = finalText;

      await supabase.from('messages').update(updateData).eq('id', messageId);

      // Get the message text for Notion
      const { data: msg } = await supabase
        .from('messages').select('body').eq('id', messageId).single();

      const messageText = finalText || msg?.body || '';

      // Queue to Notion for Wade to send
      if (contactPhone) {
        const n10 = normalize10(contactPhone);
        await createPage(NOTION_DBS.MESSAGE_QUEUE, {
          'Message': { title: [{ text: { content: messageText } }] },
          'Contact Phone': { phone_number: `+1${n10}` },
          'Contact Name': { rich_text: [{ text: { content: contactName || '' } }] },
          'Station': { select: { name: 'Wade' } },
          'Status': { select: { name: 'Queued' } },
          'Direction': { select: { name: 'Outbound' } },
        });
      }

      return NextResponse.json({
        success: true,
        action,
        messageId,
        status: 'queued_for_send',
      });
    } else if (action === 'reject') {
      // Mark as rejected
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
