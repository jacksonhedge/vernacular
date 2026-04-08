import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/widget/session — Create or resume a widget conversation
export async function POST(request: Request) {
  try {
    const { embed_token, session_id, visitor_name, visitor_email } = await request.json();

    if (!embed_token || !session_id) {
      return NextResponse.json({ error: 'embed_token and session_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Validate embed token
    const { data: config } = await supabase
      .from('widget_configs')
      .select('id, station_id, client_name, brand_color, greeting, is_active')
      .eq('embed_token', embed_token)
      .eq('is_active', true)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Invalid or inactive widget' }, { status: 404 });
    }

    // Get station phone
    const { data: station } = await supabase
      .from('stations')
      .select('phone_number')
      .eq('id', config.station_id)
      .single();

    // Check for existing session
    const { data: existing } = await supabase
      .from('widget_conversations')
      .select('id')
      .eq('widget_config_id', config.id)
      .eq('session_id', session_id)
      .eq('status', 'open')
      .limit(1);

    let conversationId: string;

    if (existing && existing.length > 0) {
      conversationId = existing[0].id;
    } else {
      const { data: newConv } = await supabase
        .from('widget_conversations')
        .insert({
          widget_config_id: config.id,
          station_id: config.station_id,
          session_id,
          source: 'widget',
          visitor_name: visitor_name || null,
          visitor_email: visitor_email || null,
          status: 'open',
        })
        .select('id')
        .single();

      conversationId = newConv?.id || '';
    }

    return NextResponse.json({
      conversation_id: conversationId,
      greeting: config.greeting,
      brand_color: config.brand_color,
      client_name: config.client_name,
      station_phone: station?.phone_number || '',
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
