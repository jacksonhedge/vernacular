'use client';

import Link from 'next/link';

export default function SupportPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8f9fb 0%, #ffffff 100%)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#0c0f1a',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '18px 28px',
        background: '#fff',
      }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          textDecoration: 'none', color: '#0c0f1a',
        }}>
          <img src="/logo.png" alt="Vernacular" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>Vernacular</span>
        </Link>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 28px 80px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px' }}>
          Support
        </h1>
        <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.6, margin: '0 0 32px' }}>
          We&apos;re here to help. Reach out anytime and we&apos;ll get back to you within one business day.
        </p>

        {/* Contact Card */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 32,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #2678FF, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Email Support</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Typical response: &lt; 24 hours</div>
            </div>
          </div>
          <a href="mailto:support@vernacular.chat" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', borderRadius: 10,
            background: '#2678FF', color: '#fff',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
            boxShadow: '0 1px 3px rgba(38,120,255,0.3)',
          }}>
            support@vernacular.chat
          </a>
        </div>

        {/* FAQ */}
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
          Frequently Asked Questions
        </h2>

        {[
          {
            q: 'What is Vernacular?',
            a: 'Vernacular is an enterprise messaging CRM that lets businesses send and receive real iMessage blue bubbles through dedicated Mac relay stations, with AI-powered response drafting via our copilot Craig.',
          },
          {
            q: 'How do I reset my password?',
            a: 'On the login screen, tap "Forgot password" to receive a reset link by email. If you signed in with Apple or Google, use those options instead — we don\'t store your password for OAuth accounts.',
          },
          {
            q: 'Why is my message stuck in "Queued" status?',
            a: 'Messages go through a Mac relay station before delivery. If a message is queued for more than a few minutes, check Settings → Phone Lines to verify your station is Online. Contact support if it stays offline.',
          },
          {
            q: 'How is my data handled?',
            a: 'We store your conversations and contacts securely in Supabase with row-level security. See our Privacy Policy for full details.',
          },
          {
            q: 'Can I delete my account?',
            a: 'Yes. Email support@vernacular.chat with the subject "Delete Account" and we\'ll remove your account and associated data within 7 business days.',
          },
          {
            q: 'Does Vernacular work with Android?',
            a: 'Vernacular sends and receives iMessages, which requires an Apple device on one side. Android contacts can still receive messages as SMS fallback.',
          },
          {
            q: 'How do I report a bug?',
            a: 'Email support@vernacular.chat with a description of what happened, what you expected, and screenshots if possible.',
          },
        ].map((item, i) => (
          <details key={i} style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 10,
            cursor: 'pointer',
          }}>
            <summary style={{
              fontSize: 15, fontWeight: 600, color: '#0c0f1a',
              listStyle: 'none', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              {item.q}
              <span style={{ fontSize: 18, color: '#9ca3af' }}>+</span>
            </summary>
            <p style={{
              fontSize: 14, color: '#6b7280', lineHeight: 1.6,
              margin: '12px 0 0', paddingTop: 12,
              borderTop: '1px solid rgba(0,0,0,0.04)',
            }}>
              {item.a}
            </p>
          </details>
        ))}

        {/* Links */}
        <div style={{
          marginTop: 40, paddingTop: 32,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', gap: 24, fontSize: 13, color: '#6b7280',
        }}>
          <Link href="/privacy" style={{ color: '#2678FF', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: '#2678FF', textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/acceptable-use" style={{ color: '#2678FF', textDecoration: 'none' }}>Acceptable Use</Link>
        </div>
      </div>
    </div>
  );
}
