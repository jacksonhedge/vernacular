import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const NOTION_TOKEN = process.env.NOTION_TOKEN || 'ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw';
const MESSAGE_LOG_DB = 'adee0d95-54f9-471e-af02-d37fe6afdd52';

export async function GET() {
  try {
    const notion = new Client({ auth: NOTION_TOKEN });

    // Fetch from Message Log database — group by contact
    const response = await notion.dataSources.query({
      data_source_id: MESSAGE_LOG_DB,
      sorts: [{ property: 'Date', direction: 'descending' }],
      page_size: 100,
    });

    // Group messages by contact name to build contact list
    const contactMap = new Map<string, {
      name: string;
      phone: string;
      lastMessage: string;
      lastDate: string;
      direction: string;
      messageCount: number;
      chapter: string;
    }>();

    for (const page of response.results) {
      if (!('properties' in page)) continue;
      const props = page.properties;

      const name = getTitle(props['Contact Name'] || props['Message']);
      const phone = getPhone(props['Contact Phone']);
      const message = getTitle(props['Message']);
      const direction = getSelect(props['Direction']);
      const date = getDate(props['Date']);
      const chapter = getRichText(props['Chapter']);

      if (!name) continue;

      const existing = contactMap.get(name);
      if (!existing || (date && existing.lastDate < date)) {
        contactMap.set(name, {
          name,
          phone: phone || existing?.phone || '',
          lastMessage: message || existing?.lastMessage || '',
          lastDate: date || existing?.lastDate || '',
          direction: direction || existing?.direction || '',
          messageCount: (existing?.messageCount || 0) + 1,
          chapter: chapter || existing?.chapter || '',
        });
      } else {
        existing.messageCount++;
      }
    }

    const contacts = Array.from(contactMap.entries()).map(([, contact], i) => ({
      id: `notion-${i}`,
      name: contact.name,
      phone: contact.phone,
      lastMessage: contact.lastMessage,
      lastDate: contact.lastDate,
      direction: contact.direction,
      messageCount: contact.messageCount,
      chapter: contact.chapter,
      initials: contact.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    }));

    return NextResponse.json({ contacts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch contacts';
    console.error('[Vernacular] /api/notion/contacts error:', msg);
    // Return empty contacts instead of 500 — dashboard shouldn't break
    return NextResponse.json({ contacts: [], error: msg });
  }
}

// Helper functions to extract Notion property values
function getTitle(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'title' && Array.isArray(p.title)) {
    return (p.title as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  }
  if (p.type === 'rich_text' && Array.isArray(p.rich_text)) {
    return (p.rich_text as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  }
  return '';
}

function getRichText(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'rich_text' && Array.isArray(p.rich_text)) {
    return (p.rich_text as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  }
  if (p.type === 'relation' && Array.isArray(p.relation)) {
    return ''; // Relations need separate fetch
  }
  return '';
}

function getSelect(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'select' && p.select && typeof p.select === 'object') {
    return (p.select as { name: string }).name || '';
  }
  return '';
}

function getPhone(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'phone_number') return (p.phone_number as string) || '';
  if (p.type === 'rich_text' && Array.isArray(p.rich_text)) {
    return (p.rich_text as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  }
  return '';
}

function getDate(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'date' && p.date && typeof p.date === 'object') {
    return (p.date as { start: string }).start || '';
  }
  return '';
}
