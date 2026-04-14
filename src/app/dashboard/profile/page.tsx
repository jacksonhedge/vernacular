'use client';

import { useDashboard } from '@/contexts/DashboardContext';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const { user, org } = useDashboard();
  const email = (user as Record<string, unknown> | null)?.email as string | undefined;
  const authId = (user as Record<string, unknown> | null)?.id as string | undefined;

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f8f9fb', padding: 24 }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0c0f1a', margin: '0 0 20px', letterSpacing: '-0.02em' }}>Profile</h1>
        <div style={{ padding: 20, borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.06)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(38,120,255,0.08)', color: '#2678FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800,
            }}>
              {(email || '??').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0c0f1a' }}>{email || 'Signed in'}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{(org?.name as string) || '—'}</div>
            </div>
          </div>
          <Row label="Email" value={email || '—'} />
          <Row label="Auth ID" value={authId || '—'} mono />
          <Row label="Org" value={(org?.name as string) || '—'} />
        </div>
        <button onClick={signOut} style={{
          width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)',
          background: 'rgba(239,68,68,0.05)', color: '#DC2626',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>Sign out</button>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#0c0f1a', fontWeight: 600, fontFamily: mono ? "'JetBrains Mono', monospace" : undefined, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
    </div>
  );
}
