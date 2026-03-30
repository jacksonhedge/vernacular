'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusField, setFocusField] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email || !password) return setError('Email and password required');

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw new Error(authError.message);
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%', padding: '12px 16px', borderRadius: 12,
    border: focusField === field ? '2px solid #378ADD' : '1.5px solid rgba(0,0,0,0.1)',
    background: '#fff', fontSize: 15, color: '#1c1c1e', outline: 'none',
    fontFamily: "'Inter', sans-serif",
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: focusField === field ? '0 0 0 4px rgba(55,138,221,0.1)' : 'none',
    boxSizing: 'border-box' as const,
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e8f4fd 0%, #f0f4ff 50%, #e8f0fd 100%)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="Vernacular" style={{ width: 44, height: 44, borderRadius: 12 }} />
            <span style={{ fontSize: 24, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.02em' }}>Vernacular</span>
          </a>
        </div>

        <div style={{
          background: '#fff', borderRadius: 24,
          border: '1px solid rgba(0,0,0,0.06)',
          padding: '40px 36px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1c1c1e', marginBottom: 4, letterSpacing: '-0.02em' }}>Welcome back</h1>
          <p style={{ fontSize: 15, color: '#8e8e93', marginBottom: 28 }}>Log in to your workspace.</p>

          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 12, marginBottom: 20,
              background: 'linear-gradient(135deg, #FEF2F2, #FFF1F1)', border: '1px solid #FECACA',
              color: '#DC2626', fontSize: 13, fontWeight: 500,
            }}>{error}</div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Email</label>
            <input type="email" placeholder="jane@acme.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              onFocus={() => setFocusField('email')} onBlur={() => setFocusField('')}
              style={inputStyle('email')} />
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568' }}>Password</label>
              <a href="#" style={{ fontSize: 12, color: '#378ADD', textDecoration: 'none', fontWeight: 500 }}>Forgot password?</a>
            </div>
            <input type="password" placeholder="Enter password"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              onFocus={() => setFocusField('password')} onBlur={() => setFocusField('')}
              style={inputStyle('password')} />
          </div>

          <button onClick={handleLogin} disabled={loading} style={{
            width: '100%', padding: '15px', borderRadius: 14,
            background: loading ? '#9fc5eb' : 'linear-gradient(135deg, #378ADD, #2B6CB0)',
            color: '#fff', border: 'none',
            cursor: loading ? 'default' : 'pointer',
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(55,138,221,0.3)',
            transition: 'all 0.2s ease',
          }}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#8e8e93' }}>
            Don&apos;t have an account? <a href="/signup" style={{ color: '#378ADD', textDecoration: 'none', fontWeight: 600 }}>Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
