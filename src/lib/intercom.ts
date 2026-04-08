/**
 * Intercom integration utilities.
 * HMAC verification, API client, config lookup.
 */

import { createHmac } from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';

const INTERCOM_WEBHOOK_SECRET = process.env.INTERCOM_WEBHOOK_SECRET || '';

/**
 * Verify Intercom webhook signature (HMAC-SHA256).
 */
export async function verifyIntercomWebhook(req: Request): Promise<{ valid: boolean; body: Record<string, unknown> }> {
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature') || '';

  if (!INTERCOM_WEBHOOK_SECRET || !signature) {
    // In dev, skip verification if secret not set
    try {
      return { valid: !INTERCOM_WEBHOOK_SECRET, body: JSON.parse(rawBody) };
    } catch {
      return { valid: false, body: {} };
    }
  }

  const expected = 'sha256=' + createHmac('sha256', INTERCOM_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const valid = signature === expected;

  try {
    return { valid, body: JSON.parse(rawBody) };
  } catch {
    return { valid: false, body: {} };
  }
}

/**
 * Call the Intercom REST API.
 */
export async function intercomAPI(
  accessToken: string,
  path: string,
  options?: { method?: string; body?: Record<string, unknown> }
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.intercom.io${path}`, {
    method: options?.method || 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Intercom-Version': '2.11',
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });
  return res.json();
}

/**
 * Find widget config by Intercom app ID.
 */
export async function getConfigByIntercomAppId(supabase: SupabaseClient, appId: string) {
  const { data } = await supabase
    .from('widget_configs')
    .select('*, stations(phone_number, name)')
    .eq('intercom_app_id', appId)
    .eq('is_active', true)
    .limit(1);

  return data?.[0] || null;
}

/**
 * Strip HTML tags from Intercom message bodies.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}
