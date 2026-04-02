import { createClient } from '@supabase/supabase-js';

// Internal tooling — credentials embedded intentionally for station setup
const SUPABASE_URL = 'https://miuyksnwzkhiyyilchjs.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdXlrc253emtoaXl5aWxjaGpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg4NzA3NywiZXhwIjoyMDkwNDYzMDc3fQ.ELbzfs92jYikwB4IcQrGBCDfSZs_gNoJeqx4jswEJuo';

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
