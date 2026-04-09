import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/contacts/by-initiative?initiativeId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const initiativeId = searchParams.get('initiativeId');
  if (!initiativeId) return NextResponse.json({ error: 'initiativeId required' }, { status: 400 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('initiative_contacts')
    .select('contact_id, contacts(id, full_name, phone, email, state, greek_org, apps_used, device_types, ambassador_interest)')
    .eq('initiative_id', initiativeId)
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contacts = (data || [])
    .map((row: Record<string, unknown>) => row.contacts)
    .filter(Boolean);

  return NextResponse.json({ contacts, count: contacts.length });
}
