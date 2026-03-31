import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vernacular-admin-2026';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Fetch all platform data
    const [orgsRes, usersRes, stationsRes, signupsRes, integrationsRes] = await Promise.all([
      supabase.from('organizations').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('stations').select('*').order('created_at', { ascending: false }),
      supabase.from('signup_events').select('*').order('created_at', { ascending: false }),
      supabase.from('org_integrations').select('*'),
    ]);

    // Message and conversation counts
    const [msgCountRes, convCountRes, contactCountRes] = await Promise.all([
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
      supabase.from('contacts').select('id', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      organizations: orgsRes.data || [],
      users: usersRes.data || [],
      stations: stationsRes.data || [],
      signups: signupsRes.data || [],
      integrations: integrationsRes.data || [],
      counts: {
        messages: msgCountRes.count || 0,
        conversations: convCountRes.count || 0,
        contacts: contactCountRes.count || 0,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
