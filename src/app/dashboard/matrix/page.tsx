'use client';

import { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { fmtMsgTime, parseTimestamp, normalizePhone, greekLetters, formatTime } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { ContactRecord } from '@/types/dashboard';

// ── Tile Modal with editable contact fields ──────────────────────────────

function TileModal({ tileId, allTiles, columns, contacts, tileColor, onClose, onAskCraig }: {
  tileId: string;
  allTiles: Array<{ id: string; name: string; initials: string; phone: string; status: string; colId: string; msgCount: number; state: string; greekOrg: string; age: number | null; text: string; timestamp: string; direction: string }>;
  columns: Array<{ id: string; messages: Array<{ id: string; text: string; direction: string; timestamp: string; isAIDraft?: boolean; status?: string }> }>;
  contacts: ContactRecord[];
  tileColor: (status: string) => { bg: string; glow: string; text: string };
  onClose: () => void;
  onAskCraig?: (name: string, messages: Array<{ text: string; direction: string }>) => void;
}) {
  const tile = allTiles.find(t => t.id === tileId);
  const col = tile ? columns.find(c => c.id === tile.colId) : null;
  const contactRecord = tile ? contacts.find(c => c.phone === tile.phone) : null;

  const [activeTab, setActiveTab] = useState<'chat' | 'details'>('chat');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: contactRecord?.full_name || tile?.name || '',
    email: contactRecord?.email || '',
    company: contactRecord?.company || '',
    job_title: contactRecord?.job_title || '',
    state: contactRecord?.state || tile?.state || '',
    greek_org: contactRecord?.greek_org || tile?.greekOrg || '',
    school: contactRecord?.school || '',
    notes: contactRecord?.notes || '',
    tags: (contactRecord?.tags || []).join(', '),
    linkedin_url: contactRecord?.linkedin_url || '',
    instagram_handle: contactRecord?.instagram_handle || '',
    venmo_handle: contactRecord?.venmo_handle || '',
  });

  if (!tile || !col) return null;

  const colors = tileColor(tile.status);

  const saveContact = async () => {
    if (!contactRecord?.id) return;
    setSaving(true);
    await supabase.from('contacts').update({
      full_name: editForm.full_name,
      first_name: editForm.full_name.split(' ')[0] || '',
      last_name: editForm.full_name.split(' ').slice(1).join(' ') || '',
      email: editForm.email,
      company: editForm.company,
      job_title: editForm.job_title,
      state: editForm.state,
      greek_org: editForm.greek_org,
      school: editForm.school,
      notes: editForm.notes,
      tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      linkedin_url: editForm.linkedin_url,
      instagram_handle: editForm.instagram_handle,
      venmo_handle: editForm.venmo_handle,
    }).eq('id', contactRecord.id);
    setSaving(false);
    setEditing(false);
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.1)', fontSize: 13,
    fontFamily: "'Inter', sans-serif", outline: 'none',
    background: '#fff', color: '#0c0f1a', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: 4,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, width: 480, maxHeight: '85vh',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header with gradient */}
        <div style={{
          padding: '22px 24px 18px',
          background: `linear-gradient(145deg, ${colors.bg}, ${colors.bg}cc)`,
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 16,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 20, fontWeight: 800,
            }}>
              {tile.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{tile.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{tile.phone}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {onAskCraig && (
                <button onClick={() => onAskCraig(tile.name, col!.messages)} title="Ask Craig about this contact" style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                  color: '#fff', width: 32, height: 32, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
                    <circle cx="12" cy="12" r="11" fill="#FFE000" />
                    <circle cx="10" cy="7" r="1.4" fill="#1c1c00" />
                    <path d="M12 12 L24 4 L24 20 Z" fill="#fff">
                    </path>
                  </svg>
                </button>
              )}
              <button onClick={onClose} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                color: '#fff', fontSize: 16, width: 32, height: 32, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}>x</button>
            </div>
          </div>

          {/* Quick stats row */}
          <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
            {[
              { label: 'Messages', value: String(tile.msgCount) },
              { label: 'Status', value: tile.status.charAt(0).toUpperCase() + tile.status.slice(1) },
              ...(tile.state ? [{ label: 'State', value: tile.state }] : []),
              ...(tile.greekOrg && tile.greekOrg !== 'None' ? [{ label: 'Org', value: greekLetters(tile.greekOrg) }] : []),
              ...(tile.age ? [{ label: 'Age', value: String(tile.age) }] : []),
            ].map(stat => (
              <div key={stat.label} style={{
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(4px)',
              }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginTop: 1 }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)',
          background: '#fafbfc',
        }}>
          {(['chat', 'details'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
              background: 'transparent',
              borderBottom: activeTab === tab ? '2px solid #2678FF' : '2px solid transparent',
              color: activeTab === tab ? '#2678FF' : '#9ca3af',
              fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: "'Inter', sans-serif",
            }}>
              {tab === 'chat' ? 'Conversation' : 'Contact Details'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'chat' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', maxHeight: 380, background: '#f8f9fb' }}>
            {col.messages.slice(-25).map(msg => (
              <div key={msg.id} style={{
                display: 'flex', justifyContent: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                marginBottom: 6,
              }}>
                <div style={{
                  maxWidth: '80%', padding: '9px 14px',
                  borderRadius: msg.direction === 'outgoing' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.isAIDraft ? '#FEF3C7' : msg.direction === 'outgoing' ? '#2678FF' : '#fff',
                  color: msg.isAIDraft ? '#92400E' : msg.direction === 'outgoing' ? '#fff' : '#0c0f1a',
                  fontSize: 13, lineHeight: 1.45,
                  border: msg.direction === 'incoming' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  boxShadow: msg.direction === 'outgoing' && !msg.isAIDraft ? '0 1px 3px rgba(38,120,255,0.15)' : 'none',
                }}>
                  {msg.text}
                  <div style={{ fontSize: 9, marginTop: 3, opacity: 0.5, fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmtMsgTime(msg.timestamp)}
                    {msg.isAIDraft && ' · AI Draft'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', maxHeight: 380 }}>
            {!contactRecord ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#9ca3af', fontSize: 13 }}>
                No contact record found for this phone number.
              </div>
            ) : editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} style={fieldStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} style={fieldStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Company</label>
                    <input value={editForm.company} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} style={fieldStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Job Title</label>
                    <input value={editForm.job_title} onChange={e => setEditForm(p => ({ ...p, job_title: e.target.value }))} style={fieldStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>State</label>
                    <input value={editForm.state} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))} style={fieldStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Greek Org</label>
                    <input value={editForm.greek_org} onChange={e => setEditForm(p => ({ ...p, greek_org: e.target.value }))} style={fieldStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>School</label>
                    <input value={editForm.school} onChange={e => setEditForm(p => ({ ...p, school: e.target.value }))} style={fieldStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Venmo</label>
                    <input value={editForm.venmo_handle} onChange={e => setEditForm(p => ({ ...p, venmo_handle: e.target.value }))} style={fieldStyle} placeholder="@handle" />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>LinkedIn</label>
                  <input value={editForm.linkedin_url} onChange={e => setEditForm(p => ({ ...p, linkedin_url: e.target.value }))} style={fieldStyle} placeholder="https://linkedin.com/in/..." />
                </div>
                <div>
                  <label style={labelStyle}>Instagram</label>
                  <input value={editForm.instagram_handle} onChange={e => setEditForm(p => ({ ...p, instagram_handle: e.target.value }))} style={fieldStyle} placeholder="@handle" />
                </div>
                <div>
                  <label style={labelStyle}>Tags (comma separated)</label>
                  <input value={editForm.tags} onChange={e => setEditForm(p => ({ ...p, tags: e.target.value }))} style={fieldStyle} placeholder="vip, testing, nj" />
                </div>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveContact} disabled={saving} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                    background: '#2678FF', color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', opacity: saving ? 0.6 : 1,
                  }}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditing(false)} style={{
                    padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)',
                    background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Read-only contact view */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button onClick={() => setEditing(true)} style={{
                    padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
                    background: '#fff', color: '#2678FF', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Edit Contact
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[
                    { label: 'Phone', value: tile.phone, mono: true },
                    { label: 'Email', value: contactRecord.email },
                    { label: 'Company', value: contactRecord.company },
                    { label: 'Title', value: contactRecord.job_title },
                    { label: 'State', value: contactRecord.state },
                    { label: 'Greek Org', value: contactRecord.greek_org },
                    { label: 'School', value: contactRecord.school },
                    { label: 'Source', value: contactRecord.source || contactRecord.import_source },
                    { label: 'LinkedIn', value: contactRecord.linkedin_url, link: true },
                    { label: 'Instagram', value: contactRecord.instagram_handle ? `@${contactRecord.instagram_handle}` : '' },
                    { label: 'Venmo', value: contactRecord.venmo_handle ? `@${contactRecord.venmo_handle}` : '' },
                    { label: 'Created', value: contactRecord.created_at ? formatTime(contactRecord.created_at) : '' },
                  ].filter(f => f.value).map(field => (
                    <div key={field.label}>
                      <div style={labelStyle}>{field.label}</div>
                      {field.link ? (
                        <a href={field.value} target="_blank" rel="noopener noreferrer" style={{
                          fontSize: 13, color: '#2678FF', fontWeight: 500, textDecoration: 'none',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                        }}>
                          {field.value}
                        </a>
                      ) : (
                        <div style={{
                          fontSize: 13, color: '#0c0f1a', fontWeight: 500,
                          fontFamily: field.mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
                        }}>
                          {field.value}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Tags */}
                {contactRecord.tags && contactRecord.tags.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={labelStyle}>Tags</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {contactRecord.tags.map(tag => (
                        <span key={tag} style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                          background: 'rgba(38,120,255,0.08)', color: '#2678FF',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Notes */}
                {contactRecord.notes && (
                  <div style={{ marginTop: 16 }}>
                    <div style={labelStyle}>Notes</div>
                    <div style={{
                      fontSize: 13, color: '#6b7280', lineHeight: 1.5,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)',
                    }}>
                      {contactRecord.notes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MatrixPage() {
  const {
    columns, contacts, allConversations,
    dbInitiatives, activeInitiativeFilter, setActiveInitiativeFilter, initiativePhones,
    ghostConfig, orgId, setColumns,
    setShowAICopilot, setAiCopilotMessages,
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

        {/* Initiative dropdown + launch controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={stagedInitiativeId || ''}
            onChange={async (e) => {
              const id = e.target.value;
              if (!id) { setStagedContacts([]); setStagedMessages([]); setStagedInitiativeId(null); return; }
              setStagedInitiativeId(id);
              const init = dbInitiatives.find(i => i.id === id);
              if (!init) return;
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
            }}
            style={{
              padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: stagedInitiativeId ? 'rgba(38,120,255,0.15)' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              border: stagedInitiativeId ? '1.5px solid rgba(96,165,250,0.4)' : '1.5px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', outline: 'none',
              fontFamily: "'Inter', sans-serif",
              minWidth: 200,
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: 36,
            }}
          >
            <option value="" style={{ background: '#1a1a2e', color: '#fff' }}>Stage Initiative...</option>
            {dbInitiatives.filter(i => !i.parent_id).map(init => (
              <option key={init.id} value={init.id} style={{ background: '#1a1a2e', color: '#fff' }}>
                {init.title}
              </option>
            ))}
          </select>
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

          // Vacant tile — subtle grid pattern
          if (!tile) {
            return (
              <div key={`vacant-${idx}`} style={{
                aspectRatio: '1', borderRadius: 8,
                background: 'linear-gradient(145deg, #12132a, #0e0f22)',
                border: '1px solid rgba(255,255,255,0.03)',
                opacity: 0.6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 3, height: 3, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                }} />
              </div>
            );
          }

          // Active tile — 4-corner data layout
          const colors = tileColor(tile.status);
          const firstName = tile.name.trim().split(' ')[0] || '';
          const displayName = !firstName || firstName === 'Unknown' ? tile.initials : firstName.length > 7 ? tile.initials : firstName;
          const statusLabel = tile.status === 'received' ? 'REPLY' : tile.status === 'draft' ? 'DRAFT' : tile.status === 'queued' ? 'QUEUE' : tile.status === 'failed' ? 'FAIL' : '';
          const statusDot = tile.status === 'received' ? '#4ADE80' : tile.status === 'draft' ? '#FCD34D' : tile.status === 'queued' ? '#60A5FA' : tile.status === 'failed' ? '#F87171' : 'rgba(255,255,255,0.3)';
          const cornerTag = tile.greekOrg && !['None', 'NA', 'n/a', ''].includes(tile.greekOrg)
            ? greekLetters(tile.greekOrg)
            : tile.state ? tile.state.slice(0, 2).toUpperCase() : '';
          const relTime = tile.timestamp ? formatTime(tile.timestamp) : '';

          return (
            <button key={tile.id || idx} className="disco-tile"
              onClick={() => setExpandedTileId(expandedTileId === tile.id ? null : tile.id)}
              title={`${tile.name} · ${tile.phone}\n"${tile.text.substring(0, 80)}"\n${tile.msgCount} msgs · ${tile.status}`}
              style={{
                aspectRatio: '1', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: `linear-gradient(145deg, ${colors.bg}, ${colors.bg}dd)`,
                color: colors.text,
                boxShadow: colors.glow,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 0, overflow: 'hidden', position: 'relative',
                transition: 'all 0.2s',
                animation: tile.status === 'draft' ? 'nasaUrgent 1.5s ease-in-out infinite' :
                  tile.status === 'queued' ? 'nasaPulse 2s ease-in-out infinite' : 'none',
                opacity: expandedTileId === tile.id ? 1 : 0.88,
                outline: expandedTileId === tile.id ? '2px solid #fff' : 'none',
                outlineOffset: 1,
              }}
            >
              {/* ═══ TOP-LEFT: Status dot + label ═══ */}
              <div style={{
                position: 'absolute', top: 4, left: 5,
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%', background: statusDot,
                  boxShadow: tile.status === 'received' ? `0 0 4px ${statusDot}` : 'none',
                }} />
                {statusLabel && (
                  <span style={{
                    fontSize: 6, fontWeight: 800, color: statusDot,
                    letterSpacing: '0.06em',
                    fontFamily: "'JetBrains Mono', monospace",
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                  }}>
                    {statusLabel}
                  </span>
                )}
              </div>

              {/* ═══ TOP-RIGHT: Org/State logo badge — BIG and prominent ═══ */}
              {cornerTag && (() => {
                const isGreek = tile.greekOrg && !['None', 'NA', 'n/a', ''].includes(tile.greekOrg);
                // Color coding by org
                const orgColors: Record<string, { bg: string; border: string }> = {
                  'ΣΧ': { bg: 'rgba(30,58,138,0.85)', border: 'rgba(96,165,250,0.5)' },
                  'ΧΦ': { bg: 'rgba(127,29,29,0.85)', border: 'rgba(248,113,113,0.5)' },
                  'ΔΖ': { bg: 'rgba(21,128,61,0.85)', border: 'rgba(74,222,128,0.5)' },
                  'ΖΤΑ': { bg: 'rgba(126,34,206,0.85)', border: 'rgba(192,132,252,0.5)' },
                  'ΑΣΦ': { bg: 'rgba(161,98,7,0.85)', border: 'rgba(253,224,71,0.5)' },
                  'ΒΘΠ': { bg: 'rgba(15,23,42,0.85)', border: 'rgba(148,163,184,0.5)' },
                  'ΦΣΚ': { bg: 'rgba(21,94,117,0.85)', border: 'rgba(34,211,238,0.5)' },
                  'ΘΧ': { bg: 'rgba(120,53,15,0.85)', border: 'rgba(251,146,60,0.5)' },
                };
                const orgColor = orgColors[cornerTag] || { bg: 'rgba(15,23,42,0.8)', border: 'rgba(148,163,184,0.4)' };

                return (
                  <div style={{
                    position: 'absolute', top: 2, right: 2,
                    width: isGreek ? 28 : 24, height: isGreek ? 28 : 24,
                    borderRadius: isGreek ? 8 : 6,
                    background: isGreek ? orgColor.bg : 'rgba(15,23,42,0.75)',
                    border: `1.5px solid ${isGreek ? orgColor.border : 'rgba(255,255,255,0.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(6px)',
                    boxShadow: isGreek
                      ? `0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`
                      : '0 1px 4px rgba(0,0,0,0.3)',
                  }}>
                    <span style={{
                      fontSize: isGreek ? 13 : 11,
                      fontWeight: 900,
                      color: '#fff',
                      letterSpacing: isGreek ? '0.02em' : '0.04em',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      fontFamily: isGreek ? 'serif' : "'JetBrains Mono', monospace",
                      lineHeight: 1,
                    }}>
                      {cornerTag}
                    </span>
                  </div>
                );
              })()}

              {/* ═══ CENTER: Name ═══ */}
              <span style={{
                fontSize: displayName.length > 5 ? 17 : 22,
                fontWeight: 900, textAlign: 'center', lineHeight: 1,
                letterSpacing: '-0.04em',
                textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                marginTop: 2,
              }}>
                {displayName}
              </span>

              {/* ═══ BOTTOM-LEFT: Message count ═══ */}
              <span style={{
                position: 'absolute', bottom: 16, left: 5,
                fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {tile.msgCount > 0 ? `${tile.msgCount}msg` : ''}
              </span>

              {/* ═══ BOTTOM-RIGHT: Age or direction ═══ */}
              <span style={{
                position: 'absolute', bottom: 16, right: 5,
                fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {tile.age ? `${tile.age}y` : tile.direction === 'incoming' ? '↙in' : '↗out'}
              </span>

              {/* ═══ BOTTOM BAR: Time + date ═══ */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '3px 6px',
                background: tile.direction === 'incoming'
                  ? 'linear-gradient(90deg, rgba(34,197,94,0.35), rgba(34,197,94,0.15))'
                  : 'linear-gradient(90deg, rgba(0,0,0,0.3), rgba(0,0,0,0.15))',
                borderRadius: '0 0 8px 8px',
                backdropFilter: 'blur(4px)',
              }}>
                <span style={{
                  fontSize: 8, fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: tile.direction === 'incoming' ? '#4ADE80' : 'rgba(255,255,255,0.7)',
                }}>
                  {tile.timestamp ? fmtMsgTime(tile.timestamp) : '—'}
                </span>
                <span style={{
                  fontSize: 7, fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'rgba(255,255,255,0.35)',
                }}>
                  {relTime}
                </span>
              </div>

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

      {/* Expanded tile modal — with editable contact fields */}
      {expandedTileId && <TileModal
        tileId={expandedTileId}
        allTiles={allTiles}
        columns={columns}
        contacts={contacts}
        tileColor={tileColor}
        onClose={() => setExpandedTileId(null)}
        onAskCraig={(name, messages) => {
          setShowAICopilot(true);
          const last5 = messages.slice(-5).map(m =>
            `${m.direction === 'outgoing' ? 'You' : 'Them'}: ${m.text}`
          ).join('\n');
          setAiCopilotMessages(prev => [...prev, { role: 'user', text: `Help me with ${name}. Here's our recent conversation:\n${last5}\n\nWhat should I say next?` }]);
        }}
      />}
    </div>
  );
}
