'use client';

import { useState } from 'react';

/* ──────────── Types ──────────── */
type Org = { id: string; name: string; slug: string; plan: string; created_at: string };
type User = { id: string; email: string; full_name: string; role: string; organization_id: string; created_at: string };
type Station = { id: string; name: string; phone_number: string; apple_id: string; machine_name: string; status: string; auto_reply_enabled: boolean; last_heartbeat: string | null; organization_id: string };
type Signup = { id: string; company_name: string; full_name: string; email: string; industry: string; team_size: string; use_case: string; created_at: string };
type Integration = { id: string; organization_id: string; provider: string; enabled: boolean; status: string };
type OrgSetting = { id: string; organization_id: string; ai_auto_draft: boolean; ai_model: string; max_messages_per_day: number };
type Message = { id: string; direction: string; body: string; status: string; ai_generated: boolean; sent_at: string; station_id: string; conversation_id: string; contact_phone: string | null; contact_name: string | null; organization_id: string | null };
type Conversation = { id: string; station_id: string; contact_id: string; status: string; last_message_at: string };
type Counts = { messages: number; conversations: number; contacts: number; messagesToday: number; outbound: number; inbound: number; aiGenerated: number };
type AdminTab = 'overview' | 'machines' | 'companies' | 'signups' | 'messages';

/* ──────────── Helpers ──────────── */
const timeAgo = (d: string | null) => {
  if (!d) return 'Never';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60000) return 'Just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
};

const formatCurrency = (n: number) => `$${n.toLocaleString()}`;
const formatNumber = (n: number) => n.toLocaleString();

const planBase: Record<string, number> = { starter: 0, pro: 99, enterprise: 499 };

const calcOrgMRR = (org: Org, users: User[], stations: Station[]) => {
  const seats = users.filter(u => u.organization_id === org.id).length;
  const numbers = stations.filter(s => s.organization_id === org.id).length;
  return (seats * 29) + (numbers * 49) + (planBase[org.plan] || 0);
};

/* ──────────── Component ──────────── */
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<AdminTab>('overview');

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [settings, setSettings] = useState<OrgSetting[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [counts, setCounts] = useState<Counts>({ messages: 0, conversations: 0, contacts: 0, messagesToday: 0, outbound: 0, inbound: 0, aiGenerated: 0 });
  const [stationMsgToday, setStationMsgToday] = useState<Record<string, number>>({});

  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [signupFilter, setSignupFilter] = useState('');
  const [msgFilter, setMsgFilter] = useState<{ company: string; direction: string }>({ company: '', direction: '' });
  const [companySortBy, setCompanySortBy] = useState<'mrr' | 'team' | 'stations'>('mrr');

  const login = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid password');
      setOrgs(data.organizations);
      setUsers(data.users);
      setStations(data.stations);
      setSignups(data.signups);
      setIntegrations(data.integrations);
      setSettings(data.settings || []);
      setRecentMessages(data.recentMessages || []);
      setConversations(data.conversations || []);
      setCounts(data.counts);
      setStationMsgToday(data.stationMsgToday || {});
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const getOrgName = (orgId: string | null) => orgs.find(o => o.id === orgId)?.name || 'Unknown';
  const onlineStations = stations.filter(s => s.status === 'online').length;
  const offlineStations = stations.filter(s => s.status === 'offline').length;
  const totalMRR = orgs.reduce((sum, org) => sum + calcOrgMRR(org, users, stations), 0);
  const responseRate = counts.outbound > 0 ? Math.round((counts.inbound / counts.outbound) * 100) : 0;
  const aiDraftRate = counts.messages > 0 ? Math.round((counts.aiGenerated / counts.messages) * 100) : 0;

  /* ──── Login Screen ──── */
  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{ width: 400, textAlign: 'center' }}>
          {/* Glow effect */}
          <div style={{
            position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(55,138,221,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <img src="/logo.png" alt="Vernacular" style={{
              width: 72, height: 72, borderRadius: 18, margin: '0 auto 20px', display: 'block',
              boxShadow: '0 0 40px rgba(55,138,221,0.2)',
            }} />
            <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.03em' }}>Vernacular</h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 40, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>ADMIN CONSOLE</p>
            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: 12, marginBottom: 16,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#EF4444', fontSize: 13,
              }}>{error}</div>
            )}
            <input
              type="password" placeholder="Enter admin password"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              style={{
                width: '100%', padding: '16px 20px', borderRadius: 14,
                border: '1.5px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 15, outline: 'none',
                fontFamily: "'Inter', sans-serif", marginBottom: 16, boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(55,138,221,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <button onClick={login} disabled={loading} style={{
              width: '100%', padding: '16px', borderRadius: 14, border: 'none',
              background: loading ? 'rgba(55,138,221,0.4)' : 'linear-gradient(135deg, #378ADD, #2563EB)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              boxShadow: '0 4px 24px rgba(55,138,221,0.25)',
              transition: 'all 0.2s',
            }}>{loading ? 'Authenticating...' : 'Enter Console'}</button>
          </div>
        </div>
      </div>
    );
  }

  /* ──── Tab definitions ──── */
  const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '◎' },
    { id: 'machines', label: 'Machines', icon: '⬡' },
    { id: 'companies', label: 'Companies', icon: '◧' },
    { id: 'signups', label: 'Signups', icon: '↗' },
    { id: 'messages', label: 'Messages', icon: '◈' },
  ];

  /* ──── Machine SVG Icons ──── */
  const MachineIcon = ({ name, size = 80 }: { name: string; size?: number }) => {
    const isLaptop = name?.toLowerCase().includes('macbook') || name?.toLowerCase().includes('laptop');
    return isLaptop ? (
      <svg width={size} height={size * 0.7} viewBox="0 0 120 84" fill="none">
        <rect x="15" y="4" width="90" height="60" rx="6" fill="#1a1a2e" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <rect x="22" y="11" width="76" height="46" rx="2" fill="#0d1117" />
        <path d="M5 68 C5 66 8 64 15 64 L105 64 C112 64 115 66 115 68 L115 72 C115 76 112 78 108 78 L12 78 C8 78 5 76 5 72 Z" fill="#1e1e32" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <circle cx="60" cy="72" r="3" fill="rgba(255,255,255,0.1)" />
      </svg>
    ) : (
      <svg width={size * 0.6} height={size * 0.75} viewBox="0 0 72 90" fill="none">
        <rect x="4" y="4" width="64" height="52" rx="6" fill="#1a1a2e" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <rect x="10" y="10" width="52" height="40" rx="2" fill="#0d1117" />
        <rect x="28" y="58" width="16" height="4" rx="1" fill="rgba(255,255,255,0.08)" />
        <rect x="20" y="64" width="32" height="6" rx="3" fill="#1e1e32" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      </svg>
    );
  };

  /* ──── KPI Card component ──── */
  const KPICard = ({ label, value, suffix, color, sub }: { label: string; value: string | number; suffix?: string; color: string; sub?: string }) => (
    <div style={{
      background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
      padding: '20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
      }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.02em', fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
        {suffix && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{suffix}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  /* ──── Sorted companies for revenue ──── */
  const sortedOrgs = [...orgs].sort((a, b) => {
    if (companySortBy === 'mrr') return calcOrgMRR(b, users, stations) - calcOrgMRR(a, users, stations);
    if (companySortBy === 'team') return users.filter(u => u.organization_id === b.id).length - users.filter(u => u.organization_id === a.id).length;
    return stations.filter(s => s.organization_id === b.id).length - stations.filter(s => s.organization_id === a.id).length;
  });

  /* ──── Filtered messages ──── */
  const filteredMessages = recentMessages.filter(m => {
    if (msgFilter.company && m.organization_id !== msgFilter.company) return false;
    if (msgFilter.direction && m.direction !== msgFilter.direction) return false;
    return true;
  });

  /* ──── Filtered signups ──── */
  const filteredSignups = signups.filter(s => {
    if (!signupFilter) return true;
    const q = signupFilter.toLowerCase();
    return s.company_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.industry?.toLowerCase().includes(q);
  });

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a1a', color: '#fff',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* ══════ Top Navigation Bar ══════ */}
      <div style={{
        height: 56, background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="" style={{ width: 28, height: 28, borderRadius: 7 }} />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Vernacular</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
            background: 'rgba(55,138,221,0.12)', color: '#378ADD',
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em',
          }}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'rgba(55,138,221,0.12)' : 'transparent',
              color: tab === t.id ? '#378ADD' : 'rgba(255,255,255,0.4)',
              fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif",
              transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 11 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: onlineStations > 0 ? '#22C55E' : '#EF4444',
            boxShadow: onlineStations > 0 ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
          }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
            {onlineStations}/{stations.length} online
          </span>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1440, margin: '0 auto' }}>

        {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
        {tab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
              <KPICard label="Monthly Recurring Revenue" value={formatCurrency(totalMRR)} color="#22C55E" sub={`${orgs.length} companies paying`} />
              <KPICard label="Total Companies" value={orgs.length} color="#378ADD" sub={`${orgs.filter(o => o.plan === 'pro').length} pro, ${orgs.filter(o => o.plan === 'enterprise').length} enterprise`} />
              <KPICard label="Total Seats" value={users.length} color="#A855F7" sub={`$${users.length * 29}/mo seat revenue`} />
              <KPICard label="Active Stations" value={`${onlineStations}/${stations.length}`} color={onlineStations > 0 ? '#22C55E' : '#EF4444'} sub={`$${stations.length * 49}/mo number revenue`} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
              <KPICard label="Messages Today" value={formatNumber(counts.messagesToday)} color="#EC4899" sub={`${formatNumber(counts.messages)} all time`} />
              <KPICard label="Response Rate" value={`${responseRate}%`} color="#F59E0B" sub={`${formatNumber(counts.inbound)} in / ${formatNumber(counts.outbound)} out`} />
              <KPICard label="AI Draft Usage" value={`${aiDraftRate}%`} color="#A855F7" sub={`${formatNumber(counts.aiGenerated)} AI-generated`} />
              <KPICard label="Contacts Reached" value={formatNumber(counts.contacts)} color="#378ADD" sub={`${formatNumber(counts.conversations)} conversations`} />
            </div>

            {/* Two columns: Revenue + Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
              {/* Revenue Breakdown */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
                padding: '24px', overflow: 'hidden',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Revenue by Company</span>
                  <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#22C55E' }}>{formatCurrency(totalMRR)}/mo</span>
                </div>
                {sortedOrgs.map(org => {
                  const mrr = calcOrgMRR(org, users, stations);
                  const seats = users.filter(u => u.organization_id === org.id).length;
                  const nums = stations.filter(s => s.organization_id === org.id).length;
                  const pct = totalMRR > 0 ? (mrr / totalMRR) * 100 : 0;
                  return (
                    <div key={org.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{org.name}</span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                            background: org.plan === 'enterprise' ? 'rgba(168,85,247,0.12)' : org.plan === 'pro' ? 'rgba(55,138,221,0.12)' : 'rgba(255,255,255,0.05)',
                            color: org.plan === 'enterprise' ? '#A855F7' : org.plan === 'pro' ? '#378ADD' : 'rgba(255,255,255,0.3)',
                            fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                          }}>{org.plan || 'starter'}</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#22C55E' }}>{formatCurrency(mrr)}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max(pct, 2)}%`, borderRadius: 3, background: 'linear-gradient(90deg, #22C55E, #378ADD)', transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>{seats} seats × $29</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>{nums} numbers × $49</span>
                      </div>
                    </div>
                  );
                })}
                {orgs.length === 0 && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: 32 }}>No companies yet</div>}
              </div>

              {/* Recent Activity Feed */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
                padding: '24px', overflow: 'hidden',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>Recent Activity</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Mix signups and messages into activity feed */}
                  {(() => {
                    const activities: { type: string; time: string; text: string; color: string }[] = [];
                    signups.slice(0, 8).forEach(s => {
                      activities.push({ type: 'signup', time: s.created_at, text: `${s.company_name} signed up (${s.industry || 'N/A'})`, color: '#22C55E' });
                    });
                    recentMessages.slice(0, 12).forEach(m => {
                      const dir = m.direction === 'outbound' ? '→' : '←';
                      const orgName = m.organization_id ? getOrgName(m.organization_id) : 'Unknown';
                      activities.push({
                        type: 'message', time: m.sent_at,
                        text: `${dir} ${orgName} ${m.direction === 'outbound' ? 'sent to' : 'received from'} ${m.contact_phone || 'unknown'}`,
                        color: m.direction === 'outbound' ? '#378ADD' : '#F59E0B',
                      });
                    });
                    stations.forEach(s => {
                      if (s.last_heartbeat) {
                        activities.push({ type: 'station', time: s.last_heartbeat, text: `${s.name} heartbeat (${s.status})`, color: s.status === 'online' ? '#22C55E' : '#EF4444' });
                      }
                    });
                    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20).map((a, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                        borderBottom: i < 19 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', flex: 1 }}>{a.text}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{timeAgo(a.time)}</span>
                      </div>
                    ));
                  })()}
                  {recentMessages.length === 0 && signups.length === 0 && (
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: 32 }}>No activity yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom health row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {/* Fleet Status */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Station Fleet</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[
                    { label: 'Online', value: onlineStations, color: '#22C55E' },
                    { label: 'Offline', value: offlineStations, color: '#EF4444' },
                    { label: 'Never Connected', value: stations.filter(s => !s.last_heartbeat).length, color: 'rgba(255,255,255,0.2)' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                      <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: s.color }}>{s.value}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Integration Health */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Integrations</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {(() => {
                    const providers = [...new Set(integrations.map(i => i.provider))];
                    return providers.length > 0 ? providers.map(p => {
                      const count = integrations.filter(i => i.provider === p && i.enabled).length;
                      return (
                        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: count > 0 ? '#22C55E' : 'rgba(255,255,255,0.1)' }} />
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{p}</span>
                          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.3)' }}>×{count}</span>
                        </div>
                      );
                    }) : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>No integrations configured</span>;
                  })()}
                </div>
              </div>

              {/* Message Queue */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Message Pipeline</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#378ADD' }}>{formatNumber(counts.outbound)}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Sent</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#F59E0B' }}>{formatNumber(counts.inbound)}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Received</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#A855F7' }}>{formatNumber(counts.aiGenerated)}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>AI Drafted</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════ MACHINES TAB ══════════════════ */}
        {tab === 'machines' && (
          <>
            {/* Topology View */}
            <div style={{
              background: 'linear-gradient(180deg, #0d0d1f 0%, #0a0a1a 100%)',
              borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)',
              padding: '48px 32px', marginBottom: 28, position: 'relative', overflow: 'hidden',
              minHeight: 520,
            }}>
              {/* Grid dots background */}
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.04,
                backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }} />
              {/* Radial glow from center */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 500, height: 500, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(55,138,221,0.06) 0%, transparent 60%)',
                pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48 }}>
                {/* Header */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>Network Topology</div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>Station Fleet</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                    <span style={{ color: '#22C55E', fontWeight: 700 }}>{onlineStations}</span> online · <span style={{ color: '#EF4444', fontWeight: 700 }}>{offlineStations}</span> offline · {stations.length} total
                  </div>
                </div>

                {/* Station nodes + hub */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
                  {stations.map(station => {
                    const isOnline = station.status === 'online';
                    const isSyncing = station.status === 'syncing';
                    const statusColor = isOnline ? '#22C55E' : isSyncing ? '#F59E0B' : '#EF4444';
                    const org = orgs.find(o => o.id === station.organization_id);
                    const msgCount = stationMsgToday[station.id] || 0;

                    return (
                      <div key={station.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {/* Connection line */}
                        <svg width="4" height="48" style={{ marginBottom: -2 }}>
                          {isOnline ? (
                            <>
                              <line x1="2" y1="0" x2="2" y2="48" stroke="#22C55E" strokeWidth="2" strokeOpacity="0.4" />
                              <circle r="3" fill="#22C55E">
                                <animateMotion dur="2s" repeatCount="indefinite" path="M2,48 L2,0" />
                              </circle>
                            </>
                          ) : (
                            <line x1="2" y1="0" x2="2" y2="48" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="4 4" />
                          )}
                        </svg>

                        {/* Station card */}
                        <div style={{
                          background: isOnline ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
                          borderRadius: 20, padding: '28px 24px', textAlign: 'center', minWidth: 240,
                          border: `1.5px solid ${isOnline ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                          boxShadow: isOnline ? '0 0 40px rgba(34,197,94,0.08), inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                          transition: 'all 0.3s ease',
                        }}>
                          <MachineIcon name={station.machine_name || ''} size={90} />

                          {/* Status + Name */}
                          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <div style={{
                              width: 10, height: 10, borderRadius: '50%', background: statusColor,
                              boxShadow: isOnline ? `0 0 12px ${statusColor}80` : 'none',
                              animation: isOnline ? 'pulse 2s ease-in-out infinite' : 'none',
                            }} />
                            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>{station.name}</span>
                          </div>

                          {/* Machine type */}
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{station.machine_name || 'Unknown Machine'}</div>

                          {/* Phone number */}
                          <div style={{
                            fontSize: 17, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                            color: '#378ADD', marginTop: 14, letterSpacing: '0.01em',
                          }}>{station.phone_number || 'No number assigned'}</div>

                          {/* Signal bars */}
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 12 }}>
                            {[1, 2, 3, 4].map(bar => (
                              <div key={bar} style={{
                                width: 5, height: 5 + bar * 3, borderRadius: 2,
                                background: isOnline ? '#22C55E' : isSyncing && bar <= 2 ? '#F59E0B' : 'rgba(255,255,255,0.08)',
                                transition: 'background 0.3s',
                              }} />
                            ))}
                          </div>

                          {/* Company badge */}
                          <div style={{
                            marginTop: 14, fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                            background: 'rgba(55,138,221,0.1)', color: '#378ADD',
                            fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                            letterSpacing: '0.05em', display: 'inline-block',
                          }}>{org?.name || 'Unassigned'}</div>

                          {/* Stats row */}
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 14 }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.8)' }}>{msgCount}</div>
                              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>msgs today</div>
                            </div>
                            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.06)' }} />
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: statusColor, textTransform: 'uppercase' }}>{station.status}</div>
                              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{timeAgo(station.last_heartbeat)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Machine placeholder */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <svg width="4" height="48" style={{ marginBottom: -2 }}>
                      <line x1="2" y1="0" x2="2" y2="48" stroke="rgba(255,255,255,0.04)" strokeWidth="2" strokeDasharray="4 4" />
                    </svg>
                    <div style={{
                      borderRadius: 20, padding: '48px 24px', textAlign: 'center', minWidth: 240,
                      border: '2px dashed rgba(255,255,255,0.06)', cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }} onClick={() => window.alert('Run `npx vernacular-agent setup` on the target Mac')}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                      <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.2)' }}>Add Machine</div>
                      <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.1)' }}>npx vernacular-agent setup</div>
                    </div>
                  </div>
                </div>

                {/* Vernacular Hub */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(55,138,221,0.06)', borderRadius: 14, padding: '12px 24px',
                  border: '1px solid rgba(55,138,221,0.15)',
                  boxShadow: '0 0 30px rgba(55,138,221,0.05)',
                }}>
                  <img src="/logo.png" alt="" style={{ width: 24, height: 24, borderRadius: 6 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#378ADD' }}>Vernacular Hub</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>vernacular.chat</span>
                </div>
              </div>
            </div>

            {/* Station detail table */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Station Details</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>{stations.length} machines</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Status', 'Name', 'Phone', 'Company', 'Machine', 'Apple ID', 'Last Heartbeat', 'Msgs Today', 'Auto-Reply'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '10px 16px', fontSize: 9, fontWeight: 700,
                      color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {stations.map(s => {
                    const isOnline = s.status === 'online';
                    const statusColor = isOnline ? '#22C55E' : s.status === 'syncing' ? '#F59E0B' : '#EF4444';
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: isOnline ? `0 0 6px ${statusColor}` : 'none' }} />
                            <span style={{ fontSize: 10, fontWeight: 600, color: statusColor, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>{s.status}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#378ADD', fontWeight: 600 }}>{s.phone_number || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{getOrgName(s.organization_id)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{s.machine_name || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>{s.apple_id || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{timeAgo(s.last_heartbeat)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{stationMsgToday[s.id] || 0}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                            background: s.auto_reply_enabled ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                            color: s.auto_reply_enabled ? '#22C55E' : 'rgba(255,255,255,0.2)',
                            fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                          }}>{s.auto_reply_enabled ? 'ON' : 'OFF'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══════════════════ COMPANIES TAB ══════════════════ */}
        {tab === 'companies' && (
          <>
            {/* Sort controls */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>Sort by</span>
              {(['mrr', 'team', 'stations'] as const).map(s => (
                <button key={s} onClick={() => setCompanySortBy(s)} style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: companySortBy === s ? 'rgba(55,138,221,0.12)' : 'rgba(255,255,255,0.03)',
                  color: companySortBy === s ? '#378ADD' : 'rgba(255,255,255,0.4)',
                  fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                  textTransform: 'capitalize',
                }}>{s === 'mrr' ? 'Revenue' : s === 'team' ? 'Team Size' : 'Stations'}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {sortedOrgs.map(org => {
                const orgUsers = users.filter(u => u.organization_id === org.id);
                const orgStations = stations.filter(s => s.organization_id === org.id);
                const orgIntgs = integrations.filter(i => i.organization_id === org.id);
                const mrr = calcOrgMRR(org, users, stations);
                const expanded = expandedOrg === org.id;
                const planColor = org.plan === 'enterprise' ? '#A855F7' : org.plan === 'pro' ? '#378ADD' : 'rgba(255,255,255,0.3)';

                return (
                  <div key={org.id} style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: 16,
                    border: expanded ? '1px solid rgba(55,138,221,0.15)' : '1px solid rgba(255,255,255,0.06)',
                    overflow: 'hidden', transition: 'border-color 0.2s',
                  }}>
                    {/* Header - clickable */}
                    <div
                      onClick={() => setExpandedOrg(expanded ? null : org.id)}
                      style={{
                        padding: '18px 24px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: 12,
                          background: `linear-gradient(135deg, ${planColor}30, ${planColor}10)`,
                          border: `1px solid ${planColor}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: planColor, fontWeight: 800, fontSize: 16,
                        }}>{org.name.charAt(0)}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700 }}>{org.name}</span>
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                              background: `${planColor}15`, color: planColor,
                              fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                            }}>{org.plan || 'starter'}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{org.slug}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#22C55E' }}>{formatCurrency(mrr)}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>MRR</div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{orgUsers.length}</div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>seats</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{orgStations.length}</div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>stations</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{orgIntgs.filter(i => i.enabled).length}</div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>integrations</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expanded && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '20px 24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                          {/* Team */}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Team ({orgUsers.length})</div>
                            {orgUsers.map(u => (
                              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{
                                  width: 26, height: 26, borderRadius: 8, background: 'rgba(55,138,221,0.1)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 10, fontWeight: 700, color: '#378ADD',
                                }}>{(u.full_name || u.email).charAt(0).toUpperCase()}</div>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{u.full_name || u.email}</div>
                                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>{u.role}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Stations */}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Stations ({orgStations.length})</div>
                            {orgStations.map(s => (
                              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.status === 'online' ? '#22C55E' : '#EF4444' }} />
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{s.name}</div>
                                  <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#378ADD' }}>{s.phone_number || '—'}</div>
                                </div>
                              </div>
                            ))}
                            {orgStations.length === 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>No stations</div>}
                          </div>

                          {/* Integrations */}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Integrations</div>
                            {orgIntgs.map(ig => (
                              <div key={ig.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ig.enabled ? '#22C55E' : 'rgba(255,255,255,0.1)' }} />
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{ig.provider}</span>
                                <span style={{
                                  fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
                                  background: ig.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                                  color: ig.enabled ? '#22C55E' : 'rgba(255,255,255,0.2)',
                                  fontFamily: "'JetBrains Mono', monospace",
                                }}>{ig.enabled ? 'ACTIVE' : 'OFF'}</span>
                              </div>
                            ))}
                            {orgIntgs.length === 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>None configured</div>}
                          </div>
                        </div>
                        <div style={{ marginTop: 16, fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>
                          Created {new Date(org.created_at).toLocaleDateString()} · ID: {org.id.slice(0, 8)}...
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ══════════════════ SIGNUPS TAB ══════════════════ */}
        {tab === 'signups' && (
          <>
            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#378ADD' }}>{signups.length}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Total Signups</span>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#22C55E' }}>
                  {signups.length > 0 ? Math.round((orgs.length / signups.length) * 100) : 0}%
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Conversion Rate</span>
              </div>
              <div style={{ flex: 1 }} />
              <input
                type="text" placeholder="Search signups..."
                value={signupFilter} onChange={e => setSignupFilter(e.target.value)}
                style={{
                  padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 12, outline: 'none',
                  fontFamily: "'Inter', sans-serif", width: 220,
                }}
              />
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Company', 'Name', 'Email', 'Industry', 'Team Size', 'Use Case', 'Date', 'Status'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px 16px', fontSize: 9, fontWeight: 700,
                      color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {filteredSignups.map(s => {
                    const converted = orgs.some(o => o.name?.toLowerCase() === s.company_name?.toLowerCase());
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{s.company_name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{s.full_name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>{s.email}</td>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.industry || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.team_size || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.4)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.use_case || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>{new Date(s.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                            background: converted ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                            color: converted ? '#22C55E' : '#F59E0B',
                            fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                          }}>{converted ? 'CONVERTED' : 'PENDING'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredSignups.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No signups match your search</div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════ MESSAGES TAB ══════════════════ */}
        {tab === 'messages' && (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
              <select
                value={msgFilter.company}
                onChange={e => setMsgFilter(f => ({ ...f, company: e.target.value }))}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 12, outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <option value="" style={{ background: '#1a1a2e' }}>All Companies</option>
                {orgs.map(o => <option key={o.id} value={o.id} style={{ background: '#1a1a2e' }}>{o.name}</option>)}
              </select>
              <select
                value={msgFilter.direction}
                onChange={e => setMsgFilter(f => ({ ...f, direction: e.target.value }))}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 12, outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <option value="" style={{ background: '#1a1a2e' }}>All Directions</option>
                <option value="outbound" style={{ background: '#1a1a2e' }}>Outbound</option>
                <option value="inbound" style={{ background: '#1a1a2e' }}>Inbound</option>
              </select>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>
                {filteredMessages.length} messages
              </span>
            </div>

            {/* Volume bar chart - last 24h by hour */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
              padding: '20px 24px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Message Volume (24h)</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                {(() => {
                  const now = Date.now();
                  const hours = Array.from({ length: 24 }, (_, i) => {
                    const hourStart = now - (23 - i) * 3600000;
                    const hourEnd = hourStart + 3600000;
                    return recentMessages.filter(m => {
                      const t = new Date(m.sent_at).getTime();
                      return t >= hourStart && t < hourEnd;
                    }).length;
                  });
                  const max = Math.max(...hours, 1);
                  return hours.map((count, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: '100%', height: Math.max(count / max * 64, 2), borderRadius: 3,
                        background: count > 0 ? 'linear-gradient(180deg, #378ADD, rgba(55,138,221,0.4))' : 'rgba(255,255,255,0.03)',
                        transition: 'height 0.3s ease',
                      }} />
                      {i % 4 === 0 && <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.15)', fontFamily: "'JetBrains Mono', monospace" }}>{new Date(now - (23 - i) * 3600000).getHours()}h</span>}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Messages table */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Time', 'Company', '', 'Contact', 'Message', 'AI', 'Status'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '10px 14px', fontSize: 9, fontWeight: 700,
                      color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {filteredMessages.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px 14px', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                        {m.sent_at ? new Date(m.sent_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{m.organization_id ? getOrgName(m.organization_id) : '—'}</td>
                      <td style={{ padding: '10px 14px', width: 28 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: m.direction === 'outbound' ? '#378ADD' : '#F59E0B',
                        }}>{m.direction === 'outbound' ? '→' : '←'}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>
                        {m.contact_name || m.contact_phone || '—'}
                      </td>
                      <td style={{
                        padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)',
                        maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{m.body || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {m.ai_generated && (
                          <span style={{
                            fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                            background: 'rgba(168,85,247,0.1)', color: '#A855F7',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>AI</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                          background: m.status === 'delivered' ? 'rgba(34,197,94,0.1)' : m.status === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
                          color: m.status === 'delivered' ? '#22C55E' : m.status === 'failed' ? '#EF4444' : 'rgba(255,255,255,0.3)',
                          fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                        }}>{m.status || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMessages.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No messages to show</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Global animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        select option { background: #1a1a2e; }
      `}</style>
    </div>
  );
}
