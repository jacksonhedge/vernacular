import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/widget/handoff — User wants to continue in iMessage
export async function POST(request: Request) {
  try {
    const { conversation_id, embed_token } = await request.json();

    if (!conversation_id || !embed_token) {
      return NextResponse.json({ error: 'conversation_id and embed_token required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Validate
    const { data: config } = await supabase
      .from('widget_configs')
      .select('id, station_id, client_name')
      .eq('embed_token', embed_token)
      .single();

    if (!config) return NextResponse.json({ error: 'Invalid widget' }, { status: 404 });

    // Get station phone
    const { data: station } = await supabase
      .from('stations')
      .select('phone_number')
      .eq('id', config.station_id)
      .single();

    const phone = station?.phone_number || '';

    // Get last 3 messages for context
    const { data: messages } = await supabase
      .from('widget_messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('sent_at', { ascending: false })
      .limit(3);

    const context = (messages || [])
      .reverse()
      .map(m => `${m.role === 'user' ? 'Me' : 'Support'}: ${m.content.substring(0, 60)}`)
      .join(' | ');

    const contextMessage = `Re: ${config.client_name} support — ${context.substring(0, 120)}`;

    // Update conversation
    await supabase.from('widget_conversations').update({
      status: 'handed_off',
      handed_off_at: new Date().toISOString(),
      resolution_method: 'imessage_handoff',
    }).eq('id', conversation_id);

    // Log system message
    await supabase.from('widget_messages').insert({
      conversation_id,
      role: 'system',
      content: 'Customer requested iMessage handoff',
    });

    // Format phone for sms: link
    const phoneDigits = phone.replace(/\D/g, '');
    const smsPhone = phoneDigits.length === 10 ? `+1${phoneDigits}` : `+${phoneDigits}`;

    return NextResponse.json({
      phone_number: phone,
      sms_link: `sms:${smsPhone}&body=${encodeURIComponent(contextMessage)}`,
      context_message: contextMessage,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
