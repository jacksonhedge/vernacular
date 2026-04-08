import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getCreditSummary } from '@/lib/credits';

// GET /api/billing?orgId=xxx — Get billing summary for an org
export async function GET(request: NextRequest) {
  try {
    const orgId = new URL(request.url).searchParams.get('orgId');
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const supabase = createServiceClient();

    // Get subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at');

    // Get current usage summary
    const summary = await getCreditSummary(supabase, orgId);

    // Get invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', orgId)
      .order('period_end', { ascending: false })
      .limit(12);

    // Get org info
    const { data: org } = await supabase
      .from('organizations')
      .select('name, account_type, credits_used_this_month, billing_cycle_start')
      .eq('id', orgId)
      .single();

    return NextResponse.json({
      org: {
        name: org?.name,
        accountTypes: org?.account_type || [],
        billingCycleStart: org?.billing_cycle_start,
      },
      subscriptions: subscriptions || [],
      currentMonth: {
        minimumCents: summary.monthlyMinimumCents,
        usageCents: summary.usageCents,
        overageCents: summary.overageCents,
        totalDueCents: summary.totalDueCents,
        breakdown: summary.breakdown,
      },
      invoices: invoices || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

// POST /api/billing — Generate invoice for current period
export async function POST(request: NextRequest) {
  try {
    const { orgId, brexLink, notes } = await request.json();
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const supabase = createServiceClient();
    const summary = await getCreditSummary(supabase, orgId);

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: orgId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        minimum_cents: summary.monthlyMinimumCents,
        usage_cents: summary.usageCents,
        overage_cents: summary.overageCents,
        total_cents: summary.totalDueCents,
        status: brexLink ? 'sent' : 'draft',
        brex_link: brexLink || null,
        notes: notes || null,
        sent_at: brexLink ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ invoice });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
