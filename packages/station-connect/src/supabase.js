import { createClient } from '@supabase/supabase-js';

// Credentials loaded from environment or ~/vernacular/.env
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

let client = null;

export function getSupabaseClient() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export function getSupabaseUrl() {
  return SUPABASE_URL;
}

export function getServiceKey() {
  return SUPABASE_SERVICE_KEY;
}

/**
 * Look up a station by phone number.
 * Returns the station row or null if not found.
 */
export async function lookupStation(phoneNumber) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase lookup failed: ${error.message}`);
  }
  return data;
}

/**
 * Insert or update a station record.
 */
export async function upsertStation(stationData) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('stations')
    .upsert(stationData, { onConflict: 'phone_number' })
    .select()
    .single();

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
  return data;
}

/**
 * Get full station config including org settings.
 */
export async function getStationConfig(phoneNumber) {
  const supabase = getSupabaseClient();

  const { data: station, error: stationError } = await supabase
    .from('stations')
    .select('*, organizations(*)')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (stationError) {
    throw new Error(`Config lookup failed: ${stationError.message}`);
  }
  return station;
}
