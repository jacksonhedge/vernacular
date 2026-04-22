import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { to, subject, body, fromName, contactName, organizationId } = await req.json();
    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'to, subject, body are required' }, { status: 400 });
    }

    const fromLabel = fromName ? `${fromName} via Vernacular` : 'Vernacular';
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: `${fromLabel} <${fromAddress}>`,
      to: [to],
      subject,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;line-height:1.6;color:#111;">
        ${body.split('\n').map((line: string) => `<p style="margin:0 0 12px;">${line || '&nbsp;'}</p>`).join('')}
      </div>`,
    });

    if (error) {
      console.error('[email/send] Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const supabase = createServiceClient();
    await supabase.from('sent_emails').insert({
      organization_id: organizationId,
      contact_name: contactName || null,
      to_email: to,
      from_email: fromAddress,
      subject,
      body,
      status: 'sent',
      resend_id: data?.id || null,
    });

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error('[email/send]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
