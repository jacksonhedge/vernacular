import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/contacts/update — Update contact by phone number
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, fullName, firstName, lastName, email, company, jobTitle,
            linkedin, instagram, twitter, school, greekOrg, venmo, notes } = body;

    if (!phone) {
      return NextResponse.json({ error: 'phone required' }, { status: 400 });
    }

    const supabase = createServiceClient(); // Service role — bypasses RLS

    // Find contact — try exact match first, then last 4 digits
    const digits = phone.replace(/\D/g, '');
    const d10 = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
    const formatted = d10.length === 10 ? `(${d10.slice(0,3)}) ${d10.slice(3,6)}-${d10.slice(6)}` : phone;
    const last4 = d10.slice(-4);

    let { data: contacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', formatted)
      .limit(1);

    // Fallback: ilike on last 4 digits
    if (!contacts || contacts.length === 0) {
      const { data: fallback } = await supabase
        .from('contacts')
        .select('id')
        .ilike('phone', `%${last4}%`)
        .limit(1);
      contacts = fallback;
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const contactId = contacts[0].id;

    // Build update
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (fullName) {
      updateData.full_name = fullName;
      const parts = fullName.split(' ');
      updateData.first_name = parts[0] || null;
      updateData.last_name = parts.slice(1).join(' ') || null;
    }
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (email) updateData.email = email;
    if (company) updateData.company = company;
    if (jobTitle) updateData.job_title = jobTitle;
    if (linkedin) updateData.linkedin_url = linkedin;
    if (instagram) updateData.instagram_handle = instagram;
    if (twitter) updateData.twitter_handle = twitter;
    if (school) updateData.school = school;
    if (greekOrg) updateData.greek_org = greekOrg;
    if (venmo) updateData.venmo_handle = venmo;
    if (notes) updateData.notes = notes;

    const { error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contactId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, contactId, updated: Object.keys(updateData) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
