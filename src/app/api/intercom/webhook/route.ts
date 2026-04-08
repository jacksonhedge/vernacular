import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyIntercomWebhook, getConfigByIntercomAppId, stripHtml } from '@/lib/intercom';
import { deductCredits } from '@/lib/credits';

// POST /api/intercom/webhook — Receives Intercom webhook events
export async function POST(request: Request) {
  try {
    const { valid, body } = await verifyIntercomWebhook(request);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const topic = body.topic as string;
    const appId = body.app_id as string;
    const item = (body.data as Record<string, unknown>)?.item as Record<string, unknown> || {};

    const supabase = createServiceClient();
    const config = appId ? await getConfigByIntercomAppId(supabase, appId) : null;

    // ── conversation.user.created ──────────────────────────────────────
    if (topic === 'conversation.user.created' && config) {
      const intercomConvId = item.id as string;
      const user = item.user as Record<string, unknown> || {};

      // Check if we already track this conversation
      const { data: existing } = await supabase
        .from('widget_conversations')
        .select('id')
        .eq('intercom_conversation_id', intercomConvId)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('widget_conversations').insert({
          widget_config_id: config.id,
          station_id: config.station_id,
          intercom_conversation_id: intercomConvId,
          session_id: intercomConvId,
          source: 'intercom',
          visitor_name: (user.name as string) || null,
          visitor_email: (user.email as string) || null,
          status: 'open',
        });
      }
    }

    // ── conversation.admin.closed ──────────────────────────────────────
    if (topic === 'conversation.admin.closed' && config) {
      const intercomConvId = item.id as string;

      const { data: conv } = await supabase
        .from('widget_conversations')
        .select('id, billed, message_count')
        .eq('intercom_conversation_id', intercomConvId)
        .single();

      if (conv && !conv.billed && (conv.message_count || 0) > 0) {
        const rateCents = config.intercom_ticket_rate_cents || 50; // $0.50 via Intercom

        await supabase.from('widget_conversations').update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_method: 'imessage_handoff',
          billed: true,
          bill_amount_cents: rateCents,
        }).eq('id', conv.id);

        await supabase.from('widget_billing').insert({
          widget_config_id: config.id,
          conversation_id: conv.id,
          organization_id: config.organization_id,
          amount_cents: rateCents,
          source: 'intercom',
        });

        if (config.organization_id) {
          await deductCredits(supabase, config.organization_id, 'support_ticket_resolved',
            `Intercom ticket resolved: $${(rateCents / 100).toFixed(2)}`);
        }
      }
    }

    // ── conversation.user.replied ──────────────────────────────────────
    if (topic === 'conversation.user.replied' && config) {
      const intercomConvId = item.id as string;

      const { data: conv } = await supabase
        .from('widget_conversations')
        .select('id, message_count')
        .eq('intercom_conversation_id', intercomConvId)
        .single();

      if (conv) {
        // Extract message text from Intercom's nested structure
        const parts = (item.conversation_parts as Record<string, unknown>)?.conversation_parts as Array<Record<string, unknown>> || [];
        const latestPart = parts[0];
        const messageBody = latestPart?.body ? stripHtml(latestPart.body as string) : '';

        if (messageBody) {
          await supabase.from('widget_messages').insert({
            conversation_id: conv.id,
            role: 'user',
            content: messageBody,
          });

          await supabase.from('widget_conversations').update({
            message_count: (conv.message_count || 0) + 1,
          }).eq('id', conv.id);
        }
      }
    }

    // Always return 200 — Intercom retries on non-2xx
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Intercom webhook]', err);
    return NextResponse.json({ received: true }); // Still 200 to prevent retries
  }
}
