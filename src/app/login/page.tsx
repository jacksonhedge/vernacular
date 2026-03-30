'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email || !password) return setError('Email and password required');

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error(authError.message);

      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f8f8fa',
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #378ADD, #5AC8FA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 16,
            }}>V</div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#1c1c1e' }}>Vernacular</span>
          </a>
        </div>

        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.08)',
          padding: '32px 28px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', marginBottom: 4 }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: '#8e8e93', marginBottom: 24 }}>Log in to your workspace.</p>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: '#FEF2F2', border: '1px solid #FEE2E2',
              color: '#DC2626', fontSize: 13,
            }}>{error}</div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1c1c1e', marginBottom: 6 }}>Email</label>
            <input
              type="email" placeholder="jane@acme.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid #e5e5ea', background: '#f8f8fa',
                fontSize: 14, color: '#1c1c1e', outline: 'none',
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>Password</label>
              <a href="#" style={{ fontSize: 12, color: '#378ADD', textDecoration: 'none' }}>Forgot password?</a>
            </div>
            <input
              type="password" placeholder="Enter password"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid #e5e5ea', background: '#f8f8fa',
                fontSize: 14, color: '#1c1c1e', outline: 'none',
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: 12,
              background: loading ? '#9fc5eb' : '#378ADD',
              color: '#fff', border: 'none',
              cursor: loading ? 'default' : 'pointer',
              fontSize: 15, fontWeight: 600,
            }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#8e8e93' }}>
            Don&apos;t have an account? <a href="/signup" style={{ color: '#378ADD', textDecoration: 'none', fontWeight: 500 }}>Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
