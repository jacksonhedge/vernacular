/**
 * Credit tracking and deduction for Vernacular billing.
 * Every billable action goes through this module.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// Credit costs per action
export const CREDIT_COSTS = {
  send_imessage: 3,
  send_email: 3,
  receive_message: 0,
  new_contact: 250,
  new_contact_widget: 300,
  ai_draft: 15,
  ai_auto_response: 20,
  ai_sentiment: 10,
  widget_handoff: 50,
  contact_enrichment: 500,
  bulk_blast: 5,
  contact_import: 250,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

/**
 * Deduct credits from an organization's balance.
 * Logs the usage to credit_usage table.
 * Returns true if credits were available, false if over limit.
 */
export async function deductCredits(
  supabase: SupabaseClient,
  orgId: string,
  action: CreditAction,
  description?: string,
  contactId?: string,
  messageId?: string,
): Promise<{ success: boolean; creditsUsed: number; remaining: number }> {
  const cost = CREDIT_COSTS[action];

  if (cost === 0) return { success: true, creditsUsed: 0, remaining: -1 };

  // Log the usage
  await supabase.from('credit_usage').insert({
    organization_id: orgId,
    action,
    credits_used: cost,
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

  const newUsed = (org?.credits_used_this_month || 0) + cost;
  const balance = org?.credits_balance || 50000;

  await supabase
    .from('organizations')
    .update({ credits_used_this_month: newUsed })
    .eq('id', orgId);

  return {
    success: true,
    creditsUsed: cost,
    remaining: balance - newUsed,
  };
}

/**
 * Get credit usage summary for an organization
 */
export async function getCreditSummary(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{
  balance: number;
  used: number;
  remaining: number;
  breakdown: Record<string, number>;
}> {
  const { data: org } = await supabase
    .from('organizations')
    .select('credits_balance, credits_used_this_month')
    .eq('id', orgId)
    .single();

  const balance = org?.credits_balance || 50000;
  const used = org?.credits_used_this_month || 0;

  // Get breakdown by action type this month
  const { data: usage } = await supabase
    .from('credit_usage')
    .select('action, credits_used')
    .eq('organization_id', orgId)
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const breakdown: Record<string, number> = {};
  for (const row of usage || []) {
    breakdown[row.action] = (breakdown[row.action] || 0) + row.credits_used;
  }

  return { balance, used, remaining: balance - used, breakdown };
}
