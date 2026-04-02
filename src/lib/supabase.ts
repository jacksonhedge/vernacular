import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client-side Supabase (browser)
// NEXT_PUBLIC_ vars are embedded at build time by Next.js
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase with service role (API routes only — never called at build time)
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — check Vercel env vars');
  return createClient(url, serviceKey);
}
