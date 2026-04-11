'use client';

import { useDashboard } from '@/contexts/DashboardContext';
import { getStationStatus, formatTime } from '@/lib/utils';

export default function DashboardHome() {
  const {
    metrics, recentMessages, stations, contacts,
    stationOverride, allConversations,
  } = useDashboard();

  const allMetricsZero = metrics.messagesToday === 0 && metrics.messagesAllTime === 0
    && metrics.responseRate === 0 && metrics.activeConversations === 0;

  const metricCards = [
    {
      label: 'Messages Sent',
      value: metrics.messagesAllTime.toLocaleString(),
      sub: metrics.messagesAllTime === 0 ? 'Send your first message' : `${metrics.messagesToday} today`,
      color: '#2678FF',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2678FF" strokeWidth="2" strokeLinecap="round">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      ),
    },
    {
      label: 'Response Rate',
      value: `${metrics.responseRate}%`,
      sub: 'Outbound / inbound ratio',
      color: '#22C55E',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
        </svg>
      ),
    },
    {
      label: 'Active Conversations',
      value: metrics.activeConversations.toLocaleString(),
      sub: `${contacts.length} total contacts`,
      color: '#F59E0B',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      label: 'AI Drafts',
      value: metrics.aiDrafts.toLocaleString(),
      sub: 'Total AI-generated messages',
      color: '#8B5CF6',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round">
          <path d="M9.5 2A5.5 5.5 0 0 0 4 7.5V16a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V7.5A5.5 5.5 0 0 0 14.5 2z" />
          <circle cx="9" cy="10" r="1.5" fill="#8B5CF6" stroke="none" /><circle cx="15" cy="10" r="1.5" fill="#8B5CF6" stroke="none" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
      {/* Getting Started */}
      {allMetricsZero && (
        <div style={{
          background: 'linear-gradient(135deg, #1a2742 0%, #0c1629 100%)',
          borderRadius: 16, padding: '28px 32px', marginBottom: 28,
          border: '1px solid rgba(38,120,255,0.15)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, width: 300, height: '100%',
            background: 'radial-gradient(circle at 70% 30%, rgba(38,120,255,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Welcome to Vernacular
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 20px' }}>
            Get started by connecting a phone line, importing contacts, and sending your first message.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { num: '1', text: 'Connect a phone line', done: stations.some(s => getStationStatus(s, stationOverride) !== 'offline') },
              { num: '2', text: 'Import contacts', done: contacts.length > 0 },
              { num: '3', text: 'Send your first message', done: metrics.messagesAllTime > 0 },
            ].map(step => (
              <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: step.done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
                  border: step.done ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: step.done ? '#22C55E' : 'rgba(255,255,255,0.4)',
                }}>
                  {step.done ? '\u2713' : step.num}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: step.done ? 'rgba(255,255,255,0.4)' : '#fff',
                  textDecoration: step.done ? 'line-through' : 'none',
                }}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {metricCards.map(card => (
          <div key={card.label} style={{
            background: '#fff', borderRadius: 14,
            border: '1px solid rgba(0,0,0,0.06)',
            padding: '22px 24px',
            transition: 'all 0.2s',
            cursor: 'default',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${card.color}10`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              {card.icon}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#0c0f1a', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', marginTop: 4 }}>{card.label}</div>
            <div style={{ fontSize: 12, color: card.color, fontWeight: 600, marginTop: 8 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-column: Recent Activity + Stations */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Recent Activity */}
        <div style={{
          background: '#fff', borderRadius: 14,
          border: '1px solid rgba(0,0,0,0.06)', padding: '20px 24px',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0c0f1a', marginBottom: 16, letterSpacing: '-0.01em' }}>
            Recent Activity
          </div>
          {recentMessages.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              No messages yet. Send your first message to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentMessages.map(msg => {
                // Try to match contact name from conversations
                const contactMatch = allConversations.find(c =>
                  c.contact?.phone && msg.contactPhone &&
                  c.contact.phone.replace(/\D/g, '').slice(-10) === msg.contactPhone.replace(/\D/g, '').slice(-10)
                );
                const displayName = contactMatch?.contact?.name || msg.contactName;
                return (
                  <div key={msg.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 8px', borderRadius: 10,
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: msg.direction === 'inbound' ? 'rgba(34,197,94,0.1)' : 'rgba(38,120,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke={msg.direction === 'inbound' ? '#22C55E' : '#2678FF'}
                        strokeWidth="2" strokeLinecap="round">
                        {msg.direction === 'inbound'
                          ? <><polyline points="7 7 17 17" /><polyline points="17 7 17 17 7 17" /></>
                          : <><polyline points="17 7 7 17" /><polyline points="7 7 7 17 17 17" /></>
                        }
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0c0f1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.preview}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {formatTime(msg.sentAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Phone Lines */}
        <div style={{
          background: '#fff', borderRadius: 14,
          border: '1px solid rgba(0,0,0,0.06)', padding: '20px 24px',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0c0f1a', marginBottom: 16, letterSpacing: '-0.01em' }}>
            Phone Lines
          </div>
          {stations.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              No phone lines configured.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stations.map(station => {
                const status = getStationStatus(station, stationOverride);
                const statusColor = status === 'online' ? '#22C55E' : status === 'idle' ? '#F59E0B' : '#EF4444';
                return (
                  <div key={station.id} style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', background: statusColor,
                        boxShadow: status === 'online' ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
                      }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0c0f1a' }}>{station.name}</span>
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: '#2678FF',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {station.phone_number}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      {station.machine_name || 'Unknown machine'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
