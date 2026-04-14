'use client';

import { useDashboard } from '@/contexts/DashboardContext';

export default function SettingsPage() {
  const { org, orgId, orgSettings, soundEnabled, setSoundEnabled, aiCopilotModel, setAiCopilotModel } = useDashboard();

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f8f9fb', padding: 24 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0c0f1a', margin: '0 0 20px', letterSpacing: '-0.02em' }}>Settings</h1>

        <section style={{ padding: 20, borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Organization</div>
          <Row label="Name" value={(org?.name as string) || '—'} />
          <Row label="Org ID" value={orgId || '—'} mono />
          {orgSettings?.company_name && <Row label="Company name" value={orgSettings.company_name} />}
        </section>

        <section style={{ padding: 20, borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Craig</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0c0f1a' }}>Default model</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Persisted for your org.</div>
            </div>
            <select value={aiCopilotModel} onChange={e => setAiCopilotModel(e.target.value as typeof aiCopilotModel)} style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff',
              fontSize: 13, fontWeight: 600, color: '#0c0f1a', cursor: 'pointer', outline: 'none',
            }}>
              <optgroup label="Haiku"><option value="haiku-4.5">Haiku 4.5</option><option value="haiku-3">Haiku 3</option></optgroup>
              <optgroup label="Sonnet"><option value="sonnet-4.6">Sonnet 4.6</option><option value="sonnet-4.5">Sonnet 4.5</option></optgroup>
              <optgroup label="Opus"><option value="opus-4.6">Opus 4.6</option><option value="opus-4.5">Opus 4.5</option></optgroup>
            </select>
          </div>
          <Row label="Auto-text" value="OFF (drafts only)" />
        </section>

        <section style={{ padding: 20, borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Notifications</div>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', cursor: 'pointer' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0c0f1a' }}>Sounds</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Play a tone on incoming and sent messages.</div>
            </div>
            <input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} />
          </label>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#0c0f1a', fontWeight: 600, fontFamily: mono ? "'JetBrains Mono', monospace" : undefined }}>{value}</span>
    </div>
  );
}
