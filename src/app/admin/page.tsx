'use client';

import { useState, useEffect } from 'react';

type Org = { id: string; name: string; slug: string; plan: string; created_at: string };
type User = { id: string; email: string; full_name: string; role: string; organization_id: string; created_at: string };
type Station = { id: string; name: string; phone_number: string; apple_id: string; machine_name: string; status: string; auto_reply_enabled: boolean; last_heartbeat: string | null; organization_id: string };
type Signup = { id: string; company_name: string; full_name: string; email: string; industry: string; team_size: string; use_case: string; created_at: string };
type Integration = { id: string; organization_id: string; provider: string; enabled: boolean; status: string };

type AdminTab = 'overview' | 'machines' | 'companies' | 'signups';

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
  const [counts, setCounts] = useState({ messages: 0, conversations: 0, contacts: 0 });

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
      setCounts(data.counts);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const getOrgName = (orgId: string) => orgs.find(o => o.id === orgId)?.name || 'Unknown';
  const getOrgUsers = (orgId: string) => users.filter(u => u.organization_id === orgId);
  const getOrgStations = (orgId: string) => stations.filter(s => s.organization_id === orgId);
  const getOrgIntegrations = (orgId: string) => integrations.filter(i => i.organization_id === orgId);
  const onlineStations = stations.filter(s => s.status === 'online').length;
  const timeAgo = (d: string | null) => {
    if (!d) return 'Never';
    const ms = Date.now() - new Date(d).getTime();
    if (ms < 60000) return 'Just now';
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
    return `${Math.floor(ms / 86400000)}d ago`;
  };

  // Login screen
  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{ width: 380, textAlign: 'center' }}>
          <img src="/logo.png" alt="Vernacular" style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px', display: 'block' }} />
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em' }}>Vernacular Admin</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32 }}>Platform management console</p>
          {error && <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <input
            type="password" placeholder="Admin password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{
              width: '100%', padding: '14px 18px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, outline: 'none',
              fontFamily: "'Inter', sans-serif", marginBottom: 16, boxSizing: 'border-box',
            }}
          />
          <button onClick={login} disabled={loading} style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: loading ? 'rgba(55,138,221,0.5)' : 'linear-gradient(135deg, #378ADD, #2B6CB0)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
            boxShadow: '0 4px 16px rgba(55,138,221,0.3)',
          }}>{loading ? 'Authenticating...' : 'Enter Admin'}</button>
        </div>
      </div>
    );
  }

  const TABS: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'machines', label: 'Machines' },
    { id: 'companies', label: 'Companies' },
    { id: 'signups', label: 'Signups' },
  ];

  // Machine type icon
  const MachineIcon = ({ name, size = 80 }: { name: string; size?: number }) => {
    const isLaptop = name?.toLowerCase().includes('macbook') || name?.toLowerCase().includes('laptop');
    return (
      <div style={{ width: size, height: size * 0.75, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isLaptop ? (
          <svg width={size} height={size * 0.7} viewBox="0 0 120 84" fill="none">
            <rect x="15" y="4" width="90" height="60" rx="6" fill="#1a1a2e" stroke="#333" strokeWidth="2" />
            <rect x="22" y="11" width="76" height="46" rx="2" fill="#0d1117" />
            <path d="M5 68 C5 66 8 64 15 64 L105 64 C112 64 115 66 115 68 L115 72 C115 76 112 78 108 78 L12 78 C8 78 5 76 5 72 Z" fill="#2a2a3e" stroke="#333" strokeWidth="1.5" />
            <circle cx="60" cy="72" r="3" fill="#444" />
          </svg>
        ) : (
          <svg width={size * 0.6} height={size * 0.75} viewBox="0 0 72 90" fill="none">
            <rect x="4" y="4" width="64" height="52" rx="6" fill="#1a1a2e" stroke="#333" strokeWidth="2" />
            <rect x="10" y="10" width="52" height="40" rx="2" fill="#0d1117" />
            <rect x="28" y="58" width="16" height="4" rx="1" fill="#333" />
            <rect x="20" y="64" width="32" height="6" rx="3" fill="#2a2a3e" stroke="#333" strokeWidth="1" />
          </svg>
        )}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a1a', color: '#fff',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Top bar */}
      <div style={{
        height: 64, background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Vernacular</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'rgba(55,138,221,0.15)', color: '#378ADD', fontFamily: "'JetBrains Mono', monospace" }}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'rgba(55,138,221,0.15)' : 'transparent',
              color: tab === t.id ? '#378ADD' : 'rgba(255,255,255,0.5)',
              fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
              transition: 'all 0.15s ease',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ════ OVERVIEW TAB ════ */}
        {tab === 'overview' && (
          <>
            {/* Metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 32 }}>
              {[
                { label: 'Companies', value: orgs.length, color: '#378ADD' },
                { label: 'Users', value: users.length, color: '#A855F7' },
                { label: 'Stations', value: stations.length, color: '#22C55E' },
                { label: 'Online', value: onlineStations, color: onlineStations > 0 ? '#22C55E' : '#EF4444' },
                { label: 'Contacts', value: counts.contacts, color: '#F59E0B' },
                { label: 'Messages', value: counts.messages, color: '#EC4899' },
              ].map(m => (
                <div key={m.label} style={{
                  background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
                  padding: '20px 18px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: m.color, letterSpacing: '-0.02em' }}>{m.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Recent signups */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '24px', marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'rgba(255,255,255,0.8)' }}>Recent Signups</h3>
              {signups.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No signups yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Company', 'Name', 'Email', 'Industry', 'Team Size', 'Signed Up'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {signups.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px', fontSize: 13, fontWeight: 600 }}>{s.company_name}</td>
                        <td style={{ padding: '10px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{s.full_name}</td>
                        <td style={{ padding: '10px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>{s.email}</td>
                        <td style={{ padding: '10px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{s.industry || '—'}</td>
                        <td style={{ padding: '10px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{s.team_size || '—'}</td>
                        <td style={{ padding: '10px', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>{new Date(s.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ════ MACHINES TAB ════ */}
        {tab === 'machines' && (
          <>
            {/* Topology Diagram */}
            <div style={{
              background: 'linear-gradient(135deg, #0d1117, #1a1a2e)',
              borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)',
              padding: '48px 32px', marginBottom: 32, position: 'relative', overflow: 'hidden',
              minHeight: 400,
            }}>
              {/* Background grid */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48 }}>
                {/* Header */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>Network Topology</div>
                  <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Station Fleet</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{stations.length} machines &middot; {onlineStations} online</div>
                </div>

                {/* Hub + Stations */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 80, flexWrap: 'wrap' }}>
                  {stations.map((station, i) => {
                    const isOnline = station.status === 'online';
                    const statusColor = isOnline ? '#22C55E' : station.status === 'syncing' ? '#F59E0B' : '#EF4444';
                    const org = orgs.find(o => o.id === station.organization_id);

                    return (
                      <div key={station.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        {/* Connection line */}
                        <div style={{
                          width: 2, height: 32,
                          background: isOnline ? '#22C55E' : 'rgba(255,255,255,0.1)',
                          borderRadius: 1,
                          ...(isOnline ? {} : { backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 4px, transparent 4px, transparent 8px)' }),
                        }} />

                        {/* Machine card */}
                        <div style={{
                          background: 'rgba(255,255,255,0.04)', borderRadius: 16,
                          border: `2px solid ${isOnline ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          padding: '24px 28px', textAlign: 'center', minWidth: 220,
                          boxShadow: isOnline ? '0 0 30px rgba(34,197,94,0.1)' : 'none',
                          transition: 'all 0.3s ease',
                        }}>
                          {/* Machine icon */}
                          <MachineIcon name={station.machine_name || ''} size={90} />

                          {/* Status dot + name */}
                          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <div style={{
                              width: 10, height: 10, borderRadius: '50%', background: statusColor,
                              boxShadow: isOnline ? `0 0 8px ${statusColor}` : 'none',
                              animation: isOnline ? 'pulse 2s ease infinite' : 'none',
                            }} />
                            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{station.name}</span>
                          </div>

                          {/* Machine name */}
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{station.machine_name || 'Unknown Machine'}</div>

                          {/* Phone number */}
                          <div style={{
                            fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                            color: '#378ADD', marginTop: 12, letterSpacing: '0.02em',
                          }}>
                            {station.phone_number || 'No number'}
                          </div>

                          {/* Signal bars */}
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 10 }}>
                            {[1, 2, 3, 4].map(bar => (
                              <div key={bar} style={{
                                width: 6, height: 6 + bar * 4, borderRadius: 2,
                                background: isOnline && bar <= 4 ? '#22C55E' :
                                  station.status === 'syncing' && bar <= 2 ? '#F59E0B' : 'rgba(255,255,255,0.1)',
                              }} />
                            ))}
                          </div>

                          {/* Company badge */}
                          <div style={{
                            marginTop: 12, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                            background: 'rgba(55,138,221,0.12)', color: '#378ADD',
                            fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.04em',
                            display: 'inline-block',
                          }}>{org?.name || 'Unassigned'}</div>

                          {/* Status text */}
                          <div style={{ marginTop: 8, fontSize: 11, color: statusColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {station.status}
                          </div>

                          {/* Apple ID */}
                          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {station.apple_id || '—'}
                          </div>

                          {/* Last heartbeat */}
                          <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                            Heartbeat: {timeAgo(station.last_heartbeat)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add machine placeholder */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ width: 2, height: 32, background: 'rgba(255,255,255,0.05)' }} />
                    <div style={{
                      background: 'transparent', borderRadius: 16,
                      border: '2px dashed rgba(255,255,255,0.1)',
                      padding: '40px 28px', textAlign: 'center', minWidth: 220,
                      cursor: 'pointer', transition: 'border-color 0.2s',
                    }} onClick={() => window.alert('Station setup: Run `npx vernacular-agent setup` on the target Mac')}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                      <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>Add Machine</div>
                    </div>
                  </div>
                </div>

                {/* Vernacular Hub */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  background: 'rgba(55,138,221,0.08)', borderRadius: 14, padding: '14px 28px',
                  border: '1px solid rgba(55,138,221,0.2)',
                }}>
                  <img src="/logo.png" alt="" style={{ width: 28, height: 28, borderRadius: 7 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#378ADD' }}>Vernacular Hub</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>vernacular.chat</span>
                </div>
              </div>
            </div>

            {/* Station detail cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
              {stations.map(station => {
                const isOnline = station.status === 'online';
                const statusColor = isOnline ? '#22C55E' : '#EF4444';
                const org = orgs.find(o => o.id === station.organization_id);
                const assignedUsers = users.filter(u => u.organization_id === station.organization_id);

                return (
                  <div key={station.id} style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                  }}>
                    {/* Card header */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor, boxShadow: isOnline ? `0 0 8px ${statusColor}` : 'none' }} />
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{station.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: isOnline ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: statusColor, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>{station.status}</span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'rgba(55,138,221,0.12)', color: '#378ADD', fontFamily: "'JetBrains Mono', monospace" }}>{org?.name || '—'}</span>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Phone Number</div>
                          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#378ADD' }}>{station.phone_number || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Machine</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{station.machine_name || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Apple ID</div>
                          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>{station.apple_id || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Last Heartbeat</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{timeAgo(station.last_heartbeat)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Auto-Reply</div>
                          <div style={{ fontSize: 12, color: station.auto_reply_enabled ? '#22C55E' : 'rgba(255,255,255,0.3)' }}>{station.auto_reply_enabled ? 'Enabled' : 'Disabled'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Assigned Team</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{assignedUsers.map(u => u.full_name || u.email).join(', ') || '—'}</div>
                        </div>
                      </div>

                      {/* Status signals */}
                      <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        {[
                          { label: 'Connection', ok: isOnline },
                          { label: 'iMessage', ok: isOnline },
                          { label: 'Sync', ok: isOnline },
                        ].map(sig => (
                          <div key={sig.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: sig.ok ? '#22C55E' : 'rgba(255,255,255,0.15)' }} />
                            <span style={{ fontSize: 10, color: sig.ok ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', fontWeight: 500 }}>{sig.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ════ COMPANIES TAB ════ */}
        {tab === 'companies' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {orgs.map(org => {
              const orgUsers = getOrgUsers(org.id);
              const orgStations = getOrgStations(org.id);
              const orgIntgs = getOrgIntegrations(org.id);
              const planColors: Record<string, string> = { starter: '#22C55E', pro: '#378ADD', enterprise: '#A855F7' };

              return (
                <div key={org.id} style={{
                  background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #378ADD, #2B6CB0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>
                        {org.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{org.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>{org.slug}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: `${planColors[org.plan] || '#666'}20`, color: planColors[org.plan] || '#666', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>{org.plan || 'starter'}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Created {new Date(org.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ padding: '16px 24px', display: 'flex', gap: 32 }}>
                    {/* Team */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Team ({orgUsers.length})</div>
                      {orgUsers.map(u => (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 12, background: 'rgba(55,138,221,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#378ADD' }}>
                            {(u.full_name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{u.full_name || u.email}</span>
                          <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: u.role === 'owner' ? 'rgba(55,138,221,0.12)' : 'rgba(255,255,255,0.05)', color: u.role === 'owner' ? '#378ADD' : 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>{u.role}</span>
                        </div>
                      ))}
                    </div>

                    {/* Stations */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Stations ({orgStations.length})</div>
                      {orgStations.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.status === 'online' ? '#22C55E' : '#EF4444' }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{s.name}</span>
                          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#378ADD' }}>{s.phone_number}</span>
                        </div>
                      ))}
                      {orgStations.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>No stations</div>}
                    </div>

                    {/* Integrations */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Integrations</div>
                      {orgIntgs.map(ig => (
                        <div key={ig.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: ig.enabled ? '#22C55E' : 'rgba(255,255,255,0.15)' }} />
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{ig.provider}</span>
                        </div>
                      ))}
                      {orgIntgs.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>None configured</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════ SIGNUPS TAB ════ */}
        {tab === 'signups' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>All Signups ({signups.length})</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Company', 'Name', 'Email', 'Industry', 'Team Size', 'Use Case', 'Date'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {signups.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{s.company_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{s.full_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>{s.email}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{s.industry || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{s.team_size || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{s.use_case || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
    </div>
  );
}
