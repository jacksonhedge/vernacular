'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type Step = 'info' | 'verify' | 'test';

export default function SignupPage() {
  const [step, setStep] = useState<Step>('info');
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; stationPhone?: string; message?: string; note?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusField, setFocusField] = useState('');
  const [form, setForm] = useState({
    companyName: '',
    website: '',
    industry: '',
    fullName: '',
    workEmail: '',
    jobTitle: '',
    password: '',
    teamSize: '',
    useCase: '',
  });

  const INDUSTRIES = [
    'Sales & Outreach', 'Customer Support', 'Real Estate', 'Recruiting',
    'Financial Services', 'Healthcare', 'Education', 'Marketing Agency',
    'E-commerce', 'SaaS', 'Other',
  ];

  const TEAM_SIZES = ['Just me', '2-5', '6-20', '21-50', '50+'];

  const USE_CASES = [
    'Outbound sales', 'Customer support', 'VIP client management',
    'Appointment scheduling', 'Lead nurturing', 'Team messaging', 'Other',
  ];

  const isBusinessEmail = (email: string) => {
    const personal = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com', 'protonmail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return domain && !personal.includes(domain);
  };

  const handleSubmit = async () => {
    setError('');

    if (!form.companyName.trim()) { setError('Company name is required'); return; }
    if (!form.fullName.trim()) { setError('Your name is required'); return; }
    if (!form.workEmail.trim()) { setError('Work email is required'); return; }
    if (!form.password || form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!form.industry) { setError('Please select an industry'); return; }

    // Check Supabase client
    if (!supabase || !supabase.auth) {
      setError('Connection error. Please refresh and try again.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.workEmail,
        password: form.password,
        options: { data: { full_name: form.fullName, company_name: form.companyName } },
      });
      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('Signup failed — please try again');

      // 2. Create org, user record, and settings via server API (uses service role)
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          companyName: form.companyName,
          email: form.workEmail,
          fullName: form.fullName,
          industry: form.industry,
          teamSize: form.teamSize,
          useCase: form.useCase,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create workspace');

      setStep('verify');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="Vernacular" style={{ width: 40, height: 40, borderRadius: 10 }} />
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.02em' }}>Vernacular</span>
          </a>
        </div>

        {step === 'info' && (
          <div style={{
            background: '#fff', borderRadius: 24,
            border: '1px solid rgba(0,0,0,0.06)',
            padding: '40px 36px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1c1c1e', marginBottom: 4, letterSpacing: '-0.02em' }}>Create your workspace</h1>
            <p style={{ fontSize: 15, color: '#8e8e93', marginBottom: 28, lineHeight: 1.5 }}>Set up Vernacular for your business in minutes.</p>

            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: 12, marginBottom: 20,
                background: 'linear-gradient(135deg, #FEF2F2, #FFF1F1)', border: '1px solid #FECACA',
                color: '#DC2626', fontSize: 13, fontWeight: 500,
              }}>{error}</div>
            )}

            {/* Company section header */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Company Details</div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Company Name *</label>
              <input type="text" placeholder="Acme Inc" value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
                onFocus={() => setFocusField('company')} onBlur={() => setFocusField('')}
                style={inputStyle('company')} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Company Website</label>
              <input type="url" placeholder="https://acme.com" value={form.website}
                onChange={e => setForm({ ...form, website: e.target.value })}
                onFocus={() => setFocusField('website')} onBlur={() => setFocusField('')}
                style={inputStyle('website')} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>Industry *</label>
                <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}
                  onFocus={() => setFocusField('industry')} onBlur={() => setFocusField('')}
                  style={{ ...inputStyle('industry'), cursor: 'pointer', appearance: 'none' as const }}>
                  <option value="">Select</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Use Case</label>
                <select value={form.useCase} onChange={e => setForm({ ...form, useCase: e.target.value })}
                  onFocus={() => setFocusField('usecase')} onBlur={() => setFocusField('')}
                  style={{ ...inputStyle('usecase'), cursor: 'pointer', appearance: 'none' as const }}>
                  <option value="">Select</option>
                  {USE_CASES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Team Size</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TEAM_SIZES.map(s => (
                  <button key={s} onClick={() => setForm({ ...form, teamSize: s })} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13,
                    border: form.teamSize === s ? '2px solid #378ADD' : '1.5px solid rgba(0,0,0,0.1)',
                    background: form.teamSize === s ? 'rgba(55,138,221,0.06)' : '#fff',
                    color: form.teamSize === s ? '#378ADD' : '#666',
                    cursor: 'pointer', fontWeight: 600, fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.15s ease',
                  }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)', margin: '4px 0 24px' }} />

            {/* Personal section header */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Your Details</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input type="text" placeholder="Jane Smith" value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  onFocus={() => setFocusField('name')} onBlur={() => setFocusField('')}
                  style={inputStyle('name')} />
              </div>
              <div>
                <label style={labelStyle}>Job Title</label>
                <input type="text" placeholder="VP of Sales" value={form.jobTitle}
                  onChange={e => setForm({ ...form, jobTitle: e.target.value })}
                  onFocus={() => setFocusField('title')} onBlur={() => setFocusField('')}
                  style={inputStyle('title')} />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Work Email *</label>
              <input type="email" placeholder="jane@acme.com" value={form.workEmail}
                onChange={e => setForm({ ...form, workEmail: e.target.value })}
                onFocus={() => setFocusField('email')} onBlur={() => setFocusField('')}
                style={inputStyle('email')} />
              {form.workEmail && !isBusinessEmail(form.workEmail) && (
                <p style={{ fontSize: 12, color: '#FF9500', marginTop: 6, fontWeight: 500 }}>We recommend a work email for faster verification.</p>
              )}
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Password *</label>
              <input type="password" placeholder="At least 8 characters" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onFocus={() => setFocusField('password')} onBlur={() => setFocusField('')}
                style={inputStyle('password')} />
            </div>

            <button onClick={handleSubmit} disabled={loading} style={{
              width: '100%', padding: '15px', borderRadius: 14,
              background: loading ? '#9fc5eb' : 'linear-gradient(135deg, #378ADD, #2B6CB0)',
              color: '#fff', border: 'none', cursor: loading ? 'default' : 'pointer',
              fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(55,138,221,0.3)',
              transition: 'all 0.2s ease',
            }}>
              {loading ? 'Creating workspace...' : 'Create Workspace'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#8e8e93' }}>
              Already have an account? <a href="/login" style={{ color: '#378ADD', textDecoration: 'none', fontWeight: 600 }}>Log in</a>
            </p>
          </div>
        )}

        {step === 'verify' && (
          <div style={{
            background: '#fff', borderRadius: 24,
            border: '1px solid rgba(0,0,0,0.06)',
            padding: '48px 36px', textAlign: 'center',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(55,138,221,0.12), rgba(55,138,221,0.06))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              border: '1px solid rgba(55,138,221,0.15)',
            }}>
              <img src="/logo.png" alt="" style={{ width: 40, height: 40, borderRadius: 10 }} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1c1c1e', marginBottom: 8, letterSpacing: '-0.02em' }}>Workspace created!</h2>
            <p style={{ fontSize: 15, color: '#8e8e93', lineHeight: 1.6, marginBottom: 20 }}>
              Verification link sent to <strong style={{ color: '#1c1c1e' }}>{form.workEmail}</strong>
            </p>

            {/* Try it now CTA */}
            <div style={{
              padding: '24px', borderRadius: 16,
              background: 'linear-gradient(135deg, #EBF5FF, #E0EDFF)',
              border: '1px solid rgba(55,138,221,0.15)',
              textAlign: 'center', marginBottom: 20,
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1c1c1e', marginBottom: 4, letterSpacing: '-0.02em' }}>See the blue bubble magic</h3>
              <p style={{ fontSize: 13, color: '#8e8e93', marginBottom: 16, lineHeight: 1.5 }}>
                Send yourself a test iMessage right now. Enter your phone number and we&apos;ll send you a blue bubble from your Vernacular number.
              </p>
              <button onClick={() => setStep('test')} style={{
                padding: '12px 28px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(55,138,221,0.3)',
              }}>Try It Now</button>
            </div>

            <button onClick={() => window.location.href = '/login'} style={{
              width: '100%', padding: '15px', borderRadius: 14,
              background: '#fff', border: '1.5px solid rgba(0,0,0,0.1)',
              color: '#666', cursor: 'pointer',
              fontSize: 15, fontWeight: 600,
            }}>Skip &mdash; Go to Login</button>
          </div>
        )}

        {step === 'test' && (
          <div style={{
            background: '#fff', borderRadius: 24,
            border: '1px solid rgba(0,0,0,0.06)',
            padding: '40px 36px', textAlign: 'center',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {/* iMessage bubble preview */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{
                  background: '#378ADD', color: '#fff', padding: '12px 18px',
                  borderRadius: '20px 20px 6px 20px', fontSize: 15, fontWeight: 500,
                  maxWidth: 300, textAlign: 'left', lineHeight: 1.4,
                  boxShadow: '0 2px 12px rgba(55,138,221,0.25)',
                }}>
                  Hey! This is a test from Vernacular. Your iMessage CRM is ready to go. 💬
                </div>
                <span style={{ fontSize: 11, color: '#8e8e93' }}>Delivered</span>
              </div>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1c1c1e', marginBottom: 4, letterSpacing: '-0.02em' }}>Send yourself a blue iMessage</h2>
            <p style={{ fontSize: 13, color: '#8e8e93', marginBottom: 24, lineHeight: 1.5 }}>
              Enter your phone number below. We&apos;ll send you a real iMessage — look for the <strong style={{ color: '#378ADD' }}>blue bubble</strong>.
            </p>

            {/* Phone input */}
            <div style={{ marginBottom: 16, textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Your Phone Number</label>
              <input
                type="tel" placeholder="(412) 735-1089"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                style={{
                  width: '100%', padding: '14px 18px', borderRadius: 12,
                  border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff',
                  fontSize: 18, fontWeight: 600, color: '#1c1c1e', outline: 'none',
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em',
                  textAlign: 'center', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Sending from badge */}
            <div style={{
              padding: '10px 16px', borderRadius: 10,
              background: '#f8fafc', border: '1px solid rgba(0,0,0,0.06)',
              marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 12, color: '#8e8e93' }}>Sending from</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#378ADD', fontFamily: "'JetBrains Mono', monospace" }}>(412) 512-8437</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(55,138,221,0.1)', color: '#378ADD' }}>WADE</span>
            </div>

            {/* Result */}
            {testResult && (
              <div style={{
                padding: '14px 18px', borderRadius: 12, marginBottom: 16, textAlign: 'left',
                background: testResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: testResult.success ? '#16A34A' : '#DC2626', marginBottom: 4 }}>
                  {testResult.success ? 'Message queued!' : 'Error'}
                </div>
                <div style={{ fontSize: 12, color: testResult.success ? '#4a5568' : '#DC2626', lineHeight: 1.5 }}>
                  {testResult.success ? testResult.note : testResult.error}
                </div>
                {testResult.success && (
                  <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 6 }}>
                    Check your phone within 1 minute for a blue iMessage from {testResult.stationPhone}
                  </div>
                )}
              </div>
            )}

            {/* Send button */}
            <button
              onClick={async () => {
                if (!testPhone) return;
                setTestSending(true);
                setTestResult(null);
                try {
                  const res = await fetch('/api/send-test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: testPhone }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  setTestResult({ success: true, stationPhone: data.stationPhone, message: data.message, note: data.note });
                } catch (err) {
                  setTestResult({ error: err instanceof Error ? err.message : 'Failed to send' });
                } finally {
                  setTestSending(false);
                }
              }}
              disabled={testSending || !testPhone}
              style={{
                width: '100%', padding: '15px', borderRadius: 14, border: 'none',
                background: testSending || !testPhone ? '#9fc5eb' : 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                color: '#fff', fontSize: 16, fontWeight: 700, cursor: testSending || !testPhone ? 'default' : 'pointer',
                boxShadow: testSending || !testPhone ? 'none' : '0 4px 16px rgba(55,138,221,0.3)',
                marginBottom: 12,
              }}
            >
              {testSending ? 'Sending...' : 'Send Test iMessage'}
            </button>

            <button onClick={() => window.location.href = '/login'} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: 'transparent', color: '#8e8e93', cursor: 'pointer',
              fontSize: 14, fontWeight: 500,
            }}>Continue to Login &rarr;</button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>
          By signing up, you agree to our{' '}
          <a href="#" style={{ color: 'rgba(0,0,0,0.45)', textDecoration: 'underline' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" style={{ color: 'rgba(0,0,0,0.45)', textDecoration: 'underline' }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#4a5568', marginBottom: 6, letterSpacing: '-0.01em',
};
