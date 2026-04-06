import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

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
      // All messages for counts — uses actual column names
      supabase.from('messages').select('id, direction, status, source_system, sent_at, contact_phone, station').order('sent_at', { ascending: false }).limit(5000),
      // Recent messages for feed
      supabase.from('messages').select('id, direction, message, status, source_system, sent_at, contact_phone, station, created_at').order('sent_at', { ascending: false }).limit(100),
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
    const outboundMessages = allMessages.filter(m => m.direction === 'Outbound' || m.direction === 'outbound');
    const inboundMessages = allMessages.filter(m => m.direction === 'Inbound' || m.direction === 'inbound');
    const aiMessages = allMessages.filter(m => m.source_system === 'vernacular-ai');

    // Per-station today counts (messages have station name directly)
    const stationMsgToday: Record<string, number> = {};
    const stationsData = stationsRes.data || [];
    const stationNameToId: Record<string, string> = {};
    const stationOrgMap: Record<string, string> = {};
    stationsData.forEach(s => { stationNameToId[s.name] = s.id; stationOrgMap[s.id] = s.organization_id; });

    todayMessages.forEach(m => {
      const stationId = stationNameToId[m.station];
      if (stationId) {
        stationMsgToday[stationId] = (stationMsgToday[stationId] || 0) + 1;
      }
    });

    // Build conversation-to-contact map
    const convContactMap: Record<string, string> = {};
    convData.forEach(c => { convContactMap[c.id] = c.contact_id; });

    // Enrich recent messages — messages already have contact_phone and station
    const enrichedMessages = (recentMsgsRes.data || []).map(msg => {
      const stationId = stationNameToId[msg.station];
      const orgId = stationId ? stationOrgMap[stationId] : null;
      // Look up contact name by phone
      const contact = Object.values(contactsMap).find(c => c.phone === msg.contact_phone);
      return {
        ...msg,
        body: msg.message, // alias for admin page compatibility
        contact_name: contact?.full_name || null,
        organization_id: orgId,
        station_id: stationId || null,
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
