'use client';

const INTEGRATIONS = [
  { key: 'intercom', name: 'Intercom', description: 'Hand off live chats to iMessage for VIP customers.', status: 'available' },
  { key: 'notion', name: 'Notion', description: 'Pull knowledge from Notion pages into Craig\u2019s context.', status: 'available' },
  { key: 'gmail', name: 'Gmail', description: 'Craig reads recent email threads for a contact.', status: 'coming_soon' },
  { key: 'calendar', name: 'Google Calendar', description: 'Craig schedules follow-ups and meetings.', status: 'coming_soon' },
  { key: 'slack', name: 'Slack', description: 'Notify team when a VIP texts or a conversation goes stale.', status: 'coming_soon' },
];

export default function IntegrationsPage() {
  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f8f9fb', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0c0f1a', margin: '0 0 20px', letterSpacing: '-0.02em' }}>Integrations</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {INTEGRATIONS.map(i => (
            <div key={i.key} style={{
              padding: 16, borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0c0f1a' }}>{i.name}</div>
                <span style={{
                  padding: '3px 9px', borderRadius: 6,
                  background: i.status === 'available' ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.04)',
                  color: i.status === 'available' ? '#16A34A' : '#9ca3af',
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>{i.status === 'available' ? 'Available' : 'Soon'}</span>
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, flex: 1 }}>{i.description}</div>
              <button disabled={i.status !== 'available'} style={{
                padding: '8px 12px', borderRadius: 8, border: 'none',
                background: i.status === 'available' ? '#2678FF' : 'rgba(0,0,0,0.04)',
                color: i.status === 'available' ? '#fff' : '#9ca3af',
                fontSize: 12, fontWeight: 700,
                cursor: i.status === 'available' ? 'pointer' : 'default',
              }}>{i.status === 'available' ? 'Connect' : 'Notify me'}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
