import { NextResponse } from 'next/server';

// AI auto-respond is FULLY DISABLED — re-enable when ready for production
// Full implementation preserved in git history
export async function POST() {
  return NextResponse.json({ ok: false, error: 'AI auto-respond is disabled' }, { status: 503 });
}
