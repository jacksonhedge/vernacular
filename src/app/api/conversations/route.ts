import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/auth';

// GET /api/conversations — List conversations for user's org
// Query params: station_id, status, limit, offset
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const stationId = searchParams.get('station_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = createServiceClient();

    let query = supabase
      .from('conversations')
      .select(`
        *,
        contacts (id, phone, first_name, last_name, email),
        stations (id, name, phone_number)
      `)
      .eq('org_id', user.org_id)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (stationId) {
      query = query.eq('station_id', stationId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: conversations, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch last message for each conversation
    const conversationIds = (conversations || []).map((c) => c.id);
    let lastMessages: Record<string, unknown> = {};

    if (conversationIds.length > 0) {
      // Get the latest message per conversation using a subquery approach
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('sent_at', { ascending: false });

      if (messages) {
        // Group by conversation_id, take the first (most recent)
        for (const msg of messages) {
          if (!lastMessages[msg.conversation_id]) {
            lastMessages[msg.conversation_id] = msg;
          }
        }
      }
    }

    const enriched = (conversations || []).map((conv) => ({
      ...conv,
      last_message: lastMessages[conv.id] || null,
    }));

    return NextResponse.json({ conversations: enriched });
  } catch (err) {
    console.error('GET /api/conversations error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
