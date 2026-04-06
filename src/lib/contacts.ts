/**
 * Shared contact creation/lookup utilities for Vernacular.
 * Used across all API routes for consistent contact data.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { formatPhone, normalize10 } from './phone';
import { deductCredits } from './credits';

export interface ContactInput {
  phone: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  company?: string;
  job_title?: string;
  source?: string;
  import_source?: string;
  source_system?: string;
  organization_id?: string;
  tags?: string[];
  notes?: string;
  linkedin_url?: string;
  instagram_handle?: string;
  twitter_handle?: string;
  website?: string;
  school?: string;
  greek_org?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  address?: string;
  dob?: string;
  venmo_handle?: string;
  referred_by?: string;
  secondary_phone?: string;
  secondary_email?: string;
  timezone?: string;
  preferred_channel?: string;
  deal_value?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Find a contact by phone number using last-4-digit ilike matching.
 * Returns the contact ID and name if found.
 */
export async function findContactByPhone(
  supabase: SupabaseClient,
  phone: string
): Promise<{ id: string; full_name: string | null } | null> {
  const d10 = normalize10(phone);
  const last4 = d10.slice(-4);

  const { data } = await supabase
    .from('contacts')
    .select('id, full_name')
    .ilike('phone', `%${last4}%`)
    .limit(1);

  return data && data.length > 0 ? data[0] : null;
}

/**
 * Find or create a contact. Always uses consistent phone formatting.
 * Returns the contact ID.
 */
export async function findOrCreateContact(
  supabase: SupabaseClient,
  input: ContactInput
): Promise<string | null> {
  // Try to find existing contact
  const existing = await findContactByPhone(supabase, input.phone);
  if (existing) return existing.id;

  // Format phone consistently
  const formattedPhone = formatPhone(input.phone);

  // Build the insert data with all available fields
  const insertData: Record<string, unknown> = {
    phone: formattedPhone,
    source: input.source || 'conversation',
    import_source: input.import_source || input.source || 'conversation',
    source_system: input.source_system || 'vernacular-web',
    lifecycle_stage: 'new',
    engagement_score: 0,
    preferred_channel: input.preferred_channel || 'imessage',
    first_contacted_at: new Date().toISOString(),
  };

  // Add optional fields only if provided
  if (input.full_name) insertData.full_name = input.full_name;
  if (input.first_name) insertData.first_name = input.first_name;
  if (input.last_name) insertData.last_name = input.last_name;
  if (input.email) insertData.email = input.email;
  if (input.company) insertData.company = input.company;
  if (input.job_title) insertData.job_title = input.job_title;
  if (input.organization_id) insertData.organization_id = input.organization_id;
  if (input.tags) insertData.tags = input.tags;
  if (input.notes) insertData.notes = input.notes;
  if (input.linkedin_url) insertData.linkedin_url = input.linkedin_url;
  if (input.instagram_handle) insertData.instagram_handle = input.instagram_handle;
  if (input.twitter_handle) insertData.twitter_handle = input.twitter_handle;
  if (input.website) insertData.website = input.website;
  if (input.school) insertData.school = input.school;
  if (input.greek_org) insertData.greek_org = input.greek_org;
  if (input.city) insertData.city = input.city;
  if (input.state) insertData.state = input.state;
  if (input.zip) insertData.zip = input.zip;
  if (input.country) insertData.country = input.country;
  if (input.address) insertData.address = input.address;
  if (input.dob) insertData.dob = input.dob;
  if (input.venmo_handle) insertData.venmo_handle = input.venmo_handle;
  if (input.referred_by) insertData.referred_by = input.referred_by;
  if (input.secondary_phone) insertData.secondary_phone = input.secondary_phone;
  if (input.secondary_email) insertData.secondary_email = input.secondary_email;
  if (input.timezone) insertData.timezone = input.timezone;
  if (input.deal_value) insertData.deal_value = input.deal_value;
  if (input.metadata) insertData.metadata = input.metadata;

  // Auto-generate full_name if not provided
  if (!insertData.full_name && (input.first_name || input.last_name)) {
    insertData.full_name = [input.first_name, input.last_name].filter(Boolean).join(' ');
  }

  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('[contacts] Create failed:', error.message);
    return null;
  }

  // Deduct credits for new contact creation
  if (newContact?.id && input.organization_id) {
    const isWidget = input.source === 'widget';
    await deductCredits(
      supabase,
      input.organization_id,
      isWidget ? 'new_contact_widget' : 'new_contact',
      `New contact: ${input.full_name || input.phone}`,
      newContact.id,
    );
  }

  return newContact?.id || null;
}

/**
 * Log an activity on a contact (messaged, viewed, assigned, etc.)
 */
export async function logContactActivity(
  supabase: SupabaseClient,
  contactId: string,
  action: string,
  details?: string,
  userId?: string,
  orgId?: string,
  metadata?: Record<string, unknown>
) {
  await supabase.from('contact_activity').insert({
    contact_id: contactId,
    user_id: userId || null,
    organization_id: orgId || null,
    action,
    details: details || null,
    metadata: metadata || null,
  });
}

/**
 * Update engagement score and lifecycle stage based on an event
 */
export async function updateEngagement(
  supabase: SupabaseClient,
  contactId: string,
  event: 'sent' | 'received_reply' | 'no_reply' | 'opened' | 'clicked' | 'meeting' | 'opted_out'
) {
  // Get current contact data
  const { data: contact } = await supabase
    .from('contacts')
    .select('engagement_score, lifecycle_stage, total_messages')
    .eq('id', contactId)
    .single();

  if (!contact) return;

  let score = contact.engagement_score || 0;
  let stage = contact.lifecycle_stage || 'new';
  const updates: Record<string, unknown> = {};

  switch (event) {
    case 'sent':
      score += 5;
      if (stage === 'new') stage = 'contacted';
      updates.last_contacted_at = new Date().toISOString();
      if (!contact.total_messages) updates.first_contacted_at = new Date().toISOString();
      updates.total_messages = (contact.total_messages || 0) + 1;
      break;
    case 'received_reply':
      score += 15;
      if (stage === 'contacted') stage = 'responded';
      if (stage === 'responded') stage = 'active';
      updates.last_replied_at = new Date().toISOString();
      break;
    case 'no_reply':
      score -= 10;
      break;
    case 'opened':
      score += 3;
      break;
    case 'clicked':
      score += 10;
      break;
    case 'meeting':
      score += 20;
      if (['contacted', 'responded', 'active'].includes(stage)) stage = 'opportunity';
      break;
    case 'opted_out':
      score = 0;
      stage = 'lost';
      updates.opted_out = true;
      updates.opt_out_date = new Date().toISOString();
      break;
  }

  // Clamp score 0-100
  score = Math.max(0, Math.min(100, score));

  await supabase
    .from('contacts')
    .update({ engagement_score: score, lifecycle_stage: stage, ...updates })
    .eq('id', contactId);
}
