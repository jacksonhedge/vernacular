import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1 (${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return phone;
}

// Normalize phone to last 10 digits for matching
function normDigits(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.length === 11 && d[0] === '1' ? d.slice(1) : d;
}

export async function GET(request: NextRequest) {
  try {
    // Auth via orgId param — dashboard doesn't send Bearer token
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

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

    // Get ALL recent messages then match by normalized phone digits
    // Messages use +15865223609 format, contacts use (586) 522-3609 format
    const { data: messages } = await supabase
      .from('messages')
      .select('id, direction, message, status, source_system, sent_at, created_at, contact_phone, station, conversation_id')
      .order('created_at', { ascending: true })
      .limit(500);

    // Build a lookup: normalized phone digits -> contact_id
    const phoneToContactId: Record<string, string> = {};
    Object.entries(contactMap).forEach(([cid, c]) => { if (c.phone) phoneToContactId[normDigits(c.phone)] = cid; });

    // Build a lookup: contact_id -> conversation_id
    const contactIdToConvId: Record<string, string> = {};
    conversations.forEach(conv => { if (conv.contact_id) contactIdToConvId[conv.contact_id] = conv.id; });

    const messagesByConv: Record<string, Array<{
      id: string; text: string; direction: string; timestamp: string; status: string; isAIDraft: boolean;
    }>> = {};

    (messages || []).forEach(m => {
      // First try conversation_id directly, then fall back to phone matching
      let convId: string | undefined;
      if (m.conversation_id && contactIdToConvId) {
        // Check if this conversation_id is one we're tracking
        const allConvIds = new Set(Object.values(contactIdToConvId));
        if (allConvIds.has(m.conversation_id)) convId = m.conversation_id;
      }
      if (!convId) {
        const contactId = m.contact_phone ? phoneToContactId[normDigits(m.contact_phone)] : undefined;
        convId = contactId ? contactIdToConvId[contactId] : undefined;
      }
      if (!convId) return;
      if (!messagesByConv[convId]) messagesByConv[convId] = [];
      const time = m.sent_at || m.created_at;
      messagesByConv[convId].push({
        id: m.id,
        text: m.message || '',
        direction: m.direction === 'outbound' ? 'outgoing' : 'incoming',
        timestamp: time ? new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
        status: m.status,
        isAIDraft: m.source_system === 'ai',
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
        messages: messagesByConv[conv.id] || [],
      };
    });

    return NextResponse.json({ conversations: result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to fetch' }, { status: 500 });
  }
}
