'use client';

import { useState, useEffect, useRef } from 'react';

const ROTATING_WORDS = ['CRM', 'Customer Communication', 'Customer Support', 'Sales Outreach', 'Team Messaging'];

export default function LandingPage() {
  const [phase, setPhase] = useState<'imessage' | 'typing' | 'message' | 'reveal'>('imessage');
  const [wordIndex, setWordIndex] = useState(0);
  const [wordFade, setWordFade] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Phase timeline
  useEffect(() => {
    // Phase 1: Show iMessage window (immediate)
    const t1 = setTimeout(() => setPhase('typing'), 800);
    // Phase 2: Show typing indicator
    const t2 = setTimeout(() => {
      setPhase('message');
      // Play iMessage sound
      try {
        audioRef.current = new Audio('/imessage-sound.mp3');
        audioRef.current.volume = 0.4;
        audioRef.current.play().catch(() => {});
      } catch {}
    }, 2200);
    // Phase 3: Reveal full page
    const t3 = setTimeout(() => setPhase('reveal'), 3500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Rotating words
  useEffect(() => {
    if (phase !== 'reveal') return;
    const interval = setInterval(() => {
      setWordFade(false);
      setTimeout(() => {
        setWordIndex(i => (i + 1) % ROTATING_WORDS.length);
        setWordFade(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: "'Inter', -apple-system, sans-serif", overflow: 'hidden' }}>

      {/* ===== iMessage Window Phase ===== */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: phase === 'reveal' ? 0 : 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#000',
        opacity: phase === 'reveal' ? 0 : 1,
        transition: 'opacity 0.8s ease',
        pointerEvents: phase === 'reveal' ? 'none' : 'auto',
      }}>
        <div style={{
          width: 380, maxWidth: '90vw',
          background: '#fff', borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          transform: phase === 'reveal' ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.8s ease',
        }}>
          {/* iPhone status bar */}
          <div style={{
            height: 54, background: '#f6f6f6',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 8, position: 'relative',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1c1c1e', letterSpacing: '-0.01em' }}>9:41</span>
          </div>

          {/* iMessage header */}
          <div style={{
            padding: '8px 16px 12px', background: '#f6f6f6',
            borderBottom: '1px solid #e5e5e5',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ color: '#378ADD', fontSize: 13, fontWeight: 500 }}>{'<'}</div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #378ADD, #5AC8FA)',
                margin: '0 auto 4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14, fontWeight: 700,
              }}>V</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>Vernacular</div>
            </div>
            <div style={{ width: 20 }} />
          </div>

          {/* Chat area */}
          <div style={{
            minHeight: 320, padding: '20px 16px', background: '#fff',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            gap: 8,
          }}>
            {/* Incoming bubble (always visible) */}
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                background: '#e5e5ea', color: '#1c1c1e',
                padding: '9px 14px', borderRadius: '18px 18px 18px 4px',
                fontSize: 15, lineHeight: 1.4, maxWidth: '75%',
              }}>
                Hey, how do you manage all your outreach?
              </div>
            </div>

            {/* Typing indicator */}
            {(phase === 'typing') && (
              <div style={{
                display: 'flex', justifyContent: 'flex-end',
                animation: 'fadeIn 0.3s ease',
              }}>
                <div style={{
                  background: '#378ADD', borderRadius: '18px 18px 4px 18px',
                  padding: '12px 18px',
                  display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'typingDot 1.4s ease-in-out infinite' }} />
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'typingDot 1.4s ease-in-out 0.2s infinite' }} />
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'typingDot 1.4s ease-in-out 0.4s infinite' }} />
                </div>
              </div>
            )}

            {/* Sent message */}
            {(phase === 'message' || phase === 'reveal') && (
              <div style={{
                display: 'flex', justifyContent: 'flex-end',
                animation: 'bubblePop 0.3s ease',
              }}>
                <div style={{
                  background: '#378ADD', color: '#fff',
                  padding: '9px 14px', borderRadius: '18px 18px 4px 18px',
                  fontSize: 15, lineHeight: 1.4, maxWidth: '75%',
                }}>
                  Vernacular. One dashboard for everything.
                </div>
              </div>
            )}
          </div>

          {/* iMessage compose bar */}
          <div style={{
            padding: '8px 12px 28px', background: '#fff',
            borderTop: '1px solid #e5e5e5',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#8e8e93', fontSize: 18, fontWeight: 300,
            }}>+</div>
            <div style={{
              flex: 1, height: 34, borderRadius: 17,
              border: '1px solid #c7c7cc', background: '#fff',
              display: 'flex', alignItems: 'center', paddingLeft: 12,
              fontSize: 15, color: '#8e8e93',
            }}>iMessage</div>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Full Landing Page (revealed after animation) ===== */}
      <div style={{
        opacity: phase === 'reveal' ? 1 : 0,
        transform: phase === 'reveal' ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s',
      }}>
        {/* Navbar */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height: 64, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px',
          animation: phase === 'reveal' ? 'slideDown 0.5s ease 0.3s both' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #378ADD, #5AC8FA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 14,
            }}>V</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Vernacular</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <a href="#features" style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Features</a>
            <a href="#pricing" style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Pricing</a>
            <a href="/login" style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Log In</a>
            <a href="/signup" style={{
              fontSize: 13, fontWeight: 600, color: '#fff',
              padding: '8px 20px', borderRadius: 8,
              background: '#378ADD',
              textDecoration: 'none',
            }}>Get Started</a>
          </div>
        </nav>

        {/* Hero */}
        <section style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '120px 24px 80px', textAlign: 'center',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 100,
            background: 'rgba(55,138,221,0.1)', border: '1px solid rgba(55,138,221,0.2)',
            marginBottom: 32,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#378ADD', animation: 'pulse 2s ease infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#378ADD', letterSpacing: '0.02em' }}>Built on iMessage</span>
          </div>

          {/* Main heading with rotating word */}
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: 24,
          }}>
            Message managing for
            <br />
            <span style={{
              background: 'linear-gradient(90deg, #378ADD, #5AC8FA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              opacity: wordFade ? 1 : 0,
              transition: 'opacity 0.4s ease',
              display: 'inline-block',
              minWidth: 300,
            }}>
              {ROTATING_WORDS[wordIndex]}
            </span>
          </h1>

          <p style={{
            fontSize: 18, color: 'rgba(255,255,255,0.45)',
            maxWidth: 520, lineHeight: 1.7, marginBottom: 40,
          }}>
            Every iMessage conversation in one dashboard.
            AI drafts your replies. You approve and send.
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            <a href="/signup" style={{
              padding: '14px 32px', borderRadius: 12,
              background: '#378ADD', color: '#fff',
              fontSize: 15, fontWeight: 600, textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(55,138,221,0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}>Start Free Trial</a>
            <a href="#demo" style={{
              padding: '14px 32px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)',
              fontSize: 15, fontWeight: 500, textDecoration: 'none',
              transition: 'border-color 0.2s, color 0.2s',
            }}>See How It Works</a>
          </div>

          {/* Dashboard preview */}
          <div style={{
            marginTop: 64, width: '100%', maxWidth: 900,
            borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
            padding: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            <div style={{
              borderRadius: 12, overflow: 'hidden', background: '#111',
            }}>
              {/* Window chrome */}
              <div style={{
                height: 36, background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', padding: '0 14px', gap: 6,
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                </div>
                <span style={{ marginLeft: 16, fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>vernacular.chat/dashboard</span>
              </div>
              {/* Mock dashboard */}
              <div style={{ display: 'flex', height: 340 }}>
                {/* Sidebar */}
                <div style={{ width: 200, borderRight: '1px solid rgba(255,255,255,0.05)', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>Conversations</div>
                  {[
                    { name: 'Jake Thompson', msg: 'Just got the Venmo!', unread: true },
                    { name: 'Colby Resh', msg: 'Sounds good', unread: false },
                    { name: 'Jack Robinson', msg: 'Appreciate it bro', unread: true },
                    { name: 'Austin Sarvis', msg: "I'm all set up", unread: false },
                    { name: 'Grady Pierce', msg: "I'll lyk when it comes", unread: false },
                  ].map((c, i) => (
                    <div key={c.name} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8,
                      background: i === 0 ? 'rgba(55,138,221,0.12)' : 'transparent',
                      cursor: 'pointer',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: i === 0 ? 'rgba(55,138,221,0.3)' : 'rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: i === 0 ? '#5AC8FA' : 'rgba(255,255,255,0.3)',
                        flexShrink: 0,
                      }}>{c.name.split(' ').map(n => n[0]).join('')}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)' }}>{c.name}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.msg}</div>
                      </div>
                      {c.unread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#378ADD', flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
                {/* Chat area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 11, padding: '6px 12px', borderRadius: '14px 14px 4px 14px', maxWidth: 200 }}>What&apos;s your Venmo?</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 11, padding: '6px 12px', borderRadius: '14px 14px 14px 4px', maxWidth: 200 }}>Just got the Venmo! 🙏</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{
                        border: '1px dashed rgba(55,138,221,0.4)',
                        background: 'rgba(55,138,221,0.06)',
                        color: '#5AC8FA', fontSize: 11, padding: '6px 12px',
                        borderRadius: '14px 14px 4px 14px', maxWidth: 220, position: 'relative',
                      }}>
                        <span style={{ position: 'absolute', top: -6, right: 6, fontSize: 7, background: 'rgba(55,138,221,0.2)', color: '#5AC8FA', padding: '1px 4px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace" }}>AI Draft</span>
                        Here&apos;s the link to get started!
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      <div style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: '#378ADD', color: '#fff', fontWeight: 600 }}>Approve</div>
                      <div style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>Edit</div>
                    </div>
                  </div>
                  <div style={{ height: 40, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6 }}>
                    <div style={{ flex: 1, height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" style={{
          padding: '100px 24px', borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 12, letterSpacing: '-0.02em' }}>Built for outreach at scale</h2>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', marginBottom: 60, maxWidth: 480, margin: '0 auto 60px', fontSize: 16 }}>Everything your team needs to manage iMessage conversations.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {[
                { icon: '💬', title: 'Multi-conversation view', desc: 'HootSuite-style columns. See 4+ conversations at once.' },
                { icon: '🤖', title: 'AI-powered drafts', desc: 'Claude reads the thread and suggests a reply. You approve or edit.' },
                { icon: '📱', title: 'Pure iMessage', desc: 'No Twilio. Messages go through your real Apple ID.' },
                { icon: '👤', title: 'Contact CRM', desc: 'Full profiles for every contact. School, org, status, notes.' },
                { icon: '📢', title: 'Blast & schedule', desc: 'Send to 50 people at once. Schedule for the perfect time.' },
                { icon: '📊', title: 'Campaign tracking', desc: 'See who replied, who converted, who needs a follow-up.' },
              ].map(f => (
                <div key={f.title} style={{
                  padding: 28, borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{
          padding: '100px 24px', borderTop: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: '#fff', marginBottom: 12, letterSpacing: '-0.02em' }}>Ready to try Vernacular?</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', marginBottom: 32, fontSize: 17 }}>Free trial. No credit card.</p>
          <a href="/signup" style={{
            display: 'inline-block', padding: '16px 40px', borderRadius: 12,
            background: '#378ADD', color: '#fff', fontSize: 16, fontWeight: 700,
            textDecoration: 'none', boxShadow: '0 4px 24px rgba(55,138,221,0.3)',
          }}>Get Started Free</a>
        </section>

        {/* Footer */}
        <footer style={{
          padding: '24px 32px', borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          color: 'rgba(255,255,255,0.2)', fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(55,138,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#5AC8FA' }}>V</div>
            Vernacular
          </div>
          <div>vernacular.chat</div>
        </footer>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bubblePop {
          0% { opacity: 0; transform: scale(0.8) translateY(8px); }
          50% { transform: scale(1.02) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        a:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}
