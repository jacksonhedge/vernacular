'use client';

import { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { fmtMsgTime, parseTimestamp, normalizePhone, greekLetters } from '@/lib/utils';
import type { ContactRecord } from '@/types/dashboard';

export default function MatrixPage() {
  const {
    columns, contacts, allConversations,
    dbInitiatives, activeInitiativeFilter, setActiveInitiativeFilter, initiativePhones,
    ghostConfig, orgId, setColumns,
  } = useDashboard();

  const [expandedTileId, setExpandedTileId] = useState<string | null>(null);
  const [stagedContacts, setStagedContacts] = useState<Array<{ name: string; phone: string; firstName: string; initials: string; state?: string }>>([]);
  const [stagedMessages, setStagedMessages] = useState<string[]>([]);
  const [stagedInitiativeId, setStagedInitiativeId] = useState<string | null>(null);

  // Build tiles from conversations
  const seenPhones = new Set<string>();
  const allTiles = columns.filter(col => {
    if (!col.contact) return false;
    const ph = normalizePhone(col.contact.phone || '') || col.id;
    if (seenPhones.has(ph)) return false;
    seenPhones.add(ph);
    return true;
  }).map(col => {
    const cr = contacts.find(c => c.phone === col.contact!.phone) as ContactRecord | undefined;
    const fullName = cr?.full_name || col.contact!.name;
    const state = cr?.state || '';
    const greekOrg = cr?.greek_org || '';
    const dob = cr?.dob || '';
    const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000)) : null;
    const isPhone = fullName.startsWith('+') || fullName.startsWith('(') || fullName.match(/^\d/);
    const trimmed = fullName.trim();
    const initials = !trimmed || trimmed === 'Unknown'
      ? (col.contact!.phone?.replace(/\D/g, '').slice(-4) || '??')
      : isPhone
        ? trimmed.replace(/\D/g, '').slice(-4)
        : trimmed.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
    const lastMsg = col.messages[col.messages.length - 1];
    const hasUnread = lastMsg?.direction === 'incoming' && !lastMsg?.isAIDraft;
    const hasAiDraft = col.messages.some(m => m.isAIDraft);
    const lastStatus = (lastMsg?.status || (lastMsg?.direction === 'incoming' ? 'received' : 'sent')).toLowerCase();
    const tileStatus = hasAiDraft ? 'draft' : hasUnread ? 'received' : lastStatus;
    return {
      id: col.id, text: lastMsg?.text || '', name: fullName, initials,
      phone: col.contact!.phone || '', direction: lastMsg?.direction || 'outgoing',
      status: tileStatus, colId: col.id, aiMode: col.aiMode || 'off', age,
      timestamp: lastMsg?.timestamp || '', state, greekOrg, msgCount: col.messages.length,
    };
  });

  // Sort
  allTiles.sort((a, b) => {
    const priority = (s: string) => s === 'draft' ? 0 : s === 'received' ? 1 : s === 'queued' ? 2 : 3;
    const pDiff = priority(a.status) - priority(b.status);
    if (pDiff !== 0) return pDiff;
    const aT = a.timestamp ? parseTimestamp(a.timestamp).getTime() : 0;
    const bT = b.timestamp ? parseTimestamp(b.timestamp).getTime() : 0;
    return bT - aT;
  });

  const tileColor = (status: string) => {
    if (status === 'failed') return { bg: '#DC2626', glow: '0 0 12px rgba(220,38,38,0.6)', text: '#fff' };
    if (status === 'queued' || status === 'sending') return { bg: '#3B82F6', glow: '0 0 12px rgba(59,130,246,0.6)', text: '#fff' };
    if (status === 'draft') return { bg: '#F59E0B', glow: '0 0 10px rgba(245,158,11,0.5)', text: '#fff' };
    if (status === 'received') return { bg: '#22C55E', glow: '0 0 10px rgba(34,197,94,0.5)', text: '#fff' };
    return { bg: '#7C3AED', glow: '0 0 8px rgba(124,58,237,0.4)', text: '#fff' };
  };

  const COLS = 10;
  const TOTAL_TILES = 100;

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#0a0a1a', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              Contact Matrix
            </h2>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono', monospace" }}>
              {allTiles.length} conversations{stagedContacts.length > 0 ? ` · ${stagedContacts.length} staged` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { label: 'Needs Reply', color: '#22C55E' },
              { label: 'AI Draft', color: '#F59E0B' },
              { label: 'Active', color: '#7C3AED' },
              { label: 'Staged', color: '#3B82F6' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color, boxShadow: `0 0 8px ${l.color}60` }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Initiative buttons + launch controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {dbInitiatives.filter(i => !i.parent_id).map(init => {
            const isActive = stagedInitiativeId === init.id;
            return (
              <button key={init.id} onClick={async () => {
                if (isActive) { setStagedContacts([]); setStagedMessages([]); setStagedInitiativeId(null); return; }
                const res = await fetch('/api/ai/search-history', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'initiative_details', query: init.title, orgId }),
                });
                const data = await res.json();
                const contactLines = (data.result || '').split('\n').filter((l: string) => l.startsWith('- '));
                const parsed = contactLines.map((l: string) => {
                  const match = l.match(/- (.+?) \| \((\d{3})\) (\d{3})-(\d{4})(?:\s*\|\s*([^|]*))?/);
                  if (!match) return null;
                  const name = match[1].trim();
                  const phone = `(${match[2]}) ${match[3]}-${match[4]}`;
                  const st = (match[5] || '').trim();
                  const firstName = name.split(' ')[0];
                  const isPhoneNum = name.startsWith('(') || name.startsWith('+') || name.match(/^\d/);
                  const initials = isPhoneNum ? name.replace(/\D/g, '').slice(-4) : name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                  return { name, phone, firstName, initials, state: st };
                }).filter(Boolean) as typeof stagedContacts;
                setStagedContacts(parsed);
                setStagedMessages([]);
                setStagedInitiativeId(init.id);
              }} style={{
                padding: '9px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: isActive ? '#2678FF' : 'rgba(255,255,255,0.06)',
                color: '#fff',
                border: isActive ? '2px solid #60A5FA' : '2px solid transparent',
                boxShadow: isActive ? '0 0 16px rgba(38,120,255,0.4)' : 'none',
                transition: 'all 0.2s',
              }}>
                {init.title}
              </button>
            );
          })}
          <div style={{ flex: 1 }} />
          {stagedContacts.length > 0 && (
            <>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', fontFamily: "'JetBrains Mono', monospace" }}>
                {stagedContacts.length} STAGED
              </span>
              <button onClick={() => {
                const msg1 = prompt('Message 1 (use {name} for first name):');
                if (!msg1) return;
                const msg2 = prompt('Message 2 (optional):');
                setStagedMessages(msg2 ? [msg1, msg2] : [msg1]);
              }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #F59E0B', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Set Messages
              </button>
              {stagedMessages.length > 0 && (
                <button onClick={async () => {
                  if (!window.confirm(`Launch ${stagedContacts.length} x ${stagedMessages.length} = ${stagedContacts.length * stagedMessages.length} texts?`)) return;
                  for (const c of stagedContacts) {
                    for (const tmpl of stagedMessages) {
                      const msg = tmpl.replace(/\{name\}/g, c.firstName);
                      await fetch('/api/messages/send', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phoneNumber: c.phone, message: msg, contactName: c.name, organizationId: orgId }),
                      });
                    }
                  }
                  alert(`Launched! ${stagedContacts.length * stagedMessages.length} messages queued.`);
                  setStagedContacts([]); setStagedMessages([]); setStagedInitiativeId(null);
                }} style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  animation: 'nasaPulse 2s ease-in-out infinite',
                }}>
                  LAUNCH
                </button>
              )}
              <button onClick={() => { setStagedContacts([]); setStagedMessages([]); setStagedInitiativeId(null); }} style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Ghost Squad */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, padding: '10px 28px 14px' }}>
        {ghostConfig.map((ghost, gi) => {
          const activeTile = allTiles.find((t, ti) => (t.aiMode === 'draft' || t.aiMode === 'auto' || t.status === 'draft') && ti % ghostConfig.length === gi);
          const isWorking = !!activeTile;
          return (
            <div key={ghost.name} title={`${ghost.name} — ${ghost.role}${isWorking ? ` (on ${activeTile?.name})` : ' (idle)'}`} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              opacity: isWorking ? 0.3 : 1, transition: 'all 0.5s',
            }}>
              <svg width="22" height="22" viewBox="0 0 14 16" style={{ animation: isWorking ? 'none' : 'ghostFloat 3s ease-in-out infinite', animationDelay: `${gi * 0.2}s` }}>
                <path d="M1 14V7a6 6 0 0 1 12 0v7l-2-2-2 2-2-2-2 2-2-2z" fill={ghost.color} opacity="0.9" />
                <circle cx="5" cy="7" r="1.2" fill="#fff" /><circle cx="9" cy="7" r="1.2" fill="#fff" />
                <circle cx="5.5" cy="7" r="0.6" fill="#111" /><circle cx="9.5" cy="7" r="0.6" fill="#111" />
              </svg>
              <span style={{ fontSize: 7, color: isWorking ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                {ghost.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gap: 3, padding: '0 28px 28px', position: 'relative',
      }}>
        {/* Center logo overlay */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 5, pointerEvents: 'none', opacity: 0.06,
        }}>
          <img src="/logo.png" alt="" style={{ width: 120, height: 120, borderRadius: 24 }} />
        </div>

        {Array.from({ length: TOTAL_TILES }).map((_, idx) => {
          const tile = allTiles[idx];
          const stagedIdx = idx - allTiles.length;
          const staged = stagedIdx >= 0 && stagedIdx < stagedContacts.length ? stagedContacts[stagedIdx] : null;

          // Staged tile
          if (!tile && staged) {
            const alreadyContacted = allTiles.some(t => normalizePhone(t.phone) === normalizePhone(staged.phone));
            return (
              <div key={`staged-${stagedIdx}`} className="disco-tile" style={{
                aspectRatio: '1', borderRadius: 6,
                background: alreadyContacted ? 'linear-gradient(135deg, #6B7280, #4B5563)' : 'linear-gradient(135deg, #60A5FA, #3B82F6)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative', padding: 2, overflow: 'hidden',
                opacity: alreadyContacted ? 0.5 : 1,
                animation: alreadyContacted ? 'none' : 'tileGlow 3s ease-in-out infinite',
                border: alreadyContacted ? '2px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.12)',
              }} title={`${alreadyContacted ? 'ALREADY TEXTED: ' : 'STAGED: '}${staged.name}`}>
                {staged.state && <span style={{ position: 'absolute', top: 3, right: 4, fontSize: 11, fontWeight: 900, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{staged.state.slice(0, 2).toUpperCase()}</span>}
                <span style={{ fontSize: staged.firstName.length > 6 ? 16 : 22, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.3)', textDecoration: alreadyContacted ? 'line-through' : 'none' }}>
                  {staged.firstName.length > 8 ? staged.initials : staged.firstName}
                </span>
                <span style={{ fontSize: 7, opacity: 0.6, fontWeight: 600, marginTop: 1 }}>{alreadyContacted ? 'CONTACTED' : 'STAGED'}</span>
              </div>
            );
          }

          // Vacant tile
          if (!tile) {
            return <div key={`vacant-${idx}`} style={{ aspectRatio: '1', borderRadius: 6, background: '#1a1a2e', opacity: 0.4 }} />;
          }

          // Active tile
          const colors = tileColor(tile.status);
          return (
            <button key={tile.id || idx} className="disco-tile"
              onClick={() => setExpandedTileId(expandedTileId === tile.id ? null : tile.id)}
              title={`${tile.name}: "${tile.text.substring(0, 60)}" — ${tile.status}`}
              style={{
                aspectRatio: '1', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: colors.bg, color: colors.text,
                boxShadow: colors.glow,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 2, overflow: 'hidden', position: 'relative',
                transition: 'all 0.2s',
                animation: tile.status === 'draft' ? 'nasaUrgent 1.5s ease-in-out infinite' :
                  tile.status === 'queued' ? 'nasaPulse 2s ease-in-out infinite' : 'none',
                opacity: expandedTileId === tile.id ? 1 : 0.85,
                outline: expandedTileId === tile.id ? '2px solid #fff' : 'none',
                outlineOffset: 1,
              }}
            >
              <span style={{ position: 'absolute', top: 3, left: 5, fontSize: 10, opacity: 0.6 }}>
                {tile.direction === 'incoming' ? '↙' : '↗'}
              </span>
              <span style={{
                position: 'absolute', top: 3, right: 4, fontSize: 10, fontWeight: 900, opacity: 0.9,
                fontFamily: "'JetBrains Mono', monospace",
                background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: 3,
              }}>
                {tile.greekOrg && !['None', 'NA', 'n/a'].includes(tile.greekOrg) ? greekLetters(tile.greekOrg) : tile.state ? tile.state.slice(0, 2).toUpperCase() : ''}
              </span>
              <span style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                textAlign: 'center', fontSize: 10, fontWeight: 700, padding: '3px 0',
                fontFamily: "'JetBrains Mono', monospace",
                background: tile.direction === 'incoming' ? 'rgba(34,197,94,0.3)' : 'rgba(0,0,0,0.2)',
                color: tile.direction === 'incoming' ? '#4ADE80' : '#fff',
                borderRadius: '0 0 6px 6px',
              }}>
                {tile.timestamp ? fmtMsgTime(tile.timestamp) : '—'}
              </span>
              <span style={{
                fontSize: (tile.name.split(' ')[0] || '').length > 6 ? 18 : 24,
                fontWeight: 900, textAlign: 'center', lineHeight: 1,
                letterSpacing: '-0.04em', textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}>
                {(() => {
                  const firstName = tile.name.trim().split(' ')[0] || '';
                  if (!firstName || firstName === 'Unknown') return tile.initials;
                  return firstName.length > 6 ? tile.initials : firstName;
                })()}
              </span>
              {/* Ghost on AI tiles */}
              {(tile.aiMode === 'draft' || tile.aiMode === 'auto' || tile.status === 'draft') && (() => {
                const ghost = ghostConfig[idx % ghostConfig.length];
                return (
                  <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', animation: 'ghostFloat 2s ease-in-out infinite' }}>
                    <svg width="14" height="14" viewBox="0 0 14 16">
                      <path d="M1 14V7a6 6 0 0 1 12 0v7l-2-2-2 2-2-2-2 2-2-2z" fill={ghost.color} opacity="0.9" />
                      <circle cx="5" cy="7" r="1.2" fill="#fff" /><circle cx="9" cy="7" r="1.2" fill="#fff" />
                    </svg>
                  </div>
                );
              })()}
            </button>
          );
        })}
      </div>

      {/* Expanded tile modal */}
      {expandedTileId && (() => {
        const tile = allTiles.find(t => t.id === expandedTileId);
        if (!tile) return null;
        const col = columns.find(c => c.id === tile.colId);
        if (!col) return null;
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400,
          }} onClick={() => setExpandedTileId(null)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: '#fff', borderRadius: 20, width: 420, maxHeight: '80vh',
              boxShadow: '0 24px 80px rgba(0,0,0,0.4)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                background: `linear-gradient(135deg, ${tileColor(tile.status).bg}, ${tileColor(tile.status).bg}cc)`,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 18, fontWeight: 800,
                }}>
                  {tile.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{tile.name}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: "'JetBrains Mono', monospace" }}>{tile.phone}</div>
                </div>
                <button onClick={() => setExpandedTileId(null)} style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
                  color: '#fff', fontSize: 16, width: 32, height: 32, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>x</button>
              </div>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', maxHeight: 400, background: '#f8f9fb' }}>
                {col.messages.slice(-20).map(msg => (
                  <div key={msg.id} style={{
                    display: 'flex', justifyContent: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                    marginBottom: 6,
                  }}>
                    <div style={{
                      maxWidth: '80%', padding: '8px 12px',
                      borderRadius: msg.direction === 'outgoing' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: msg.isAIDraft ? '#FEF3C7' : msg.direction === 'outgoing' ? '#2678FF' : '#fff',
                      color: msg.isAIDraft ? '#92400E' : msg.direction === 'outgoing' ? '#fff' : '#0c0f1a',
                      fontSize: 13, lineHeight: 1.4,
                      border: msg.direction === 'incoming' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    }}>
                      {msg.text}
                      <div style={{ fontSize: 9, marginTop: 3, opacity: 0.5, fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmtMsgTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Stats */}
              <div style={{
                padding: '14px 20px', borderTop: '1px solid rgba(0,0,0,0.06)',
                display: 'flex', gap: 16, background: '#fff',
              }}>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  <span style={{ fontWeight: 700, color: '#0c0f1a' }}>{tile.msgCount}</span> messages
                </div>
                {tile.state && <div style={{ fontSize: 11, color: '#2678FF', fontWeight: 600 }}>{tile.state}</div>}
                {tile.greekOrg && tile.greekOrg !== 'None' && <div style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600 }}>{tile.greekOrg}</div>}
                {tile.age && <div style={{ fontSize: 11, color: '#9ca3af' }}>Age: {tile.age}</div>}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
