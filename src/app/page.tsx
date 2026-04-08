'use client';

import { useState, useEffect } from 'react';

const WORDS = ['VIP Hosts', 'Support Teams', 'Sales Reps', 'QA Testers'];

function Bubble({ children, align = 'left', delay = 0 }: { children: React.ReactNode; align?: 'left' | 'right'; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{
      display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      <div style={{
        background: align === 'right' ? '#378ADD' : 'rgba(255,255,255,0.95)',
        color: align === 'right' ? '#fff' : '#1a3a5c',
        padding: '14px 20px', borderRadius: align === 'right' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
        maxWidth: 420, fontSize: 15, lineHeight: 1.6, fontWeight: 500,
        boxShadow: align === 'right' ? '0 4px 20px rgba(55,138,221,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        {children}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [wordIdx, setWordIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => { setWordIdx(i => (i + 1) % WORDS.length); setFade(true); }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, sans-serif",
      background: 'linear-gradient(180deg, #0d1f3c 0%, #1a3a5c 30%, #2e6494 55%, #5a9fd4 75%, #a8d4f0 90%, #dceefb 100%)',
      minHeight: '100vh', color: '#fff', position: 'relative', overflow: 'hidden',
    }}>
      {/* Cloud layers */}
      <div style={{
        position: 'absolute', top: '15%', left: '-5%', width: '40%', height: '30%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', top: '25%', right: '-10%', width: '50%', height: '25%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute', top: '55%', left: '10%', width: '35%', height: '20%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.06) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(50px)',
      }} />

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 48px', maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Vernacular</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {['Solutions', 'Pricing', 'How It Works'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>{l}</a>
          ))}
          <a href="/login" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Log In</a>
          <a href="/signup" style={{
            padding: '10px 24px', borderRadius: 24, background: '#378ADD', color: '#fff',
            textDecoration: 'none', fontSize: 14, fontWeight: 600,
            boxShadow: '0 4px 16px rgba(55,138,221,0.4)',
          }}>Get Started</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        maxWidth: 1200, margin: '0 auto', padding: '80px 48px 40px',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{
            fontSize: 64, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.08,
            marginBottom: 24,
          }}>
            Blue bubble<br />messaging for{' '}
            <span style={{
              color: '#a8d4f0', transition: 'opacity 0.3s',
              opacity: fade ? 1 : 0,
            }}>{WORDS[wordIdx]}</span>
          </h1>
          <p style={{
            fontSize: 18, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 40, maxWidth: 480,
          }}>
            Send real iMessages from dedicated phone lines. AI drafts responses, you approve. Every conversation tracked.
          </p>
          <div style={{ display: 'flex', gap: 14 }}>
            <a href="/signup" style={{
              padding: '14px 36px', borderRadius: 28, background: '#378ADD', color: '#fff',
              textDecoration: 'none', fontSize: 15, fontWeight: 700,
              boxShadow: '0 4px 20px rgba(55,138,221,0.4)',
            }}>Start Free Trial</a>
            <a href="/ai-chat" style={{
              padding: '14px 36px', borderRadius: 28,
              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
              textDecoration: 'none', fontSize: 15, fontWeight: 600,
            }}>Try AI Chat</a>
          </div>
        </div>

        {/* iMessage demo bubbles floating on right */}
        <div style={{
          position: 'absolute', right: 48, top: 60, width: 360,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <Bubble align="right" delay={400}>Hey! This is Jackson from Betting Hero. Wanted to check if you&apos;re interested in testing a new sportsbook app this week?</Bubble>
          <Bubble align="left" delay={1200}>Yeah for sure, what&apos;s involved?</Bubble>
          <Bubble align="right" delay={2000}>Just download the app, make a test deposit of $20, and give us feedback. We&apos;ll send you $50 for your time 🙌</Bubble>
          <Bubble align="left" delay={2800}>I&apos;m in, send me the link</Bubble>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Delivered via iMessage · Blue Bubble</span>
          </div>
        </div>
      </section>

      {/* Metrics in bubbles */}
      <section style={{
        maxWidth: 1200, margin: '0 auto', padding: '60px 48px',
        display: 'flex', justifyContent: 'center', gap: 20, position: 'relative', zIndex: 10,
      }}>
        {[
          { num: '99.2%', label: 'Delivery Rate' },
          { num: '<3s', label: 'AI Response' },
          { num: '24/7', label: 'Station Uptime' },
          { num: '$0.001', label: 'Per Text Sent' },
        ].map(m => (
          <div key={m.label} style={{
            textAlign: 'center', padding: '20px 28px', borderRadius: 16,
            background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{m.num}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{m.label}</div>
          </div>
        ))}
      </section>

      {/* Solutions */}
      <section id="solutions" style={{
        maxWidth: 1200, margin: '0 auto', padding: '80px 48px', position: 'relative', zIndex: 10,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>Four solutions</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>Each with a dedicated Mac station, phone number, and AI personas.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { icon: '🎰', name: 'VIP Manager', price: '$1,500/mo', unit: 'per line', desc: 'High-value relationship management for sportsbooks and premium brands.', features: ['VIP concierge AI persona', 'Promo & deposit tracking', 'Re-engagement automation'], gradient: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(167,139,250,0.05))' },
            { icon: '📱', name: 'Sales & Outreach', price: '$1,500/mo', unit: 'per seat', desc: 'Cold outreach that lands in iMessage, not spam folders.', features: ['AI draft + approve workflow', 'Contact management', 'Campaign tracking'], gradient: 'linear-gradient(135deg, rgba(110,231,183,0.15), rgba(110,231,183,0.05))' },
            { icon: '🧪', name: 'App Testing', price: '$1,222/mo', unit: 'per seat', desc: 'Recruit testers, distribute builds, collect feedback.', features: ['Tester recruitment AI', 'Feedback collection', 'QA coordination'], gradient: 'linear-gradient(135deg, rgba(255,193,7,0.15), rgba(255,193,7,0.05))' },
            { icon: '💬', name: 'Customer Support', price: '$100/mo', unit: '+ $1.25/ticket', desc: 'AI chat widget with one-tap iMessage handoff.', features: ['Embeddable chat widget', 'FAQ knowledge base', 'Per-ticket billing'], gradient: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.05))' },
          ].map(s => (
            <div key={s.name} style={{
              padding: '28px 28px', borderRadius: 20,
              background: s.gradient, border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{s.name}</div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: "'JetBrains Mono', monospace" }}>{s.price} <span style={{ fontWeight: 400 }}>{s.unit}</span></span>
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 14 }}>{s.desc}</p>
              {s.features.map(f => (
                <div key={f} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span> {f}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* How It Works — shown as iMessage conversation */}
      <section id="how-it-works" style={{
        maxWidth: 700, margin: '0 auto', padding: '80px 48px', position: 'relative', zIndex: 10,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>How it works</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Bubble align="left" delay={0}>How does Vernacular work?</Bubble>
          <Bubble align="right" delay={300}>We set up a dedicated MacBook with its own phone number and Apple ID. It stays on 24/7 at our facility.</Bubble>
          <Bubble align="left" delay={600}>So I can send iMessages from my browser?</Bubble>
          <Bubble align="right" delay={900}>Exactly. You type in our dashboard, the Mac sends it as a real blue bubble iMessage. Recipients can&apos;t tell the difference.</Bubble>
          <Bubble align="left" delay={1200}>What about the AI part?</Bubble>
          <Bubble align="right" delay={1500}>Set a goal for each conversation. Our AI drafts responses aligned to that goal. You approve, edit, or let it send automatically.</Bubble>
          <Bubble align="left" delay={1800}>That&apos;s clean. How do I get started?</Bubble>
          <Bubble align="right" delay={2100}>Sign up, pick your solution type, and we&apos;ll have your station online within 24 hours. Blue bubbles from day one. 💬</Bubble>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{
        maxWidth: 900, margin: '0 auto', padding: '80px 48px', position: 'relative', zIndex: 10,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>Simple pricing</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>Monthly minimum. Usage included. Overage billed above.</p>
        </div>

        <div style={{
          padding: '28px', borderRadius: 20,
          background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px', marginBottom: 24 }}>
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
              <div key={action} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 14 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{action}</span>
                <span style={{ color: cost === 'Free' ? '#6EE7B7' : '#fff', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{cost}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            Add-ons: Slack, Notion, Email ($25/mo each) · Salesforce ($50/mo) · Webhook ($15/mo)
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        maxWidth: 1200, margin: '0 auto', padding: '60px 48px 100px',
        textAlign: 'center', position: 'relative', zIndex: 10,
      }}>
        <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>
          Ready to go blue?
        </h2>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', marginBottom: 36 }}>
          Your station goes live within 24 hours.
        </p>
        <a href="/signup" style={{
          padding: '16px 44px', borderRadius: 28, background: '#378ADD', color: '#fff',
          textDecoration: 'none', fontSize: 16, fontWeight: 700, display: 'inline-block',
          boxShadow: '0 6px 24px rgba(55,138,221,0.4)',
        }}>Get Started</a>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '32px 48px', maxWidth: 1200, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'relative', zIndex: 10,
      }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Vernacular by Hedge, Inc.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 12 }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
