import React from 'react';
import type { NavSection, StationMode } from '../../shared/types';

interface SidebarProps {
  activeNav: NavSection;
  onNavChange: (nav: NavSection) => void;
  stationMode: StationMode;
  onStationModeChange: (mode: StationMode) => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  collapsed: boolean;
  onCollapse: () => void;
}

const NAV_ITEMS: { key: NavSection; label: string; icon: string }[] = [
  { key: 'conversations', label: 'Conversations', icon: '💬' },
  { key: 'contacts', label: 'Contacts', icon: '👥' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

const STATUS_COLORS: Record<StationMode, string> = {
  online: '#22C55E',
  offline: '#EF4444',
  dnd: '#F59E0B',
};

export default function Sidebar({
  activeNav,
  onNavChange,
  stationMode,
  onStationModeChange,
  soundEnabled,
  onSoundToggle,
  collapsed,
  onCollapse,
}: SidebarProps) {
  return (
    <div style={{ ...styles.sidebar, width: collapsed ? 60 : 220 }}>
      {/* Title bar drag region */}
      <div style={styles.dragRegion} />

      {/* Workspace header */}
      <div style={styles.header}>
        {!collapsed && (
          <>
            <div style={styles.workspaceName}>Vernacular</div>
            <div style={styles.planBadge}>PRO</div>
          </>
        )}
        {collapsed && <div style={styles.collapsedLogo}>V</div>}
      </div>

      {/* Station status */}
      <div style={styles.stationStatus}>
        <div
          style={{
            ...styles.statusDot,
            backgroundColor: STATUS_COLORS[stationMode],
          }}
        />
        {!collapsed && (
          <select
            value={stationMode}
            onChange={(e) => onStationModeChange(e.target.value as StationMode)}
            style={styles.statusSelect}
          >
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="dnd">Do Not Disturb</option>
          </select>
        )}
      </div>

      {/* Navigation */}
      <div style={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavChange(item.key)}
            style={{
              ...styles.navButton,
              backgroundColor: activeNav === item.key ? 'rgba(55, 138, 221, 0.15)' : 'transparent',
              color: activeNav === item.key ? '#378ADD' : '#9ca3af',
            }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>

      {/* Bottom controls */}
      <div style={styles.bottomControls}>
        {/* Sound toggle */}
        <button onClick={onSoundToggle} style={styles.bottomButton}>
          <span>{soundEnabled ? '🔊' : '🔇'}</span>
          {!collapsed && <span style={{ marginLeft: 8 }}>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>}
        </button>

        {/* Collapse toggle */}
        <button onClick={onCollapse} style={styles.bottomButton}>
          <span>{collapsed ? '▶' : '◀'}</span>
          {!collapsed && <span style={{ marginLeft: 8 }}>Collapse</span>}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    backgroundColor: '#1a1a2e',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s ease',
    overflow: 'hidden',
    flexShrink: 0,
  },
  dragRegion: {
    height: 38,
    WebkitAppRegion: 'drag' as any,
    flexShrink: 0,
  },
  header: {
    padding: '0 16px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.02em',
  },
  planBadge: {
    fontSize: 9,
    fontWeight: 700,
    color: '#378ADD',
    background: 'rgba(55, 138, 221, 0.15)',
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: '0.05em',
  },
  collapsedLogo: {
    fontSize: 20,
    fontWeight: 700,
    color: '#378ADD',
    textAlign: 'center' as const,
    width: '100%',
  },
  stationStatus: {
    padding: '0 16px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusSelect: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontSize: 12,
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  },
  nav: {
    flex: 1,
    padding: '0 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'Inter, sans-serif',
    transition: 'background 0.15s',
  },
  navIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center' as const,
  },
  bottomControls: {
    padding: '12px 8px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  bottomButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    color: '#9ca3af',
    background: 'transparent',
    fontFamily: 'Inter, sans-serif',
    transition: 'background 0.15s',
  },
};
