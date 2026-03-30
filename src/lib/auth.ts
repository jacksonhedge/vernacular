import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from './supabase';

export interface AuthUser {
  id: string;
  auth_id: string;
  email: string;
  role: 'platform_admin' | 'org_admin' | 'agent';
  org_id: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    settings: Record<string, unknown>;
  };
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const supabase = createServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: dbUser } = await supabase
    .from('users')
    .select('*, organizations(*)')
    .eq('auth_id', user.id)
    .single();

  return dbUser as AuthUser | null;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
