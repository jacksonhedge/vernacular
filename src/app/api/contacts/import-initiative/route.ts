import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/contacts/import-initiative — Upload CSV, create contacts + initiative, link them
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const initiativeName = formData.get('initiativeName') as string;
    const organizationId = formData.get('organizationId') as string;

    if (!file || !initiativeName || !organizationId) {
      return NextResponse.json({ error: 'file, initiativeName, organizationId required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const csvText = await file.text();
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV has no data rows' }, { status: 400 });
    }

    // Parse headers — handle quoted fields
    const parseCSVLine = (line: string) => {
      const fields: string[] = [];
      let field = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; continue; }
        if (c === ',' && !inQ) { fields.push(field.trim()); field = ''; continue; }
        field += c;
      }
      fields.push(field.trim());
      return fields;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

    // Map common header names to contact fields
    const fieldMap: Record<string, string> = {
      'first_name': 'first_name', 'first': 'first_name', 'firstname': 'first_name',
      'last_name': 'last_name', 'last': 'last_name', 'lastname': 'last_name',
      'full_name': 'full_name', 'name': 'full_name', 'fullname': 'full_name',
      'phone': 'phone', 'phone_number': 'phone', 'phonenumber': 'phone', 'mobile': 'phone',
      'email': 'email', 'email_address': 'email',
      'state': 'state', 'which_state_are_you_living_in_': 'state',
      'address': 'address',
      'date_of_birth': 'dob', 'dob': 'dob', 'birthday': 'dob',
      'greek_org': 'greek_org', 'what_is_your_greek_org_': 'greek_org', 'fraternity': 'greek_org', 'sorority': 'greek_org',
      'venmo': 'venmo_handle', 'venmo_handle': 'venmo_handle',
      'school': 'school', 'college': 'school', 'university': 'school',
      'what_college_do_you_attend___if_none__put_na_': 'school',
      'device_type_s__you_have_access_to_test_on_': 'device_types', 'device_types': 'device_types', 'devices': 'device_types',
      'what_apps_have_you_used_before_': 'apps_used', 'apps_used': 'apps_used', 'apps': 'apps_used',
      '_optional__who_referred_you_to_this_testing_group_': 'referred_by', 'referred_by': 'referred_by', 'referral': 'referred_by',
      'ambassador_interest': 'ambassador_interest',
      'company': 'company', 'job_title': 'job_title', 'notes': 'notes',
    };

    // Map header indices to contact fields
    const colMap: Record<number, string> = {};
    headers.forEach((h, i) => {
      const mapped = fieldMap[h];
      if (mapped) colMap[i] = mapped;
    });

    // Create initiative
    const { data: initiative } = await supabase.from('org_knowledge').insert({
      organization_id: organizationId,
      title: initiativeName,
      content: `Imported from CSV: ${file.name} (${lines.length - 1} contacts)`,
      category: 'initiative',
      enabled: true,
    }).select('id').single();

    if (!initiative) {
      return NextResponse.json({ error: 'Failed to create initiative' }, { status: 500 });
    }

    let imported = 0;
    let linked = 0;
    let skipped = 0;
    const contactIds: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 2) continue;

      const record: Record<string, string> = {};
      Object.entries(colMap).forEach(([idx, field]) => {
        const val = fields[Number(idx)];
        if (val && val.trim()) record[field] = val.trim();
      });

      // Need at least a phone number
      let phone = record.phone || '';
      if (!phone) continue;

      // Format phone
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 7) continue;
      const d10 = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
      if (d10.length !== 10) continue;
      const formatted = `(${d10.slice(0, 3)}) ${d10.slice(3, 6)}-${d10.slice(6)}`;

      // Build name
      const fullName = record.full_name || (record.first_name && record.last_name
        ? `${record.first_name} ${record.last_name}` : record.first_name || '');

      // Upsert contact
      const contactData: Record<string, unknown> = {
        phone: formatted,
        organization_id: organizationId,
        import_source: 'csv',
        source: 'import',
        source_system: 'vernacular-ai-import',
      };
      if (fullName) { contactData.full_name = fullName; }
      if (record.first_name) contactData.first_name = record.first_name;
      if (record.last_name) contactData.last_name = record.last_name;
      if (record.email) contactData.email = record.email;
      if (record.state) contactData.state = record.state;
      if (record.address) contactData.address = record.address;
      if (record.greek_org) contactData.greek_org = record.greek_org;
      if (record.venmo_handle) contactData.venmo_handle = record.venmo_handle.replace(/^@/, '');
      if (record.school) contactData.school = record.school;
      if (record.device_types) contactData.device_types = record.device_types;
      if (record.apps_used) contactData.apps_used = record.apps_used;
      if (record.referred_by) contactData.referred_by = record.referred_by;
      if (record.ambassador_interest) contactData.ambassador_interest = record.ambassador_interest;
      if (record.company) contactData.company = record.company;
      if (record.job_title) contactData.job_title = record.job_title;
      if (record.notes) contactData.notes = record.notes;

      const { data: existing } = await supabase
        .from('contacts').select('id').eq('phone', formatted).limit(1);

      let contactId: string;
      if (existing && existing.length > 0) {
        contactId = existing[0].id;
        await supabase.from('contacts').update(contactData).eq('id', contactId);
        skipped++;
      } else {
        const { data: newContact } = await supabase
          .from('contacts').insert(contactData).select('id').single();
        if (!newContact) continue;
        contactId = newContact.id;
        imported++;
      }

      contactIds.push(contactId);
    }

    // Link all contacts to initiative
    if (contactIds.length > 0) {
      const linkRows = contactIds.map(cid => ({
        initiative_id: initiative.id,
        contact_id: cid,
      }));
      // Insert in batches of 50
      for (let b = 0; b < linkRows.length; b += 50) {
        const batch = linkRows.slice(b, b + 50);
        await supabase.from('initiative_contacts').insert(batch).select();
      }
      linked = contactIds.length;
    }

    return NextResponse.json({
      success: true,
      initiativeId: initiative.id,
      imported,
      linked,
      skipped,
      total: lines.length - 1,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
