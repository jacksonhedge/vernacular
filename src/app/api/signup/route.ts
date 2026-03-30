import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { userId, companyName, email, fullName } = await request.json();

    if (!userId || !companyName || !email || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Create organization
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: companyName, slug, plan: 'starter' })
      .select()
      .single();

    if (orgError) {
      return NextResponse.json({ error: 'Failed to create organization: ' + orgError.message }, { status: 500 });
    }

    // 2. Create user record
    const { error: userError } = await supabase
      .from('users')
      .insert({
        auth_id: userId,
        organization_id: org.id,
        email,
        full_name: fullName,
        role: 'owner',
      });

    if (userError) {
      // Cleanup: delete the org we just created
      await supabase.from('organizations').delete().eq('id', org.id);
      return NextResponse.json({ error: 'Failed to create user: ' + userError.message }, { status: 500 });
    }

    // 3. Create org settings
    await supabase.from('org_settings').insert({
      organization_id: org.id,
      company_name: companyName,
      ai_auto_draft: true,
      ai_model: 'claude-sonnet-4-20250514',
    });

    return NextResponse.json({ success: true, orgId: org.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
