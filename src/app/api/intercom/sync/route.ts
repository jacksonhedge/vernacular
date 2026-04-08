import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { intercomAPI } from '@/lib/intercom';

// POST /api/intercom/sync — Push conversation notes back to Intercom
export async function POST(request: Request) {
  try {
    const { conversation_id, embed_token } = await request.json();

    if (!conversation_id || !embed_token) {
      return NextResponse.json({ error: 'conversation_id and embed_token required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get conversation
    const { data: conv } = await supabase
      .from('widget_conversations')
      .select('id, intercom_conversation_id, message_count, resolution_method, status, created_at, resolved_at')
      .eq('id', conversation_id)
      .single();

    if (!conv?.intercom_conversation_id) {
      return NextResponse.json({ error: 'No Intercom conversation linked' }, { status: 404 });
    }

    // Get config with access token
    const { data: config } = await supabase
      .from('widget_configs')
      .select('intercom_access_token, intercom_admin_id, intercom_tag_id, client_name')
      .eq('embed_token', embed_token)
      .single();

    if (!config?.intercom_access_token) {
      return NextResponse.json({ error: 'Intercom not connected' }, { status: 400 });
    }

    const accessToken = config.intercom_access_token;
    const adminId = config.intercom_admin_id;

    // Calculate duration
    const start = new Date(conv.created_at).getTime();
    const end = conv.resolved_at ? new Date(conv.resolved_at).getTime() : Date.now();
    const durationMin = Math.round((end - start) / 60000);

    // Post note to Intercom conversation
    if (adminId) {
      const noteBody = `<p><strong>Continued via iMessage through Vernacular</strong></p>
<p>Messages exchanged: ${conv.message_count || 0}</p>
<p>Resolution: ${conv.resolution_method || 'pending'}</p>
<p>Duration: ${durationMin} minutes</p>`;

      await intercomAPI(accessToken, `/conversations/${conv.intercom_conversation_id}/reply`, {
        method: 'POST',
        body: {
          message_type: 'note',
          type: 'admin',
          admin_id: adminId,
          body: noteBody,
        },
      });
    }

    // Tag the conversation (find or create tag)
    let tagId = config.intercom_tag_id;
    if (!tagId) {
      // Create the tag
      const tagRes = await intercomAPI(accessToken, '/tags', {
        method: 'POST',
        body: { name: 'vernacular-imessage' },
      });
      tagId = tagRes.id as string;
      if (tagId) {
        await supabase.from('widget_configs')
          .update({ intercom_tag_id: tagId })
          .eq('embed_token', embed_token);
      }
    }

    if (tagId) {
      await intercomAPI(accessToken, `/conversations/${conv.intercom_conversation_id}/tags`, {
        method: 'POST',
        body: { id: tagId },
      });
    }

    return NextResponse.json({ synced: true });
  } catch (err) {
    console.error('[Intercom sync]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Sync failed' }, { status: 500 });
  }
}
