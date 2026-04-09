import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/ai/search-history — Craig's data lookup tool
export async function POST(request: NextRequest) {
  try {
    const { action, query, orgId } = await request.json();
    const supabase = createServiceClient();

    if (action === 'conversation_history') {
      // Get full conversation history for a contact (by name or phone)
      const searchTerm = query || '';
      const digits = searchTerm.replace(/\D/g, '').slice(-4);

      // Find contact
      let contactQuery = supabase.from('contacts').select('id, full_name, phone, email, state, greek_org, school, venmo_handle, apps_used, device_types, ambassador_interest, notes, referred_by').eq('organization_id', orgId);

      if (digits.length >= 4) {
        contactQuery = contactQuery.ilike('phone', `%${digits}%`);
      } else {
        contactQuery = contactQuery.ilike('full_name', `%${searchTerm}%`);
      }

      const { data: contacts } = await contactQuery.limit(1);
      if (!contacts || contacts.length === 0) {
        return NextResponse.json({ result: `No contact found matching "${searchTerm}"` });
      }

      const contact = contacts[0];

      // Get all messages for this contact
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contact.id);

      const convIds = (conversations || []).map(c => c.id);
      let messages: Array<Record<string, unknown>> = [];

      if (convIds.length > 0) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('message, direction, sent_at, created_at, status')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: true })
          .limit(50);
        messages = msgs || [];
      }

      const msgLines = messages.map(m => {
        const dir = (m.direction as string || '').toLowerCase() === 'outbound' ? '→ YOU' : '← THEM';
        const time = m.sent_at || m.created_at || '';
        return `${dir}: "${m.message}" (${time ? new Date(time as string).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) : '?'})`;
      }).join('\n');

      return NextResponse.json({
        result: `CONTACT: ${contact.full_name || 'Unknown'} | ${contact.phone}
Email: ${contact.email || 'none'} | State: ${contact.state || '?'} | School: ${contact.school || '?'}
Greek Org: ${contact.greek_org || 'none'} | Venmo: ${contact.venmo_handle || 'none'}
Apps: ${contact.apps_used || 'none'} | Devices: ${contact.device_types || '?'}
Ambassador Interest: ${contact.ambassador_interest || 'none'}
Referred By: ${contact.referred_by || 'none'} | Notes: ${contact.notes || 'none'}

FULL MESSAGE HISTORY (${messages.length} messages):
${msgLines || 'No messages yet'}`,
      });
    }

    if (action === 'search_contacts') {
      // Search contacts by any field
      const { data: results } = await supabase
        .from('contacts')
        .select('full_name, phone, email, state, greek_org, school, apps_used')
        .eq('organization_id', orgId)
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,state.ilike.%${query}%,greek_org.ilike.%${query}%,school.ilike.%${query}%`)
        .limit(20);

      const lines = (results || []).map(c =>
        `- ${c.full_name || 'Unknown'} | ${c.phone} | ${c.state || '?'} | ${c.greek_org || ''}`
      ).join('\n');

      return NextResponse.json({
        result: `Found ${(results || []).length} contacts matching "${query}":\n${lines || 'No matches'}`,
      });
    }

    if (action === 'initiative_details') {
      // Get initiative + its contacts
      const { data: initiatives } = await supabase
        .from('org_knowledge')
        .select('id, title, content')
        .eq('organization_id', orgId)
        .eq('category', 'initiative')
        .ilike('title', `%${query}%`)
        .limit(1);

      if (!initiatives || initiatives.length === 0) {
        return NextResponse.json({ result: `No initiative found matching "${query}"` });
      }

      const init = initiatives[0];

      // Get linked contacts
      const { data: links } = await supabase
        .from('initiative_contacts')
        .select('contact_id')
        .eq('initiative_id', init.id)
        .limit(200);

      const contactIds = (links || []).map(l => l.contact_id);
      let contactList: Array<Record<string, unknown>> = [];

      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('full_name, phone, state, greek_org')
          .in('id', contactIds);
        contactList = contacts || [];
      }

      const contactLines = contactList.map(c =>
        `- ${c.full_name || 'Unknown'} | ${c.phone} | ${c.state || '?'} | ${c.greek_org || ''}`
      ).join('\n');

      return NextResponse.json({
        result: `INITIATIVE: ${init.title}
${init.content}

CONTACTS (${contactList.length}):
${contactLines || 'No contacts linked'}`,
      });
    }

    if (action === 'recent_activity') {
      // Get recent messages across all conversations
      const daysBack = parseInt(query) || 7;
      const since = new Date(Date.now() - daysBack * 86400000).toISOString();

      const { data: msgs } = await supabase
        .from('messages')
        .select('message, direction, contact_phone, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50);

      const lines = (msgs || []).map(m => {
        const dir = (m.direction as string || '').toLowerCase() === 'outbound' ? '→' : '←';
        return `${dir} ${m.contact_phone}: "${(m.message as string || '').substring(0, 100)}" (${new Date(m.created_at as string).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })})`;
      }).join('\n');

      return NextResponse.json({
        result: `RECENT ACTIVITY (last ${daysBack} days, ${(msgs || []).length} messages):\n${lines}`,
      });
    }

    return NextResponse.json({ result: 'Unknown action. Use: conversation_history, search_contacts, initiative_details, recent_activity' });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
