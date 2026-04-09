/**
 * Vernacular Billing — Usage-based pricing with monthly minimums.
 *
 * Pricing Model:
 * - VIP Manager:     $1,500/mo minimum per line, overage billed per action
 * - Sales/Outreach:  $1,500/mo minimum per seat, overage billed per action
 * - App Testing:     $1,222/mo minimum per seat, overage billed per action
 * - Customer Support: $1,000 setup fee (+$1,000 AI), then $1.25 per resolved ticket (no monthly minimum)
 *
 * Usage costs (included in monthly minimum, overage charged above):
 * - New conversation opened:        $0.99
 * - Text sent (human):              $0.03
 * - Text received:                  $0.00 (free)
 * - AI draft generated:             $0.10
 * - AI draft approved & sent:       $0.17
 * - AI auto-send:                   $0.25
 * - Support ticket resolved:        $1.25
 * - Contact import:                 $0.07
 * - Widget handoff to iMessage:     $0.50
 */

import { SupabaseClient } from '@supabase/supabase-js';

// Costs in cents per action
export const ACTION_COSTS_CENTS = {
  new_conversation: 99,        // $0.99
  send_imessage: 0.1,          // $0.001
  send_email: 0.1,             // $0.001
  receive_message: 0,          // free
  ai_draft: 0.31,              // $0.0031
  ai_response_sent: 1,         // $0.01 — AI wrote AND it was sent
  ai_auto_response: 25,        // $0.25
  ai_draft_approved: 17,       // $0.17
  support_ticket_resolved: 125, // $1.25
  contact_import: 7,           // $0.07
  new_contact: 7,              // $0.07
  new_contact_widget: 7,       // $0.07
  widget_handoff: 50,          // $0.50
  ai_sentiment: 5,             // $0.05
  contact_enrichment: 25,      // $0.25
  bulk_blast: 5,               // $0.05
  ai_chat: 10,                 // $0.10
  ai_chat_history_load: 5,     // $0.05 — loading previous AI chat
  ai_tone_analysis: 50,        // $0.50 — tone profile generation
  ai_contact_update: 1,        // $0.01 — AI-initiated contact update
} as const;

// Monthly minimums in cents by account type
export const MONTHLY_MINIMUMS_CENTS: Record<string, number> = {
  vip_manager: 150000,        // $1,500
  sales_outreach: 150000,     // $1,500
  app_testing: 122200,        // $1,222
  customer_support: 0,        // No monthly minimum (per-ticket only)
  general: 0,                 // No minimum
};

// Setup fees in cents
export const SETUP_FEES_CENTS: Record<string, number> = {
  vip_manager: 100000,        // $1,000 base setup
  sales_outreach: 100000,     // $1,000 base setup
  app_testing: 100000,        // $1,000 base setup
  customer_support: 100000,   // $1,000 base setup
  general: 0,
};

// AI setup fee — additional $1,000 if client wants AI messaging
export const AI_SETUP_FEE_CENTS = 100000; // $1,000

export type BillingAction = keyof typeof ACTION_COSTS_CENTS;

// Legacy alias
export const CREDIT_COSTS = ACTION_COSTS_CENTS;
export type CreditAction = BillingAction;

/**
 * Log a billable action and update the org's running total.
 */
/**
 * Check if an org's billing is in good standing.
 */
export async function checkBillingStatus(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_status, demo_expires_at')
    .eq('id', orgId)
    .single();

  const status = org?.subscription_status || 'active';

  if (status === 'canceled') return { allowed: false, reason: 'subscription_canceled' };
  if (status === 'demo') {
    const expires = org?.demo_expires_at ? new Date(org.demo_expires_at) : null;
    if (expires && expires < new Date()) return { allowed: false, reason: 'demo_expired' };
  }
  // past_due gets a 7-day grace period (handled by admin manually)

  return { allowed: true };
}

export async function deductCredits(
  supabase: SupabaseClient,
  orgId: string,
  action: BillingAction,
  description?: string,
  contactId?: string,
  messageId?: string,
): Promise<{ success: boolean; creditsUsed: number; remaining: number; costCents: number; blocked?: boolean; reason?: string }> {
  const costCents = ACTION_COSTS_CENTS[action] || 0;

  if (costCents === 0) return { success: true, creditsUsed: 0, remaining: -1, costCents: 0 };

  // Check billing status
  const billing = await checkBillingStatus(supabase, orgId);
  if (!billing.allowed) {
    return { success: false, creditsUsed: 0, remaining: 0, costCents: 0, blocked: true, reason: billing.reason };
  }

  // Log the usage with dollar amount
  await supabase.from('credit_usage').insert({
    organization_id: orgId,
    action,
    credits_used: costCents,
    description: description || action.replace(/_/g, ' '),
    contact_id: contactId || null,
    message_id: messageId || null,
  });

  // Update org running total
  const { data: org } = await supabase
    .from('organizations')
    .select('credits_used_this_month, credits_balance')
    .eq('id', orgId)
    .single();

  const newUsed = (org?.credits_used_this_month || 0) + costCents;
  const balance = org?.credits_balance || 0;

  await supabase
    .from('organizations')
    .update({ credits_used_this_month: newUsed })
    .eq('id', orgId);

  return {
    success: true,
    creditsUsed: costCents,
    remaining: balance - newUsed,
    costCents,
  };
}

/**
 * Get billing summary for an organization.
 * Shows monthly minimum, usage, overage.
 */
export async function getCreditSummary(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{
  monthlyMinimumCents: number;
  usageCents: number;
  overageCents: number;
  totalDueCents: number;
  breakdown: Record<string, { count: number; totalCents: number }>;
}> {
  const { data: org } = await supabase
    .from('organizations')
    .select('credits_used_this_month, account_type')
    .eq('id', orgId)
    .single();

  const usageCents = org?.credits_used_this_month || 0;

  // Sum monthly minimums across all active subscriptions (not max)
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('solution_type, quantity, monthly_minimum_cents')
    .eq('organization_id', orgId)
    .eq('status', 'active');

  const monthlyMinimumCents = (subs || []).reduce(
    (sum, s) => sum + (s.monthly_minimum_cents * (s.quantity || 1)), 0
  );

  // Overage = usage above monthly minimum (only if there IS a minimum)
  const overageCents = monthlyMinimumCents > 0
    ? Math.max(0, usageCents - monthlyMinimumCents)
    : 0;

  // Total due = max(minimum, usage) for seat-based, or just usage for per-ticket
  const totalDueCents = monthlyMinimumCents > 0
    ? Math.max(monthlyMinimumCents, usageCents)
    : usageCents;

  // Get breakdown by action type this month
  const { data: usage } = await supabase
    .from('credit_usage')
    .select('action, credits_used')
    .eq('organization_id', orgId)
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const breakdown: Record<string, { count: number; totalCents: number }> = {};
  for (const row of usage || []) {
    if (!breakdown[row.action]) breakdown[row.action] = { count: 0, totalCents: 0 };
    breakdown[row.action].count++;
    breakdown[row.action].totalCents += row.credits_used;
  }

  return { monthlyMinimumCents, usageCents, overageCents, totalDueCents, breakdown };
}
