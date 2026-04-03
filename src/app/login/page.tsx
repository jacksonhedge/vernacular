'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusField, setFocusField] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('vernacular_remember') === 'true';
    return false;
  });

  // Load saved credentials on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('vernacular_remember');
    if (saved === 'true') {
      const savedEmail = localStorage.getItem('vernacular_email') || '';
      if (savedEmail) setEmail(savedEmail);
    }
  }, []);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) return setError('Email and password required');

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw new Error(authError.message);
      // Save or clear credentials based on remember me
      if (rememberMe) {
        localStorage.setItem('vernacular_remember', 'true');
        localStorage.setItem('vernacular_email', email);
      } else {
        localStorage.removeItem('vernacular_remember');
        localStorage.removeItem('vernacular_email');
      }
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
              <button onClick={() => setShowReset(true)} style={{ fontSize: 12, color: '#378ADD', textDecoration: 'none', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Forgot password?</button>
            </div>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} placeholder="Enter password"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                onFocus={() => setFocusField('password')} onBlur={() => setFocusField('')}
                style={{ ...inputStyle('password'), paddingRight: 44 }} />
              <button onClick={() => setShowPassword(!showPassword)} type="button" style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <button onClick={() => setRememberMe(!rememberMe)} type="button" style={{
              width: 18, height: 18, borderRadius: 4, border: rememberMe ? 'none' : '1.5px solid rgba(0,0,0,0.2)',
              background: rememberMe ? '#378ADD' : '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'all 0.15s',
            }}>
              {rememberMe && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            <label onClick={() => setRememberMe(!rememberMe)} style={{
              fontSize: 13, color: '#6b7280', cursor: 'pointer', userSelect: 'none',
              fontFamily: "'Inter', sans-serif",
            }}>
              Remember me
            </label>
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

        {/* Forgot Password Modal */}
        {showReset && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }} onClick={() => !resetLoading && setShowReset(false)}>
            <div style={{
              background: '#fff', borderRadius: 24, padding: '36px 32px', maxWidth: 400, width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }} onClick={e => e.stopPropagation()}>
              {!resetSent ? (
                <>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1c1c1e', marginBottom: 8, letterSpacing: '-0.02em' }}>Reset your password</h2>
                  <p style={{ fontSize: 14, color: '#8e8e93', marginBottom: 24, lineHeight: 1.5 }}>
                    Enter your email and we&apos;ll send you a link to reset your password.
                  </p>
                  {error && (
                    <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', fontSize: 13 }}>{error}</div>
                  )}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Email</label>
                    <input type="email" placeholder="jackson@hedgepayments.co" value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !resetLoading && (async () => {
                        if (!email) { setError('Enter your email'); return; }
                        setError(''); setResetLoading(true);
                        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://vernacular.chat/login' });
                        setResetLoading(false);
                        if (resetErr) { setError(resetErr.message); return; }
                        setResetSent(true);
                      })()}
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.1)',
                        background: '#fff', fontSize: 15, color: '#1c1c1e', outline: 'none',
                        fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' as const,
                      }}
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!email) { setError('Enter your email'); return; }
                      setError(''); setResetLoading(true);
                      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://vernacular.chat/login' });
                      setResetLoading(false);
                      if (resetErr) { setError(resetErr.message); return; }
                      setResetSent(true);
                    }}
                    disabled={resetLoading}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                      background: resetLoading ? '#9fc5eb' : 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                      color: '#fff', fontSize: 15, fontWeight: 700, cursor: resetLoading ? 'default' : 'pointer',
                      boxShadow: resetLoading ? 'none' : '0 4px 16px rgba(55,138,221,0.3)',
                    }}
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button onClick={() => { setShowReset(false); setError(''); }} style={{
                    width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                    background: 'transparent', color: '#8e8e93', cursor: 'pointer',
                    fontSize: 14, fontWeight: 500, marginTop: 8,
                  }}>Cancel</button>
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>
                    <img src="/logo.png" alt="" style={{ width: 48, height: 48, borderRadius: 12 }} />
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1c1c1e', marginBottom: 8 }}>Check your email</h2>
                  <p style={{ fontSize: 14, color: '#8e8e93', lineHeight: 1.6, marginBottom: 24 }}>
                    We sent a password reset link to<br />
                    <strong style={{ color: '#1c1c1e' }}>{email}</strong>
                  </p>
                  <button onClick={() => { setShowReset(false); setResetSent(false); setError(''); }} style={{
                    width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                    color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(55,138,221,0.3)',
                  }}>Back to Login</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
