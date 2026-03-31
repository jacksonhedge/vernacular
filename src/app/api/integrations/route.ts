import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, organizationId, provider, config, integrationId } = body;
    const supabase = createServiceClient();

    if (action === 'connect') {
      if (!organizationId || !provider || !config) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Upsert integration
      const { data, error } = await supabase.from('org_integrations').upsert({
        organization_id: organizationId,
        provider,
        enabled: true,
        config,
        status: 'connected',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,provider' }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'disconnect') {
      if (!integrationId) {
        return NextResponse.json({ error: 'Missing integration ID' }, { status: 400 });
      }

      const { error } = await supabase.from('org_integrations').update({
        enabled: false,
        status: 'disconnected',
        updated_at: new Date().toISOString(),
      }).eq('id', integrationId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
