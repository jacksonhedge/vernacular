'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }

      const { data } = await supabase
        .from('users').select('*, organizations(*)').eq('auth_id', session.user.id).single();
      setUser(data);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e8f4fd 0%, #f0f4ff 50%, #e8f0fd 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo.png" alt="Vernacular" style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
            animation: 'pulse 2s ease infinite', display: 'block',
          }} />
          <p style={{ color: '#8e8e93', fontSize: 15, fontWeight: 500 }}>Loading workspace...</p>
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
      </div>
    );
  }

  const org = user?.organizations as Record<string, unknown> | undefined;
  const firstName = (user?.full_name as string)?.split(' ')[0] || 'there';

  const checklist = [
    { done: true, title: 'Create workspace', desc: 'Your organization is set up', icon: '1' },
    { done: false, title: 'Connect a station', desc: 'Set up a Mac with iMessage to start sending', icon: '2' },
    { done: false, title: 'Import contacts', desc: 'Upload a CSV or connect your CRM', icon: '3' },
    { done: false, title: 'Send your first message', desc: 'Compose and send from the dashboard', icon: '4' },
    { done: false, title: 'Enable AI drafts', desc: 'Let Claude help you reply faster', icon: '5' },
  ];

  const stats = [
    { label: 'Stations', value: '0', color: '#378ADD', bg: 'rgba(55,138,221,0.08)' },
    { label: 'Conversations', value: '0', color: '#A855F7', bg: 'rgba(168,85,247,0.08)' },
    { label: 'Messages Sent', value: '0', color: '#34D399', bg: 'rgba(52,211,153,0.08)' },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Top nav */}
      <nav style={{
        height: 64, background: '#fff',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', padding: '0 28px',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="Vernacular" style={{ width: 34, height: 34, borderRadius: 8 }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em' }}>
            {(org?.name as string) || 'Vernacular'}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
            background: 'linear-gradient(135deg, rgba(55,138,221,0.12), rgba(55,138,221,0.06))',
            color: '#378ADD', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>{(org?.plan as string) || 'starter'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#8e8e93', fontWeight: 500 }}>{user?.email as string}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
            style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 13,
              background: '#fff', border: '1.5px solid rgba(0,0,0,0.1)',
              color: '#666', cursor: 'pointer', fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.15s ease',
            }}
          >Log Out</button>
        </div>
      </nav>

      {/* Dashboard content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 28px' }}>
        {/* Welcome header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1c1c1e', marginBottom: 8, letterSpacing: '-0.02em' }}>
            Welcome, {firstName}
          </h1>
          <p style={{ fontSize: 16, color: '#8e8e93', lineHeight: 1.5 }}>
            Your workspace is ready. Let&apos;s get your first station connected.
          </p>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.06)',
              padding: '24px 20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: s.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: s.color, opacity: 0.8 }} />
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#1c1c1e', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#8e8e93', fontWeight: 500, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Setup checklist */}
        <div style={{
          background: '#fff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)',
          padding: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em' }}>Getting Started</h2>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#378ADD', background: 'rgba(55,138,221,0.08)', padding: '4px 12px', borderRadius: 8 }}>1 of 5</span>
          </div>

          {checklist.map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: 16, padding: '16px 0',
              borderBottom: i < checklist.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
              alignItems: 'center',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                background: item.done ? 'linear-gradient(135deg, #378ADD, #2B6CB0)' : '#f8fafc',
                border: item.done ? 'none' : '2px solid rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: item.done ? '0 2px 8px rgba(55,138,221,0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}>
                {item.done ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#c7c7cc', fontFamily: "'JetBrains Mono', monospace" }}>{item.icon}</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 15, fontWeight: 600,
                  color: item.done ? '#8e8e93' : '#1c1c1e',
                  textDecoration: item.done ? 'line-through' : 'none',
                }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#a0aec0', marginTop: 2 }}>{item.desc}</div>
              </div>
              {!item.done && i === 1 && (
                <button style={{
                  padding: '8px 18px', borderRadius: 10, fontSize: 13,
                  background: 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 2px 8px rgba(55,138,221,0.25)',
                }}>Connect</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
