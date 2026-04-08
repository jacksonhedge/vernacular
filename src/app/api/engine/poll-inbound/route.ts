import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { findOrCreateContact, logContactActivity, updateEngagement } from '@/lib/contacts';

// GET /api/engine/poll-inbound — Process new inbound messages from the messages table
// Wade writes inbound messages directly to Supabase. This endpoint links them to conversations.
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Find messages that don't have a conversation_id yet (inbound + outbound)
    const { data: unlinked } = await supabase
      .from('messages')
      .select('id, message, contact_phone, station, direction, created_at')
      .is('conversation_id', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!unlinked || unlinked.length === 0) {
      return NextResponse.json({ ok: true, found: 0, synced: 0, skipped: 0, errors: 0 });
    }

    let synced = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const msg of unlinked) {
      if (!msg.contact_phone || !msg.message) continue;

      // Skip spam: short codes, emails, non-phone strings, test numbers
      const phoneDigits = msg.contact_phone.replace(/\D/g, '');
      if (phoneDigits.length < 7) continue;
      if (msg.contact_phone.includes('@')) continue;
      const areaCode = phoneDigits.length === 11 ? phoneDigits.slice(1, 4) : phoneDigits.slice(0, 3);
      if (areaCode === '555') continue;

      // Find station first (need org_id for contact)
      const { data: station } = await supabase
        .from('stations').select('id, organization_id')
        .eq('name', msg.station || 'Wade')
        .limit(1);

      const stationOrgId = station?.[0]?.organization_id || null;

      // Find or create contact (with org_id from station)
      const contactId = await findOrCreateContact(supabase, {
        phone: msg.contact_phone,
        source: 'inbound',
        import_source: 'imessage',
        source_system: 'wade-station',
        organization_id: stationOrgId || undefined,
      });

      if (!contactId) { errors++; errorDetails.push(`${msg.contact_phone}: no contactId`); continue; }

      // Log activity + update engagement (inbound only)
      const dir = (msg.direction || '').toLowerCase();
      if (dir === 'inbound') {
        await logContactActivity(supabase, contactId, 'replied', `Inbound: "${msg.message.substring(0, 50)}"`);
        await updateEngagement(supabase, contactId, 'received_reply');
      }

      const stationId = station?.[0]?.id;
      if (!stationId) { errors++; errorDetails.push(`${msg.contact_phone}: no station "${msg.station}"`); continue; }

      // Find or create conversation
      let convId: string | null = null;
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('station_id', stationId)
        .eq('contact_id', contactId)
        .limit(1);

      if (existingConv && existingConv.length > 0) {
        convId = existingConv[0].id;
      } else {
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({
            station_id: stationId,
            contact_id: contactId,
            status: 'active',
            last_message_at: msg.created_at,
            last_message_preview: msg.message.substring(0, 100),
            unread_count: 1,
            flagged: false,
          })
          .select('id').single();
        if (convErr) { errors++; errorDetails.push(`${msg.contact_phone}: conv create: ${convErr.message}`); continue; }
        convId = newConv?.id || null;
      }

      if (!convId) { errors++; errorDetails.push(`${msg.contact_phone}: no convId`); continue; }

      // Link message to conversation
      await supabase.from('messages').update({ conversation_id: convId }).eq('id', msg.id);

      // Update conversation
      await supabase.from('conversations').update({
        last_message_at: msg.created_at,
        last_message_preview: msg.message.substring(0, 100),
        unread_count: 1,
      }).eq('id', convId);

      synced++;

      // Only trigger AI for RECENT inbound messages (not historical bulk syncs)
      const isInbound = (msg.direction || '').toLowerCase() === 'inbound';
      const msgAge = Date.now() - new Date(msg.created_at).getTime();
      const fiveMinutes = 5 * 60 * 1000;
      if (!isInbound || msgAge > fiveMinutes) continue;

      // Check if this conversation has AI mode enabled → trigger AI response
      try {
        const { data: conv } = await supabase
          .from('conversations')
          .select('ai_mode, ai_system_prompt, ai_ghost_name')
          .eq('id', convId)
          .single();

        if (conv && (conv.ai_mode === 'draft' || conv.ai_mode === 'auto')) {
          const { data: history } = await supabase
            .from('messages')
            .select('direction, message')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true })
            .limit(10);

          const conversationHistory = (history || []).map(m => ({
            role: m.direction === 'Outbound' ? 'outgoing' : 'incoming',
            content: m.message,
          }));

          const { data: contact } = await supabase
            .from('contacts').select('full_name, phone')
            .eq('id', contactId).single();

          const aiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vernacular.chat';
          await fetch(`${aiUrl}/api/ai/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: convId,
              contactName: contact?.full_name || '',
              contactPhone: contact?.phone || msg.contact_phone,
              inboundMessage: msg.message,
              conversationHistory,
              systemPrompt: conv.ai_system_prompt || undefined,
              mode: conv.ai_mode,
              ghostName: conv.ai_ghost_name || 'Blinky',
            }),
          });
        }
      } catch (aiErr) {
        console.error('[poll-inbound] AI trigger failed:', aiErr instanceof Error ? aiErr.message : aiErr);
      }
    }

    return NextResponse.json({
      ok: true,
      found: unlinked.length,
      synced,
      errors,
      errorDetails: errorDetails.slice(0, 5),
    });
  } catch (err) {
    console.error('[poll-inbound] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
