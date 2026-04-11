'use client';
import { useDashboard } from '@/contexts/DashboardContext';
import { fmtMsgTime, normalizePhone } from '@/lib/utils';

export default function SummaryPage() {
  const { allConversations, contacts, activeInitiativeFilter, initiativePhones } = useDashboard();

  const rows = allConversations
    .filter(col => col.contact && col.messages.length > 0)
    .filter(col => {
      if (!activeInitiativeFilter) return true;
      return initiativePhones.has(normalizePhone(col.contact?.phone || ''));
    })
    .map(col => {
      const lastMsg = col.messages[col.messages.length - 1];
      const inbound = col.messages.filter(m => m.direction === 'incoming').length;
      const outbound = col.messages.filter(m => m.direction === 'outgoing').length;
      return {
        id: col.id,
        name: col.contact?.name || 'Unknown',
        phone: col.contact?.phone || '',
        lastMessage: lastMsg?.text || '',
        lastTime: lastMsg?.timestamp || '',
        total: col.messages.length,
        inbound, outbound,
        responseRate: inbound > 0 ? Math.round((outbound / inbound) * 100) : 0,
        status: lastMsg?.direction === 'incoming' ? 'Awaiting Reply' : lastMsg?.isAIDraft ? 'AI Draft' : 'Active',
      };
    })
    .sort((a, b) => {
      if (a.status === 'Awaiting Reply' && b.status !== 'Awaiting Reply') return -1;
      if (a.status !== 'Awaiting Reply' && b.status === 'Awaiting Reply') return 1;
      return 0;
    });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        height: 56, minHeight: 56, background: '#fff',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', padding: '0 24px',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0c0f1a', margin: 0 }}>Summary</h2>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', background: 'rgba(0,0,0,0.04)', padding: '3px 10px', borderRadius: 6, marginLeft: 12, fontFamily: "'JetBrains Mono', monospace" }}>
          {rows.length} conversations
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fb', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              {['Contact', 'Phone', 'Last Message', 'Messages', 'Response Rate', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.01)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0c0f1a' }}>{row.name}</td>
                <td style={{ padding: '12px 16px', color: '#2678FF', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{row.phone}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.lastMessage}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{row.total}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: row.responseRate > 50 ? '#22C55E' : '#F59E0B' }}>{row.responseRate}%</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                    background: row.status === 'Awaiting Reply' ? 'rgba(34,197,94,0.1)' : row.status === 'AI Draft' ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.04)',
                    color: row.status === 'Awaiting Reply' ? '#22C55E' : row.status === 'AI Draft' ? '#F59E0B' : '#9ca3af',
                  }}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
