'use client';

import { DashboardProvider, useDashboard } from '@/contexts/DashboardContext';
import Sidebar from '@/components/dashboard/Sidebar';
import CraigPanel from '@/components/dashboard/CraigPanel';

function CraigFAB() {
  const { showAICopilot, setShowAICopilot } = useDashboard();
  if (showAICopilot) return null;
  return (
    <button
      onClick={() => setShowAICopilot(true)}
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 300,
        width: 58, height: 58, borderRadius: 16,
        background: '#0c0f1a',
        border: '2px solid rgba(255,224,0,0.3)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(245,158,11,0.4), 0 0 0 3px rgba(255,224,0,0.15)',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(245,158,11,0.5), 0 0 0 4px rgba(255,224,0,0.2)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,158,11,0.4), 0 0 0 3px rgba(255,224,0,0.15)'; }}
      title="Open Craig AI"
    >
      <img src="/pacman.png" alt="Craig" width={32} height={32} style={{ display: 'block', objectFit: 'contain' }} />
    </button>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading, showAICopilot } = useDashboard();

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0c0f1a', fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #2678FF, #1a5fd4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 20px rgba(38,120,255,0.3)',
            animation: 'pulse 2s ease infinite',
          }}>
            <img src="/logo.png" alt="V" style={{ width: 28, height: 28, borderRadius: 6 }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 500 }}>Loading workspace...</p>
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; transform: scale(1); } 50% { opacity:0.6; transform: scale(0.95); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh', display: 'flex',
      fontFamily: "'Inter', -apple-system, sans-serif",
      background: '#f8f9fb',
      overflow: 'hidden',
    }}>
      <Sidebar />
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minWidth: 0,
      }}>
        {children}
      </main>
      {showAICopilot && <CraigPanel />}
      <CraigFAB />
      <style>{`
        @keyframes ghostFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes ghostBlink { 0% { opacity:1; } 50% { opacity:0.4; filter: brightness(2); } 100% { opacity:1; } }
        @keyframes discoShift { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
        @keyframes tileGlow { 0%,100% { opacity: 0.85; } 50% { opacity: 1; } }
        @keyframes nasaPulse { 0%,100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.02); box-shadow: 0 0 12px currentColor; } }
        @keyframes nasaUrgent { 0%,100% { opacity: 0.75; } 50% { opacity: 1; box-shadow: 0 0 14px rgba(245,158,11,0.4); } }
        .disco-tile:hover { transform: scale(1.2) !important; z-index: 10 !important; box-shadow: 0 0 24px currentColor !important; }
        button:hover { opacity: 0.95; }
        button:active { transform: scale(0.98); }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `}</style>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
