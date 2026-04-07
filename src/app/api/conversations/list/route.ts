import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1 (${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return phone;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const supabase = createServiceClient();

    // Get all stations for this org
    const { data: stations } = await supabase
      .from('stations').select('id').eq('organization_id', orgId);

    if (!stations || stations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const stationIds = stations.map(s => s.id);

    // Fetch conversations sorted by most recent
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, station_id, contact_id, status, last_message_at, last_message_preview, unread_count, ai_mode, goal')
      .in('station_id', stationIds)
      .order('last_message_at', { ascending: false })
      .limit(50);

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

    // Get messages for these conversations directly by conversation_id
    const convIds = conversations.map(c => c.id);
    const { data: messages } = await supabase
      .from('messages')
      .select('id, direction, message, status, source_system, sent_at, created_at, conversation_id')
      .in('conversation_id', convIds)
      .order('sent_at', { ascending: true, nullsFirst: true });

    // Group messages by conversation
    const messagesByConv: Record<string, Array<{
      id: string; text: string; direction: string; timestamp: string; status: string; isAIDraft: boolean;
    }>> = {};

    (messages || []).forEach(m => {
      if (!m.conversation_id) return;
      if (!messagesByConv[m.conversation_id]) messagesByConv[m.conversation_id] = [];
      const time = m.sent_at || m.created_at;
      const dir = (m.direction || '').toLowerCase();
      messagesByConv[m.conversation_id].push({
        id: m.id,
        text: m.message || '',
        direction: dir === 'outbound' ? 'outgoing' : 'incoming',
        timestamp: time ? new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
        status: m.status,
        isAIDraft: m.source_system === 'vernacular-ai' && (m.status === 'Draft' || m.status === 'draft'),
      });
    });

    // Build response
    const result = conversations.map(conv => {
      const contact = contactMap[conv.contact_id];
      const rawName = contact?.full_name?.trim();
      const name = rawName || (contact?.phone ? formatPhone(contact.phone) : 'Unknown');
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
        aiMode: conv.ai_mode || 'off',
        goal: conv.goal || '',
        messages: messagesByConv[conv.id] || [],
      };
    });

    return NextResponse.json({ conversations: result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to fetch' }, { status: 500 });
  }
}
