import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { formatPhone, phoneOrFilter } from '@/lib/phone';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const supabase = createServiceClient();

    // VCF import
    if (contentType.includes('text/vcard') || contentType.includes('text/x-vcard') || contentType.includes('application/json')) {
      const body = await request.json();
      const { organizationId, contacts: contactsData, source } = body;

      if (!organizationId || !contactsData || !Array.isArray(contactsData)) {
        return NextResponse.json({ error: 'Missing organizationId or contacts array' }, { status: 400 });
      }

      const results = { imported: 0, skipped: 0, errors: [] as string[] };

      for (const contact of contactsData) {
        try {
          // Check for duplicate by phone
          if (contact.phone) {
            contact.phone = formatPhone(contact.phone);
            const { data: existing } = await supabase
              .from('contacts')
              .select('id')
              .eq('organization_id', organizationId)
              .or(phoneOrFilter(contact.phone))
              .limit(1);

            if (existing && existing.length > 0) {
              // If source is 'edit', update the existing contact
              if (source === 'edit') {
                const updateData: Record<string, unknown> = {};
                const fullName = contact.fullName || contact.full_name;
                if (fullName) {
                  updateData.full_name = fullName;
                  const parts = fullName.split(' ');
                  updateData.first_name = parts[0] || null;
                  updateData.last_name = parts.slice(1).join(' ') || null;
                }
                if (contact.email) updateData.email = contact.email;
                if (contact.company) updateData.company = contact.company;
                if (contact.jobTitle || contact.job_title) updateData.job_title = contact.jobTitle || contact.job_title;
                if (contact.linkedinUrl || contact.linkedin_url) updateData.linkedin_url = contact.linkedinUrl || contact.linkedin_url;
                if (Object.keys(updateData).length > 0) {
                  await supabase.from('contacts').update(updateData).eq('id', existing[0].id);
                  results.imported++;
                } else {
                  results.skipped++;
                }
                continue;
              }
              results.skipped++;
              continue;
            }
          }

          const { error } = await supabase.from('contacts').insert({
            organization_id: organizationId,
            phone: contact.phone || '',
            first_name: contact.firstName || contact.first_name || null,
            last_name: contact.lastName || contact.last_name || null,
            full_name: contact.fullName || contact.full_name || [contact.firstName || contact.first_name, contact.lastName || contact.last_name].filter(Boolean).join(' ') || null,
            email: contact.email || null,
            company: contact.company || contact.organization || null,
            job_title: contact.jobTitle || contact.job_title || contact.title || null,
            linkedin_url: contact.linkedinUrl || contact.linkedin_url || contact.linkedin || null,
            instagram_handle: contact.instagram || contact.instagram_handle || null,
            twitter_handle: contact.twitter || contact.twitter_handle || null,
            website: contact.website || contact.url || null,
            address: contact.address || null,
            city: contact.city || null,
            state: contact.state || null,
            zip: contact.zip || null,
            school: contact.school || null,
            greek_org: contact.greekOrg || contact.greek_org || null,
            venmo_handle: contact.venmo || contact.venmo_handle || null,
            notes: contact.notes || null,
            tags: contact.tags || [],
            source: source || contact.source || 'manual',
            import_source: source || 'manual',
            referred_by: contact.referredBy || contact.referred_by || null,
            apps_used: contact.appsUsed || contact.apps_used || null,
            ambassador_interest: contact.ambassadorInterest || contact.ambassador_interest || null,
            dob: contact.dob || contact.birthday || null,
          });

          if (error) {
            results.errors.push(`${contact.fullName || contact.phone}: ${error.message}`);
          } else {
            results.imported++;
          }
        } catch (err) {
          results.errors.push(`${contact.fullName || contact.phone}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      return NextResponse.json({
        success: true,
        imported: results.imported,
        skipped: results.skipped,
        errors: results.errors,
        total: contactsData.length,
      });
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Import failed' }, { status: 500 });
  }
}

// Parse VCF string into contact objects
function parseVCF(vcfString: string): Array<Record<string, string>> {
  const contacts: Array<Record<string, string>> = [];
  const cards = vcfString.split('BEGIN:VCARD').filter(c => c.trim());

  for (const card of cards) {
    const contact: Record<string, string> = {};
    const lines = card.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      if (line.startsWith('END:VCARD')) continue;
      if (line.startsWith('VERSION:')) continue;

      if (line.startsWith('FN:') || line.startsWith('FN;')) {
        contact.fullName = line.split(':').slice(1).join(':').trim();
      } else if (line.startsWith('N:') || line.startsWith('N;')) {
        const parts = line.split(':').slice(1).join(':').split(';');
        contact.lastName = parts[0]?.trim() || '';
        contact.firstName = parts[1]?.trim() || '';
      } else if (line.startsWith('TEL') && line.includes(':')) {
        contact.phone = line.split(':').slice(1).join(':').trim();
      } else if (line.startsWith('EMAIL') && line.includes(':')) {
        contact.email = line.split(':').slice(1).join(':').trim();
      } else if (line.startsWith('ORG:') || line.startsWith('ORG;')) {
        contact.company = line.split(':').slice(1).join(':').replace(/;/g, ', ').trim();
      } else if (line.startsWith('TITLE:') || line.startsWith('TITLE;')) {
        contact.jobTitle = line.split(':').slice(1).join(':').trim();
      } else if (line.startsWith('URL') && line.includes(':')) {
        const url = line.split(':').slice(1).join(':').trim();
        if (url.includes('linkedin.com')) {
          contact.linkedinUrl = url;
        } else if (url.includes('instagram.com')) {
          contact.instagram = url.replace(/.*instagram\.com\//, '').replace(/\/$/, '');
        } else if (url.includes('twitter.com') || url.includes('x.com')) {
          contact.twitter = url.replace(/.*(?:twitter|x)\.com\//, '').replace(/\/$/, '');
        } else {
          contact.website = url;
        }
      } else if (line.startsWith('ADR') && line.includes(':')) {
        const parts = line.split(':').slice(1).join(':').split(';');
        contact.address = [parts[2], parts[3], parts[4], parts[5]].filter(Boolean).join(', ').trim();
        contact.city = parts[3]?.trim() || '';
        contact.state = parts[4]?.trim() || '';
        contact.zip = parts[5]?.trim() || '';
      } else if (line.startsWith('BDAY:')) {
        contact.dob = line.split(':')[1]?.trim() || '';
      } else if (line.startsWith('NOTE:') || line.startsWith('NOTE;')) {
        contact.notes = line.split(':').slice(1).join(':').trim();
      }
    }

    if (contact.fullName || contact.phone || contact.email) {
      contacts.push(contact);
    }
  }

  return contacts;
}
