import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/auth';

// PATCH /api/profile — Update user profile fields
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const { userId, full_name, phone, job_title, linkedin_url, twitter_handle, timezone, bio, location } = body;

    // Users can only update their own profile
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: cannot update another user' }, { status: 403 });
    }

    const supabase = createServiceClient();

    const updates: Record<string, unknown> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (job_title !== undefined) updates.job_title = job_title;
    if (linkedin_url !== undefined) updates.linkedin_url = linkedin_url;
    if (twitter_handle !== undefined) updates.twitter_handle = twitter_handle;
    if (timezone !== undefined) updates.timezone = timezone;
    if (bio !== undefined) updates.bio = bio;
    if (location !== undefined) updates.location = location;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
