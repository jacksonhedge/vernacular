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
  const [billingAnnual, setBillingAnnual] = useState(false);

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
          <Bubble align="left" delay={400}>Hey, I&apos;m having trouble resetting my password. Can you help?</Bubble>
          <Bubble align="right" delay={1200}>Of course! I just sent a reset link to your email. You should see it within 60 seconds. Let me know if it doesn&apos;t come through 👍</Bubble>
          <Bubble align="left" delay={2000}>Got it, that worked. Thanks!</Bubble>
          <Bubble align="right" delay={2800}>Happy to help. Anything else I can do for you?</Bubble>
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
        position: 'relative', zIndex: 10, padding: '100px 0',
        background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 70%, transparent 100%)',
      }}>
        {/* Cloud background */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0,
        }}>
          <div style={{ position: 'absolute', top: '10%', left: '5%', width: '45%', height: '60%', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.07) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', top: '20%', right: '0%', width: '50%', height: '50%', background: 'radial-gradient(ellipse at center, rgba(168,212,240,0.08) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', bottom: '5%', left: '20%', width: '60%', height: '40%', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(70px)' }} />
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#a8d4f0', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Solutions</div>
            <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>Built for how you<br />actually message</h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.45)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
              Four purpose-built solutions, each with its own dedicated phone line, AI agents, and workflow.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              {
                icon: '🎰', name: 'VIP Manager', tagline: 'White-glove relationship management',
                desc: 'Keep your highest-value clients engaged with personalized outreach, exclusive promos, and proactive check-ins — all through blue bubble iMessage.',
                features: ['Dedicated VIP concierge AI persona', 'Proactive re-engagement campaigns', 'Deposit & activity tracking', 'Event invitations & promo delivery'],
                color: '#A78BFA', bg: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.12)',
              },
              {
                icon: '📱', name: 'Sales & Outreach', tagline: 'Outreach that actually gets read',
                desc: 'Skip the spam folder. Land directly in iMessage with personalized cold outreach that feels human because AI helps you write it.',
                features: ['AI drafts, you approve', 'Smart follow-up sequences', 'Contact enrichment & CRM', 'Response rate analytics'],
                color: '#6EE7B7', bg: 'rgba(110,231,183,0.06)', border: 'rgba(110,231,183,0.12)',
              },
              {
                icon: '🧪', name: 'App Testing', tagline: 'QA coordination via text',
                desc: 'Recruit beta testers, distribute builds, and collect structured feedback — all through iMessage conversations your testers already use.',
                features: ['Tester recruitment automation', 'Build link distribution', 'Structured feedback collection', 'Device & eligibility screening'],
                color: '#FFC107', bg: 'rgba(255,193,7,0.06)', border: 'rgba(255,193,7,0.12)',
              },
              {
                icon: '💬', name: 'Customer Support', tagline: 'AI support that escalates to humans',
                desc: 'An embeddable chat widget that resolves common questions instantly. When it can&apos;t, one tap hands off to a real iMessage conversation.',
                features: ['Embeddable AI chat widget', 'Teachable FAQ knowledge base', 'One-tap iMessage handoff', 'Per-resolved-ticket billing'],
                color: '#60A5FA', bg: 'rgba(96,165,250,0.06)', border: 'rgba(96,165,250,0.12)',
              },
            ].map(s => (
              <div key={s.name} style={{
                padding: '36px 32px', borderRadius: 24,
                background: s.bg, border: `1px solid ${s.border}`,
                backdropFilter: 'blur(20px)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${s.border}`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `linear-gradient(135deg, ${s.bg}, ${s.border})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                    border: `1px solid ${s.border}`,
                  }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 13, color: s.color, fontWeight: 500 }}>{s.tagline}</div>
                  </div>
                </div>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 20 }}>{s.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {s.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                      <div style={{ width: 5, height: 5, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                      {f}
                    </div>
                  ))}
                </div>
                <a href="/signup" style={{
                  display: 'inline-block', marginTop: 20, padding: '10px 24px', borderRadius: 20,
                  background: `${s.border}`, color: '#fff', textDecoration: 'none',
                  fontSize: 13, fontWeight: 600, transition: 'opacity 0.15s',
                }}>Learn More</a>
              </div>
            ))}
          </div>
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
        maxWidth: 1100, margin: '0 auto', padding: '80px 48px', position: 'relative', zIndex: 10,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>Simple, transparent pricing</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>Platform fee + usage-based AI credits. No hidden costs.</p>
          {/* Monthly / Annual toggle */}
          <div style={{ display: 'inline-flex', borderRadius: 12, background: 'rgba(255,255,255,0.08)', padding: 3 }}>
            <button onClick={() => setBillingAnnual(false)} style={{
              padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: !billingAnnual ? '#378ADD' : 'transparent',
              color: !billingAnnual ? '#fff' : 'rgba(255,255,255,0.5)',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            }}>Monthly</button>
            <button onClick={() => setBillingAnnual(true)} style={{
              padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: billingAnnual ? '#378ADD' : 'transparent',
              color: billingAnnual ? '#fff' : 'rgba(255,255,255,0.5)',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            }}>Annual <span style={{ fontSize: 11, color: billingAnnual ? '#86EFAC' : 'rgba(255,255,255,0.3)' }}>Save 12%</span></button>
          </div>
        </div>

        {/* Tier Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
          {[
            {
              name: 'Support',
              icon: '💬',
              price: '$1,000',
              period: 'setup',
              subtitle: 'No monthly minimum',
              highlight: false,
              color: '#60A5FA',
              features: [
                { text: 'Dedicated iMessage line', included: true },
                { text: '$1.25 per resolved ticket', included: true },
                { text: 'AI-powered FAQ matching', included: true },
                { text: 'Embeddable chat widget', included: true },
                { text: 'Intercom integration', included: true },
                { text: 'Contact import ($0.07/ea)', included: true },
                { text: 'AI auto-responses', included: false },
                { text: 'Bulk messaging', included: false },
              ],
            },
            {
              name: 'Growth',
              icon: '📱',
              price: billingAnnual ? '$791' : '$899',
              period: billingAnnual ? '/mo per line (billed annually)' : '/mo per line',
              subtitle: billingAnnual ? '$9,494/year — save $1,294' : 'Most popular',
              highlight: true,
              color: '#378ADD',
              features: [
                { text: 'Everything in Support', included: true },
                { text: 'AI draft + auto-send ($0.17)', included: true },
                { text: 'Bulk blast ($0.05/recipient)', included: true },
                { text: 'Initiative management', included: true },
                { text: 'Contact enrichment ($0.25)', included: true },
                { text: 'Tone analysis ($0.50)', included: true },
                { text: 'Calendar + scheduling', included: true },
                { text: 'Multi-channel (coming soon)', included: true },
              ],
            },
            {
              name: 'Enterprise',
              icon: '🏢',
              price: 'Custom',
              period: '',
              subtitle: '5+ lines, volume pricing',
              highlight: false,
              color: '#A78BFA',
              features: [
                { text: 'Everything in Growth', included: true },
                { text: 'Dedicated account manager', included: true },
                { text: 'Custom AI training', included: true },
                { text: 'API access + webhooks', included: true },
                { text: 'SLA + priority support', included: true },
                { text: 'SSO + team management', included: true },
                { text: 'Custom integrations', included: true },
                { text: 'On-premise station option', included: true },
              ],
            },
          ].map(tier => (
            <div key={tier.name} style={{
              borderRadius: 16, overflow: 'hidden',
              background: tier.highlight ? 'rgba(55,138,221,0.1)' : 'rgba(255,255,255,0.04)',
              border: tier.highlight ? '2px solid rgba(55,138,221,0.4)' : '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column',
            }}>
              {tier.highlight && (
                <div style={{ background: '#378ADD', padding: '6px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Most Popular
                </div>
              )}
              <div style={{ padding: '28px 24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 24 }}>{tier.icon}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{tier.name}</span>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#fff' }}>{tier.price}</span>
                  {tier.period && <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>{tier.period}</span>}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>{tier.subtitle}</div>
                <a href="/signup" style={{
                  display: 'block', textAlign: 'center', padding: '12px 0', borderRadius: 10,
                  background: tier.highlight ? '#378ADD' : 'rgba(255,255,255,0.08)',
                  color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700,
                  border: tier.highlight ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  transition: 'all 0.15s',
                }}>
                  {tier.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                </a>
              </div>
              <div style={{ padding: '0 24px 24px', flex: 1 }}>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                  {tier.features.map(f => (
                    <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 13 }}>
                      {f.included ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={tier.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      )}
                      <span style={{ color: f.included ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Usage costs breakdown */}
        <div style={{
          padding: '28px', borderRadius: 16,
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16, textAlign: 'center' }}>Pay-per-action usage costs</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 32px' }}>
            {[
              ['New conversation', '$0.99'],
              ['Text sent', '$0.001'],
              ['Text received', 'Free'],
              ['AI draft generated', '$0.003'],
              ['AI approved & sent', '$0.17'],
              ['AI auto-response', '$0.25'],
              ['Ticket resolved', '$1.25'],
              ['Contact import', '$0.07'],
              ['Widget handoff', '$0.50'],
              ['Bulk blast (per recipient)', '$0.05'],
              ['Tone analysis', '$0.50'],
              ['Contact enrichment', '$0.25'],
            ].map(([action, cost]) => (
              <div key={action} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>{action}</span>
                <span style={{ color: cost === 'Free' ? '#6EE7B7' : '#fff', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{cost}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 16 }}>
            Usage is included in your monthly minimum. Overage billed per action above the minimum.
          </div>
        </div>

        {/* Setup fee note */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
          Setup: $899 first line · $301 additional lines · $333/mo additional seats · 12% off annual · AI usage billed separately
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
          <a href="/privacy" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 12 }}>Privacy</a>
          <a href="/terms" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 12 }}>Terms</a>
          <a href="/acceptable-use" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 12 }}>Acceptable Use</a>
          <a href="mailto:jackson@hedgepayments.co" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 12 }}>Contact</a>
        </div>
      </footer>
    </div>
  );
}
