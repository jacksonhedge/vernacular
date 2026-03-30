import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/auth';

// GET /api/messages — List messages for a conversation
// Query params: conversation_id (required), limit, offset
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversation_id');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify the conversation belongs to user's org
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, org_id')
      .eq('id', conversationId)
      .single();

    if (!conversation || conversation.org_id !== user.org_id) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark conversation as read for this user
    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('GET /api/messages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/messages — Send a new message
// Body: { conversation_id, body, schedule_for? }
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const { conversation_id, body: messageBody, schedule_for } = body;

    if (!conversation_id || !messageBody) {
      return NextResponse.json(
        { error: 'conversation_id and body are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify conversation belongs to user's org
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, org_id, station_id, contact_id')
      .eq('id', conversation_id)
      .single();

    if (!conversation || conversation.org_id !== user.org_id) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check for opt-outs
    const { data: optOut } = await supabase
      .from('opt_outs')
      .select('id')
      .eq('contact_id', conversation.contact_id)
      .eq('org_id', user.org_id)
      .is('opted_back_in_at', null)
      .maybeSingle();

    if (optOut) {
      return NextResponse.json(
        { error: 'Contact has opted out of messages' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const sendAt = schedule_for || now;
    const status = schedule_for ? 'scheduled' : 'sending';

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        station_id: conversation.station_id,
        direction: 'outbound',
        body: messageBody,
        status,
        send_at: sendAt,
        sent_at: null,
        sent_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: now })
      .eq('id', conversation_id);

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    console.error('POST /api/messages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
