import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getConfigByIntercomAppId } from '@/lib/intercom';

// POST /api/intercom/canvas — Canvas Kit endpoint for Intercom Messenger
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const appId = body.app_id;

    const supabase = createServiceClient();
    const config = await getConfigByIntercomAppId(supabase, appId);

    if (!config) {
      return NextResponse.json({
        canvas: {
          content: {
            components: [
              { type: 'text', text: 'Vernacular is not configured for this workspace.', style: 'error' },
            ],
          },
        },
      });
    }

    // Get station phone
    const { data: station } = await supabase
      .from('stations')
      .select('phone_number')
      .eq('id', config.station_id)
      .single();

    const phone = station?.phone_number || '';
    const phoneDigits = phone.replace(/\D/g, '');
    const smsPhone = phoneDigits.length === 10 ? `+1${phoneDigits}` : `+${phoneDigits}`;

    // Build context from Intercom conversation
    const convId = body.context?.conversation_id || '';
    const userName = body.context?.user?.name || 'Customer';
    const contextMessage = `Re: ${config.client_name} support — ${userName} requested iMessage`;

    return NextResponse.json({
      canvas: {
        content: {
          components: [
            { type: 'text', text: '💬 Continue in iMessage', style: 'header' },
            { type: 'text', text: 'Get a direct text from our support team. Faster responses, real conversations, blue bubbles.' },
            {
              type: 'button',
              label: 'Text Us →',
              style: 'primary',
              id: 'text-us-btn',
              action: {
                type: 'url',
                url: `sms:${smsPhone}&body=${encodeURIComponent(contextMessage)}`,
              },
            },
            { type: 'spacer', size: 's' },
            { type: 'text', text: `Powered by Vernacular · ${config.client_name}`, style: 'muted' },
          ],
        },
      },
    });
  } catch (err) {
    return NextResponse.json({
      canvas: { content: { components: [{ type: 'text', text: 'Something went wrong.', style: 'error' }] } },
    }, { status: 200 }); // Always return 200 for Canvas Kit
  }
}
