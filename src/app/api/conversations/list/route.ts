import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get all conversations for this org's stations
    const { data: stations } = await supabase
      .from('stations').select('id').eq('organization_id', orgId);

    if (!stations || stations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const stationIds = stations.map(s => s.id);

    // Fetch conversations with contact info
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, station_id, contact_id, status, last_message_at, last_message_preview, unread_count')
      .in('station_id', stationIds)
      .order('last_message_at', { ascending: false })
      .limit(20);

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Get contact details
    const contactIds = [...new Set(conversations.map(c => c.contact_id).filter(Boolean))];
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, phone, full_name, email, company, tags')
      .in('id', contactIds);

    const contactMap: Record<string, { phone: string; full_name: string; email: string; company: string; tags: string[] }> = {};
    (contacts || []).forEach(c => { contactMap[c.id] = c; });

    // Get messages for each conversation
    const convIds = conversations.map(c => c.id);
    const { data: messages } = await supabase
      .from('messages')
      .select('id, conversation_id, direction, body, status, ai_generated, created_at, sent_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true })
      .limit(500);

    const messagesByConv: Record<string, Array<{
      id: string; text: string; direction: string; timestamp: string; status: string; isAIDraft: boolean;
    }>> = {};

    (messages || []).forEach(m => {
      if (!messagesByConv[m.conversation_id]) messagesByConv[m.conversation_id] = [];
      const time = m.sent_at || m.created_at;
      messagesByConv[m.conversation_id].push({
        id: m.id,
        text: m.body,
        direction: m.direction === 'outbound' ? 'outgoing' : 'incoming',
        timestamp: time ? new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
        status: m.status,
        isAIDraft: m.ai_generated,
      });
    });

    // Build response
    const result = conversations.map(conv => {
      const contact = contactMap[conv.contact_id];
      const name = contact?.full_name?.trim() || contact?.phone || 'Unknown';
      const initials = name.startsWith('+') || name.match(/^\d/)
        ? '##'
        : name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

      return {
        conversationId: conv.id,
        contact: {
          id: conv.contact_id,
          name,
          initials,
          phone: contact?.phone || '',
          email: contact?.email || '',
          company: contact?.company || '',
          tags: contact?.tags || [],
        },
        status: conv.status,
        lastMessageAt: conv.last_message_at,
        lastMessagePreview: conv.last_message_preview,
        unreadCount: conv.unread_count || 0,
        messages: messagesByConv[conv.id] || [],
      };
    });

    return NextResponse.json({ conversations: result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to fetch' }, { status: 500 });
  }
}
