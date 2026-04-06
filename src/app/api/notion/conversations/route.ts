import { NextResponse } from 'next/server';

// This endpoint previously served mock demo conversations.
// All conversation data now comes from Supabase via /api/conversations/list.
// This endpoint is kept for backwards compatibility but returns empty data.

export async function GET() {
  return NextResponse.json({ conversations: [], messages: [] });
}
