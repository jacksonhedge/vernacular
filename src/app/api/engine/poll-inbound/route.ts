import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { formatPhone, phoneOrFilter } from '@/lib/phone';
import { queryDatabase, NOTION_DBS, getTitle, getRichText, getSelect, getPhone } from '@/lib/notion';

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
    for (const msg of inboundMessages) {
      // Check if we already have this Notion page synced
      const { data: existing } = await supabase
        .from('messages')
        .select('id')
        .not('notion_page_id', 'is', null)
        .eq('notion_page_id', msg.notionId)
        .limit(1);

      if (existing && existing.length > 0) { skipped++; continue; }

      // Find or create contact
      let contactId: string | null = null;
      const { data: contacts } = await supabase
        .from('contacts').select('id, full_name')
        .or(phoneOrFilter(msg.phone))
        .limit(1);

      if (contacts && contacts.length > 0) {
        contactId = contacts[0].id;
      } else if (msg.phone) {
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            phone: formatPhone(msg.phone),
            full_name: msg.contactName || null,
            source: 'inbound',
            import_source: 'imessage',
          })
          .select('id').single();
        contactId = newContact?.id || null;
      }

      if (!contactId) continue;

      // Find or create conversation
      const { data: station } = await supabase
        .from('stations').select('id')
        .eq('name', msg.station || 'Wade')
        .limit(1);

      const stationId = station?.[0]?.id;
      if (!stationId) continue;

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
        const { data: newConv } = await supabase
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
        convId = newConv?.id || null;
      }

      if (!convId) { console.error(`[poll-inbound] No convId for ${msg.phone}`); errors++; continue; }

      // Create message record
      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: convId,
        direction: 'inbound',
        body: msg.message,
        status: 'delivered',
        ai_generated: false,
        notion_page_id: msg.notionId,
      });
      if (msgErr) { console.error(`[poll-inbound] Insert failed:`, msgErr.message); errors++; continue; }

      // Update conversation
      await supabase.from('conversations').update({
        last_message_at: msg.createdAt,
        last_message_preview: msg.message.substring(0, 100),
        unread_count: 1,
      }).eq('id', convId);

      synced++;
    }

    return NextResponse.json({
      ok: true,
      found: inboundMessages.length,
      synced,
      skipped,
      errors,
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
