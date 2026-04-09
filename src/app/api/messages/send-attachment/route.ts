import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/messages/send-attachment — Upload file + queue outbound message
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const phoneNumber = formData.get('phoneNumber') as string;
    const contactName = formData.get('contactName') as string;
    const organizationId = formData.get('organizationId') as string;
    const message = (formData.get('message') as string) || '';

    if (!file || !phoneNumber) {
      return NextResponse.json({ error: 'file and phoneNumber required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Upload to Supabase Storage
    const ts = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `outbound/${ts}_${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await supabase.storage
      .from('attachments')
      .upload(storagePath, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) {
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(storagePath);
    const attachmentUrl = urlData.publicUrl;

    // Determine attachment type
    let attachmentType = 'file';
    if (file.type.startsWith('image/')) attachmentType = 'image';
    else if (file.type.startsWith('video/')) attachmentType = 'video';
    else if (file.type.includes('pdf')) attachmentType = 'pdf';

    // Find station
    const { data: stations } = await supabase
      .from('stations')
      .select('id, name, phone_number')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(1);

    const station = stations?.[0];
    const stationName = station?.name || 'Wade';

    // Create message record
    const msgText = message || `[${attachmentType.toUpperCase()}: ${file.name}]`;
    const { data: msgData } = await supabase.from('messages').insert({
      message: msgText,
      contact_phone: phoneNumber,
      direction: 'Outbound',
      station: stationName,
      status: 'Queued',
      source_system: 'vernacular-web',
      attachment_type: attachmentType,
      attachment_name: file.name,
      attachment_url: attachmentUrl,
    }).select('id').single();

    // Queue for outbound delivery
    await supabase.from('outbound_queue').insert({
      station_name: stationName,
      contact_phone: phoneNumber,
      contact_name: contactName,
      message: msgText,
      status: 'queued',
      source_system: 'vernacular-web',
      organization_id: organizationId,
      message_id: msgData?.id,
      attachment_url: attachmentUrl,
    });

    return NextResponse.json({
      success: true,
      messageId: msgData?.id,
      attachmentUrl,
      text: msgText,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
