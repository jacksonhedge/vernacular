'use client';

import { useDashboard } from '@/contexts/DashboardContext';
import { getStationStatus, getStationDotColor, getStationLabel, formatHeartbeat } from '@/lib/utils';

export default function StationsPage() {
  const { stations } = useDashboard();

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f8f9fb', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0c0f1a', margin: 0, letterSpacing: '-0.02em' }}>Phone Lines</h1>
          <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace" }}>{stations.length} station{stations.length === 1 ? '' : 's'}</span>
        </div>
        {stations.length === 0 ? (
          <div style={{ padding: 40, background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📱</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0c0f1a', marginBottom: 4 }}>No stations yet</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>Stations are Macs running the iMessage relay. Contact support to add one.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {stations.map(s => {
              const status = getStationStatus(s);
              return (
                <div key={s.id} style={{ padding: 16, borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: getStationDotColor(status) }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0c0f1a', flex: 1 }}>{s.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: getStationDotColor(status), textTransform: 'uppercase', letterSpacing: '0.06em' }}>{getStationLabel(status)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#0c0f1a', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{s.phone_number}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', gap: 12 }}>
                    <span>Heartbeat: {formatHeartbeat(s.last_heartbeat)}</span>
                    {s.machine_name && <span>· {s.machine_name}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
