'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  text: string;
  direction: 'outgoing' | 'incoming';
  timestamp: string;
  isAIDraft?: boolean;
}

interface Contact {
  id: string;
  name: string;
  initials: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  avatar?: string;
}

interface ConversationColumn {
  id: string;
  contact: Contact | null;
  messages: Message[];
}

// ── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Sarah Chen', initials: 'SC', tag: 'VIP Client', tagColor: '#D97706', tagBg: 'rgba(217,119,6,0.1)' },
  { id: 'c2', name: 'Marcus Williams', initials: 'MW', tag: 'Enterprise', tagColor: '#7C3AED', tagBg: 'rgba(124,58,237,0.1)' },
  { id: 'c3', name: 'David Kim', initials: 'DK', tag: 'Lead', tagColor: '#2563EB', tagBg: 'rgba(37,99,235,0.1)' },
];

const MOCK_CONVERSATIONS: ConversationColumn[] = [
  {
    id: 'col-1',
    contact: MOCK_CONTACTS[0],
    messages: [
      { id: 'm1', text: 'Hey Sarah! Just wanted to follow up on the early access program we discussed last week.', direction: 'outgoing', timestamp: '10:24 AM' },
      { id: 'm2', text: 'Hi! Yes, I\'ve been looking forward to this. Our team is really excited about the platform.', direction: 'incoming', timestamp: '10:26 AM' },
      { id: 'm3', text: 'That\'s great to hear. I can get you set up with a sandbox environment today. How many seats would you need initially?', direction: 'outgoing', timestamp: '10:28 AM' },
      { id: 'm4', text: 'We\'d start with 5 seats for the pilot. Can we also get API access for our dev team?', direction: 'incoming', timestamp: '10:31 AM' },
      { id: 'm5', text: 'Absolutely. I\'ll send over the credentials and documentation this afternoon. The API supports both REST and webhooks.', direction: 'outgoing', timestamp: '10:33 AM' },
      { id: 'm6', text: 'Perfect. Also, quick question \u2014 is there SSO support? That\'s a requirement for us.', direction: 'incoming', timestamp: '10:35 AM' },
    ],
  },
  {
    id: 'col-2',
    contact: MOCK_CONTACTS[1],
    messages: [
      { id: 'm7', text: 'Marcus, welcome aboard! I\'m your dedicated account manager. How\'s the onboarding going so far?', direction: 'outgoing', timestamp: '9:15 AM' },
      { id: 'm8', text: 'Thanks! We got the team added but having some trouble with the CRM integration. Getting a 403 on the webhook endpoint.', direction: 'incoming', timestamp: '9:22 AM' },
      { id: 'm9', text: 'That\'s likely a permissions issue with the API key scope. Can you check if the key has write access enabled? It\'s under Settings > API Keys > Permissions.', direction: 'outgoing', timestamp: '9:25 AM' },
      { id: 'm10', text: 'Found it \u2014 it was set to read-only. Switching to read-write now.', direction: 'incoming', timestamp: '9:30 AM' },
      { id: 'm11', text: 'That should fix it. Once connected, your contacts will sync automatically every 15 minutes. Let me know if you run into anything else.', direction: 'outgoing', timestamp: '9:32 AM' },
    ],
  },
  {
    id: 'col-3',
    contact: MOCK_CONTACTS[2],
    messages: [
      { id: 'm12', text: 'Hi David, it was great meeting you at the conference. As discussed, here\'s a quick overview of our platform.', direction: 'outgoing', timestamp: 'Yesterday' },
      { id: 'm13', text: 'Thanks for reaching out! I showed the demo to my team and they were impressed. What does pricing look like for a 50-person org?', direction: 'incoming', timestamp: 'Yesterday' },
      { id: 'm14', text: 'For that size, you\'d be looking at our Pro tier. I can put together a custom proposal \u2014 would Tuesday work for a quick call?', direction: 'outgoing', timestamp: 'Yesterday' },
      { id: 'm15', text: 'Tuesday works. Can you send a calendar invite? david.kim@techcorp.io', direction: 'incoming', timestamp: 'Yesterday' },
      { id: 'm16', text: 'Hi David, just following up on our conversation. I\'ve put together a custom proposal for your team at the Pro tier \u2014 $89/seat/mo with volume pricing. I\'ll include the details in our Tuesday call. Looking forward to it!', direction: 'outgoing', timestamp: '', isAIDraft: true },
    ],
  },
];

// ── Nav Items ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Conversations',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    active: true,
  },
  {
    label: 'Contacts',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Campaigns',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    label: 'Outreach Board',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4" />
      </svg>
    ),
  },
  {
    label: 'AI Drafts',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a4 4 0 0 1 4-4z" /><path d="M8 7v1a4 4 0 0 0 8 0V7" /><path d="M6 12c-1.5 1-2 3-2 5h16c0-2-.5-4-2-5" /><line x1="12" y1="17" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" />
      </svg>
    ),
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<ConversationColumn[]>(MOCK_CONVERSATIONS);
  const [showContactPicker, setShowContactPicker] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [hoveredColClose, setHoveredColClose] = useState<string | null>(null);
  const messageEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }

      const { data } = await supabase
        .from('users').select('*, organizations(*)').eq('auth_id', session.user.id).single();
      setUser(data);
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Auto-scroll columns to bottom
  useEffect(() => {
    Object.values(messageEndRefs.current).forEach(ref => {
      ref?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [columns]);

  // ── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e8f4fd 0%, #f0f4ff 50%, #e8f0fd 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo.png" alt="Vernacular" style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
            animation: 'pulse 2s ease infinite', display: 'block',
          }} />
          <p style={{ color: '#8e8e93', fontSize: 15, fontWeight: 500 }}>Loading workspace...</p>
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
      </div>
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const org = user?.organizations as Record<string, unknown> | undefined;
  const plan = ((org?.plan as string) || 'starter').toLowerCase();

  const addColumn = () => {
    const newCol: ConversationColumn = {
      id: `col-${Date.now()}`,
      contact: null,
      messages: [],
    };
    setColumns(prev => [...prev, newCol]);
    setShowContactPicker(newCol.id);
  };

  const removeColumn = (colId: string) => {
    setColumns(prev => prev.filter(c => c.id !== colId));
    setShowContactPicker(null);
  };

  const pickContact = (colId: string, contact: Contact) => {
    setColumns(prev => prev.map(c =>
      c.id === colId ? { ...c, contact } : c
    ));
    setShowContactPicker(null);
  };

  const sendMessage = (colId: string) => {
    const text = inputValues[colId]?.trim();
    if (!text) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const msg: Message = {
      id: `m-${Date.now()}`,
      text,
      direction: 'outgoing',
      timestamp: time,
    };
    setColumns(prev => prev.map(c =>
      c.id === colId ? { ...c, messages: [...c.messages, msg] } : c
    ));
    setInputValues(prev => ({ ...prev, [colId]: '' }));
  };

  const usedContactIds = columns.filter(c => c.contact).map(c => c.contact!.id);
  const availableContacts = MOCK_CONTACTS.filter(c => !usedContactIds.includes(c.id));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      fontFamily: "'Inter', -apple-system, sans-serif",
      background: '#f0f2f5',
      overflow: 'hidden',
    }}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{
        width: 240,
        minWidth: 240,
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo + Org */}
        <div style={{
          padding: '20px 18px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <img src="/logo.png" alt="Vernacular" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {(org?.name as string) || 'Vernacular'}
            </div>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: plan === 'enterprise' ? '#A78BFA' : plan === 'pro' ? '#60A5FA' : '#6EE7B7',
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: 2,
            }}>
              {plan}
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const isActive = item.active;
            const isHovered = hoveredNav === item.label;
            return (
              <button
                key={item.label}
                onMouseEnter={() => setHoveredNav(item.label)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: "'Inter', sans-serif",
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                  background: isActive
                    ? 'rgba(55,138,221,0.2)'
                    : isHovered
                      ? 'rgba(255,255,255,0.06)'
                      : 'transparent',
                  marginBottom: 2,
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  position: 'relative',
                }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 18,
                    borderRadius: '0 3px 3px 0',
                    background: '#378ADD',
                  }} />
                )}
                <span style={{ color: isActive ? '#378ADD' : 'rgba(255,255,255,0.4)', display: 'flex' }}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom: User + Logout */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.45)',
            fontWeight: 500,
            marginBottom: 10,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {user?.email as string}
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
            style={{
              width: '100%',
              padding: '7px 0',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* ── Main Area ────────────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Top Bar */}
        <div style={{
          height: 56,
          minHeight: 56,
          background: '#fff',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#1c1c1e',
              letterSpacing: '-0.01em',
              margin: 0,
            }}>
              Conversations
            </h1>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#8e8e93',
              background: 'rgba(0,0,0,0.04)',
              padding: '3px 10px',
              borderRadius: 6,
            }}>
              {columns.length} streams
            </span>
          </div>
          <button
            onClick={addColumn}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              background: '#378ADD',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(55,138,221,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Column
          </button>
        </div>

        {/* Columns Container */}
        <div style={{
          flex: 1,
          display: 'flex',
          gap: 0,
          overflow: 'auto',
          padding: '16px 16px',
        }}>
          {columns.map(col => (
            <div key={col.id} style={{
              width: 360,
              minWidth: 360,
              display: 'flex',
              flexDirection: 'column',
              background: '#fff',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.08)',
              marginRight: 12,
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              {/* Column Header */}
              <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#fafbfc',
                minHeight: 52,
              }}>
                {col.contact ? (
                  <>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      background: 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      letterSpacing: '0.02em',
                    }}>
                      {col.contact.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em' }}>
                        {col.contact.name}
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: col.contact.tagColor,
                        background: col.contact.tagBg,
                        padding: '2px 7px',
                        borderRadius: 4,
                        fontFamily: "'JetBrains Mono', monospace",
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {col.contact.tag}
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, fontSize: 13, color: '#8e8e93', fontWeight: 500 }}>
                    Select a contact...
                  </div>
                )}
                <button
                  onClick={() => removeColumn(col.id)}
                  onMouseEnter={() => setHoveredColClose(col.id)}
                  onMouseLeave={() => setHoveredColClose(null)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: 'none',
                    background: hoveredColClose === col.id ? 'rgba(0,0,0,0.06)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8e8e93',
                    flexShrink: 0,
                    transition: 'background 0.15s ease',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Contact Picker (if no contact selected) */}
              {!col.contact && showContactPicker === col.id && (
                <div style={{
                  padding: '12px',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}>
                  {availableContacts.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#8e8e93', textAlign: 'center', padding: '8px 0' }}>
                      No more contacts available
                    </div>
                  ) : (
                    availableContacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => pickContact(col.id, contact)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontFamily: "'Inter', sans-serif",
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          background: 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                        }}>
                          {contact.initials}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{contact.name}</div>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: contact.tagColor,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            {contact.tag}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Messages Area */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                background: '#f8f9fa',
              }}>
                {col.messages.length === 0 && col.contact && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#a0aec0',
                    fontSize: 13,
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Start a conversation with {col.contact.name}
                  </div>
                )}
                {col.messages.length === 0 && !col.contact && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#a0aec0',
                    fontSize: 13,
                  }}>
                    Pick a contact above to start
                  </div>
                )}
                {col.messages.map(msg => (
                  <div key={msg.id} style={{
                    display: 'flex',
                    justifyContent: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                    paddingBottom: 2,
                  }}>
                    <div style={{
                      maxWidth: '82%',
                      position: 'relative',
                    }}>
                      {msg.isAIDraft && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          marginBottom: 4,
                          justifyContent: 'flex-end',
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a4 4 0 0 1 4 4v1H8V6a4 4 0 0 1 4-4z" /><path d="M6 12c-1.5 1-2 3-2 5h16c0-2-.5-4-2-5" />
                          </svg>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#A855F7',
                            fontFamily: "'JetBrains Mono', monospace",
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}>
                            AI Draft
                          </span>
                        </div>
                      )}
                      <div style={{
                        padding: '9px 13px',
                        borderRadius: msg.direction === 'outgoing' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.isAIDraft
                          ? 'transparent'
                          : msg.direction === 'outgoing'
                            ? '#378ADD'
                            : '#e9ecef',
                        color: msg.isAIDraft
                          ? '#4a5568'
                          : msg.direction === 'outgoing'
                            ? '#fff'
                            : '#1c1c1e',
                        fontSize: 13,
                        lineHeight: 1.45,
                        fontWeight: 400,
                        border: msg.isAIDraft ? '1.5px dashed rgba(168,85,247,0.4)' : 'none',
                        boxShadow: msg.isAIDraft
                          ? 'none'
                          : msg.direction === 'outgoing'
                            ? '0 1px 2px rgba(55,138,221,0.2)'
                            : '0 1px 2px rgba(0,0,0,0.04)',
                      }}>
                        {msg.text}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: '#a0aec0',
                        marginTop: 3,
                        textAlign: msg.direction === 'outgoing' ? 'right' : 'left',
                        paddingLeft: msg.direction === 'incoming' ? 4 : 0,
                        paddingRight: msg.direction === 'outgoing' ? 4 : 0,
                        fontWeight: 500,
                      }}>
                        {msg.isAIDraft ? 'Draft \u00b7 Ready to send' : msg.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={el => { messageEndRefs.current[col.id] = el; }} />
              </div>

              {/* Input Bar */}
              {col.contact && (
                <div style={{
                  padding: '10px 12px',
                  borderTop: '1px solid rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#fff',
                }}>
                  <input
                    type="text"
                    placeholder={`Message ${col.contact.name.split(' ')[0]}...`}
                    value={inputValues[col.id] || ''}
                    onChange={e => setInputValues(prev => ({ ...prev, [col.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') sendMessage(col.id); }}
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      borderRadius: 20,
                      border: '1px solid rgba(0,0,0,0.1)',
                      fontSize: 13,
                      fontFamily: "'Inter', sans-serif",
                      outline: 'none',
                      background: '#f8f9fa',
                      color: '#1c1c1e',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(55,138,221,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)')}
                  />
                  <button
                    onClick={() => sendMessage(col.id)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      border: 'none',
                      background: inputValues[col.id]?.trim() ? '#378ADD' : 'rgba(0,0,0,0.06)',
                      cursor: inputValues[col.id]?.trim() ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={inputValues[col.id]?.trim() ? '#fff' : '#a0aec0'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add Column Placeholder */}
          <button
            onClick={addColumn}
            style={{
              width: 200,
              minWidth: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              borderRadius: 12,
              border: '2px dashed rgba(0,0,0,0.1)',
              cursor: 'pointer',
              gap: 8,
              transition: 'all 0.15s ease',
              fontFamily: "'Inter', sans-serif",
              color: '#a0aec0',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(55,138,221,0.3)';
              e.currentTarget.style.background = 'rgba(55,138,221,0.02)';
              e.currentTarget.style.color = '#378ADD';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#a0aec0';
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Add Stream</span>
          </button>
        </div>
      </main>
    </div>
  );
}
