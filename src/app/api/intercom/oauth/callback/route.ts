import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { intercomAPI } from '@/lib/intercom';

const CLIENT_ID = process.env.INTERCOM_CLIENT_ID || '';
const CLIENT_SECRET = process.env.INTERCOM_CLIENT_SECRET || '';

// GET /api/intercom/oauth/callback — Exchange code for access token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const embedToken = searchParams.get('state'); // We pass embed_token as state

    if (!code) {
      return NextResponse.redirect(new URL('/dashboard?intercom=error&reason=no_code', request.url));
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.redirect(new URL('/dashboard?intercom=error&reason=not_configured', request.url));
    }

    // Exchange code for token
    const tokenRes = await fetch('https://api.intercom.io/auth/eagle/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL('/dashboard?intercom=error&reason=token_exchange_failed', request.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.token;
    const appId = tokenData.app_id || tokenData.app?.id_code;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/dashboard?intercom=error&reason=no_token', request.url));
    }

    const supabase = createServiceClient();

    // Get admin ID for posting notes later
    let adminId: string | null = null;
    try {
      const me = await intercomAPI(accessToken, '/me');
      adminId = (me.id as string) || null;
    } catch { /* optional */ }

    // Update widget config with Intercom credentials
    if (embedToken) {
      await supabase.from('widget_configs').update({
        intercom_access_token: accessToken,
        intercom_app_id: appId || null,
        intercom_admin_id: adminId,
      }).eq('embed_token', embedToken);
    }

    return NextResponse.redirect(new URL('/dashboard?intercom=connected', request.url));
  } catch (err) {
    console.error('[Intercom OAuth]', err);
    return NextResponse.redirect(new URL('/dashboard?intercom=error', request.url));
  }
}
