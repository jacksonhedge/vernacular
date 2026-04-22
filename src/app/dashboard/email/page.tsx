'use client';

import { useState, useEffect, useRef } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import type { ContactRecord } from '@/types/dashboard';

interface SentEmail {
  id: string;
  contact_name: string | null;
  to_email: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
}

function fmtTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function EmailPage() {
  const { orgId, contacts, org } = useDashboard();
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [selected, setSelected] = useState<SentEmail | null>(null);
  const [composing, setComposing] = useState(false);

  // Compose form
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [contactSuggestions, setContactSuggestions] = useState<ContactRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/email/list?orgId=${orgId}`)
      .then(r => r.json())
      .then(d => { if (d.emails) setSentEmails(d.emails); })
      .catch(() => {});
  }, [orgId]);

  const handleToChange = (val: string) => {
    setTo(val);
    if (val.length > 1) {
      const q = val.toLowerCase();
      const matches = (contacts as ContactRecord[]).filter(c =>
        c.email && (c.full_name?.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      ).slice(0, 6);
      setContactSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const pickContact = (c: ContactRecord) => {
    setTo(c.email || '');
    setShowSuggestions(false);
    setTimeout(() => bodyRef.current?.focus(), 50);
  };

  const sendEmail = async () => {
    if (!to || !subject || !body) return;
    setSending(true);
    try {
      const matchedContact = (contacts as ContactRecord[]).find(c => c.email === to);
      const contactName = matchedContact
        ? `${matchedContact.first_name || ''} ${matchedContact.last_name || ''}`.trim() || null
        : null;

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to, subject, body,
          fromName: (org as Record<string, unknown>)?.name as string || 'Vernacular',
          contactName,
          organizationId: orgId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const newEmail: SentEmail = {
          id: data.id || `local-${Date.now()}`,
          contact_name: contactName,
          to_email: to,
          subject,
          body,
          status: 'sent',
          created_at: new Date().toISOString(),
        };
        setSentEmails(prev => [newEmail, ...prev]);
        setTo(''); setSubject(''); setBody('');
        setComposing(false);
        setToast('Email sent!');
        setTimeout(() => setToast(''), 3000);
      } else {
        setToast(data.error || 'Failed to send');
        setTimeout(() => setToast(''), 4000);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden', background: '#f0f2f5' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast === 'Email sent!' ? '#22C55E' : '#EF4444',
          color: '#fff', padding: '10px 20px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>{toast}</div>
      )}

      {/* Left panel — sent list */}
      <div style={{
        width: 300, minWidth: 300, background: '#fff',
        borderRight: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0c0f1a', letterSpacing: '-0.01em' }}>
              📧 Email
            </span>
            <button onClick={() => { setComposing(true); setSelected(null); }} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none',
              background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>+ Compose</button>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{sentEmails.length} sent</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sentEmails.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              No emails sent yet.
            </div>
          ) : sentEmails.map(email => (
            <button key={email.id} onClick={() => { setSelected(email); setComposing(false); }} style={{
              width: '100%', textAlign: 'left', padding: '14px 20px',
              border: 'none', borderBottom: '1px solid rgba(0,0,0,0.04)',
              background: selected?.id === email.id ? 'rgba(239,68,68,0.06)' : 'transparent',
              borderLeft: selected?.id === email.id ? '3px solid #EF4444' : '3px solid transparent',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0c0f1a' }}>
                  {email.contact_name || email.to_email}
                </span>
                <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmtTime(email.created_at)}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email.subject}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email.body}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — compose or detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {composing ? (
          /* Compose */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: 32 }}>
            <div style={{
              background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)',
              maxWidth: 700, width: '100%', margin: '0 auto',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0c0f1a' }}>New Email</span>
                <button onClick={() => setComposing(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer' }}>×</button>
              </div>

              {/* To field */}
              <div style={{ padding: '0 24px', borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', width: 52 }}>To</span>
                  <input
                    value={to}
                    onChange={e => handleToChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Email address or contact name"
                    style={{
                      flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0c0f1a',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>
                {showSuggestions && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
                  }}>
                    {contactSuggestions.map(c => (
                      <button key={c.id} onMouseDown={() => pickContact(c)} style={{
                        width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none',
                        background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2,
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0c0f1a' }}>
                          {c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()}
                        </span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div style={{ padding: '0 24px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', width: 52 }}>Subject</span>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Email subject"
                    style={{
                      flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0c0f1a',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '16px 24px' }}>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={e => {
                    setBody(e.target.value);
                    if (bodyRef.current) { bodyRef.current.style.height = 'auto'; bodyRef.current.style.height = `${Math.max(200, bodyRef.current.scrollHeight)}px`; }
                  }}
                  placeholder="Write your message..."
                  style={{
                    width: '100%', border: 'none', outline: 'none', fontSize: 14, lineHeight: 1.65,
                    color: '#0c0f1a', fontFamily: "'Inter', sans-serif", resize: 'none',
                    minHeight: 200,
                  }}
                />
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  Sent via Resend · {process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}
                </span>
                <button
                  onClick={sendEmail}
                  disabled={!to || !subject || !body || sending}
                  style={{
                    padding: '10px 24px', borderRadius: 8, border: 'none',
                    background: !to || !subject || !body || sending ? 'rgba(0,0,0,0.06)' : '#EF4444',
                    color: !to || !subject || !body || sending ? '#9ca3af' : '#fff',
                    fontSize: 13, fontWeight: 700, cursor: !to || !subject || !body || sending ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        ) : selected ? (
          /* Email detail */
          <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
            <div style={{
              background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)',
              maxWidth: 700, width: '100%', margin: '0 auto',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}>
              <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0c0f1a', marginBottom: 12 }}>{selected.subject}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
                  <span>To: <strong style={{ color: '#0c0f1a' }}>{selected.contact_name ? `${selected.contact_name} <${selected.to_email}>` : selected.to_email}</strong></span>
                  <span>{new Date(selected.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ padding: '24px 28px', fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
                {selected.body.split('\n').map((line, i) => (
                  <p key={i} style={{ margin: '0 0 12px' }}>{line || <br />}</p>
                ))}
              </div>
              <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 8 }}>
                <button onClick={() => {
                  setTo(selected.to_email);
                  setSubject(`Re: ${selected.subject}`);
                  setBody('');
                  setComposing(true);
                  setSelected(null);
                }} style={{
                  padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
                  background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>↩ Reply</button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0c0f1a', marginBottom: 8 }}>Email your contacts</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>Send emails to your 429 contacts with email addresses on file.</div>
              <button onClick={() => setComposing(true)} style={{
                padding: '12px 28px', borderRadius: 10, border: 'none',
                background: '#EF4444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Compose Email</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
