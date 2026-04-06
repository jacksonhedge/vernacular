import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email, fullName, role, organizationId } = await request.json();

    if (!email || !fullName || !organizationId) {
      return NextResponse.json({ error: 'email, fullName, and organizationId are required' }, { status: 400 });
    }

    const validRole = ['admin', 'member'].includes(role) ? role : 'member';
    const supabase = createServiceClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      return NextResponse.json({ error: 'User already exists in this organization' }, { status: 409 });
    }

    // Generate temp password
    const tempPassword = `Vernacular${Date.now().toString(36)}!`;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError) {
      // User might already exist in auth but not in this org
      if (authError.message?.includes('already been registered')) {
        // Look up existing auth user
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingAuth = users?.find(u => u.email === email);
        if (existingAuth) {
          // Add to this org
          const { error: userErr } = await supabase.from('users').insert({
            auth_id: existingAuth.id,
            organization_id: organizationId,
            email,
            full_name: fullName,
            role: validRole,
          });
          if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
          return NextResponse.json({
            success: true,
            message: 'Existing user added to organization',
            needsPasswordReset: false,
          });
        }
      }
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create user record in org
    const { error: userError } = await supabase.from('users').insert({
      auth_id: authData.user.id,
      organization_id: organizationId,
      email,
      full_name: fullName,
      role: validRole,
    });

    if (userError) {
      // Cleanup: delete auth user if org record fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Log the invite
    await supabase.from('signup_events').insert({
      company_name: 'Team Invite',
      full_name: fullName,
      email,
      use_case: `Invited as ${validRole} to org ${organizationId}`,
    });

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      tempPassword,
      message: `${fullName} has been invited. Share the temporary password securely.`,
      needsPasswordReset: true,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}
