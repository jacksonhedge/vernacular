import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/auth';

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1 (${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return phone;
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

    // Get messages for each conversation by matching contact_phone
    // The messages table uses: id, message, contact_phone, direction, station, status, source_system, sent_at, created_at
    const contactPhones = [...new Set(Object.values(contactMap).map(c => c.phone).filter(Boolean))];
    const { data: messages } = contactPhones.length > 0
      ? await supabase
          .from('messages')
          .select('id, direction, message, status, source_system, sent_at, created_at, contact_phone, station')
          .in('contact_phone', contactPhones)
          .order('created_at', { ascending: true })
          .limit(500)
      : { data: [] as Array<{ id: string; direction: string; message: string; status: string; source_system: string; sent_at: string; created_at: string; contact_phone: string; station: string }> };

    // Build a lookup: contact_phone -> contact_id
    const phoneToContactId: Record<string, string> = {};
    Object.entries(contactMap).forEach(([cid, c]) => { if (c.phone) phoneToContactId[c.phone] = cid; });

    // Build a lookup: contact_id -> conversation_id
    const contactIdToConvId: Record<string, string> = {};
    conversations.forEach(conv => { if (conv.contact_id) contactIdToConvId[conv.contact_id] = conv.id; });

    const messagesByConv: Record<string, Array<{
      id: string; text: string; direction: string; timestamp: string; status: string; isAIDraft: boolean;
    }>> = {};

    (messages || []).forEach(m => {
      const contactId = phoneToContactId[m.contact_phone];
      const convId = contactId ? contactIdToConvId[contactId] : undefined;
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
