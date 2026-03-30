'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      // Get user profile
      const { data } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('auth_id', session.user.id)
        .single();

      setUser(data);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#f8f8fa',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #378ADD, #5AC8FA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 18,
            margin: '0 auto 12px',
            animation: 'pulse 2s ease infinite',
          }}>V</div>
          <p style={{ color: '#8e8e93', fontSize: 14 }}>Loading workspace...</p>
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>
      </div>
    );
  }

  const org = user?.organizations as Record<string, unknown> | undefined;

  return (
    <div style={{
      minHeight: '100vh', background: '#f8f8fa',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Top nav */}
      <nav style={{
        height: 56, background: '#fff', borderBottom: '1px solid #e5e5ea',
        display: 'flex', alignItems: 'center', padding: '0 24px',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #378ADD, #5AC8FA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 14,
          }}>V</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e' }}>
            {(org?.name as string) || 'Vernacular'}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            background: 'rgba(55,138,221,0.1)', color: '#378ADD',
            fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
          }}>{(org?.plan as string) || 'starter'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#8e8e93' }}>{user?.email as string}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 13,
              background: 'transparent', border: '1px solid #e5e5ea',
              color: '#8e8e93', cursor: 'pointer', fontWeight: 500,
            }}
          >Log Out</button>
        </div>
      </nav>

      {/* Dashboard content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1c1c1e', marginBottom: 8 }}>
          Welcome, {(user?.full_name as string)?.split(' ')[0] || 'there'} 👋
        </h1>
        <p style={{ fontSize: 15, color: '#8e8e93', marginBottom: 40 }}>
          Your workspace is ready. Let&apos;s get your first station connected.
        </p>

        {/* Setup checklist */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #e5e5ea',
          padding: '24px 28px',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', marginBottom: 20 }}>Getting Started</h2>

          {[
            { done: true, title: 'Create workspace', desc: 'Your organization is set up' },
            { done: false, title: 'Connect a station', desc: 'Set up a Mac with iMessage to start sending and receiving' },
            { done: false, title: 'Import contacts', desc: 'Upload a CSV or connect your CRM' },
            { done: false, title: 'Send your first message', desc: 'Compose and send a message from the dashboard' },
            { done: false, title: 'Enable AI drafts', desc: 'Let Claude help you reply faster' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, padding: '14px 0',
              borderBottom: i < 4 ? '1px solid #f2f2f7' : 'none',
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: item.done ? '#378ADD' : '#f2f2f7',
                border: item.done ? 'none' : '2px solid #e5e5ea',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 2,
              }}>
                {item.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: item.done ? '#8e8e93' : '#1c1c1e', textDecoration: item.done ? 'line-through' : 'none' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 24 }}>
          {[
            { label: 'Stations', value: '0', icon: '📱' },
            { label: 'Conversations', value: '0', icon: '💬' },
            { label: 'Messages Sent', value: '0', icon: '📨' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 12, border: '1px solid #e5e5ea',
              padding: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1c1c1e' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
