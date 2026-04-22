'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { getStationStatus, getStationDotColor, getStationLabel, formatHeartbeat } from '@/lib/utils';

// ── Nav items ─────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: 'OVERVIEW',
    items: [
      { label: 'Dashboard',      path: '/dashboard',             emoji: '🏠', color: '#2678FF' },
      { label: 'Conversations',  path: '/dashboard/streams',     emoji: '💬', color: '#22C55E' },
      { label: 'Contacts',       path: '/dashboard/contacts',    emoji: '👥', color: '#A78BFA' },
    ],
  },
  {
    label: 'WORKSPACE',
    items: [
      { label: 'Initiatives',    path: '/dashboard/initiatives', emoji: '⚡', color: '#F59E0B' },
      { label: 'Matrix',         path: '/dashboard/matrix',      emoji: '🎯', color: '#EC4899' },
      { label: 'Schedule',       path: '/dashboard/schedule',    emoji: '📅', color: '#06B6D4' },
      { label: 'Email',          path: '/dashboard/email',       emoji: '📧', color: '#EF4444' },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { label: 'Phone Lines',    path: '/dashboard/stations',    emoji: '📱', color: '#10B981' },
      { label: 'Team',           path: '/dashboard/team',        emoji: '🤝', color: '#6366F1' },
      { label: 'Integrations',   path: '/dashboard/integrations',emoji: '🔌', color: '#8B5CF6' },
      { label: 'Settings',       path: '/dashboard/settings',    emoji: '⚙️', color: '#64748B' },
    ],
  },
];


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
              const color = (item as { color?: string }).color || '#2678FF';
              const emoji = (item as { emoji?: string }).emoji || '•';
              return (
                <button
                  key={item.path}
                  onClick={() => { playSound('click'); router.push(item.path); }}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: sidebarCollapsed ? '10px 0' : '8px 16px',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    background: active ? `${color}18` : 'transparent',
                    border: 'none', cursor: 'pointer',
                    borderLeft: active ? `3px solid ${color}` : '3px solid transparent',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: active ? `${color}25` : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, transition: 'background 0.15s',
                  }}>
                    {emoji}
                  </span>
                  {!sidebarCollapsed && (
                    <span style={{
                      fontSize: 13, fontWeight: active ? 600 : 500,
                      color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'color 0.15s', flex: 1,
                    }}>
                      {item.label}
                    </span>
                  )}
                  {isConversations && unreadCount > 0 && (
                    <span style={{
                      background: '#EF4444', color: '#fff',
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
          <span style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: showAICopilot ? 'rgba(38,120,255,0.25)' : 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>
            🤖
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
