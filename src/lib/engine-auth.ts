import { NextRequest } from 'next/server';
import { createServiceClient } from './supabase';

export interface EngineKeyData {
  id: string;
  org_id: string;
  key_prefix: string;
  revoked: boolean;
  last_used_at: string | null;
  organizations: {
    id: string;
    name: string;
    slug: string;
    settings: Record<string, unknown>;
  };
}

export async function verifyEngineKey(req: NextRequest): Promise<EngineKeyData | null> {
  const key = req.headers.get('x-engine-key');
  if (!key) return null;

  const supabase = createServiceClient();

  // In production, compare bcrypt hash. For now, compare prefix.
  const prefix = key.substring(0, 8);
  const { data } = await supabase
    .from('api_keys')
    .select('*, organizations(*)')
    .eq('key_prefix', prefix)
    .eq('revoked', false)
    .single();

  if (!data) return null;

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return data as EngineKeyData;
}
