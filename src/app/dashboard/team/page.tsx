'use client';

import { useDashboard } from '@/contexts/DashboardContext';

export default function TeamPage() {
  const { teamMembers } = useDashboard();

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f8f9fb', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0c0f1a', margin: 0, letterSpacing: '-0.02em' }}>Team</h1>
          <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace" }}>{teamMembers.length} member{teamMembers.length === 1 ? '' : 's'}</span>
        </div>
        {teamMembers.length === 0 ? (
          <div style={{ padding: 40, background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0c0f1a', marginBottom: 4 }}>No team members yet</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>Invite teammates to collaborate on conversations and initiatives.</div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            {teamMembers.map((m, idx) => (
              <div key={m.id} style={{
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                borderBottom: idx === teamMembers.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: 'rgba(38,120,255,0.08)', color: '#2678FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                }}>
                  {(m.full_name || m.email || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0c0f1a' }}>{m.full_name || '—'}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{m.email}</div>
                </div>
                <span style={{
                  padding: '3px 9px', borderRadius: 6,
                  background: m.role === 'platform_admin' ? 'rgba(124,58,237,0.1)' : m.role === 'org_admin' ? 'rgba(38,120,255,0.1)' : 'rgba(0,0,0,0.04)',
                  color: m.role === 'platform_admin' ? '#7C3AED' : m.role === 'org_admin' ? '#2678FF' : '#6b7280',
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>{m.role.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
