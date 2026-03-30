import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';

// GET /api/orgs — Get current org details + settings
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const supabase = createServiceClient();

    const { data: org, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', user.org_id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ org });
  } catch (err) {
    console.error('GET /api/orgs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/orgs — Update org settings (org_admin or platform_admin only)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    if (user.role !== 'org_admin' && user.role !== 'platform_admin') {
      return forbidden();
    }

    const body = await req.json();
    const { name, settings, ai_persona, ai_enabled } = body;

    const supabase = createServiceClient();

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (settings !== undefined) updates.settings = settings;
    if (ai_persona !== undefined) updates.ai_persona = ai_persona;
    if (ai_enabled !== undefined) updates.ai_enabled = ai_enabled;
    updates.updated_at = new Date().toISOString();

    const { data: org, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', user.org_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ org });
  } catch (err) {
    console.error('PATCH /api/orgs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
