/**
 * Notion client wrapper for Vernacular.
 * Uses direct REST API calls (not SDK) for reliability.
 * SDK v5 dataSources.query has permission issues — REST API works.
 */

const NOTION_TOKEN = process.env.NOTION_TOKEN || 'ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw';
const NOTION_VERSION = '2022-06-28';
const BASE_URL = 'https://api.notion.com/v1';

// Known database IDs
export const NOTION_DBS = {
  MESSAGE_QUEUE: 'db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956',
  MESSAGE_LOG: 'adee0d95-54f9-471e-af02-d37fe6afdd52',
} as const;

interface NotionResponse {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
  status?: number;
}

/** Base fetch wrapper with auth, versioning, and error handling */
async function notionFetch(path: string, options: RequestInit = {}): Promise<NotionResponse> {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[Notion] ❌ ${options.method || 'GET'} ${path} → ${res.status}:`, data.message || data.code);
      return { ok: false, error: data.message || `HTTP ${res.status}`, status: res.status };
    }

    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    console.error(`[Notion] ❌ ${options.method || 'GET'} ${path} → Network error:`, msg);
    return { ok: false, error: msg };
  }
}

/** Query a Notion database with filters and sorts */
export async function queryDatabase(databaseId: string, options: {
  filter?: Record<string, unknown>;
  sorts?: Array<Record<string, string>>;
  page_size?: number;
} = {}) {
  const result = await notionFetch(`/databases/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: options.filter,
      sorts: options.sorts,
      page_size: options.page_size || 50,
    }),
  });

  if (!result.ok) return { ok: false as const, error: result.error, results: [] };

  const data = result.data as { results: Array<Record<string, unknown>> };
  return { ok: true as const, results: data.results || [] };
}

/** Create a page (write to a database) */
export async function createPage(databaseId: string, properties: Record<string, unknown>) {
  const result = await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });

  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, pageId: (result.data as { id: string }).id };
}

/** Update a page's properties */
export async function updatePage(pageId: string, properties: Record<string, unknown>) {
  const result = await notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });

  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const };
}

// ── Property Extractors ──────────────────────────────────────────────

export function getTitle(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'title' && Array.isArray(p.title))
    return (p.title as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  if (p.type === 'rich_text' && Array.isArray(p.rich_text))
    return (p.rich_text as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  return '';
}

export function getRichText(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'rich_text' && Array.isArray(p.rich_text))
    return (p.rich_text as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  return '';
}

export function getSelect(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'select' && p.select && typeof p.select === 'object')
    return (p.select as { name: string }).name || '';
  return '';
}

export function getPhone(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'phone_number') return (p.phone_number as string) || '';
  if (p.type === 'rich_text' && Array.isArray(p.rich_text))
    return (p.rich_text as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
  return '';
}

export function getDate(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as Record<string, unknown>;
  if (p.type === 'date' && p.date && typeof p.date === 'object')
    return (p.date as { start: string }).start || '';
  return '';
}
