import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client-side Supabase (browser)
// NEXT_PUBLIC_ vars are embedded at build time by Next.js
export const supabase = createClient(
  supabaseUrl || 'https://miuyksnwzkhiyyilchjs.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdXlrc253emtoaXl5aWxjaGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODcwNzcsImV4cCI6MjA5MDQ2MzA3N30.D9-XO0-XgxpzwygqbYYutCIWEuBsd80KGCthJOp5OeQ'
);

// Server-side Supabase with service role (API routes only — never called at build time)
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase env vars not set');
  return createClient(url, serviceKey);
}
