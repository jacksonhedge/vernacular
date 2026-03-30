'use client';

import { useState, useEffect, useRef } from 'react';

const ROTATING_WORDS = ['CRM', 'VIPs', 'Customer Support', 'Sales Outreach', 'Team Messaging'];

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

      {/* ===== Loading Phase — iMessage Typing Dots ===== */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: phase === 'reveal' ? 0 : 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 24,
        background: '#000',
        opacity: phase === 'reveal' ? 0 : 1,
        transition: 'opacity 0.8s ease',
        pointerEvents: phase === 'reveal' ? 'none' : 'auto',
      }}>
        {/* Vernacular logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          opacity: phase === 'imessage' ? 1 : 0.5,
          transition: 'opacity 0.3s',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #378ADD, #5AC8FA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 18,
          }}>V</div>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Vernacular</span>
        </div>

        {/* iMessage typing dots in a gray bubble */}
        {(phase === 'typing' || phase === 'imessage') && (
          <div style={{
            display: 'inline-flex',
            background: phase === 'typing' ? '#e5e5ea' : 'transparent',
            borderRadius: '20px 20px 20px 6px',
            padding: phase === 'typing' ? '14px 22px' : '14px 22px',
            gap: 5, alignItems: 'center',
            transition: 'background 0.3s',
            opacity: phase === 'typing' ? 1 : 0,
            animation: phase === 'typing' ? 'fadeIn 0.3s ease' : 'none',
          }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#8e8e93', animation: 'typingDot 1.4s ease-in-out infinite' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#8e8e93', animation: 'typingDot 1.4s ease-in-out 0.2s infinite' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#8e8e93', animation: 'typingDot 1.4s ease-in-out 0.4s infinite' }} />
          </div>
        )}

        {/* Message bubble pops in */}
        {(phase === 'message') && (
          <div style={{ animation: 'bubblePop 0.35s ease' }}>
            <div style={{
              background: '#378ADD', color: '#fff',
              padding: '12px 22px',
              borderRadius: '22px 22px 6px 22px',
              fontSize: 17, fontWeight: 500, lineHeight: 1.4,
              boxShadow: '0 4px 20px rgba(55,138,221,0.3)',
            }}>
              One dashboard for every conversation.
            </div>
          </div>
        )}
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

        {/* Hero — Multi-column messaging window */}
        <section style={{
          padding: '88px 24px 0', display: 'flex', flexDirection: 'column',
          alignItems: 'center',
        }}>
          {/* HootSuite-style multi-column messaging window */}
          <div style={{
            width: '100%', maxWidth: 1200,
            borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
            padding: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#111' }}>
              {/* macOS window chrome */}
              <div style={{
                height: 38, background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', padding: '0 14px', gap: 6,
              }}>
                <div style={{ display: 'flex', gap: 7 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                </div>
                <div style={{
                  marginLeft: 16, flex: 1, maxWidth: 360,
                  background: 'rgba(255,255,255,0.06)', borderRadius: 6,
                  padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>vernacular.chat/dashboard</span>
                </div>
              </div>

              {/* 4-column conversations */}
              <div style={{ display: 'flex', minHeight: 420 }}>

                {/* Column 1 — Jake T. */}
                <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(55,138,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#5AC8FA', flexShrink: 0 }}>JT</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Jake T.</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Sigma Chi &middot; OSU</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>ACTIVE</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>Yo Jake whats up man, this is Jackson</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Hey! Yeah I signed up yesterday</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ position: 'relative', background: 'rgba(55,138,221,0.15)', border: '1px dashed rgba(55,138,221,0.3)', color: '#7ab8f0', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>
                        <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: 'rgba(55,138,221,0.25)', color: '#7ab8f0', padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>AI</span>
                        Perfect — what&apos;s your Venmo? I&apos;ll send the deposit over
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>It&apos;s @jake-t22</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>Sent! Here&apos;s the link to get started</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%' }}>
                      <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 8, fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>ogmarketslimited.pxf.io/hedge</span>
                    </div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Just got the Venmo! 🙏</div></div>
                  </div>
                  <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>

                {/* Column 2 — Colby R. */}
                <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>CR</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Colby R.</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Sigma Chi &middot; USC</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>CONFIRMED</span>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>RESTRICTED</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>Yo Colby whats up man</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Hey what&apos;s this about?</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>Derby Days sponsorship — first 25 guys get a free deposit</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Oh bet, my Venmo is @colby-resh</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px' }}>Sent! Check your Venmo</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Got it, thanks bro</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%' }}>
                      <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 8, fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>ogmarketslimited.pxf.io/hedge</span>
                    </div></div>
                  </div>
                  <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>

                {/* Column 3 — Jack R. */}
                <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>JR</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Jack R.</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Sigma Chi &middot; USC</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>CONFIRMED</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>Yo Jack whats up man</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>What&apos;s this for again, lowkey forgot</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ position: 'relative', background: 'rgba(55,138,221,0.15)', border: '1px dashed rgba(55,138,221,0.3)', color: '#7ab8f0', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>
                        <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: 'rgba(55,138,221,0.25)', color: '#7ab8f0', padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>AI</span>
                        Derby Days sponsorship from OG + Crypto.com. First 25 guys get a free deposit
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Oh bet send it over</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ position: 'relative', background: 'rgba(55,138,221,0.15)', border: '1px dashed rgba(55,138,221,0.3)', color: '#7ab8f0', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>
                        <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: 'rgba(55,138,221,0.25)', color: '#7ab8f0', padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>AI</span>
                        Sweet, what&apos;s your Venmo? I&apos;ll get it over to you
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>@jackr99 — appreciate it bro</div></div>
                  </div>
                  <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>

                {/* Column 4 — Andy R. */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>AR</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Andy R.</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Sigma Chi &middot; USC</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>NO REPLY</span>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>RESTRICTED</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'flex-end', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>Yo Andy whats up man, this is Jackson</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>Saw you filled out the form — what&apos;s your Venmo?</div></div>
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600, color: '#fbbf24', opacity: 0.6, letterSpacing: '0.03em' }}>FOLLOW-UP NEEDED</span>
                    </div>
                    {/* AI draft pending */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <div style={{ position: 'relative', background: 'rgba(55,138,221,0.1)', border: '1px dashed rgba(55,138,221,0.25)', color: '#7ab8f0', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>
                        <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: 'rgba(55,138,221,0.25)', color: '#7ab8f0', padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>AI DRAFT</span>
                        Hey Andy, just following up — still want that free deposit?
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 8, padding: '2px 8px', borderRadius: 3, background: '#378ADD', color: '#fff', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer' }}>Approve</span>
                      <span style={{ fontSize: 8, padding: '2px 8px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer' }}>Edit</span>
                    </div>
                  </div>
                  <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* "Message management" iMessage bubble + subtitle + CTAs */}
          <div style={{ textAlign: 'center', marginTop: 48, marginBottom: 24 }}>
            <div style={{ display: 'inline-block' }}>
              <div style={{
                background: '#378ADD', color: '#fff',
                padding: '14px 28px',
                borderRadius: '22px 22px 6px 22px',
                fontSize: 'clamp(24px, 4vw, 40px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                boxShadow: '0 4px 20px rgba(55,138,221,0.3)',
                lineHeight: 1.2,
              }}>
                Message management
              </div>
            </div>
            <p style={{
              fontSize: 17, color: 'rgba(255,255,255,0.4)',
              maxWidth: 480, margin: '20px auto 32px', lineHeight: 1.6,
            }}>
              Every iMessage conversation in one dashboard. AI drafts your replies. You approve and send.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
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
          </div>
        </section>

        {/* Rotating word section */}
        <section style={{
          padding: '80px 24px 100px', textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
          }}>
            Message management for
            <br />
            <span style={{
              display: 'inline-block',
              marginTop: 12,
              opacity: wordFade ? 1 : 0,
              transform: wordFade ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(4px)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}>
              <span style={{
                display: 'inline-block',
                background: '#378ADD',
                color: '#fff',
                padding: 'clamp(8px, 1.2vw, 16px) clamp(16px, 2.5vw, 36px)',
                borderRadius: 'clamp(16px, 2.5vw, 28px) clamp(16px, 2.5vw, 28px) 6px clamp(16px, 2.5vw, 28px)',
                fontSize: 'clamp(26px, 4.5vw, 52px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                boxShadow: '0 4px 20px rgba(55,138,221,0.3)',
              }}>
                {ROTATING_WORDS[wordIndex]}
              </span>
            </span>
          </h2>
        </section>

        {/* ===== Outreach Board Visual Section ===== */}
        <section id="demo" style={{
          padding: '80px 24px 100px', borderTop: '1px solid rgba(255,255,255,0.05)',
          background: 'linear-gradient(180deg, #000 0%, #0a0f1a 100%)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8 }}>See every conversation at once</h2>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16 }}>HootSuite-style columns. AI drafts marked clearly. Manual messages in blue.</p>
            </div>

            {/* Mock outreach board */}
            <div style={{
              borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)',
              background: '#0d1a0d', overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
              {/* Top bar mock */}
              <div style={{
                height: 40, background: 'rgba(20,25,20,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: '#4ade80' }}>OUTREACH BOARD</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {['ALL', 'iMESSAGE', 'AI SENT', 'MANUAL'].map((f, i) => (
                    <span key={f} style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600,
                      padding: '3px 8px', borderRadius: 3,
                      background: i === 0 ? 'rgba(74,222,128,0.15)' : 'transparent',
                      color: i === 0 ? '#4ade80' : 'rgba(255,255,255,0.3)',
                      border: `1px solid ${i === 0 ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    }}>{f}</span>
                  ))}
                </div>
              </div>

              {/* Columns */}
              <div style={{ display: 'flex', overflow: 'hidden' }}>
                {/* Column 1 — Austin (AI + Manual) */}
                <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Austin Sarvis</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>💬</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>UofSC · Sigma Chi</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>CONFIRMED</span>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>UNDER 21</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%', lineHeight: 1.4 }}>Yo Austin whats up man, this is Jackson</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ position: 'relative', background: 'rgba(55,138,221,0.15)', border: '1px dashed rgba(55,138,221,0.3)', color: '#7ab8f0', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%', lineHeight: 1.4 }}>
                        <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: 'rgba(55,138,221,0.25)', color: '#7ab8f0', padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>AI</span>
                        What&apos;s your Venmo? I&apos;ll send the deposit
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>It is austin5922</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%', lineHeight: 1.4 }}>Sending the Venmo now!</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>I got it 🙏</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%' }}>
                      <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 8, fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>ogmarketslimited.pxf.io/hedge</span>
                    </div></div>
                  </div>
                  <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>

                {/* Column 2 — Colby (mostly manual) */}
                <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Colby Resh</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>💬</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>UofSC · Sigma Chi</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>CONFIRMED</span>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>RESTRICTED</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%', lineHeight: 1.4 }}>Yo Colby whats up man</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Hey it&apos;s Colby-Resh</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px' }}>Sweet, sending in a sec</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>I got the Venmo</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Sounds good</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%' }}>
                      <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 8, fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>ogmarketslimited.pxf.io/hedge</span>
                    </div></div>
                  </div>
                  <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>

                {/* Column 3 — Jack (AI heavy) */}
                <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Jack Robinson</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>💬</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>UofSC · Sigma Chi</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>CONFIRMED</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%', lineHeight: 1.4 }}>Yo Jack whats up man</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>What&apos;s this for again, lowkey forgot</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ position: 'relative', background: 'rgba(55,138,221,0.15)', border: '1px dashed rgba(55,138,221,0.3)', color: '#7ab8f0', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>
                        <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: 'rgba(55,138,221,0.25)', color: '#7ab8f0', padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>AI</span>
                        Oh my bad — Derby Days sponsorship from OG + Crypto.com. First 25 guys get a free deposit.
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Nvm just talked to him 🙏</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ position: 'relative', background: 'rgba(55,138,221,0.15)', border: '1px dashed rgba(55,138,221,0.3)', color: '#7ab8f0', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%', lineHeight: 1.4 }}>
                        <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: 'rgba(55,138,221,0.25)', color: '#7ab8f0', padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>AI</span>
                        Sweet, ill get the Venmo over to you
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Just got it mane appreciate it</div></div>
                  </div>
                  <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>

                {/* Column 4 — Andy (no response, follow-up) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Andy Rapp</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>💬</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>UofSC · Sigma Chi</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(56,138,221,0.12)', color: '#60a5fa', border: '1px solid rgba(56,138,221,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>CONTACTED</span>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>RESTRICTED</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%', lineHeight: 1.4 }}>Yo Andy whats up man, this is Jackson</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>Saw you filled out the form — what&apos;s your Venmo?</div></div>
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600, color: '#fbbf24', opacity: 0.6, letterSpacing: '0.03em' }}>FOLLOW-UP NEEDED</span>
                    </div>
                    {/* AI draft suggestion pending */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <div style={{ position: 'relative', background: 'rgba(55,138,221,0.1)', border: '1px dashed rgba(55,138,221,0.25)', color: '#7ab8f0', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>
                        <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: 'rgba(55,138,221,0.25)', color: '#7ab8f0', padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>AI DRAFT</span>
                        Hey Andy, just following up — still want that free deposit?
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 8, padding: '2px 8px', borderRadius: 3, background: '#378ADD', color: '#fff', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>Approve</span>
                      <span style={{ fontSize: 8, padding: '2px 8px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'JetBrains Mono', monospace" }}>Edit</span>
                    </div>
                  </div>
                  <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 10, borderRadius: 3, background: '#378ADD' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Manual message</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 10, borderRadius: 3, background: 'rgba(55,138,221,0.15)', border: '1px dashed rgba(55,138,221,0.4)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>AI-drafted message</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 10, borderRadius: 3, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Incoming reply</span>
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
