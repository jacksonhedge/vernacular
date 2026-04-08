'use client';

import { useState, useEffect } from 'react';

const WORDS = ['VIP Hosts', 'Support Teams', 'Sales Reps', 'QA Testers'];

export default function LandingPage() {
  const [wordIdx, setWordIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setWordIdx(i => (i + 1) % WORDS.length);
        setFade(true);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: '#000', color: '#fff', fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px', maxWidth: 1200, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #22C55E, #16A34A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💬</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Vernacular</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <a href="#solutions" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Solutions</a>
          <a href="#pricing" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Pricing</a>
          <a href="#how-it-works" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>How It Works</a>
          <a href="/login" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Log In</a>
          <a href="/signup" style={{
            padding: '10px 24px', borderRadius: 24, background: '#22C55E', color: '#000',
            textDecoration: 'none', fontSize: 14, fontWeight: 600, transition: 'opacity 0.15s',
          }}>Get Started</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        maxWidth: 1200, margin: '0 auto', padding: '100px 48px 80px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#22C55E', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
          iMessage for Business
        </div>
        <h1 style={{
          fontSize: 72, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05,
          margin: '0 auto 24px', maxWidth: 800,
        }}>
          Blue bubble<br />
          messaging for{' '}
          <span style={{
            color: '#22C55E', transition: 'opacity 0.3s',
            opacity: fade ? 1 : 0,
          }}>{WORDS[wordIdx]}</span>
        </h1>
        <p style={{
          fontSize: 20, color: 'rgba(255,255,255,0.5)', maxWidth: 560,
          margin: '0 auto 48px', lineHeight: 1.5, fontWeight: 400,
        }}>
          Send real iMessages from dedicated phone lines. AI-powered responses, conversation tracking, and full CRM — all through blue bubbles.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <a href="/signup" style={{
            padding: '16px 40px', borderRadius: 32, background: '#22C55E', color: '#000',
            textDecoration: 'none', fontSize: 16, fontWeight: 700, transition: 'transform 0.15s',
          }}>Start Free Trial</a>
          <a href="#how-it-works" style={{
            padding: '16px 40px', borderRadius: 32, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
            textDecoration: 'none', fontSize: 16, fontWeight: 600,
          }}>See How It Works</a>
        </div>

        {/* Trust bar */}
        <div style={{ marginTop: 64, display: 'flex', justifyContent: 'center', gap: 48, opacity: 0.3 }}>
          {['Real iMessages', 'Blue Bubbles', 'AI-Powered', 'Mac Relay Stations'].map(t => (
            <span key={t} style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t}</span>
          ))}
        </div>
      </section>

      {/* Metric bar */}
      <section style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 48px 80px',
        display: 'flex', justifyContent: 'center', gap: 80,
      }}>
        {[
          { num: '99.2%', label: 'Delivery Rate' },
          { num: '<3s', label: 'AI Response Time' },
          { num: '780+', label: 'Messages Synced' },
          { num: '24/7', label: 'Station Uptime' },
        ].map(m => (
          <div key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', color: '#22C55E' }}>{m.num}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: 500 }}>{m.label}</div>
          </div>
        ))}
      </section>

      {/* Solutions */}
      <section id="solutions" style={{
        maxWidth: 1200, margin: '0 auto', padding: '80px 48px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>Four solutions, one platform</h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', maxWidth: 500, margin: '0 auto' }}>Each solution includes a dedicated Mac station with its own phone number and AI personas.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            {
              icon: '🎰', name: 'VIP Manager', price: '$1,500/mo per line',
              desc: 'Manage high-value relationships for sportsbooks, casinos, and premium brands.',
              features: ['Dedicated phone line + Apple ID', 'AI-powered VIP concierge', 'Promo & deposit tracking', 'Re-engagement automation'],
              color: '#A78BFA',
            },
            {
              icon: '📱', name: 'Sales & Outreach', price: '$1,500/mo per seat',
              desc: 'Cold outreach that lands in iMessage, not spam folders.',
              features: ['Dedicated line for outreach', 'AI draft + approve workflow', 'Contact enrichment', 'Campaign tracking'],
              color: '#6EE7B7',
            },
            {
              icon: '🧪', name: 'App Testing', price: '$1,222/mo per seat',
              desc: 'Recruit testers, distribute builds, collect feedback via iMessage.',
              features: ['Tester recruitment AI', 'Feedback collection', 'Build distribution links', 'QA coordination'],
              color: '#FFC107',
            },
            {
              icon: '💬', name: 'Customer Support', price: '$100/mo + $1.25/ticket',
              desc: 'AI chat widget with one-tap iMessage handoff.',
              features: ['Embeddable chat widget', 'FAQ knowledge base', 'Per-ticket billing', 'iMessage escalation'],
              color: '#60A5FA',
            },
          ].map(s => (
            <div key={s.name} style={{
              padding: '36px 32px', borderRadius: 20,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              transition: 'border-color 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 32 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 14, color: s.color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{s.price}</div>
                </div>
              </div>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 20 }}>{s.desc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                    <div style={{ width: 4, height: 4, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{
        maxWidth: 1200, margin: '0 auto', padding: '80px 48px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>How it works</h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>Real iMessages, not SMS. Blue bubbles, not green.</p>
        </div>

        <div style={{ display: 'flex', gap: 32 }}>
          {[
            { step: '01', title: 'We set up your Mac station', desc: 'A dedicated MacBook with its own phone number and Apple ID. Always on, always connected.' },
            { step: '02', title: 'You message from the dashboard', desc: 'Send iMessages from your browser. AI drafts responses, you approve or edit.' },
            { step: '03', title: 'Messages deliver as blue bubbles', desc: 'Real iMessage via Mac relay. Recipients see blue bubbles, not green SMS.' },
            { step: '04', title: 'AI handles the rest', desc: 'Auto-responses, follow-ups, and escalations. Set goals per conversation.' },
          ].map(s => (
            <div key={s.step} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontSize: 48, fontWeight: 800, color: '#22C55E', opacity: 0.3,
                fontFamily: "'JetBrains Mono', monospace", marginBottom: 16,
              }}>{s.step}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{
        maxWidth: 1200, margin: '0 auto', padding: '80px 48px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>Simple pricing</h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>Monthly minimum with usage-based overage. No surprises.</p>
        </div>

        <div style={{
          padding: '32px', borderRadius: 20, background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What&apos;s included in every plan
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 32px', marginBottom: 32 }}>
            {[
              'Dedicated Mac station + phone number',
              'AI-powered response drafting',
              'Full conversation history',
              'Contact management & CRM',
              'Supabase Realtime updates',
              'VCF contact import',
              'Per-conversation goals',
              'Multi-channel (coming soon)',
              'Embeddable chat widget',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                <span style={{ color: '#22C55E' }}>✓</span> {f}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Usage costs (included in monthly minimum)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px 24px' }}>
              {[
                ['New conversation', '$0.99'],
                ['Text sent', '$0.001'],
                ['Text received', 'Free'],
                ['AI draft', '$0.0031'],
                ['AI approved & sent', '$0.25'],
                ['Ticket resolved', '$1.25'],
                ['Widget handoff', '$0.50'],
                ['Contact import', '$0.05'],
              ].map(([action, cost]) => (
                <div key={action} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{action}</span>
                  <span style={{ color: cost === 'Free' ? '#22C55E' : '#fff', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{cost}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Integration add-ons
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                ['Slack', '$25/mo'], ['Notion', '$25/mo'], ['Salesforce', '$50/mo'],
                ['Email', '$25/mo'], ['Discord', '$25/mo'], ['Telegram', '$25/mo'], ['Webhook', '$15/mo'],
              ].map(([name, price]) => (
                <div key={name} style={{
                  padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)', fontSize: 13,
                }}>
                  <span style={{ fontWeight: 600 }}>{name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>{price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        maxWidth: 1200, margin: '0 auto', padding: '80px 48px 120px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>
          Ready to go blue?
        </h2>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', marginBottom: 40 }}>
          Set up your first station in under 24 hours.
        </p>
        <a href="/signup" style={{
          padding: '18px 48px', borderRadius: 32, background: '#22C55E', color: '#000',
          textDecoration: 'none', fontSize: 18, fontWeight: 700, display: 'inline-block',
        }}>Get Started</a>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '40px 48px', maxWidth: 1200, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Vernacular</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>by Hedge, Inc.</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 13 }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
