import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { formatPhone, phoneOrFilter } from '@/lib/phone';

const NOTION_TOKEN = process.env.NOTION_TOKEN || 'ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw';
const MESSAGE_QUEUE_DB = 'db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956';

// GET /api/engine/poll-inbound — Check Notion Message Queue for new inbound messages
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Query Notion REST API directly (SDK v5 dataSources.query has issues)
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${MESSAGE_QUEUE_DB}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: 'Direction', select: { equals: 'Inbound' } },
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 20,
      }),
    });

    if (!notionRes.ok) {
      const errData = await notionRes.json();
      console.error('[poll-inbound] Notion API error:', errData);
      return NextResponse.json({ ok: false, error: errData.message || 'Notion query failed' }, { status: 500 });
    }

    const response = await notionRes.json();

    const inboundMessages: Array<{
      notionId: string;
      phone: string;
      message: string;
      contactName: string;
      station: string;
      createdAt: string;
    }> = [];

    for (const page of response.results) {
      if (!('properties' in page)) continue;
      const props = page.properties;

      const message = getTitle(props['Message']);
      const phone = getPhone(props['Contact Phone']) || getRichText(props['Contact Phone']);
      const contactName = getRichText(props['Contact Name']);
      const station = getSelect(props['Station']);
      const direction = getSelect(props['Direction']);

      if (direction !== 'Inbound' || !message || !phone) continue;

      inboundMessages.push({
        notionId: page.id,
        phone,
        message,
        contactName,
        station,
        createdAt: (page as Record<string, unknown>).created_time as string || new Date().toISOString(),
      });
    }

    // Sync each inbound message to Supabase (if not already there)
    let synced = 0;
    for (const msg of inboundMessages) {
      // Check if we already have this Notion page synced
      const { data: existing } = await supabase
        .from('messages')
        .select('id')
        .eq('notion_page_id', msg.notionId)
        .limit(1);

      if (existing && existing.length > 0) continue; // already synced

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

      if (!convId) continue;

      // Create message record
      await supabase.from('messages').insert({
        conversation_id: convId,
        direction: 'inbound',
        body: msg.message,
        status: 'delivered',
        ai_generated: false,
        notion_page_id: msg.notionId,
      });

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

// Notion property helpers
function getTitle(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'title' && Array.isArray(p.title)) return (p.title as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  return '';
}
function getRichText(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'rich_text' && Array.isArray(p.rich_text)) return (p.rich_text as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  return '';
}
function getSelect(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'select' && p.select && typeof p.select === 'object') return (p.select as { name: string }).name || '';
  return '';
}
function getPhone(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'phone_number') return (p.phone_number as string) || '';
  return '';
}
