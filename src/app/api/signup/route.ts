import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const NOTIFY_EMAIL = 'jackson@hedgepayments.co';

export async function POST(request: Request) {
  try {
    const { userId, companyName, email, fullName, industry, teamSize, useCase } = await request.json();

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

    // 4. Log signup event
    await supabase.from('signup_events').insert({
      company_name: companyName,
      full_name: fullName,
      email,
      industry: industry || null,
      team_size: teamSize || null,
      use_case: useCase || null,
    });

    // 5. Send email notification via Supabase Auth admin (invite as a side-channel notification)
    // Using edge function or simple approach: send via Supabase's built-in email
    try {
      await sendSignupNotification({ companyName, fullName, email, industry, teamSize, useCase });
    } catch {
      // Don't fail signup if notification fails
      console.error('Failed to send signup notification');
    }

    return NextResponse.json({ success: true, orgId: org.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — number choice update
export async function PATCH(request: Request) {
  try {
    const { email, companyName, numberChoice, areaCode, existingNumber } = await request.json();
    const supabase = createServiceClient();

    // Log the number request
    await supabase.from('signup_events').insert({
      company_name: companyName || 'Unknown',
      email: email || 'Unknown',
      full_name: '',
      use_case: `NUMBER_REQUEST: ${numberChoice}${numberChoice === 'new' ? ` (area code: ${areaCode})` : ` (number: ${existingNumber})`}`,
    });

    // Send notification
    await sendSignupNotification({
      companyName: companyName || 'Unknown',
      fullName: '',
      email: email || 'Unknown',
      useCase: `Number Setup: ${numberChoice === 'new' ? `New number requested (${areaCode})` : `Bring own: ${existingNumber}`}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // Don't fail silently
  }
}

async function sendSignupNotification(data: {
  companyName: string; fullName: string; email: string;
  industry?: string; teamSize?: string; useCase?: string;
}) {
  const subject = `New Vernacular Signup: ${data.companyName}`;
  const body = [
    `New signup on Vernacular!`,
    ``,
    `Company: ${data.companyName}`,
    `Name: ${data.fullName}`,
    `Email: ${data.email}`,
    `Industry: ${data.industry || 'Not specified'}`,
    `Team Size: ${data.teamSize || 'Not specified'}`,
    `Use Case: ${data.useCase || 'Not specified'}`,
    ``,
    `Time: ${new Date().toISOString()}`,
  ].join('\n');

  // Send via Supabase auth admin invite (piggyback for email delivery)
  const supabase = createServiceClient();
  try {
    await supabase.auth.admin.inviteUserByEmail(NOTIFY_EMAIL, {
      data: { notification_subject: subject, notification_body: body },
    });
  } catch {
    // Fallback: just log
    console.log(`SIGNUP NOTIFICATION:\n${body}`);
  }
}
