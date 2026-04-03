'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const ROTATING_WORDS = ['CRM', 'VIPs', 'Customer Support', 'Sales Outreach', 'Team Messaging'];

const THEMES = {
  light: {
    bg: '#f8f8fa',
    surface: '#fff',
    surfaceBorder: 'rgba(0,0,0,0.08)',
    text: '#1c1c1e',
    textSecondary: 'rgba(0,0,0,0.45)',
    textTertiary: 'rgba(0,0,0,0.25)',
    bubbleOut: '#378ADD',
    bubbleOutText: '#fff',
    bubbleIn: '#e5e5ea',
    bubbleInText: '#1c1c1e',
    bubbleInBorder: 'rgba(0,0,0,0.05)',
    aiDraftBg: 'rgba(55,138,221,0.08)',
    aiDraftBorder: 'rgba(55,138,221,0.25)',
    aiDraftText: '#378ADD',
    chrome: '#f6f6f6',
    chromeBorder: '#e5e5e5',
    chromeText: '#1c1c1e',
    navBg: 'rgba(248,248,250,0.9)',
    navBorder: 'rgba(0,0,0,0.06)',
    accent: '#378ADD',
    badgeGreen: '#34c759',
    badgeRed: '#ff3b30',
    badgeYellow: '#ff9500',
  },
  dark: {
    bg: '#0a0a0a',
    surface: '#111',
    surfaceBorder: 'rgba(255,255,255,0.08)',
    text: '#fff',
    textSecondary: 'rgba(255,255,255,0.5)',
    textTertiary: 'rgba(255,255,255,0.25)',
    bubbleOut: '#378ADD',
    bubbleOutText: '#fff',
    bubbleIn: 'rgba(255,255,255,0.07)',
    bubbleInText: 'rgba(255,255,255,0.7)',
    bubbleInBorder: 'rgba(255,255,255,0.08)',
    aiDraftBg: 'rgba(55,138,221,0.12)',
    aiDraftBorder: 'rgba(55,138,221,0.3)',
    aiDraftText: '#7ab8f0',
    chrome: '#1a1a1a',
    chromeBorder: 'rgba(255,255,255,0.05)',
    chromeText: 'rgba(255,255,255,0.25)',
    navBg: 'rgba(0,0,0,0.85)',
    navBorder: 'rgba(255,255,255,0.06)',
    accent: '#378ADD',
    badgeGreen: '#4ade80',
    badgeRed: '#f87171',
    badgeYellow: '#fbbf24',
  },
  sunset: {
    bg: '#1a0f15',
    surface: '#2d1923',
    surfaceBorder: 'rgba(255,180,120,0.1)',
    text: '#f5e6d8',
    textSecondary: 'rgba(255,230,200,0.5)',
    textTertiary: 'rgba(255,230,200,0.25)',
    bubbleOut: '#378ADD',
    bubbleOutText: '#fff',
    bubbleIn: '#3d2030',
    bubbleInText: '#f5e6d8',
    bubbleInBorder: 'rgba(255,180,120,0.12)',
    aiDraftBg: 'rgba(55,138,221,0.1)',
    aiDraftBorder: 'rgba(55,138,221,0.25)',
    aiDraftText: '#7ab8f0',
    chrome: '#2a1520',
    chromeBorder: 'rgba(255,180,120,0.08)',
    chromeText: 'rgba(255,230,200,0.3)',
    navBg: 'rgba(26,15,21,0.9)',
    navBorder: 'rgba(255,180,120,0.08)',
    accent: '#ff9f43',
    badgeGreen: '#4ade80',
    badgeRed: '#ff6b6b',
    badgeYellow: '#ff9f43',
  },
};

type MsgDef = { from: 'me' | 'them'; text: string; isAI?: boolean; isAIDraft?: boolean };
type ConvDef = { name: string; initials: string; gradient: string; subtitle: string; badge: string; badgeColor: 'green' | 'yellow'; messages: MsgDef[]; delay: number };

const CONVOS: ConvDef[] = [
  { name: 'Sarah Chen', initials: 'SC', gradient: 'linear-gradient(135deg, #FF6B6B, #FF8E53)', subtitle: 'VIP Client \u00b7 Platinum', badge: 'ACTIVE', badgeColor: 'green', delay: 0, messages: [
    { from: 'me', text: 'Hey Sarah, wanted to let you know your exclusive early access is ready' },
    { from: 'them', text: 'Thanks! When can I get the link?' },
    { from: 'me', text: "Here's your personal access: vernacular.chat/vip/sarah", isAI: true },
    { from: 'them', text: 'Amazing, just signed up!' },
    { from: 'me', text: 'Welcome aboard! Let me know if you need anything' },
    { from: 'them', text: 'Will do, thanks!' },
    { from: 'me', text: 'By the way, we just launched a referral program', isAI: true },
    { from: 'them', text: 'Absolutely, send me the details!' },
  ]},
  { name: 'Marcus Williams', initials: 'MW', gradient: 'linear-gradient(135deg, #5B86E5, #36D1DC)', subtitle: 'Enterprise \u00b7 Acme Corp', badge: 'CONFIRMED', badgeColor: 'green', delay: 1200, messages: [
    { from: 'me', text: "Hi Marcus, your team's onboarding is all set" },
    { from: 'them', text: 'Great, how many seats do we have?' },
    { from: 'me', text: "25 seats on the Enterprise plan" },
    { from: 'them', text: 'Perfect, can you send it to my work email?' },
    { from: 'me', text: 'Done! Check your inbox' },
    { from: 'them', text: 'Got it, thanks!' },
    { from: 'me', text: 'Your team can start using the API today', isAI: true },
    { from: 'them', text: 'Perfect, sharing with the devs now' },
  ]},
  { name: 'Emily Rodriguez', initials: 'ER', gradient: 'linear-gradient(135deg, #A855F7, #EC4899)', subtitle: 'VIP Client \u00b7 Gold', badge: 'ENGAGED', badgeColor: 'green', delay: 2400, messages: [
    { from: 'me', text: "Hi Emily! We're hosting a VIP launch event next Thursday" },
    { from: 'them', text: 'Sounds great, what time?' },
    { from: 'me', text: "7 PM at The Grand. Plus one welcome!", isAI: true },
    { from: 'them', text: "Perfect, I'll be there!" },
    { from: 'me', text: "I'll send the calendar invite now", isAI: true },
    { from: 'them', text: 'Got it, see you there!' },
    { from: 'me', text: 'Quick reminder \u2014 event is tomorrow at 7 PM!', isAI: true },
    { from: 'them', text: 'On my way soon!' },
  ]},
  { name: 'David Kim', initials: 'DK', gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)', subtitle: 'Lead \u00b7 TechStart Inc', badge: 'NO REPLY', badgeColor: 'yellow', delay: 800, messages: [
    { from: 'me', text: 'Hey David, saw you checked out our demo last week' },
    { from: 'me', text: 'Would love to set up a quick call to walk through pricing' },
    { from: 'me', text: 'Hi David, just circling back \u2014 any interest in a 15-min walkthrough?', isAIDraft: true },
    { from: 'them', text: 'Hey! Sorry been swamped. Thursday works?' },
    { from: 'me', text: "Thursday at 2pm? I'll send a Zoom link", isAI: true },
    { from: 'them', text: 'Locked in' },
  ]},
  { name: 'Lisa Park', initials: 'LP', gradient: 'linear-gradient(135deg, #34D399, #059669)', subtitle: 'VIP Client \u00b7 Diamond', badge: 'ACTIVE', badgeColor: 'green', delay: 1800, messages: [
    { from: 'me', text: 'Hey Lisa, your Diamond renewal is coming up next week' },
    { from: 'them', text: 'Oh perfect, can I get the same rate?' },
    { from: 'me', text: "Absolutely! Same rate + a bonus perk for loyalty", isAI: true },
    { from: 'them', text: 'Amazing, you guys are the best' },
    { from: 'me', text: 'Renewal confirmed! Your new perks are live now' },
    { from: 'them', text: 'Love it, thank you!' },
  ]},
  { name: 'James Cooper', initials: 'JC', gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)', subtitle: 'Support \u00b7 Tier 1', badge: 'PENDING', badgeColor: 'yellow', delay: 3000, messages: [
    { from: 'them', text: "Hey, I'm having trouble logging in" },
    { from: 'me', text: 'Can you try resetting your password at vernacular.chat/reset?', isAI: true },
    { from: 'them', text: 'That worked, thanks!' },
    { from: 'me', text: 'Glad to hear it! Let me know if anything else comes up' },
    { from: 'them', text: 'Actually one more thing \u2014 how do I enable 2FA?' },
    { from: 'me', text: 'Go to Settings > Security > Two-Factor', isAI: true },
    { from: 'them', text: 'Got it, all set now!' },
  ]},
];

function ChatColumn({ conv, theme: t, started }: { conv: ConvDef; theme: typeof THEMES.light; started: boolean }) {
  const [visible, setVisible] = useState(0);
  const [typing, setTyping] = useState(false);
  const [typingFrom, setTypingFrom] = useState<'me' | 'them'>('them');
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  const scheduleMessages = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setVisible(0);
    setTyping(false);

    let accum = conv.delay;
    conv.messages.forEach((msg, i) => {
      // Show typing dots
      const typingTime = accum;
      accum += 1200 + Math.random() * 1000;
      // Show message
      const msgTime = accum;
      accum += 1400 + Math.random() * 1600;

      timeouts.current.push(setTimeout(() => {
        setTypingFrom(msg.from);
        setTyping(true);
      }, typingTime));

      timeouts.current.push(setTimeout(() => {
        setTyping(false);
        setVisible(i + 1);
      }, msgTime));
    });

    // Loop after all messages shown
    timeouts.current.push(setTimeout(() => {
      scheduleMessages();
    }, accum + 3000));
  }, [conv]);

  useEffect(() => {
    if (!started) return;
    scheduleMessages();
    return () => timeouts.current.forEach(clearTimeout);
  }, [started, scheduleMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visible, typing]);

  const bc = conv.badgeColor === 'green'
    ? { bg: `${t.badgeGreen}1f`, color: t.badgeGreen, border: `${t.badgeGreen}40` }
    : { bg: `${t.badgeYellow}1a`, color: t.badgeYellow, border: `${t.badgeYellow}33` };

  return (
    <div style={{ flex: 1, borderRight: `1px solid ${t.surfaceBorder}`, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.surfaceBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: conv.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{conv.initials}</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{conv.name}</span>
        </div>
        <div style={{ fontSize: 9, color: t.textTertiary, marginTop: 2 }}>{conv.subtitle}</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
          <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: bc.bg, color: bc.color, border: `1px solid ${bc.border}`, fontFamily: "'JetBrains Mono', monospace" }}>{conv.badge}</span>
        </div>
      </div>
      <div ref={scrollRef} style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden', maxHeight: 340 }}>
        {conv.messages.slice(0, visible).map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start', animation: 'bubblePop 0.35s ease' }}>
            {(msg.isAI || msg.isAIDraft) ? (
              <div style={{ position: 'relative', background: t.aiDraftBg, border: `1px dashed ${t.aiDraftBorder}`, color: t.aiDraftText, fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>
                <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: t.aiDraftBorder, color: t.aiDraftText, padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{msg.isAIDraft ? 'AI DRAFT' : 'AI'}</span>
                {msg.text}
              </div>
            ) : msg.from === 'me' ? (
              <div style={{ background: t.bubbleOut, color: t.bubbleOutText, fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>{msg.text}</div>
            ) : (
              <div style={{ background: t.bubbleIn, color: t.bubbleInText, fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: `1px solid ${t.bubbleInBorder}`, maxWidth: '85%', lineHeight: 1.4 }}>{msg.text}</div>
            )}
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', justifyContent: typingFrom === 'me' ? 'flex-end' : 'flex-start', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'inline-flex', background: typingFrom === 'me' ? t.bubbleOut : '#e5e5ea', borderRadius: typingFrom === 'me' ? '12px 12px 3px 12px' : '12px 12px 12px 3px', padding: '8px 14px', gap: 4, alignItems: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: typingFrom === 'me' ? 'rgba(255,255,255,0.6)' : '#8e8e93', animation: 'typingDot 1.4s ease-in-out infinite' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: typingFrom === 'me' ? 'rgba(255,255,255,0.6)' : '#8e8e93', animation: 'typingDot 1.4s ease-in-out 0.2s infinite' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: typingFrom === 'me' ? 'rgba(255,255,255,0.6)' : '#8e8e93', animation: 'typingDot 1.4s ease-in-out 0.4s infinite' }} />
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '6px 8px', borderTop: `1px solid ${t.surfaceBorder}`, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.textTertiary} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <div style={{ flex: 1, height: 26, borderRadius: 18, background: '#e5e5ea', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          <span style={{ fontSize: 10, color: '#8e8e93' }}>iMessage</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.textTertiary} strokeWidth="2"><path d="M2 12h4l3-9 4 18 3-9h4"/></svg>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.textTertiary} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [phase, setPhase] = useState<'logo' | 'incoming' | 'typing' | 'reply' | 'reveal'>('logo');
  const [wordIndex, setWordIndex] = useState(0);
  const [wordFade, setWordFade] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'sunset'>('light');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Phase timeline: logo -> incoming msg -> typing dots -> reply -> reveal
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('incoming'), 600);       // Show "Hi Vernacular?"
    const t2 = setTimeout(() => setPhase('typing'), 1800);        // Show typing dots
    const t3 = setTimeout(() => {
      setPhase('reply');                                           // Show "Hello there!"
      try {
        audioRef.current = new Audio('/imessage-sound.mp3');
        audioRef.current.volume = 0.4;
        audioRef.current.play().catch(() => {});
      } catch {}
    }, 3200);
    const t4 = setTimeout(() => setPhase('reveal'), 4600);        // Reveal page

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
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

  const t = THEMES[theme];

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: "'Inter', -apple-system, sans-serif", overflow: 'hidden' }}>

      {/* ===== Loading Phase — iMessage Conversation ===== */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: phase === 'reveal' ? 0 : 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 20,
        background: t.bg,
        opacity: phase === 'reveal' ? 0 : 1,
        transition: 'opacity 0.8s ease',
        pointerEvents: phase === 'reveal' ? 'none' : 'auto',
      }}>
        {/* Vernacular logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          opacity: phase === 'logo' ? 1 : 0.5,
          transition: 'opacity 0.3s',
        }}>
          <img src="/logo.png" alt="Vernacular" style={{ width: 40, height: 40, borderRadius: 10 }} />
          <span style={{ fontSize: 22, fontWeight: 700, color: t.text, letterSpacing: '-0.02em' }}>Vernacular</span>
        </div>

        {/* Conversation container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 320 }}>
          {/* Incoming: "Hi Vernacular?" */}
          {(phase === 'incoming' || phase === 'typing' || phase === 'reply') && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'bubblePop 0.35s ease' }}>
              <div style={{
                background: '#e5e5ea', color: '#1c1c1e',
                padding: '12px 22px',
                borderRadius: '22px 22px 22px 6px',
                fontSize: 17, fontWeight: 500, lineHeight: 1.4,
              }}>
                Hi Vernacular?
              </div>
            </div>
          )}

          {/* Typing dots (our reply incoming) */}
          {phase === 'typing' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.3s ease' }}>
              <div style={{
                display: 'inline-flex', background: '#378ADD',
                borderRadius: '22px 22px 6px 22px',
                padding: '12px 20px', gap: 5, alignItems: 'center',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: 'typingDot 1.4s ease-in-out infinite' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: 'typingDot 1.4s ease-in-out 0.2s infinite' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: 'typingDot 1.4s ease-in-out 0.4s infinite' }} />
              </div>
            </div>
          )}

          {/* Reply: "Hello there!" + Delivered */}
          {phase === 'reply' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', animation: 'bubblePop 0.35s ease' }}>
              <div style={{
                background: '#378ADD', color: '#fff',
                padding: '12px 22px',
                borderRadius: '22px 22px 6px 22px',
                fontSize: 17, fontWeight: 500, lineHeight: 1.4,
                boxShadow: '0 4px 20px rgba(55,138,221,0.3)',
              }}>
                Hello there!
              </div>
              <span style={{ fontSize: 11, color: t.textTertiary, marginTop: 4, marginRight: 4 }}>Delivered</span>
            </div>
          )}
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
          height: 64, background: t.navBg, backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${t.navBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px',
          animation: phase === 'reveal' ? 'slideDown 0.5s ease 0.3s both' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="Vernacular" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: '-0.02em' }}>Vernacular</span>
          </div>
          <div style={{ display: 'flex', gap: 2, background: 'rgba(128,128,128,0.15)', borderRadius: 6, padding: 2 }}>
            <button onClick={() => setTheme('light')} style={{ width: 28, height: 24, border: 'none', background: theme === 'light' ? 'rgba(128,128,128,0.35)' : 'transparent', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>☀️</button>
            <button onClick={() => setTheme('dark')} style={{ width: 28, height: 24, border: 'none', background: theme === 'dark' ? 'rgba(128,128,128,0.35)' : 'transparent', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>🌙</button>
            <button onClick={() => setTheme('sunset')} style={{ width: 28, height: 24, border: 'none', background: theme === 'sunset' ? 'rgba(128,128,128,0.35)' : 'transparent', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>🌅</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="/login" style={{ fontSize: 14, color: t.textSecondary, textDecoration: 'none' }}>Log In</a>
            <a href="/signup" style={{
              position: 'relative', fontSize: 13, fontWeight: 600, color: '#fff',
              padding: '8px 20px',
              borderRadius: '18px 18px 6px 18px',
              background: '#378ADD',
              textDecoration: 'none',
              boxShadow: '0 2px 10px rgba(55,138,221,0.3)',
            }}>Get Started</a>
          </div>
        </nav>

        {/* Hero — Multi-column messaging window */}
        <section style={{
          padding: '88px 24px 0', display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #e8f4fd 0%, #d4eaf8 25%, #e0f0ff 50%, #cce5f8 75%, #e8f4fd 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 12s ease infinite',
        }}>
          {/* HootSuite-style multi-column messaging window */}
          <div style={{
            width: '100%', maxWidth: 1200,
            borderRadius: 16, border: `1px solid ${t.surfaceBorder}`,
            background: t.surface,
            padding: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', background: t.surface }}>
              {/* macOS window chrome */}
              <div style={{
                height: 38, background: t.chrome, borderBottom: `1px solid ${t.chromeBorder}`,
                display: 'flex', alignItems: 'center', padding: '0 14px', gap: 6,
              }}>
                <div style={{ display: 'flex', gap: 7 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                </div>
                <div style={{
                  marginLeft: 16, flex: 1, maxWidth: 360,
                  background: t.surfaceBorder, borderRadius: 6,
                  padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t.textTertiary} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span style={{ fontSize: 11, color: t.chromeText, fontFamily: "'JetBrains Mono', monospace" }}>vernacular.chat/dashboard</span>
                </div>
              </div>

              {/* Animated conversations */}
              <div style={{ display: 'flex', minHeight: 420 }}>
                {CONVOS.map((conv) => (
                  <ChatColumn key={conv.name} conv={conv} theme={t} started={phase === 'reveal'} />
                ))}
              </div>
            </div>
          </div>

          {/* "See every conversation at once... for ___" with rotating words */}
          <div style={{ textAlign: 'center', marginTop: 28, marginBottom: 16 }}>
            <h2 style={{
              fontSize: 'clamp(24px, 3.5vw, 40px)',
              fontWeight: 800,
              color: '#378ADD',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}>
              See every conversation at once.</h2>
            <h2 style={{
              fontSize: 'clamp(24px, 3.5vw, 40px)',
              fontWeight: 800,
              color: t.text,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              marginTop: 4,
            }}>
              Message management for
              <br />
              <span style={{
                display: 'inline-block',
                marginTop: 12,
                minWidth: 'clamp(180px, 35vw, 420px)',
                height: 'clamp(44px, 6vw, 70px)',
                position: 'relative',
              }}>
                <span style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: wordFade ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.95)',
                  opacity: wordFade ? 1 : 0,
                  transition: 'opacity 0.35s ease, transform 0.35s ease',
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{
                    display: 'inline-block',
                    background: '#378ADD',
                    color: '#fff',
                    padding: 'clamp(6px, 1vw, 12px) clamp(14px, 2vw, 28px)',
                    borderRadius: 'clamp(14px, 2vw, 22px) clamp(14px, 2vw, 22px) 6px clamp(14px, 2vw, 22px)',
                    fontSize: 'clamp(20px, 3.5vw, 38px)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    boxShadow: '0 4px 20px rgba(55,138,221,0.3)',
                  }}>
                    {ROTATING_WORDS[wordIndex]}
                  </span>
                </span>
              </span>
            </h2>
          </div>
        </section>

        {/* ===== Outreach Board Visual Section ===== */}
        <section id="demo" style={{
          padding: '80px 24px 100px', borderTop: `1px solid ${t.surfaceBorder}`,
          background: theme === 'light' ? 'linear-gradient(180deg, #f8f8fa 0%, #eef1f6 100%)' : theme === 'sunset' ? 'linear-gradient(180deg, #1a0f15 0%, #1a1525 100%)' : 'linear-gradient(180deg, #0a0a0a 0%, #0a0f1a 100%)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: t.text, letterSpacing: '-0.02em', marginBottom: 8 }}>See every conversation at once</h2>
              <p style={{ color: t.textSecondary, fontSize: 16 }}>HootSuite-style columns. AI drafts marked clearly. Manual messages in blue.</p>
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
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: '#4ade80' }}>CONVERSATIONS</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {['ALL', 'SALES', 'SUPPORT', 'AI SENT'].map((f, i) => (
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
                {/* Column 1 — Sales Outreach */}
                <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Rachel Torres</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>💬</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>VP Sales · Meridian Co</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>ACTIVE</span>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>VIP</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%', lineHeight: 1.4 }}>Hi Rachel, loved your talk at SaaStr — would love to show you what we&apos;re building</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Thanks! What&apos;s the product?</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ position: 'relative', background: 'rgba(55,138,221,0.15)', border: '1px dashed rgba(55,138,221,0.3)', color: '#7ab8f0', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>
                        <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: 'rgba(55,138,221,0.25)', color: '#7ab8f0', padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>AI</span>
                        It&apos;s an iMessage CRM — your team can manage all customer texts from one dashboard
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>That&apos;s exactly what we need</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%', lineHeight: 1.4 }}>Let&apos;s do a 15-min demo Thursday?</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Thursday 2pm works 🙌</div></div>
                  </div>
                  <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>

                {/* Column 2 — Customer Support */}
                <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Mike Chen</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>💬</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Customer · Pro Plan</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>OPEN TICKET</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Hey, my billing page isn&apos;t loading</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ position: 'relative', background: 'rgba(55,138,221,0.15)', border: '1px dashed rgba(55,138,221,0.3)', color: '#7ab8f0', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>
                        <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: 'rgba(55,138,221,0.25)', color: '#7ab8f0', padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>AI</span>
                        Sorry about that! Can you try clearing your cache and refreshing?
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>That fixed it, thanks!</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px' }}>Great! Anything else I can help with?</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Actually yes — how do I add a team member?</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>Settings → Team → Invite Member. They&apos;ll get a link via text</div></div>
                  </div>
                  <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>

                {/* Column 3 — CRM / Account Management */}
                <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Sarah Kim</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>💬</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>CEO · Bolt Studios</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>ENTERPRISE</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%', lineHeight: 1.4 }}>Hi Sarah — your Q2 renewal is coming up. Wanted to check in</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Hey! Yes, we want to renew but need more seats</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>How many are you thinking? I can get you the volume pricing</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>We&apos;d need 12 seats total</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ position: 'relative', background: 'rgba(55,138,221,0.15)', border: '1px dashed rgba(55,138,221,0.3)', color: '#7ab8f0', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>
                        <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: 'rgba(55,138,221,0.25)', color: '#7ab8f0', padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>AI</span>
                        For 12 seats on Business, that&apos;s $2,500/seat — I can lock in $2,200 if you sign by Friday
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 12px 3px', border: '1px solid rgba(255,255,255,0.08)' }}>Deal. Send over the contract 🤝</div></div>
                  </div>
                  <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ flex: 1, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>

                {/* Column 4 — Follow-up / No Response */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>James Park</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>💬</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Director · NovaTech</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(56,138,221,0.12)', color: '#60a5fa', border: '1px solid rgba(56,138,221,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>CONTACTED</span>
                      <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>NO REPLY</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '80%', lineHeight: 1.4 }}>Hi James — saw you downloaded our whitepaper. Happy to walk you through it</div></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ background: '#378ADD', color: '#fff', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>We&apos;re offering early access to teams under 20 people</div></div>
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600, color: '#fbbf24', opacity: 0.6, letterSpacing: '0.03em' }}>FOLLOW-UP NEEDED</span>
                    </div>
                    {/* AI draft suggestion pending */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <div style={{ position: 'relative', background: 'rgba(55,138,221,0.1)', border: '1px dashed rgba(55,138,221,0.25)', color: '#7ab8f0', fontSize: 10, padding: '5px 10px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%', lineHeight: 1.4 }}>
                        <span style={{ position: 'absolute', top: -5, right: 4, fontSize: 6, background: 'rgba(55,138,221,0.25)', color: '#7ab8f0', padding: '0px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>AI DRAFT</span>
                        Hey James, just circling back — would a quick 10-min call work this week?
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
                <span style={{ fontSize: 11, color: t.textSecondary }}>Manual message</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 10, borderRadius: 3, background: 'rgba(55,138,221,0.15)', border: '1px dashed rgba(55,138,221,0.4)' }} />
                <span style={{ fontSize: 11, color: t.textSecondary }}>AI-drafted message</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 10, borderRadius: 3, background: t.bubbleIn, border: `1px solid ${t.bubbleInBorder}` }} />
                <span style={{ fontSize: 11, color: t.textSecondary }}>Incoming reply</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section style={{
          padding: '80px 24px', borderTop: `1px solid ${t.surfaceBorder}`,
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: t.text, marginBottom: 8, letterSpacing: '-0.02em' }}>Simple pricing. Powerful texting.</h2>
          <p style={{ fontSize: 20, color: t.textSecondary, marginBottom: 48, fontWeight: 600 }}>
            $333/seat/month — minimum 3 seats
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto 40px' }}>
            {[
              {
                title: 'iMessage Line',
                desc: 'Dedicated blue bubble number, 50K credits/seat included',
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
              },
              {
                title: 'AI-Powered CRM',
                desc: 'Ghost agents, auto-responses, contact management',
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                    <path d="M6 10v1a6 6 0 0 0 12 0v-1" />
                    <line x1="12" y1="17" x2="12" y2="22" />
                    <line x1="8" y1="22" x2="16" y2="22" />
                  </svg>
                ),
              },
              {
                title: 'Email + Widget',
                desc: 'Email integration, embeddable chat widget',
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 4L12 13 2 4" />
                  </svg>
                ),
              },
            ].map((col, i) => (
              <div key={i} style={{
                padding: '32px 24px', borderRadius: 16,
                background: t.surface, border: `1px solid ${t.surfaceBorder}`,
                textAlign: 'center',
              }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{col.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 8 }}>{col.title}</div>
                <div style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.5 }}>{col.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: t.textTertiary, marginBottom: 32 }}>
            Credits: Texts $0.003 &middot; AI responses $0.02 &middot; New contacts $0.25
          </p>
          <a href="/signup" style={{
            display: 'inline-block', padding: '14px 36px', borderRadius: 12,
            background: '#378ADD', color: '#fff', fontSize: 15, fontWeight: 700,
            textDecoration: 'none', boxShadow: '0 4px 24px rgba(55,138,221,0.3)',
          }}>Get Started</a>
        </section>

        {/* CTA */}
        <section style={{
          padding: '100px 24px', borderTop: `1px solid ${t.surfaceBorder}`,
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: t.text, marginBottom: 12, letterSpacing: '-0.02em' }}>Ready to try Vernacular?</h2>
          <p style={{ fontSize: 16, color: t.textSecondary, marginBottom: 36, maxWidth: 500, margin: '0 auto 36px' }}>
            Send blue iMessages from any device. Yes, even Android.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            <a href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 32px', borderRadius: 12,
              background: '#1c1c1e', color: '#fff', fontSize: 15, fontWeight: 700,
              textDecoration: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              Download for Mac
            </a>
            <a href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 32px', borderRadius: 12,
              background: 'linear-gradient(135deg, #3DDC84, #2BA566)', color: '#fff', fontSize: 15, fontWeight: 700,
              textDecoration: 'none', boxShadow: '0 4px 24px rgba(61,220,132,0.25)',
              transition: 'transform 0.2s',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/></svg>
              Download for Android
            </a>
          </div>
          <a href="/signup" style={{
            display: 'inline-block', padding: '14px 36px', borderRadius: 12,
            background: '#378ADD', color: '#fff', fontSize: 15, fontWeight: 700,
            textDecoration: 'none', boxShadow: '0 4px 24px rgba(55,138,221,0.3)',
          }}>Or try the Web Dashboard</a>
        </section>

        {/* Footer */}
        <footer style={{
          padding: '24px 32px', borderTop: `1px solid ${t.surfaceBorder}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          color: t.textTertiary, fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.png" alt="Vernacular" style={{ width: 20, height: 20, borderRadius: 5 }} />
            Vernacular
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#" style={{ color: t.textTertiary, textDecoration: 'none', fontSize: 13 }}>Privacy Policy</a>
            <a href="#" style={{ color: t.textTertiary, textDecoration: 'none', fontSize: 13 }}>Terms of Service</a>
            <span>&copy; {new Date().getFullYear()} CoverPay, Inc.</span>
          </div>
        </footer>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
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
