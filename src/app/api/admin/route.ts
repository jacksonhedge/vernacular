import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vernacular-admin-2026';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Fetch all platform data
    const [
      orgsRes, usersRes, stationsRes, signupsRes, integrationsRes,
      settingsRes, messagesRes, recentMsgsRes, conversationsRes
    ] = await Promise.all([
      supabase.from('organizations').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('stations').select('*').order('created_at', { ascending: false }),
      supabase.from('signup_events').select('*').order('created_at', { ascending: false }),
      supabase.from('org_integrations').select('*'),
      supabase.from('org_settings').select('*'),
      // All messages for counts
      supabase.from('messages').select('id, direction, status, ai_generated, sent_at, conversation_id').order('sent_at', { ascending: false }).limit(5000),
      // Recent messages with body for feed
      supabase.from('messages').select('id, direction, body, status, ai_generated, sent_at, conversation_id, created_at').order('sent_at', { ascending: false }).limit(100),
      // Conversations with contact info
      supabase.from('conversations').select('id, station_id, contact_id, status, last_message_at').order('last_message_at', { ascending: false }),
    ]);

    // Contact and total counts
    const [contactCountRes, totalMsgCountRes, totalConvCountRes] = await Promise.all([
      supabase.from('contacts').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
    ]);

    // Contacts for message feed (get phone/name for contact_ids in recent conversations)
    const convData = conversationsRes.data || [];
    const contactIds = [...new Set(convData.map(c => c.contact_id).filter(Boolean))];
    let contactsMap: Record<string, { phone: string; full_name: string }> = {};
    if (contactIds.length > 0) {
      const { data: contacts } = await supabase.from('contacts').select('id, phone, full_name').in('id', contactIds.slice(0, 200));
      if (contacts) {
        contacts.forEach(c => { contactsMap[c.id] = { phone: c.phone, full_name: c.full_name }; });
      }
    }

    const allMessages = messagesRes.data || [];
    const todayMessages = allMessages.filter(m => m.sent_at && new Date(m.sent_at) >= todayStart);

    // Compute stats
    const outboundMessages = allMessages.filter(m => m.direction === 'outbound');
    const inboundMessages = allMessages.filter(m => m.direction === 'inbound');
    const aiMessages = allMessages.filter(m => m.ai_generated);

    // Build conversation-to-station map for enriching messages
    const convStationMap: Record<string, string> = {};
    const convContactMap: Record<string, string> = {};
    convData.forEach(c => {
      convStationMap[c.id] = c.station_id;
      convContactMap[c.id] = c.contact_id;
    });

    // Per-station today counts (via conversation -> station_id)
    const stationMsgToday: Record<string, number> = {};
    todayMessages.forEach(m => {
      const stationId = convStationMap[m.conversation_id];
      if (stationId) {
        stationMsgToday[stationId] = (stationMsgToday[stationId] || 0) + 1;
      }
    });

    // Enrich recent messages with contact phone and station info
    const stationsData = stationsRes.data || [];
    const stationOrgMap: Record<string, string> = {};
    stationsData.forEach(s => { stationOrgMap[s.id] = s.organization_id; });

    const enrichedMessages = (recentMsgsRes.data || []).map(msg => {
      const stationId = convStationMap[msg.conversation_id];
      const contactId = convContactMap[msg.conversation_id];
      const contact = contactId ? contactsMap[contactId] : null;
      const orgId = stationId ? stationOrgMap[stationId] : null;
      return {
        ...msg,
        contact_phone: contact?.phone || null,
        contact_name: contact?.full_name || null,
        organization_id: orgId,
      };
    });

    return NextResponse.json({
      organizations: orgsRes.data || [],
      users: usersRes.data || [],
      stations: stationsData,
      signups: signupsRes.data || [],
      integrations: integrationsRes.data || [],
      settings: settingsRes.data || [],
      recentMessages: enrichedMessages,
      conversations: convData,
      counts: {
        messages: totalMsgCountRes.count || 0,
        conversations: totalConvCountRes.count || 0,
        contacts: contactCountRes.count || 0,
        messagesToday: todayMessages.length,
        outbound: outboundMessages.length,
        inbound: inboundMessages.length,
        aiGenerated: aiMessages.length,
      },
      stationMsgToday,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
