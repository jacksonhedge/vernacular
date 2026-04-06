import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { formatPhone } from '@/lib/phone';
import { queryDatabase, NOTION_DBS, getTitle, getRichText, getSelect, getPhone } from '@/lib/notion';
import { findOrCreateContact, logContactActivity, updateEngagement } from '@/lib/contacts';

// GET /api/engine/poll-inbound — Check Notion Message Queue for new inbound messages
export async function GET() {
  try {
    const supabase = createServiceClient();

    const queryResult = await queryDatabase(NOTION_DBS.MESSAGE_QUEUE, {
      filter: { property: 'Direction', select: { equals: 'Inbound' } },
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      page_size: 20,
    });

    if (!queryResult.ok) {
      return NextResponse.json({ ok: false, error: queryResult.error }, { status: 500 });
    }

    const response = { results: queryResult.results };

    const inboundMessages: Array<{
      notionId: string;
      phone: string;
      message: string;
      contactName: string;
      station: string;
      createdAt: string;
    }> = [];

    for (const page of response.results) {
      const p = page as Record<string, unknown>;
      if (!p.properties) continue;
      const props = p.properties as Record<string, unknown>;

      const message = getTitle(props['Message']);
      const phone = getPhone(props['Contact Phone']) || getRichText(props['Contact Phone']);
      const contactName = getRichText(props['Contact Name']);
      const station = getSelect(props['Station']);
      const direction = getSelect(props['Direction']);

      if (direction !== 'Inbound' || !message || !phone) continue;

      // Skip spam: short codes, emails, non-phone strings, test numbers
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length < 7) continue;
      if (phone.includes('@') || phone.includes('Note:') || phone.includes('Candidates')) continue;
      if (phoneDigits.substring(phoneDigits.length === 11 ? 1 : 0, phoneDigits.length === 11 ? 4 : 3) === '555') continue;

      inboundMessages.push({
        notionId: p.id as string,
        phone,
        message,
        contactName,
        station,
        createdAt: (p.created_time as string) || new Date().toISOString(),
      });
    }

    // Sync each inbound message to Supabase (if not already there)
    let synced = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    for (const msg of inboundMessages) {
      // Check if we already have this Notion page synced
      const { data: existing } = await supabase
        .from('messages')
        .select('id')
        .not('notion_page_id', 'is', null)
        .eq('notion_page_id', msg.notionId)
        .limit(1);

      if (existing && existing.length > 0) { skipped++; continue; }

      // Find or create contact (shared utility)
      const contactId = await findOrCreateContact(supabase, {
        phone: msg.phone,
        full_name: msg.contactName || undefined,
        source: 'inbound',
        import_source: 'imessage',
        source_system: 'claude-cowork',
      });

      if (!contactId) { errors++; errorDetails.push(`${msg.phone}: no contactId`); continue; }

      // Log activity + update engagement for inbound reply
      await logContactActivity(supabase, contactId, 'replied', `Inbound: "${msg.message.substring(0, 50)}"`);
      await updateEngagement(supabase, contactId, 'received_reply');

      // Find or create conversation
      const { data: station } = await supabase
        .from('stations').select('id')
        .eq('name', msg.station || 'Wade')
        .limit(1);

      const stationId = station?.[0]?.id;
      if (!stationId) { errors++; errorDetails.push(`${msg.phone}: no station "${msg.station}"`); continue; }

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
            last_message_at: msg.createdAt,
            last_message_preview: msg.message.substring(0, 100),
            unread_count: 1,
            flagged: false,
          })
          .select('id').single();
        if (convErr) { errors++; errorDetails.push(`${msg.phone}: conv create: ${convErr.message}`); continue; }
        convId = newConv?.id || null;
      }

      if (!convId) { errors++; errorDetails.push(`${msg.phone}: no convId`); continue; }

      // Create message record
      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: convId,
        direction: 'inbound',
        body: msg.message,
        status: 'delivered',
        ai_generated: false,
        notion_page_id: msg.notionId,
        source_system: 'claude-cowork',
      });
      if (msgErr) { errors++; errorDetails.push(`${msg.phone}: msg insert: ${msgErr.message}`); continue; }

      // Update conversation
      await supabase.from('conversations').update({
        last_message_at: msg.createdAt,
        last_message_preview: msg.message.substring(0, 100),
        unread_count: 1,
      }).eq('id', convId);

      synced++;

      // Check if this conversation has AI mode enabled → trigger AI response
      try {
        const { data: conv } = await supabase
          .from('conversations')
          .select('ai_mode, ai_system_prompt, ai_ghost_name')
          .eq('id', convId)
          .single();

        if (conv && (conv.ai_mode === 'draft' || conv.ai_mode === 'auto')) {
          // Get recent conversation history for context
          const { data: history } = await supabase
            .from('messages')
            .select('direction, body')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true })
            .limit(10);

          const conversationHistory = (history || []).map(m => ({
            role: m.direction === 'outbound' ? 'outgoing' : 'incoming',
            content: m.body,
          }));

          // Get contact name
          const { data: contact } = await supabase
            .from('contacts').select('full_name, phone')
            .eq('id', contactId).single();

          // Trigger AI response
          const aiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vernacular.chat';
          await fetch(`${aiUrl}/api/ai/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: convId,
              contactName: contact?.full_name || '',
              contactPhone: contact?.phone || msg.phone,
              inboundMessage: msg.message,
              conversationHistory,
              systemPrompt: conv.ai_system_prompt || undefined,
              mode: conv.ai_mode,
              ghostName: conv.ai_ghost_name || 'Blinky',
            }),
          });

          console.log(`[poll-inbound] 🤖 AI ${conv.ai_mode} triggered for ${contact?.full_name || msg.phone}`);
        }
      } catch (aiErr) {
        console.error('[poll-inbound] AI trigger failed:', aiErr instanceof Error ? aiErr.message : aiErr);
        // Don't fail the sync — AI response is best-effort
      }
    }

    return NextResponse.json({
      ok: true,
      found: inboundMessages.length,
      synced,
      skipped,
      errors,
      errorDetails: errorDetails.slice(0, 5),
      messages: inboundMessages.map(m => ({
        phone: m.phone,
        contactName: m.contactName,
        message: m.message.substring(0, 50),
        station: m.station,
      })),
    });
  } catch (err) {
    console.error('[poll-inbound] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

// Property helpers imported from @/lib/notion
