'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type Step = 'info' | 'verify' | 'complete';

export default function SignupPage() {
  const [step, setStep] = useState<Step>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    'Sales & Outreach',
    'Customer Support',
    'Real Estate',
    'Recruiting',
    'Financial Services',
    'Healthcare',
    'Education',
    'Marketing Agency',
    'E-commerce',
    'SaaS',
    'Other',
  ];

  const TEAM_SIZES = ['Just me', '2-5', '6-20', '21-50', '50+'];

  const USE_CASES = [
    'Outbound sales',
    'Customer support',
    'VIP client management',
    'Appointment scheduling',
    'Lead nurturing',
    'Team messaging',
    'Other',
  ];

  const isBusinessEmail = (email: string) => {
    const personal = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com', 'protonmail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return domain && !personal.includes(domain);
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (!form.companyName.trim()) return setError('Company name is required');
    if (!form.fullName.trim()) return setError('Your name is required');
    if (!form.workEmail.trim()) return setError('Work email is required');
    if (!form.password || form.password.length < 8) return setError('Password must be at least 8 characters');
    if (!form.industry) return setError('Please select an industry');

    setLoading(true);

    try {
      // 1. Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.workEmail,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            company_name: form.companyName,
          },
        },
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('Signup failed');

      // 2. Create organization
      const slug = form.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: form.companyName,
          slug: slug,
          plan: 'starter',
        })
        .select()
        .single();

      if (orgError) throw new Error('Failed to create organization: ' + orgError.message);

      // 3. Create user record linked to org
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_id: authData.user.id,
          organization_id: org.id,
          email: form.workEmail,
          full_name: form.fullName,
          role: 'owner',
        });

      if (userError) throw new Error('Failed to create user: ' + userError.message);

      // 4. Create org settings
      const { error: settingsError } = await supabase
        .from('org_settings')
        .insert({
          organization_id: org.id,
          company_name: form.companyName,
          ai_auto_draft: true,
          ai_model: 'claude-sonnet-4-20250514',
        });

      if (settingsError) console.warn('Settings creation failed:', settingsError);

      // Move to verification step
      setStep('verify');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
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
      <div style={{ width: '100%', maxWidth: 480 }}>
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

        {/* Step: Info */}
        {step === 'info' && (
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.08)',
            padding: '32px 28px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', marginBottom: 4 }}>Create your workspace</h1>
            <p style={{ fontSize: 14, color: '#8e8e93', marginBottom: 24 }}>Set up Vernacular for your business.</p>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: '#FEF2F2', border: '1px solid #FEE2E2',
                color: '#DC2626', fontSize: 13,
              }}>{error}</div>
            )}

            {/* Company section */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Company Name *</label>
              <input
                type="text" placeholder="Acme Inc"
                value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Company Website</label>
              <input
                type="url" placeholder="https://acme.com"
                value={form.website}
                onChange={e => setForm({ ...form, website: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Industry *</label>
              <select
                value={form.industry}
                onChange={e => setForm({ ...form, industry: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Team Size</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TEAM_SIZES.map(s => (
                  <button
                    key={s}
                    onClick={() => setForm({ ...form, teamSize: s })}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 13,
                      border: form.teamSize === s ? '2px solid #378ADD' : '1px solid #e5e5ea',
                      background: form.teamSize === s ? 'rgba(55,138,221,0.06)' : '#fff',
                      color: form.teamSize === s ? '#378ADD' : '#1c1c1e',
                      cursor: 'pointer', fontWeight: 500,
                    }}
                  >{s}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Primary Use Case</label>
              <select
                value={form.useCase}
                onChange={e => setForm({ ...form, useCase: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select use case</option>
                {USE_CASES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#e5e5ea', margin: '24px 0' }} />

            {/* Personal info */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Your Full Name *</label>
              <input
                type="text" placeholder="Jane Smith"
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Work Email *</label>
              <input
                type="email" placeholder="jane@acme.com"
                value={form.workEmail}
                onChange={e => setForm({ ...form, workEmail: e.target.value })}
                style={inputStyle}
              />
              {form.workEmail && !isBusinessEmail(form.workEmail) && (
                <p style={{ fontSize: 11, color: '#FF9500', marginTop: 4 }}>
                  We recommend using a work email for business verification.
                </p>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Job Title</label>
              <input
                type="text" placeholder="VP of Sales"
                value={form.jobTitle}
                onChange={e => setForm({ ...form, jobTitle: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Password *</label>
              <input
                type="password" placeholder="At least 8 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={inputStyle}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 12,
                background: loading ? '#9fc5eb' : '#378ADD',
                color: '#fff', border: 'none', cursor: loading ? 'default' : 'pointer',
                fontSize: 15, fontWeight: 600,
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Creating workspace...' : 'Create Workspace'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#8e8e93' }}>
              Already have an account? <a href="/login" style={{ color: '#378ADD', textDecoration: 'none', fontWeight: 500 }}>Log in</a>
            </p>
          </div>
        )}

        {/* Step: Verify */}
        {step === 'verify' && (
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.08)',
            padding: '40px 28px', textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(55,138,221,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 24,
            }}>📧</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1c1c1e', marginBottom: 8 }}>Check your email</h2>
            <p style={{ fontSize: 14, color: '#8e8e93', lineHeight: 1.6, marginBottom: 24 }}>
              We sent a verification link to<br />
              <strong style={{ color: '#1c1c1e' }}>{form.workEmail}</strong>
            </p>
            <p style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.6 }}>
              Click the link to verify your account and access your workspace.
              The link expires in 24 hours.
            </p>

            <div style={{
              marginTop: 24, padding: '14px 18px', borderRadius: 10,
              background: '#F8F8FA', border: '1px solid #e5e5ea',
              textAlign: 'left',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Business Verification</div>
              <p style={{ fontSize: 13, color: '#1c1c1e', lineHeight: 1.5 }}>
                {isBusinessEmail(form.workEmail) ? (
                  <>Your work email domain will be verified automatically. You&apos;ll have full access once confirmed.</>
                ) : (
                  <>Since you used a personal email, our team will manually review your account within 24 hours. You can still explore the dashboard in the meantime.</>
                )}
              </p>
            </div>

            <button
              onClick={() => window.location.href = '/login'}
              style={{
                marginTop: 24, width: '100%', padding: '14px',
                borderRadius: 12, background: '#378ADD', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600,
              }}
            >Go to Login</button>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#c7c7cc' }}>
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#1c1c1e', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid #e5e5ea', background: '#f8f8fa',
  fontSize: 14, color: '#1c1c1e', outline: 'none',
  fontFamily: "'Inter', sans-serif",
};
