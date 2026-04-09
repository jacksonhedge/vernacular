import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/contacts/by-initiative?initiativeId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const initiativeId = searchParams.get('initiativeId');
    if (!initiativeId) return NextResponse.json({ error: 'initiativeId required' }, { status: 400 });

    const supabase = createServiceClient();

    // Get contact IDs from junction table
    const { data: links, error: linkErr } = await supabase
      .from('initiative_contacts')
      .select('contact_id')
      .eq('initiative_id', initiativeId)
      .limit(500);

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
    if (!links || links.length === 0) return NextResponse.json({ contacts: [], count: 0 });

    const contactIds = links.map(l => l.contact_id).filter(Boolean);

    // Fetch contacts by IDs
    const { data: contacts, error: contactErr } = await supabase
      .from('contacts')
      .select('id, full_name, phone, email, state, greek_org, apps_used, device_types, ambassador_interest')
      .in('id', contactIds);

    if (contactErr) return NextResponse.json({ error: contactErr.message }, { status: 500 });

    return NextResponse.json({ contacts: contacts || [], count: (contacts || []).length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
