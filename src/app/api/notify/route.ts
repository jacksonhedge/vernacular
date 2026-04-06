import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { subject, body, type = 'signup', recipient = 'jacksonfitzgerald25@gmail.com', metadata = {} } = await request.json();

    if (!subject || !body) {
      return NextResponse.json({ error: 'Missing subject or body' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('notifications')
      .insert({ type, subject, body, recipient, metadata })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert notification:', error.message);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET — fetch notifications (unread first, most recent)
export async function GET(request: NextRequest) {
  try {
    // Auth optional — dashboard doesn't send Bearer token
    void request;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = createServiceClient();

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notifications: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    void request;

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Missing ids array' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
