import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/widget/config/[token] — Public config for embed script
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createServiceClient();

    const { data: config } = await supabase
      .from('widget_configs')
      .select('client_name, brand_color, greeting, station_id, is_active')
      .eq('embed_token', token)
      .single();

    if (!config || !config.is_active) {
      return NextResponse.json({ error: 'Widget not found or inactive' }, { status: 404 });
    }

    // Get station phone
    const { data: station } = await supabase
      .from('stations')
      .select('phone_number, name')
      .eq('id', config.station_id)
      .single();

    return NextResponse.json({
      client_name: config.client_name,
      brand_color: config.brand_color,
      greeting: config.greeting,
      station_phone: station?.phone_number || '',
      station_name: station?.name || '',
      is_active: config.is_active,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
