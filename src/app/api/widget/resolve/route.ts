import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { deductCredits } from '@/lib/credits';

// POST /api/widget/resolve — Mark conversation resolved + bill
export async function POST(request: Request) {
  try {
    const { conversation_id, embed_token, resolution_method, source } = await request.json();

    if (!conversation_id || !embed_token) {
      return NextResponse.json({ error: 'conversation_id and embed_token required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Validate + get pricing
    const { data: config } = await supabase
      .from('widget_configs')
      .select('id, organization_id, ticket_rate_cents, intercom_ticket_rate_cents')
      .eq('embed_token', embed_token)
      .single();

    if (!config) return NextResponse.json({ error: 'Invalid widget' }, { status: 404 });

    // Check if already billed
    const { data: conv } = await supabase
      .from('widget_conversations')
      .select('billed, message_count')
      .eq('id', conversation_id)
      .single();

    if (conv?.billed) {
      return NextResponse.json({ error: 'Already billed', billed_amount_cents: 0 }, { status: 200 });
    }

    // Don't bill if no messages exchanged
    if (!conv?.message_count || conv.message_count < 1) {
      return NextResponse.json({ billed_amount_cents: 0, reason: 'no_messages' });
    }

    // Determine rate based on source
    const ticketSource = source || 'widget';
    const rateCents = ticketSource === 'intercom'
      ? (config.intercom_ticket_rate_cents || 50)   // $0.50 via Intercom
      : (config.ticket_rate_cents || 125);           // $1.25 direct

    // Update conversation
    await supabase.from('widget_conversations').update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolution_method: resolution_method || 'ai',
      billed: true,
      bill_amount_cents: rateCents,
    }).eq('id', conversation_id);

    // Insert billing record
    await supabase.from('widget_billing').insert({
      widget_config_id: config.id,
      conversation_id,
      organization_id: config.organization_id,
      amount_cents: rateCents,
      source: ticketSource,
    });

    // Deduct credits from org
    if (config.organization_id) {
      await deductCredits(supabase, config.organization_id, 'support_ticket_resolved',
        `Ticket resolved (${ticketSource}): $${(rateCents / 100).toFixed(2)}`);
    }

    return NextResponse.json({
      billed_amount_cents: rateCents,
      source: ticketSource,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
