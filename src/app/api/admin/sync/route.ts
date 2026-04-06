import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { Client } from '@notionhq/client';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345Hedgesp!';
const NOTION_TOKEN = process.env.NOTION_TOKEN || '';
// Data source ID for the Message Queue collection (from Notion DB db0fb0b9)
const MESSAGE_QUEUE_DS = 'a1f26bdc-7677-45ff-87b3-50489a66090a';

function getTitle(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'title' && Array.isArray(p.title))
    return (p.title as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  if (p.type === 'rich_text' && Array.isArray(p.rich_text))
    return (p.rich_text as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  return '';
}

function getSelect(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'select' && p.select && typeof p.select === 'object')
    return (p.select as { name: string }).name || '';
  return '';
}

function getPhone(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'phone_number') return (p.phone_number as string) || '';
  return '';
}

function getDate(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'date' && p.date && typeof p.date === 'object')
    return (p.date as { start: string }).start || '';
  return '';
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const notion = new Client({ auth: NOTION_TOKEN });
    const supabase = createServiceClient();

    // 1. Read all entries from Notion Message Queue
    const pages = await notion.dataSources.query({
      data_source_id: MESSAGE_QUEUE_DS,
      sorts: [{ property: 'Sent At', direction: 'descending' }],
      page_size: 100,
    });

    // 2. Get existing station name -> id map
    const { data: stations } = await supabase.from('stations').select('id, name, organization_id');
    const stationByName: Record<string, { id: string; organization_id: string }> = {};
    (stations || []).forEach(s => { stationByName[s.name.toLowerCase()] = { id: s.id, organization_id: s.organization_id }; });

    let synced = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (const page of pages.results) {
      if (!('properties' in page)) continue;
      const props = page.properties;
      const notionPageId = page.id;

      const body = getTitle(props['Message']);
      const phone = getPhone(props['Contact Phone'])?.replace(/\D/g, '') || '';
      const contactName = getTitle(props['Contact Name']);
      const direction = getSelect(props['Direction']);
      const stationName = getSelect(props['Station']);
      const status = getSelect(props['Status']);
      const sentAt = getDate(props['Sent At']);
      const supabaseId = getTitle(props['Supabase Message ID']);

      // Skip if already synced to Supabase
      if (supabaseId) { skipped++; continue; }
      if (!body) { skipped++; continue; }

      // Resolve station
      const station = stationByName[stationName.toLowerCase()];
      if (!station) {
        errors.push(`Station "${stationName}" not found for message: ${body.substring(0, 40)}`);
        continue;
      }

      // Find or create contact
      const normalizedPhone = phone.length === 10 ? phone : phone.replace(/^1/, '');
      let contactId: string | null = null;
      if (normalizedPhone) {
        const { data: existing } = await supabase
          .from('contacts').select('id')
          .or(`phone.eq.${normalizedPhone},phone.eq.+1${normalizedPhone},phone.eq.${phone}`)
          .limit(1);
        if (existing && existing.length > 0) {
          contactId = existing[0].id;
        } else {
          const { data: newContact } = await supabase
            .from('contacts')
            .insert({ phone: normalizedPhone, full_name: contactName || null, source: 'notion-sync', import_source: 'notion', organization_id: station.organization_id })
            .select('id').single();
          contactId = newContact?.id || null;
        }
      }
      if (!contactId) {
        errors.push(`Could not resolve contact for phone: ${phone}`);
        continue;
      }

      // Find or create conversation
      let conversationId: string | null = null;
      const { data: existingConv } = await supabase
        .from('conversations').select('id')
        .eq('station_id', station.id).eq('contact_id', contactId)
        .limit(1);

      if (existingConv && existingConv.length > 0) {
        conversationId = existingConv[0].id;
        // Update last_message_at
        await supabase.from('conversations').update({
          last_message_at: sentAt || new Date().toISOString(),
          last_message_preview: body.substring(0, 100),
        }).eq('id', conversationId);
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            station_id: station.id, contact_id: contactId, status: 'active',
            last_message_at: sentAt || new Date().toISOString(),
            last_message_preview: body.substring(0, 100),
            unread_count: direction === 'Inbound' ? 1 : 0, flagged: false,
          })
          .select('id').single();
        conversationId = newConv?.id || null;
      }
      if (!conversationId) {
        errors.push(`Could not create conversation for: ${body.substring(0, 40)}`);
        continue;
      }

      // Insert message into Supabase
      const msgDirection = direction === 'Inbound' ? 'inbound' : 'outbound';
      const msgStatus = status === 'Sent' ? 'delivered' : status === 'Failed' ? 'failed' : status === 'Queued' ? 'queued' : 'sent';
      const { data: msg, error: msgErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          direction: msgDirection,
          body,
          status: msgStatus,
          ai_generated: false,
          sent_at: sentAt || null,
        })
        .select('id').single();

      if (msgErr) {
        errors.push(`Insert failed: ${msgErr.message}`);
        continue;
      }

      // Write Supabase message ID back to Notion
      if (msg?.id) {
        try {
          await notion.pages.update({
            page_id: notionPageId,
            properties: {
              'Supabase Message ID': { rich_text: [{ text: { content: msg.id } }] },
            },
          });
        } catch {
          // Non-critical — message is synced even if Notion writeback fails
        }
      }

      synced++;
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      total: pages.results.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Sync failed' }, { status: 500 });
  }
}
