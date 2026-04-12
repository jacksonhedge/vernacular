'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { getStationStatus, getStationDotColor, getStationLabel, formatHeartbeat } from '@/lib/utils';

// ── Nav items ─────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: 'OVERVIEW',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'grid' },
      { label: 'Conversations', path: '/dashboard/streams', icon: 'chat' },
      { label: 'Contacts', path: '/dashboard/contacts', icon: 'users' },
    ],
  },
  {
    label: 'WORKSPACE',
    items: [
      { label: 'Initiatives', path: '/dashboard/initiatives', icon: 'star' },
      { label: 'Matrix', path: '/dashboard/matrix', icon: 'matrix' },
      { label: 'Schedule', path: '/dashboard/schedule', icon: 'calendar' },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { label: 'Phone Lines', path: '/dashboard/stations', icon: 'phone' },
      { label: 'Team', path: '/dashboard/team', icon: 'team' },
      { label: 'Integrations', path: '/dashboard/integrations', icon: 'plug' },
      { label: 'Settings', path: '/dashboard/settings', icon: 'gear' },
    ],
  },
];

function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const s = size;
  const props = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'grid': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case 'chat': return <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    case 'users': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case 'star': return <svg {...props}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
    case 'matrix': return <svg {...props}><rect x="3" y="3" width="4" height="4" rx="0.5" /><rect x="10" y="3" width="4" height="4" rx="0.5" /><rect x="17" y="3" width="4" height="4" rx="0.5" /><rect x="3" y="10" width="4" height="4" rx="0.5" /><rect x="10" y="10" width="4" height="4" rx="0.5" /><rect x="17" y="10" width="4" height="4" rx="0.5" /><rect x="3" y="17" width="4" height="4" rx="0.5" /><rect x="10" y="17" width="4" height="4" rx="0.5" /><rect x="17" y="17" width="4" height="4" rx="0.5" /></svg>;
    case 'calendar': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
    case 'phone': return <svg {...props}><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18.01" /></svg>;
    case 'team': return <svg {...props}><circle cx="12" cy="7" r="4" /><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2" /></svg>;
    case 'plug': return <svg {...props}><path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24" /></svg>;
    case 'gear': return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" /></svg>;
    case 'craig': return <svg width={s} height={s} viewBox="0 0 24 24" style={{ overflow: 'visible' }}><circle cx="12" cy="12" r="11" fill="#FFE000" /><circle cx="10" cy="7" r="1.4" fill="#1c1c00" /><path d="M12 12 L24 4 L24 20 Z" fill="currentColor"><animate attributeName="d" values="M12 12 L24 3 L24 21 Z;M12 12 L24 10 L24 14 Z;M12 12 L24 3 L24 21 Z" dur="0.5s" repeatCount="indefinite" /></path></svg>;
    default: return null;
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    org, sidebarCollapsed, setSidebarCollapsed,
    soundEnabled, setSoundEnabled, playSound,
    creditUsage, stations, stationOverride, unreadCount,
    showAICopilot, setShowAICopilot,
    notifications, setNotifications,
  } = useDashboard();

  const primaryStation = stations.find(s => s.phone_number && s.phone_number !== 'TBD') || stations[0];
  const stationStatus = primaryStation ? getStationStatus(primaryStation, stationOverride) : 'offline';

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(path);
  };

  return (
    <aside style={{
      width: sidebarCollapsed ? 68 : 260,
      minWidth: sidebarCollapsed ? 68 : 260,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0c0f1a',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Logo + Org */}
      <div style={{
        padding: sidebarCollapsed ? '20px 12px 16px' : '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 12,
        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
      }}>
        <div
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #2678FF, #1a5fd4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(38,120,255,0.3)',
          }}
        >
          <img src="/logo.png" alt="V" style={{ width: 22, height: 22, borderRadius: 4 }} />
        </div>
        {!sidebarCollapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {(org?.name as string) || 'Vernacular'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginTop: 2 }}>
              Enterprise Messaging
            </div>
          </div>
        )}
      </div>

      {/* Station Status */}
      {primaryStation && (
        <div style={{
          padding: sidebarCollapsed ? '12px 0' : '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: getStationDotColor(stationStatus),
            boxShadow: stationStatus === 'online' ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
            flexShrink: 0,
          }} />
          {!sidebarCollapsed && (
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#fff',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {primaryStation.phone_number}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                {getStationLabel(stationStatus)} · {formatHeartbeat(primaryStation.last_heartbeat)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Credit Usage */}
      {!sidebarCollapsed && creditUsage && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Usage</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date().toLocaleDateString('en-US', { month: 'short' })}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginBottom: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: creditUsage.minimum > 0 ? `${Math.min(100, (creditUsage.used / creditUsage.minimum) * 100)}%` : '0%',
              background: creditUsage.used > creditUsage.minimum && creditUsage.minimum > 0 ? '#EF4444' : '#22C55E',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
              ${(creditUsage.used / 100).toFixed(2)}
            </span>
            {creditUsage.minimum > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>/ ${(creditUsage.minimum / 100).toFixed(0)} min</span>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.label} style={{ marginBottom: 4 }}>
            {!sidebarCollapsed && (
              <div style={{
                padding: '12px 20px 6px',
                fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {section.label}
              </div>
            )}
            {section.items.map(item => {
              const active = isActive(item.path);
              const isConversations = item.path === '/dashboard/streams';
              return (
                <button
                  key={item.path}
                  onClick={() => { playSound('click'); router.push(item.path); }}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: sidebarCollapsed ? '10px 0' : '9px 20px',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    background: active ? 'rgba(38,120,255,0.12)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    borderLeft: active ? '3px solid #2678FF' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    color: active ? '#2678FF' : 'rgba(255,255,255,0.45)',
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s',
                  }}>
                    <NavIcon name={item.icon} />
                  </span>
                  {!sidebarCollapsed && (
                    <span style={{
                      fontSize: 13, fontWeight: active ? 600 : 500,
                      color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'color 0.15s',
                    }}>
                      {item.label}
                    </span>
                  )}
                  {/* Unread badge on Conversations */}
                  {isConversations && unreadCount > 0 && (
                    <span style={{
                      marginLeft: 'auto',
                      background: '#EF4444',
                      color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      padding: '2px 7px', borderRadius: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                      minWidth: 18, textAlign: 'center',
                    }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: Craig AI + controls */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: sidebarCollapsed ? '12px 0' : '12px 20px' }}>
        {/* Craig AI button */}
        <button
          onClick={() => setShowAICopilot(!showAICopilot)}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: sidebarCollapsed ? '10px 0' : '10px 14px',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            background: showAICopilot ? 'rgba(38,120,255,0.15)' : 'rgba(255,255,255,0.04)',
            border: showAICopilot ? '1px solid rgba(38,120,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(38,120,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = showAICopilot ? 'rgba(38,120,255,0.15)' : 'rgba(255,255,255,0.04)'; }}
        >
          <span style={{ color: showAICopilot ? '#2678FF' : 'rgba(255,255,255,0.5)', display: 'flex' }}>
            <NavIcon name="craig" />
          </span>
          {!sidebarCollapsed && (
            <>
              <span style={{ fontSize: 13, fontWeight: 600, color: showAICopilot ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                Craig AI
              </span>
              <span style={{
                marginLeft: 'auto', fontSize: 9, fontWeight: 600,
                padding: '2px 6px', borderRadius: 4,
                background: 'rgba(34,197,94,0.15)', color: '#22C55E',
              }}>
                ON
              </span>
            </>
          )}
        </button>

        {/* Sound + Collapse row */}
        {!sidebarCollapsed && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button
              onClick={() => { setSoundEnabled(!soundEnabled); playSound('click'); }}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 6,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                color: soundEnabled ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                fontSize: 11, fontWeight: 500, cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
