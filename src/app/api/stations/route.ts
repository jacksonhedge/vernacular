import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';

// GET /api/stations — List stations for the authenticated user's org
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const supabase = createServiceClient();

    const { data: stations, error } = await supabase
      .from('stations')
      .select('*')
      .eq('org_id', user.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stations });
  } catch (err) {
    console.error('GET /api/stations error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/stations — Create a new station (platform admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();
    if (user.role !== 'platform_admin') return forbidden();

    const body = await req.json();
    const { name, phone_number, apple_id, org_id } = body;

    if (!name || !phone_number) {
      return NextResponse.json(
        { error: 'name and phone_number are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: station, error } = await supabase
      .from('stations')
      .insert({
        name,
        phone_number,
        apple_id: apple_id || null,
        org_id: org_id || user.org_id,
        status: 'offline',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ station }, { status: 201 });
  } catch (err) {
    console.error('POST /api/stations error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
