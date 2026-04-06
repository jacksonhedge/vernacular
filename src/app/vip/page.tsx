'use client';

import { useState, useEffect, useRef } from 'react';

/* ─── Palette ────────────────────────────────────────────────────── */
const C = {
  bg: '#0d0d1a',
  bgEnd: '#1a1a2e',
  blue: '#378ADD',
  yellow: '#FFE000',
  green: '#22C55E',
  purple: '#7C3AED',
  red: '#EF4444',
  surface: 'rgba(255,255,255,0.04)',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.6)',
  textTertiary: 'rgba(255,255,255,0.35)',
};

/* ─── Pac-Man + Ghosts ───────────────────────────────────────────── */
function PacGhosts() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 18, opacity: 0.7 }}>
      <span style={{ display: 'inline-block', width: 20, height: 20, background: C.yellow, borderRadius: '50%', clipPath: 'polygon(100% 50%, 75% 85%, 0% 100%, 0% 0%, 75% 15%)' }} />
      <span style={{ fontSize: 16 }}>{'👻'}</span>
      <span style={{ fontSize: 16, filter: 'hue-rotate(200deg)' }}>{'👻'}</span>
      <span style={{ fontSize: 16, filter: 'hue-rotate(90deg)' }}>{'👻'}</span>
      <span style={{ fontSize: 16, filter: 'hue-rotate(300deg)' }}>{'👻'}</span>
    </div>
  );
}

/* ─── Typing dots ────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)',
            animation: `vipDotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes vipDotPulse{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>
    </span>
  );
}

/* ─── iMessage mock bubble ───────────────────────────────────────── */
function Bubble({ from, text, isAIDraft, showActions }: { from: 'host' | 'player'; text: string; isAIDraft?: boolean; showActions?: boolean }) {
  const isHost = from === 'host';
  const bubbleBg = isAIDraft
    ? 'rgba(255,224,0,0.10)'
    : isHost
    ? C.blue
    : 'rgba(255,255,255,0.08)';
  const bubbleBorder = isAIDraft ? `1px solid rgba(255,224,0,0.35)` : 'none';
  const bubbleColor = isAIDraft ? C.yellow : isHost ? '#fff' : 'rgba(255,255,255,0.8)';
  const align = isHost ? 'flex-end' : 'flex-start';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 4 }}>
      {isAIDraft && (
        <span style={{ fontSize: 10, fontWeight: 600, color: C.yellow, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
          AI Draft
        </span>
      )}
      <div
        style={{
          background: bubbleBg,
          border: bubbleBorder,
          color: bubbleColor,
          padding: '10px 16px',
          borderRadius: 20,
          maxWidth: '88%',
          fontSize: 14,
          lineHeight: 1.45,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {text}
      </div>
      {showActions && (
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          {[
            { label: 'Approve', bg: C.green, color: '#fff' },
            { label: 'Edit', bg: 'rgba(255,255,255,0.1)', color: '#fff' },
            { label: 'Dismiss', bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' },
          ].map(b => (
            <span
              key={b.label}
              style={{
                fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 12,
                background: b.bg, color: b.color, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── iMessage Phone Mock ────────────────────────────────────────── */
function PhoneMock() {
  const [step, setStep] = useState(0);
  const maxStep = 4;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const advance = () => {
      setStep(s => {
        if (s >= maxStep) {
          timer.current = setTimeout(advance, 3500);
          return 0;
        }
        timer.current = setTimeout(advance, s === maxStep - 1 ? 3000 : 1800);
        return s + 1;
      });
    };
    timer.current = setTimeout(advance, 1200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 340,
        background: '#111118',
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(55,138,221,0.15), 0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px 4px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif' }}>
        <span>9:41</span>
        <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Marcus W.</span>
        <span>iMessage</span>
      </div>

      {/* chat area */}
      <div style={{ padding: '12px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 320 }}>
        {step >= 0 && <Bubble from="host" text="Hey Marcus, great game last night. We've got courtside seats for Thursday's Lakers game — want me to hold 2 for you?" />}
        {step >= 1 && <Bubble from="player" text="Absolutely. Can you also check my comp balance?" />}
        {step >= 2 && step < maxStep && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
            <TypingDots />
            <span style={{ fontSize: 10, color: C.yellow, fontFamily: 'JetBrains Mono, monospace' }}>Blinky drafting...</span>
          </div>
        )}
        {step >= 3 && (
          <Bubble
            from="host"
            isAIDraft
            showActions
            text="Your current comp balance is $12,500. I've reserved 2 courtside seats for Thursday. Should I arrange car service from your hotel?"
          />
        )}
      </div>
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────── */
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ flex: '1 1 200px', textAlign: 'center', padding: '24px 16px' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.blue, fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.4, fontFamily: 'Inter, sans-serif' }}>{label}</div>
    </div>
  );
}

/* ─── Feature card ───────────────────────────────────────────────── */
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div
      style={{
        flex: '1 1 280px',
        background: C.surface,
        border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 20,
        padding: '36px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ fontSize: 36 }}>{icon}</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, fontFamily: 'Inter, sans-serif' }}>{title}</h3>
      <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.6, margin: 0, fontFamily: 'Inter, sans-serif' }}>{description}</p>
    </div>
  );
}

/* ─── Step card ──────────────────────────────────────────────────── */
function StepCard({ num, title, description }: { num: number; title: string; description: string }) {
  return (
    <div style={{ flex: '1 1 200px', textAlign: 'center', padding: '20px 16px', position: 'relative' }}>
      <div
        style={{
          width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, color: '#fff', fontSize: 20, fontWeight: 800,
          margin: '0 auto 16px', fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        {num}
      </div>
      <h4 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 8px', fontFamily: 'Inter, sans-serif' }}>{title}</h4>
      <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.5, margin: 0, fontFamily: 'Inter, sans-serif' }}>{description}</p>
    </div>
  );
}

/* ─── VIP Contact Card ───────────────────────────────────────────── */
function VIPContactCard() {
  const tags = [
    { label: 'VIP', color: C.yellow },
    { label: 'Whale', color: C.purple },
    { label: 'NFL', color: C.green },
    { label: 'NBA', color: C.blue },
  ];

  const rows: { label: string; value: string; valueColor?: string }[] = [
    { label: 'Deal Value', value: '$1,000,000', valueColor: C.green },
    { label: 'Engagement Score', value: '95/100', valueColor: C.yellow },
    { label: 'Lifecycle', value: 'Customer' },
    { label: 'Last Contacted', value: '2 hours ago' },
    { label: 'Preferred', value: 'iMessage only', valueColor: C.blue },
  ];

  return (
    <div
      style={{
        maxWidth: 440,
        width: '100%',
        background: '#111118',
        border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}
    >
      {/* header */}
      <div style={{ padding: '28px 24px 20px', background: 'linear-gradient(135deg, rgba(55,138,221,0.15), rgba(124,58,237,0.10))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, #5B86E5, #36D1DC)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif',
            }}
          >
            JT
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Inter, sans-serif' }}>James Thompson</div>
            <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 2, fontFamily: 'Inter, sans-serif' }}>Top 10 VIP Client</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {tags.map(t => (
            <span
              key={t.label}
              style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}33`,
                fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5,
              }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* rows */}
      <div style={{ padding: '8px 24px 16px' }}>
        {rows.map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.surfaceBorder}` }}>
            <span style={{ fontSize: 13, color: C.textSecondary, fontFamily: 'Inter, sans-serif' }}>{r.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: r.valueColor || C.text, fontFamily: 'JetBrains Mono, monospace' }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* notes */}
      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'JetBrains Mono, monospace' }}>Notes</div>
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, fontStyle: 'italic', fontFamily: 'Inter, sans-serif' }}>
          &ldquo;Top 10 VIP. Personal relationship with host. Never contact via email.&rdquo;
        </div>
      </div>
    </div>
  );
}

/* ─── Btn ────────────────────────────────────────────────────────── */
function Btn({ label, href, variant = 'primary', onClick }: { label: string; href?: string; variant?: 'primary' | 'secondary'; onClick?: () => void }) {
  const isPrimary = variant === 'primary';
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 32px',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
    border: isPrimary ? 'none' : `1px solid ${C.surfaceBorder}`,
    background: isPrimary ? C.blue : 'transparent',
    color: isPrimary ? '#fff' : C.textSecondary,
    textDecoration: 'none',
    transition: 'all 0.2s',
  };

  if (href) return <a href={href} style={style}>{label}</a>;
  return <button onClick={onClick} style={style}>{label}</button>;
}

/* ─── Section wrapper ────────────────────────────────────────────── */
function Section({ children, id, style }: { children: React.ReactNode; id?: string; style?: React.CSSProperties }) {
  return (
    <section id={id} style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto', ...style }}>
      {children}
    </section>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 48 }}>
      <h2 style={{ fontSize: 36, fontWeight: 800, color: C.text, margin: '0 0 12px', fontFamily: 'Inter, sans-serif', lineHeight: 1.2 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 16, color: C.textSecondary, margin: 0, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>{subtitle}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function VIPPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const scrollToDemo = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!mounted) return null;

  return (
    <div style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bgEnd} 40%, ${C.bg} 100%)`, minHeight: '100vh', color: C.text }}>

      {/* ─── Nav ──────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          background: 'rgba(13,13,26,0.85)',
          borderBottom: `1px solid ${C.surfaceBorder}`,
          padding: '14px 24px',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/" style={{ fontSize: 20, fontWeight: 800, color: C.text, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
              vernacular
            </a>
            <PacGhosts />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="/signup" style={{ fontSize: 14, fontWeight: 600, color: C.blue, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>Get Started</a>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <Section style={{ paddingTop: 100, paddingBottom: 60 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 60, alignItems: 'center', justifyContent: 'center' }}>
          {/* text */}
          <div style={{ flex: '1 1 400px', maxWidth: 540 }}>
            <h1
              style={{
                fontSize: 'clamp(32px, 5vw, 52px)',
                fontWeight: 900,
                lineHeight: 1.1,
                margin: '0 0 20px',
                fontFamily: 'Inter, sans-serif',
                background: `linear-gradient(135deg, ${C.text} 40%, ${C.blue})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              VIP Relationship Management in Blue Bubbles
            </h1>
            <p style={{ fontSize: 17, color: C.textSecondary, lineHeight: 1.6, margin: '0 0 32px', fontFamily: 'Inter, sans-serif' }}>
              Your VIP hosts text high-value clients all day. Give them AI-powered iMessage lines with CRM tracking, team visibility, and 24/7 ghost agents.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Btn label="Get Started" href="/signup" />
              <Btn label="See Demo" variant="secondary" onClick={scrollToDemo} />
            </div>
          </div>

          {/* phone */}
          <div style={{ flex: '0 0 auto' }}>
            <PhoneMock />
          </div>
        </div>
      </Section>

      {/* ─── Stats bar ────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${C.surfaceBorder}`, borderBottom: `1px solid ${C.surfaceBorder}`, background: 'rgba(55,138,221,0.03)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          <StatCard value="40%" label="Higher response rate with blue bubbles vs SMS" />
          <StatCard value="$0.003" label="Per text — less than a comp drink" />
          <StatCard value="2 hrs" label="Saved per host per day with AI drafts" />
          <StatCard value="100%" label="Message visibility for compliance" />
        </div>
      </div>

      {/* ─── Features ─────────────────────────────────────────── */}
      <Section>
        <SectionTitle title="Built for VIP Programs" subtitle="Everything your VIP team needs to manage high-value relationships at scale." />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <FeatureCard
            icon="📱"
            title="Dedicated VIP Lines"
            description="Each host gets their own iMessage number. Players text a business line, not a personal phone. When a host leaves, the number stays."
          />
          <FeatureCard
            icon="👻"
            title="AI Ghost Agents"
            description="Blinky drafts responses in your brand voice. Knows each player's preferences, comp history, and betting patterns. Approve with one click."
          />
          <FeatureCard
            icon="👁️"
            title="Team-Wide Visibility"
            description="VIP directors see every conversation in real-time. Seamless handoffs when hosts are out. Full audit trail for compliance."
          />
        </div>
      </Section>

      {/* ─── How it works ─────────────────────────────────────── */}
      <Section id="how-it-works" style={{ background: C.surface, borderRadius: 32, maxWidth: 1100, margin: '0 auto' }}>
        <SectionTitle title="How It Works" subtitle="From inbound text to blue-bubble reply in seconds." />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <StepCard num={1} title="Player texts your VIP line" description="Blue iMessage arrives on your dedicated number." />
          <StepCard num={2} title="Ghost agent drafts a response" description="AI reads context + CRM data to compose a reply." />
          <StepCard num={3} title="Host reviews and approves" description="Approve, edit, or type your own response." />
          <StepCard num={4} title="Player gets a blue bubble reply" description="Feels personal, not automated. Because it is." />
        </div>
      </Section>

      {/* ─── CRM Preview ──────────────────────────────────────── */}
      <Section>
        <SectionTitle title="VIP CRM at a Glance" subtitle="Every detail about your highest-value relationships, always one tap away." />
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VIPContactCard />
        </div>
      </Section>

      {/* ─── Pricing ──────────────────────────────────────────── */}
      <Section>
        <SectionTitle title="Simple Pricing, Massive ROI" />
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(55,138,221,0.08), rgba(124,58,237,0.06))',
            border: `1px solid ${C.surfaceBorder}`,
            borderRadius: 24,
            padding: '40px 32px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 900, color: C.text, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
            $333
          </div>
          <div style={{ fontSize: 16, color: C.textSecondary, marginBottom: 28, fontFamily: 'Inter, sans-serif' }}>
            per seat / month &mdash; minimum 3 seats
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', marginBottom: 28 }}>
            {[
              { label: 'Your 10-person VIP team', value: '$3,330/mo', sub: "That's less than one hosted dinner" },
              { label: '50,000 credits per seat included', value: '' },
            ].map(r => (
              <div key={r.label} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: `1px solid ${C.surfaceBorder}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: C.text, fontFamily: 'Inter, sans-serif' }}>{r.label}</span>
                  {r.value && <span style={{ fontSize: 14, fontWeight: 700, color: C.green, fontFamily: 'JetBrains Mono, monospace' }}>{r.value}</span>}
                </div>
                {r.sub && <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 4, fontFamily: 'Inter, sans-serif' }}>{r.sub}</div>}
              </div>
            ))}
          </div>

          {/* credits breakdown */}
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontFamily: 'JetBrains Mono, monospace' }}>Credit Costs</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Texts', cost: '$0.003' },
              { label: 'AI Responses', cost: '$0.02' },
              { label: 'New Contacts', cost: '$0.25' },
            ].map(c => (
              <div key={c.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: 'JetBrains Mono, monospace' }}>{c.cost}</div>
                <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: 'Inter, sans-serif' }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <Section style={{ textAlign: 'center', paddingBottom: 40 }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: C.text, margin: '0 0 24px', fontFamily: 'Inter, sans-serif' }}>
          Ready to upgrade your VIP program?
        </h2>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Btn label="Get Started" href="/signup" />
          <Btn label="Schedule a Demo" href="mailto:jackson@hedgepayments.co" variant="secondary" />
        </div>
      </Section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: `1px solid ${C.surfaceBorder}`,
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 13, color: C.textTertiary, fontFamily: 'Inter, sans-serif', marginBottom: 10 }}>
          Powered by <strong style={{ color: C.textSecondary }}>Vernacular</strong> &mdash; Business outreach in Blue iMessage
        </div>
        <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: 'Inter, sans-serif' }}>
          <a href="/privacy" style={{ color: C.textTertiary, textDecoration: 'none' }}>Privacy Policy</a>
          {' | '}
          <a href="/terms" style={{ color: C.textTertiary, textDecoration: 'none' }}>Terms</a>
          {' | '}
          <a href="https://vernacular.chat" style={{ color: C.textTertiary, textDecoration: 'none' }}>vernacular.chat</a>
        </div>
      </footer>
    </div>
  );
}
