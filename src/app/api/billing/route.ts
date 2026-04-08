import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getCreditSummary, ACTION_COSTS_CENTS } from '@/lib/credits';

// Add-on pricing in cents/month
const ADDON_PRICES: Record<string, { label: string; monthlyCents: number }> = {
  slack: { label: 'Slack Integration', monthlyCents: 2500 },
  notion: { label: 'Notion Integration', monthlyCents: 2500 },
  salesforce: { label: 'Salesforce Integration', monthlyCents: 5000 },
  email: { label: 'Email (Gmail/SMTP)', monthlyCents: 2500 },
  discord: { label: 'Discord Integration', monthlyCents: 2500 },
  telegram: { label: 'Telegram Integration', monthlyCents: 2500 },
  webhook: { label: 'Custom Webhook', monthlyCents: 1500 },
};

const SOLUTION_LABELS: Record<string, string> = {
  vip_manager: 'VIP Manager — Dedicated Line',
  sales_outreach: 'Sales/Outreach — Dedicated Seat',
  app_testing: 'App Testing — Dedicated Seat',
  customer_support: 'Customer Support — Platform',
};

// GET /api/billing?orgId=xxx
export async function GET(request: NextRequest) {
  try {
    const orgId = new URL(request.url).searchParams.get('orgId');
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const supabase = createServiceClient();

    const { data: subscriptions } = await supabase
      .from('subscriptions').select('*').eq('organization_id', orgId).eq('status', 'active');

    const { data: addons } = await supabase
      .from('subscription_addons').select('*').eq('organization_id', orgId).eq('enabled', true);

    const summary = await getCreditSummary(supabase, orgId);

    const { data: invoices } = await supabase
      .from('invoices').select('*').eq('organization_id', orgId).order('period_end', { ascending: false }).limit(12);

    const { data: org } = await supabase
      .from('organizations').select('name, account_type, billing_cycle_start').eq('id', orgId).single();

    // Calculate add-on total
    const addonTotalCents = (addons || []).reduce((sum, a) => sum + (a.monthly_cents || 0), 0);

    return NextResponse.json({
      org: { name: org?.name, accountTypes: org?.account_type || [], billingCycleStart: org?.billing_cycle_start },
      subscriptions: subscriptions || [],
      addons: (addons || []).map(a => ({ ...a, label: ADDON_PRICES[a.addon_type]?.label || a.addon_type })),
      addonPrices: ADDON_PRICES,
      currentMonth: {
        minimumCents: summary.monthlyMinimumCents,
        addonCents: addonTotalCents,
        usageCents: summary.usageCents,
        overageCents: summary.overageCents,
        totalDueCents: summary.totalDueCents + addonTotalCents,
        breakdown: summary.breakdown,
      },
      invoices: invoices || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

// POST /api/billing — Generate invoice with line items
export async function POST(request: NextRequest) {
  try {
    const { orgId, brexLink, notes } = await request.json();
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const supabase = createServiceClient();
    const summary = await getCreditSummary(supabase, orgId);

    const { data: subscriptions } = await supabase
      .from('subscriptions').select('*').eq('organization_id', orgId).eq('status', 'active');

    const { data: addons } = await supabase
      .from('subscription_addons').select('*').eq('organization_id', orgId).eq('enabled', true);

    // Get usage breakdown for line items
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: usageRows } = await supabase
      .from('credit_usage')
      .select('action, credits_used')
      .eq('organization_id', orgId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString());

    // Group usage by action
    const usageByAction: Record<string, { count: number; totalCents: number }> = {};
    for (const row of usageRows || []) {
      if (!usageByAction[row.action]) usageByAction[row.action] = { count: 0, totalCents: 0 };
      usageByAction[row.action].count++;
      usageByAction[row.action].totalCents += row.credits_used;
    }

    // Calculate totals
    const addonTotalCents = (addons || []).reduce((sum, a) => sum + (a.monthly_cents || 0), 0);
    const totalDue = summary.totalDueCents + addonTotalCents;

    // Check for unpaid setup fees
    const unpaidSetup = (subscriptions || []).filter(s => !s.setup_fee_paid && s.setup_fee_cents > 0);
    const setupFeeCents = unpaidSetup.reduce((sum, s) => sum + (s.setup_fee_cents || 0), 0);

    // Create invoice
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        organization_id: orgId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        minimum_cents: summary.monthlyMinimumCents,
        usage_cents: summary.usageCents,
        overage_cents: summary.overageCents,
        total_cents: totalDue + setupFeeCents,
        status: brexLink ? 'sent' : 'draft',
        brex_link: brexLink || null,
        notes: notes || null,
        sent_at: brexLink ? new Date().toISOString() : null,
      })
      .select().single();

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

    // Create line items
    const lineItems: Array<{ invoice_id: string; description: string; quantity: number; unit_price_cents: number; total_cents: number; line_type: string }> = [];

    // 1. Monthly minimums per subscription
    for (const sub of subscriptions || []) {
      lineItems.push({
        invoice_id: invoice.id,
        description: SOLUTION_LABELS[sub.solution_type] || sub.solution_type,
        quantity: sub.quantity || 1,
        unit_price_cents: sub.monthly_minimum_cents,
        total_cents: sub.monthly_minimum_cents * (sub.quantity || 1),
        line_type: 'minimum',
      });
    }

    // 2. Add-ons
    for (const addon of addons || []) {
      const info = ADDON_PRICES[addon.addon_type];
      lineItems.push({
        invoice_id: invoice.id,
        description: info?.label || addon.addon_type,
        quantity: 1,
        unit_price_cents: addon.monthly_cents,
        total_cents: addon.monthly_cents,
        line_type: 'addon',
      });
    }

    // 3. Usage breakdown
    for (const [action, data] of Object.entries(usageByAction)) {
      const unitCost = ACTION_COSTS_CENTS[action as keyof typeof ACTION_COSTS_CENTS] || 0;
      lineItems.push({
        invoice_id: invoice.id,
        description: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        quantity: data.count,
        unit_price_cents: unitCost,
        total_cents: data.totalCents,
        line_type: 'usage',
      });
    }

    // 4. Overage (if usage exceeds minimum)
    if (summary.overageCents > 0) {
      lineItems.push({
        invoice_id: invoice.id,
        description: 'Usage Overage (above monthly minimum)',
        quantity: 1,
        unit_price_cents: summary.overageCents,
        total_cents: summary.overageCents,
        line_type: 'overage',
      });
    }

    // 5. Unpaid setup fees
    for (const sub of unpaidSetup) {
      lineItems.push({
        invoice_id: invoice.id,
        description: `Setup Fee — ${SOLUTION_LABELS[sub.solution_type] || sub.solution_type}`,
        quantity: 1,
        unit_price_cents: sub.setup_fee_cents,
        total_cents: sub.setup_fee_cents,
        line_type: 'setup',
      });
      // Mark setup fee as paid
      await supabase.from('subscriptions').update({ setup_fee_paid: true }).eq('id', sub.id);
    }

    // Insert all line items
    if (lineItems.length > 0) {
      await supabase.from('invoice_line_items').insert(lineItems);
    }

    // Reset monthly usage counter
    await supabase.from('organizations').update({
      credits_used_this_month: 0,
      billing_cycle_start: new Date().toISOString(),
    }).eq('id', orgId);

    return NextResponse.json({
      invoice,
      lineItems,
      summary: {
        minimumCents: summary.monthlyMinimumCents,
        addonCents: addonTotalCents,
        usageCents: summary.usageCents,
        overageCents: summary.overageCents,
        setupFeeCents,
        totalCents: totalDue + setupFeeCents,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
