'use client';

import { useDashboard } from '@/contexts/DashboardContext';

export default function InitiativesPage() {
  const { dbInitiatives, initiativeContactCounts, setActiveInitiativeFilter } = useDashboard();

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f8f9fb', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0c0f1a', letterSpacing: '-0.02em', margin: 0 }}>
            Initiatives
          </h1>
          <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace" }}>
            {dbInitiatives.length} total
          </span>
        </div>
        {dbInitiatives.length === 0 ? (
          <div style={{
            padding: 40, background: '#fff', borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⭐</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0c0f1a', marginBottom: 4 }}>
              No initiatives yet
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>
              Ask Craig to create one, or upload a CSV from the Craig panel (📄).
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {dbInitiatives.map(init => {
              const count = initiativeContactCounts[init.id] || 0;
              return (
                <button key={init.id}
                  onClick={() => setActiveInitiativeFilter(init.id)}
                  style={{
                    textAlign: 'left', padding: 16, borderRadius: 12,
                    background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
                    cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>⭐</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0c0f1a' }}>{init.title}</div>
                  </div>
                  {init.content && (
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {init.content}
                    </div>
                  )}
                  <div style={{
                    display: 'inline-flex', padding: '3px 9px', borderRadius: 6,
                    background: 'rgba(38,120,255,0.08)', color: '#2678FF',
                    fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {count} contact{count === 1 ? '' : 's'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
