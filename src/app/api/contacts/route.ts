import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/auth';

// GET /api/contacts — List contacts for the org
// Query params: search, limit, offset
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = createServiceClient();

    let query = supabase
      .from('contacts')
      .select('*')
      .eq('org_id', user.org_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      // Search by phone, first_name, last_name, or email
      query = query.or(
        `phone.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data: contacts, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contacts });
  } catch (err) {
    console.error('GET /api/contacts error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/contacts — Create or upsert a contact
// Body: { phone, first_name, last_name, email, school, greek_org, ... }
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const { phone, first_name, last_name, email, school, greek_org, tags, metadata } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'phone is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Normalize phone number (basic: strip non-digits, ensure +1 prefix)
    const normalized = normalizePhone(phone);

    // Check if contact exists
    const { data: existing } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', normalized)
      .eq('org_id', user.org_id)
      .maybeSingle();

    if (existing) {
      // Upsert: update fields that are provided
      const updates: Record<string, unknown> = {};
      if (first_name !== undefined) updates.first_name = first_name;
      if (last_name !== undefined) updates.last_name = last_name;
      if (email !== undefined) updates.email = email;
      if (school !== undefined) updates.school = school;
      if (greek_org !== undefined) updates.greek_org = greek_org;
      if (tags !== undefined) updates.tags = tags;
      if (metadata !== undefined) updates.metadata = metadata;
      updates.updated_at = new Date().toISOString();

      const { data: contact, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ contact, created: false });
    }

    // Create new contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        phone: normalized,
        first_name: first_name || null,
        last_name: last_name || null,
        email: email || null,
        school: school || null,
        greek_org: greek_org || null,
        tags: tags || [],
        metadata: metadata || {},
        org_id: user.org_id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contact, created: true }, { status: 201 });
  } catch (err) {
    console.error('POST /api/contacts error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
}
