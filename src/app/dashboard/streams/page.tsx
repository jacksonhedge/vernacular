'use client';

import { useState, useRef, useEffect } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { fmtMsgTime, fmtStackTime, parseTimestamp, normalizePhone } from '@/lib/utils';
import type { ConversationColumn, Contact, Message } from '@/types/dashboard';

export default function StreamsPage() {
  const {
    columns, setColumns, allConversations, contacts,
    selectedConversationId, setSelectedConversationId,
    readConversations, setReadConversations,
    dismissedColumns, setDismissedColumns,
    inputValues, setInputValues,
    sendMessage, addColumn, removeColumn, playSound,
    lastReloadTime, dbInitiatives,
    activeInitiativeFilter, setActiveInitiativeFilter, initiativePhones,
    ghostConfig, recentlySentCols,
    showAICopilot, setShowAICopilot,
    setAiCopilotMessages, aiCopilotMessages,
    setAllConversations, orgId,
    setRecentlySentCols,
  } = useDashboard();

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshCount, setLastRefreshCount] = useState<number | null>(null);

  const refreshOutbound = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setLastRefreshCount(null);
    try {
      // Step 1: link any unlinked messages (inbound + outbound from Wade's chat.db)
      const pollRes = await fetch('/api/engine/poll-inbound');
      const pollData = pollRes.ok ? await pollRes.json() : { synced: 0 };

      // Step 2: re-fetch the conversation list
      const convRes = await fetch(`/api/conversations/list?orgId=${orgId}`);
      if (convRes.ok) {
        const data = await convRes.json();
        if (data.conversations?.length > 0) {
          const fresh = data.conversations.map((conv: Record<string, unknown>) => {
            const contact = conv.contact as Record<string, unknown>;
            const unreadCt = conv.unreadCount as number;
            const messages = conv.messages as Record<string, unknown>[];
            return {
              id: `real-${conv.conversationId}`,
              conversationId: conv.conversationId as string,
              aiMode: (conv.aiMode as string) || 'draft',
              goal: (conv.goal as string) || '',
              contact: {
                id: (contact.id as string) || '',
                name: (contact.name as string) || 'Unknown',
                initials: (contact.initials as string) || '??',
                tag: unreadCt > 0 ? 'UNREAD' : 'ACTIVE',
                tagColor: unreadCt > 0 ? '#EF4444' : '#22C55E',
                tagBg: unreadCt > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                phone: (contact.phone as string) || '',
              },
              messages: (messages || []).map((m: Record<string, unknown>) => ({
                id: m.id as string,
                text: m.text as string,
                direction: m.direction as 'outgoing' | 'incoming',
                timestamp: m.timestamp as string,
                isAIDraft: m.isAIDraft as boolean | undefined,
              })),
            };
          });
          setAllConversations(fresh);
          setColumns(prev => {
            const freshMap = new Map(fresh.map((c: ConversationColumn) => [c.id, c]));
            return prev.map(existing => {
              const f = freshMap.get(existing.id) as ConversationColumn | undefined;
              if (f) return { ...existing, messages: f.messages, contact: f.contact };
              return existing;
            });
          });
        }
      }
      setLastRefreshCount(pollData.synced || 0);
      setTimeout(() => setLastRefreshCount(null), 4000);
    } catch {
      setLastRefreshCount(-1);
      setTimeout(() => setLastRefreshCount(null), 4000);
    }
    setRefreshing(false);
  };

  const [conversationSearch, setConversationSearch] = useState('');
  type SortMode = 'unread' | 'recent' | 'name' | 'most-messages';
  const [streamSortMode, setStreamSortMode] = useState<SortMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vernacular-sort-mode');
      if (saved && ['unread', 'recent', 'name', 'most-messages'].includes(saved)) return saved as SortMode;
    }
    return 'unread';
  });
  const [showContactPicker, setShowContactPicker] = useState<string | null>(null);
  const [contactPickerSearch, setContactPickerSearch] = useState('');
  const [msgContextMenu, setMsgContextMenu] = useState<{ x: number; y: number; msgId: string; colId: string } | null>(null);
  const [chatContextMenu, setChatContextMenu] = useState<{ x: number; y: number; colId: string; phone: string; name: string } | null>(null);
  const [previewColId, setPreviewColId] = useState<string | null>(null);
  const previewCol = previewColId
    ? (columns.find(c => c.id === previewColId) || allConversations.find(c => c.id === previewColId) || null)
    : null;
  const [pinnedLeftColId, setPinnedLeftColId] = useState<string | null>(null);
  const [stickyLeftIds, setStickyLeftIds] = useState<string[]>([]); // cols that stay leftmost until explicitly closed
  const [hiddenPhones, setHiddenPhones] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem('vernacular-hidden-phones') || '[]')); } catch { return new Set(); }
  });
  const persistHiddenPhones = (next: Set<string>) => {
    localStorage.setItem('vernacular-hidden-phones', JSON.stringify([...next]));
    setHiddenPhones(next);
  };
  const [stackHidden, setStackHidden] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem('vernacular-stack-hidden') || '[]')); } catch { return new Set(); }
  });
  const persistStackHidden = (next: Set<string>) => {
    localStorage.setItem('vernacular-stack-hidden', JSON.stringify([...next]));
    setStackHidden(next);
  };
  const streamsScrollRef = useRef<HTMLDivElement>(null);
  const [scrolledTop, setScrolledTop] = useState<Record<string, boolean>>({});
  const lastMsgCounts = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!chatContextMenu) return;
    const close = () => setChatContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, [chatContextMenu]);

  // Drop sticky-left entries for columns that no longer exist (closed)
  useEffect(() => {
    setStickyLeftIds(prev => {
      const openIds = new Set(columns.map(c => c.id));
      const next = prev.filter(id => openIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [columns]);

  // Escape closes the preview modal
  useEffect(() => {
    if (!previewColId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewColId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewColId]);

  useEffect(() => { localStorage.setItem('vernacular-sort-mode', streamSortMode); }, [streamSortMode]);

  // Auto-scroll each column to bottom on load / new message — unless user toggled it to top
  useEffect(() => {
    columns.forEach(col => {
      const el = document.getElementById(`stream-msgs-${col.id}`);
      if (!el) return;
      const count = col.messages.length;
      const prev = lastMsgCounts.current[col.id];
      const firstRender = prev === undefined;
      const hasNewMsg = !firstRender && count > prev;
      lastMsgCounts.current[col.id] = count;
      if ((firstRender || hasNewMsg) && !scrolledTop[col.id]) {
        requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
      }
    });
  }, [columns, scrolledTop]);

  // Filter columns by initiative + hidden phones. Blank New-Chat picker columns
  // (no contact yet) always pass through both filters.
  const filteredColumns = (activeInitiativeFilter
    ? columns.filter(col => {
      if (!col.contact) return true; // blank picker col
      if (!col.contact.phone) return false;
      return initiativePhones.has(normalizePhone(col.contact.phone));
    })
    : columns
  ).filter(col => !col.contact?.phone || !hiddenPhones.has(normalizePhone(col.contact.phone)));

  // Sort columns
  const sortedColumns = [...filteredColumns].sort((a, b) => {
    // Blank New-Chat picker columns (no contact yet) win everything — always leftmost
    if (!a.contact && b.contact) return -1;
    if (a.contact && !b.contact) return 1;
    // Sticky cols (from New Chat picker) stay leftmost until closed — in insertion order
    const aStick = stickyLeftIds.indexOf(a.id);
    const bStick = stickyLeftIds.indexOf(b.id);
    if (aStick !== -1 && bStick === -1) return -1;
    if (aStick === -1 && bStick !== -1) return 1;
    if (aStick !== -1 && bStick !== -1) return aStick - bStick;
    // User-pinned leftmost always wins
    if (a.id === pinnedLeftColId && b.id !== pinnedLeftColId) return -1;
    if (b.id === pinnedLeftColId && a.id !== pinnedLeftColId) return 1;
    // Recently sent columns keep position
    if (recentlySentCols.has(a.id) && !recentlySentCols.has(b.id)) return -1;
    if (!recentlySentCols.has(a.id) && recentlySentCols.has(b.id)) return 1;

    const getPriority = (col: ConversationColumn) => {
      const last = col.messages[col.messages.length - 1];
      if (last?.isAIDraft) return 0; // AI drafts first
      if (last?.direction === 'incoming') return 1; // Unread
      return 2;
    };

    if (streamSortMode === 'unread') {
      const pDiff = getPriority(a) - getPriority(b);
      if (pDiff !== 0) return pDiff;
    }
    if (streamSortMode === 'name') {
      return (a.contact?.name || '').localeCompare(b.contact?.name || '');
    }
    if (streamSortMode === 'most-messages') {
      return b.messages.length - a.messages.length;
    }
    // Default: recent
    const aTime = a.messages.length > 0 ? parseTimestamp(a.messages[a.messages.length - 1].timestamp || '0').getTime() : 0;
    const bTime = b.messages.length > 0 ? parseTimestamp(b.messages[b.messages.length - 1].timestamp || '0').getTime() : 0;
    return bTime - aTime;
  });

  // Contact list for left panel — sorted to mirror streams' left-to-right ordering.
  const activeChats = allConversations
    .filter(col => col.contact && col.messages.length > 0 && col.contact.name.toLowerCase().includes(conversationSearch.toLowerCase()))
    .filter(col => !col.contact?.phone || !hiddenPhones.has(normalizePhone(col.contact.phone)))
    .filter(col => !stackHidden.has(col.id))
    .sort((a, b) => {
      // Exact mirror of sortedColumns so the stack order matches streams left-to-right
      const aStick = stickyLeftIds.indexOf(a.id);
      const bStick = stickyLeftIds.indexOf(b.id);
      if (aStick !== -1 && bStick === -1) return -1;
      if (aStick === -1 && bStick !== -1) return 1;
      if (aStick !== -1 && bStick !== -1) return aStick - bStick;
      if (a.id === pinnedLeftColId && b.id !== pinnedLeftColId) return -1;
      if (b.id === pinnedLeftColId && a.id !== pinnedLeftColId) return 1;
      if (recentlySentCols.has(a.id) && !recentlySentCols.has(b.id)) return -1;
      if (!recentlySentCols.has(a.id) && recentlySentCols.has(b.id)) return 1;
      const getPriority = (col: ConversationColumn) => {
        const last = col.messages[col.messages.length - 1];
        if (last?.isAIDraft) return 0;
        if (last?.direction === 'incoming') return 1;
        return 2;
      };
      if (streamSortMode === 'unread') {
        const pDiff = getPriority(a) - getPriority(b);
        if (pDiff !== 0) return pDiff;
      }
      if (streamSortMode === 'name') {
        return (a.contact?.name || '').localeCompare(b.contact?.name || '');
      }
      if (streamSortMode === 'most-messages') {
        return b.messages.length - a.messages.length;
      }
      const aTime = a.messages.length > 0 ? parseTimestamp(a.messages[a.messages.length - 1].timestamp || '0').getTime() : 0;
      const bTime = b.messages.length > 0 ? parseTimestamp(b.messages[b.messages.length - 1].timestamp || '0').getTime() : 0;
      return bTime - aTime;
    });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{
        height: 56, minHeight: 56, background: '#fff',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Refresh button — pulls outbound messages sent from Mac device (FAR LEFT) */}
          <button
            onClick={refreshOutbound}
            disabled={refreshing}
            title="Refresh — sync messages sent from your Mac (last 24h)"
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: refreshing ? 'rgba(38,120,255,0.1)' : 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.06)',
              cursor: refreshing ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: refreshing ? '#2678FF' : '#6b7280',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.background = 'rgba(38,120,255,0.08)'; e.currentTarget.style.color = '#2678FF'; } }}
            onMouseLeave={e => { if (!refreshing) { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#6b7280'; } }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: refreshing ? 'refreshSpin 0.8s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0c0f1a', margin: 0, letterSpacing: '-0.02em' }}>
            Streams
          </h2>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#9ca3af',
            background: 'rgba(0,0,0,0.04)', padding: '3px 10px', borderRadius: 6,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {sortedColumns.length} active
          </span>
          {lastReloadTime && !lastRefreshCount && (
            <span style={{ fontSize: 10, color: '#c4c4c6', fontFamily: "'JetBrains Mono', monospace" }}>
              Updated {lastReloadTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          {/* Refresh result toast */}
          {lastRefreshCount !== null && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: lastRefreshCount === -1 ? '#EF4444' : lastRefreshCount === 0 ? '#9ca3af' : '#22C55E',
              background: lastRefreshCount === -1 ? 'rgba(239,68,68,0.08)' : lastRefreshCount === 0 ? 'rgba(0,0,0,0.04)' : 'rgba(34,197,94,0.08)',
              padding: '3px 10px', borderRadius: 6,
              fontFamily: "'JetBrains Mono', monospace",
              animation: 'fadeSlideIn 0.3s ease-out',
            }}>
              {lastRefreshCount === -1 ? 'Refresh failed' : lastRefreshCount === 0 ? 'Up to date' : `+${lastRefreshCount} synced`}
            </span>
          )}
          <style>{`
            @keyframes refreshSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes fadeSlideIn { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: translateX(0); } }
          `}</style>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Sort */}
          <select value={streamSortMode} onChange={e => setStreamSortMode(e.target.value as typeof streamSortMode)} style={{
            padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
            background: '#fff', color: '#0c0f1a', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', outline: 'none', fontFamily: "'Inter', sans-serif",
          }}>
            <option value="unread">Unread First</option>
            <option value="recent">Most Recent</option>
            <option value="name">By Name</option>
            <option value="most-messages">Most Messages</option>
          </select>
          <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.06)' }} />
          <button onClick={addColumn} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: '#2678FF', color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            boxShadow: '0 1px 3px rgba(38,120,255,0.3)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Chat
          </button>
          {/* Craig Button — Pac-Man face, yellow pulsing (RIGHT of New Chat) */}
          <button onClick={() => setShowAICopilot(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8,
            background: 'linear-gradient(135deg, #FFE000, #F59E0B)',
            color: '#1c1c00', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em',
            boxShadow: '0 2px 8px rgba(245,158,11,0.4), 0 0 0 2px rgba(255,224,0,0.2)',
            animation: 'craigPulseYellow 1.6s ease-in-out infinite',
            textShadow: '0 1px 0 rgba(255,255,255,0.3)',
          }}
            onMouseEnter={e => { e.currentTarget.style.animation = 'none'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.animation = 'craigPulseYellow 1.6s ease-in-out infinite'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <img src="/pacman.png" alt="" width={18} height={18} style={{ display: 'block', objectFit: 'contain' }} />
            Ask Craig
          </button>
          <style>{`
            @keyframes craigPulseYellow {
              0%, 100% {
                box-shadow: 0 2px 8px rgba(245,158,11,0.4), 0 0 0 2px rgba(255,224,0,0.2);
                transform: scale(1);
              }
              50% {
                box-shadow: 0 4px 16px rgba(245,158,11,0.6), 0 0 0 6px rgba(255,224,0,0.15);
                transform: scale(1.03);
              }
            }
          `}</style>
        </div>
      </div>

      {/* Initiative Filter Bar */}
      {dbInitiatives.filter(i => !i.parent_id).length > 0 && (
        <div style={{
          padding: '8px 24px', background: '#fafbfc',
          borderBottom: '1px solid rgba(0,0,0,0.04)',
          display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4, flexShrink: 0 }}>
            Filter:
          </span>
          <button
            onClick={() => setActiveInitiativeFilter(null)}
            style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: !activeInitiativeFilter ? '1px solid #2678FF' : '1px solid rgba(0,0,0,0.08)',
              background: !activeInitiativeFilter ? 'rgba(38,120,255,0.08)' : '#fff',
              color: !activeInitiativeFilter ? '#2678FF' : '#6b7280',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            All
          </button>
          {dbInitiatives.filter(i => !i.parent_id).map(init => (
            <button key={init.id}
              onClick={() => setActiveInitiativeFilter(activeInitiativeFilter === init.id ? null : init.id)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: activeInitiativeFilter === init.id ? '1px solid #2678FF' : '1px solid rgba(0,0,0,0.08)',
                background: activeInitiativeFilter === init.id ? 'rgba(38,120,255,0.08)' : '#fff',
                color: activeInitiativeFilter === init.id ? '#2678FF' : '#6b7280',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {init.title}
            </button>
          ))}
        </div>
      )}

      {/* Main content: Contact list + Streams */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Contact List Panel */}
        <div style={{
          width: 280, minWidth: 280, maxWidth: 280,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid rgba(0,0,0,0.06)',
          background: '#fff', flexShrink: 0,
        }}>
          {/* Search */}
          <div style={{ padding: '12px 12px 8px' }}>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={conversationSearch}
                onChange={e => setConversationSearch(e.target.value)}
                placeholder="Search conversations..."
                style={{
                  width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.06)', fontSize: 13, outline: 'none',
                  fontFamily: "'Inter', sans-serif", background: '#f8f9fb',
                  boxSizing: 'border-box', color: '#0c0f1a',
                }}
              />
            </div>
          </div>

          {/* Active label */}
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Active ({activeChats.length})
            </span>
          </div>

          {/* Chat list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeChats.map(col => {
              const lastMsg = col.messages[col.messages.length - 1];
              const hasUnread = lastMsg?.direction === 'incoming' && !readConversations.has(col.id);
              const hasAiDraft = col.messages.some(m => m.isAIDraft);
              const isSelected = selectedConversationId === col.id;
              const isOpen = columns.some(c => c.id === col.id);

              return (
                <button key={col.id}
                  onContextMenu={e => {
                    e.preventDefault();
                    setChatContextMenu({
                      x: e.clientX, y: e.clientY,
                      colId: col.id,
                      phone: col.contact?.phone || '',
                      name: col.contact?.name || 'Unknown',
                    });
                  }}
                  onClick={() => {
                  playSound('click');
                  setSelectedConversationId(col.id);
                  setReadConversations(prev => new Set(prev).add(col.id));
                  // Make sure the col is in `columns` (prepended = leftmost) so it shows up first when the modal closes
                  setColumns(prev => prev.some(c => c.id === col.id) ? prev : [col, ...prev]);
                  setPreviewColId(col.id);
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '12px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: isSelected ? 'rgba(38,120,255,0.06)' : hasAiDraft ? 'rgba(245,158,11,0.04)' : hasUnread ? 'rgba(34,197,94,0.04)' : 'transparent',
                  borderBottom: '1px solid rgba(0,0,0,0.03)',
                  borderLeft: isSelected ? '3px solid #2678FF' : '3px solid transparent',
                  transition: 'background 0.15s',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: isSelected ? 'rgba(38,120,255,0.1)' : 'rgba(0,0,0,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 14, fontWeight: 700, color: isSelected ? '#2678FF' : '#6b7280',
                  }}>
                    {col.contact?.initials || '??'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: hasUnread ? 700 : 600, color: '#0c0f1a',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {col.contact?.name || 'Unknown'}
                      </span>
                      {hasUnread && (
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#2678FF', flexShrink: 0 }} />
                      )}
                    </div>
                    <div style={{
                      fontSize: 11, color: '#9ca3af',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginTop: 2,
                    }}>
                      {lastMsg?.text || 'No messages'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: '#c4c4c6', fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmtStackTime(lastMsg?.timestamp || '')}
                    </span>
                    <span
                      role="button"
                      title={isOpen ? 'Close stream' : 'Open as stream'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isOpen) {
                          if (pinnedLeftColId === col.id) setPinnedLeftColId(null);
                          removeColumn(col.id);
                        } else {
                          setPinnedLeftColId(col.id);
                          setColumns(prev => prev.some(c => c.id === col.id) ? [col, ...prev.filter(c => c.id !== col.id)] : [col, ...prev]);
                          setDismissedColumns(prev => {
                            const next = new Set(prev); next.delete(col.id);
                            localStorage.setItem('vernacular-dismissed', JSON.stringify([...next]));
                            return next;
                          });
                        }
                      }}
                      style={{
                        padding: '2px 8px', borderRadius: 5,
                        background: isOpen ? 'rgba(38,120,255,0.1)' : 'rgba(0,0,0,0.04)',
                        color: isOpen ? '#2678FF' : '#6b7280',
                        fontSize: 10, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em',
                      }}
                    >{isOpen ? 'Close' : 'Show'}</span>
                    {hasAiDraft && <div style={{ width: 7, height: 7, borderRadius: 4, background: '#F59E0B' }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stream Columns */}
        <div ref={streamsScrollRef} style={{
          flex: 1, display: 'flex', overflowX: 'auto', overflowY: 'hidden',
          gap: 0, background: '#f0f2f5', padding: '0 0 0 1px',
        }}>
          {sortedColumns.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0c0f1a', marginBottom: 6 }}>No active streams</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>Click a conversation on the left or start a new chat</div>
              </div>
            </div>
          ) : (
            sortedColumns.map(col => {
              if (!col.contact) {
                // Blank New Chat column — show a contact picker
                const q = (inputValues[col.id] || '').toLowerCase();
                const matches = q
                  ? allConversations.filter(c => c.contact && (
                      c.contact.name.toLowerCase().includes(q) ||
                      (c.contact.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
                    )).slice(0, 20)
                  : allConversations.slice(0, 20);
                return (
                  <div key={col.id} id={`stream-col-${col.id}`} style={{
                    width: 340, minWidth: 340, display: 'flex', flexDirection: 'column',
                    background: '#fff', borderRight: '1px solid rgba(0,0,0,0.06)', borderTop: '3px solid #2678FF',
                  }}>
                    <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0c0f1a' }}>New conversation</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>Search a contact to start</div>
                      </div>
                      <button onClick={() => removeColumn(col.id)} style={{
                        width: 24, height: 24, borderRadius: 6, border: 'none',
                        background: 'rgba(0,0,0,0.04)', color: '#9ca3af', cursor: 'pointer', fontSize: 12,
                      }}>×</button>
                    </div>
                    <div style={{ padding: 12 }}>
                      <input
                        autoFocus
                        value={inputValues[col.id] || ''}
                        onChange={e => setInputValues(prev => ({ ...prev, [col.id]: e.target.value }))}
                        placeholder="Search by name or phone…"
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid rgba(0,0,0,0.1)', outline: 'none',
                          fontSize: 13, fontFamily: "'Inter', sans-serif",
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
                      {matches.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>No matches</div>}
                      {matches.map(m => (
                        <button key={m.id} onClick={() => {
                          // Swap the blank col for the selected conversation — leftmost
                          setColumns(prev => {
                            const withoutBlank = prev.filter(c => c.id !== col.id);
                            const alreadyOpen = withoutBlank.find(c => c.id === m.id);
                            if (alreadyOpen) return [alreadyOpen, ...withoutBlank.filter(c => c.id !== m.id)];
                            return [m, ...withoutBlank];
                          });
                          setPinnedLeftColId(m.id);
                          setStickyLeftIds(prev => prev.includes(m.id) ? prev : [m.id, ...prev]);
                          setInputValues(prev => { const n = { ...prev }; delete n[col.id]; return n; });
                        }} style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                          padding: '8px 10px', border: 'none', background: 'transparent',
                          cursor: 'pointer', textAlign: 'left', borderRadius: 8,
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 10, background: 'rgba(38,120,255,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: '#2678FF', flexShrink: 0,
                          }}>{m.contact?.initials || '??'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0c0f1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.contact?.name}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace" }}>{m.contact?.phone}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              return (() => {
              const lastMsg = col.messages[col.messages.length - 1];
              const hasUnread = lastMsg?.direction === 'incoming';
              const isSelected = selectedConversationId === col.id;

              return (
                <div
                  key={col.id}
                  id={`stream-col-${col.id}`}
                  onClick={() => setSelectedConversationId(col.id)}
                  style={{
                    width: 340, minWidth: 340,
                    display: 'flex', flexDirection: 'column',
                    background: '#fff',
                    borderRight: '1px solid rgba(0,0,0,0.06)',
                    borderTop: isSelected ? '3px solid #2678FF' : '3px solid transparent',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Column Header */}
                  <div style={{
                    padding: '14px 16px 12px',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(38,120,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#2678FF', flexShrink: 0,
                    }}>
                      {col.contact?.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0c0f1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {col.contact?.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#2678FF', fontFamily: "'JetBrains Mono', monospace" }}>
                        {col.contact?.phone}
                      </div>
                    </div>
                    {/* Ask Craig + Scroll toggle stacked */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setShowAICopilot(true);
                        const contactName = col.contact?.name || 'this contact';
                        const lastMsgs = col.messages.slice(-3).map(m =>
                          `${m.direction === 'outgoing' ? 'You' : 'Them'}: ${m.text}`
                        ).join('\n');
                        const prompt = `Draft a reply to ${contactName}. Here's the recent conversation:\n${lastMsgs}`;
                        setAiCopilotMessages(prev => [...prev, { role: 'user', text: prompt }]);
                      }} title="Ask Craig to draft a reply" style={{
                        width: 28, height: 28, borderRadius: 8, border: 'none',
                        background: 'linear-gradient(135deg, rgba(38,120,255,0.1), rgba(99,102,241,0.1))',
                        color: '#2678FF', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(38,120,255,0.2), rgba(99,102,241,0.2))'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(38,120,255,0.1), rgba(99,102,241,0.1))'; }}
                      >
                        <img src="/pacman.png" alt="Ask Craig" width={18} height={18} style={{ display: 'block', objectFit: 'contain' }} />
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        const el = document.getElementById(`stream-msgs-${col.id}`);
                        if (!el) return;
                        const goingToTop = !scrolledTop[col.id];
                        el.scrollTo({ top: goingToTop ? 0 : el.scrollHeight, behavior: 'smooth' });
                        setScrolledTop(prev => ({ ...prev, [col.id]: goingToTop }));
                      }} style={{
                        padding: '2px 6px', borderRadius: 5, border: '1px solid rgba(0,0,0,0.06)',
                        background: 'rgba(0,0,0,0.02)', color: '#6b7280',
                        fontSize: 9, fontWeight: 600, cursor: 'pointer', lineHeight: 1.2,
                        fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
                      }}>
                        {scrolledTop[col.id] ? 'Scroll to Bottom' : 'Scroll to Top'}
                      </button>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeColumn(col.id); }} style={{
                      width: 24, height: 24, borderRadius: 6, border: 'none',
                      background: 'rgba(0,0,0,0.04)', color: '#9ca3af',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12,
                    }}>
                      x
                    </button>
                  </div>

                  {/* Messages */}
                  <div id={`stream-msgs-${col.id}`} style={{
                    flex: 1, overflowY: 'auto', padding: '12px 16px',
                    display: 'flex', flexDirection: 'column', gap: 4,
                    background: '#f8f9fb',
                  }}>
                    {col.messages.map(msg => {
                      const isOutgoing = msg.direction === 'outgoing';
                      const isDraft = msg.isAIDraft;
                      const isFailed = msg.status === 'failed' || msg.id.startsWith('failed-');

                      return (
                        <div key={msg.id} style={{
                          display: 'flex', justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
                        }}
                          onContextMenu={e => {
                            e.preventDefault();
                            setMsgContextMenu({ x: e.clientX, y: e.clientY, msgId: msg.id, colId: col.id });
                          }}
                        >
                          <div style={{
                            maxWidth: '80%',
                            padding: '9px 14px',
                            borderRadius: isOutgoing ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: isDraft ? '#FEF3C7' : isFailed ? '#FEE2E2' : isOutgoing ? '#2678FF' : '#fff',
                            color: isDraft ? '#92400E' : isFailed ? '#DC2626' : isOutgoing ? '#fff' : '#0c0f1a',
                            fontSize: 13, lineHeight: 1.45,
                            border: isDraft ? '1px solid rgba(245,158,11,0.3)' : isFailed ? '1px solid rgba(220,38,38,0.2)' : isOutgoing ? 'none' : '1px solid rgba(0,0,0,0.06)',
                            boxShadow: isOutgoing && !isDraft && !isFailed ? '0 1px 3px rgba(38,120,255,0.2)' : 'none',
                            wordBreak: 'break-word',
                          }}>
                            {msg.text}
                            <div style={{
                              fontSize: 10, marginTop: 4, opacity: 0.6,
                              textAlign: isOutgoing ? 'right' : 'left',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>
                              {fmtMsgTime(msg.timestamp)}
                              {isDraft && ' · AI Draft'}
                              {isFailed && ' · Failed'}
                              {msg.status === 'Queued' && ' · Queued'}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* AI Draft approval buttons */}
                    {col.messages.some(m => m.isAIDraft) && (() => {
                      const draft = [...col.messages].reverse().find(m => m.isAIDraft);
                      if (!draft) return null;
                      return (
                        <div style={{
                          display: 'flex', gap: 6, justifyContent: 'flex-end',
                          padding: '4px 0',
                        }}>
                          <button onClick={() => {
                            // Approve: send the draft as a real message
                            setInputValues(prev => ({ ...prev, [col.id]: draft.text }));
                            setColumns(prev => prev.map(c => c.id === col.id ? {
                              ...c, messages: c.messages.filter(m => m.id !== draft.id),
                            } : c));
                            setTimeout(() => sendMessage(col.id), 50);
                          }} style={{
                            padding: '5px 12px', borderRadius: 6, border: 'none',
                            background: '#22C55E', color: '#fff', fontSize: 11, fontWeight: 700,
                            cursor: 'pointer',
                          }}>
                            Send
                          </button>
                          <button onClick={() => {
                            setInputValues(prev => ({ ...prev, [col.id]: draft.text }));
                            setColumns(prev => prev.map(c => c.id === col.id ? {
                              ...c, messages: c.messages.filter(m => m.id !== draft.id),
                            } : c));
                          }} style={{
                            padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)',
                            background: '#fff', color: '#6b7280', fontSize: 11, fontWeight: 600,
                            cursor: 'pointer',
                          }}>
                            Edit
                          </button>
                          <button onClick={() => {
                            setColumns(prev => prev.map(c => c.id === col.id ? {
                              ...c, messages: c.messages.filter(m => m.id !== draft.id),
                            } : c));
                          }} style={{
                            padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)',
                            background: '#fff', color: '#9ca3af', fontSize: 11, fontWeight: 600,
                            cursor: 'pointer',
                          }}>
                            Dismiss
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Input */}
                  <div style={{
                    padding: '10px 12px 12px',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    background: '#fff',
                  }}>
                    <div style={{
                      display: 'flex', gap: 6, alignItems: 'flex-end',
                      background: '#f8f9fb', borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.06)',
                      padding: '4px 4px 4px 6px',
                    }}>
                      {/* Craig draft button inside input */}
                      <button
                        onClick={() => {
                          setShowAICopilot(true);
                          const name = col.contact?.name || 'contact';
                          const last3 = col.messages.slice(-3).map(m =>
                            `${m.direction === 'outgoing' ? 'You' : 'Them'}: ${m.text}`
                          ).join('\n');
                          setAiCopilotMessages(prev => [...prev, { role: 'user', text: `Draft a reply to ${name}:\n${last3}` }]);
                        }}
                        title="Ask Craig to draft"
                        style={{
                          width: 30, height: 30, borderRadius: 8, border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, color: '#9ca3af',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#2678FF'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; }}
                      >
                        <img src="/pacman.png" alt="Ask Craig" width={18} height={18} style={{ display: 'block', objectFit: 'contain' }} />
                      </button>
                      <input
                        value={inputValues[col.id] || ''}
                        onChange={e => setInputValues(prev => ({ ...prev, [col.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(col.id); } }}
                        placeholder="iMessage..."
                        style={{
                          flex: 1, border: 'none', outline: 'none', background: 'transparent',
                          color: '#0c0f1a', fontSize: 13, padding: '8px 0',
                          fontFamily: "'Inter', sans-serif",
                        }}
                      />
                      <button
                        onClick={() => sendMessage(col.id)}
                        disabled={!(inputValues[col.id] || '').trim()}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: (inputValues[col.id] || '').trim() ? '#2678FF' : 'rgba(0,0,0,0.04)',
                          border: 'none', cursor: (inputValues[col.id] || '').trim() ? 'pointer' : 'default',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke={(inputValues[col.id] || '').trim() ? '#fff' : '#c4c4c6'}
                          strokeWidth="2" strokeLinecap="round">
                          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })();
            })
          )}
        </div>
      </div>

      {/* Context Menu */}
      {msgContextMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setMsgContextMenu(null)}>
          <div style={{
            position: 'absolute', left: msgContextMenu.x, top: Math.max(10, msgContextMenu.y - 120),
            background: '#fff', borderRadius: 10, padding: 4,
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.08)',
            minWidth: 160,
          }} onClick={e => e.stopPropagation()}>
            {[
              { label: 'Copy Text', action: () => {
                const col = columns.find(c => c.id === msgContextMenu.colId);
                const msg = col?.messages.find(m => m.id === msgContextMenu.msgId);
                if (msg) navigator.clipboard.writeText(msg.text);
              }},
              { label: 'Resend', action: () => {
                const col = columns.find(c => c.id === msgContextMenu.colId);
                const msg = col?.messages.find(m => m.id === msgContextMenu.msgId);
                if (msg) {
                  setInputValues(prev => ({ ...prev, [msgContextMenu.colId]: msg.text }));
                  setTimeout(() => sendMessage(msgContextMenu.colId), 50);
                }
              }},
            ].map(item => (
              <button key={item.label} onClick={() => { item.action(); setMsgContextMenu(null); }} style={{
                display: 'block', width: '100%', padding: '8px 14px', border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                fontSize: 13, fontWeight: 500, color: '#0c0f1a', borderRadius: 6,
                fontFamily: "'Inter', sans-serif",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation preview modal (click on sidebar conversation) */}
      {previewCol && (
        <div onClick={() => setPreviewColId(null)} style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 40,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 560, maxWidth: '100%', maxHeight: '85vh',
            background: '#fff', borderRadius: 16, display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'rgba(38,120,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#2678FF',
              }}>
                {previewCol.contact?.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0c0f1a' }}>
                  {previewCol.contact?.name}
                </div>
                <div style={{ fontSize: 12, color: '#2678FF', fontFamily: "'JetBrains Mono', monospace" }}>
                  {previewCol.contact?.phone}
                </div>
              </div>
              <button onClick={() => {
                const colToOpen = previewCol;
                setPreviewColId(null);
                setPinnedLeftColId(colToOpen.id);
                setColumns(prev => {
                  if (prev.some(c => c.id === colToOpen.id)) {
                    const existing = prev.find(c => c.id === colToOpen.id)!;
                    return [existing, ...prev.filter(c => c.id !== colToOpen.id)];
                  }
                  return [colToOpen, ...prev];
                });
                setDismissedColumns(prev => {
                  const next = new Set(prev); next.delete(colToOpen.id);
                  localStorage.setItem('vernacular-dismissed', JSON.stringify([...next]));
                  return next;
                });
                setTimeout(() => {
                  document.getElementById(`stream-col-${colToOpen.id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
                }, 50);
              }} style={{
                padding: '7px 12px', borderRadius: 8, border: 'none',
                background: '#2678FF', color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
              }}>Open as Stream</button>
              <button onClick={() => setPreviewColId(null)} style={{
                width: 30, height: 30, borderRadius: 8, border: 'none',
                background: 'rgba(0,0,0,0.04)', color: '#9ca3af', cursor: 'pointer',
                fontSize: 14,
              }}>×</button>
            </div>
            {/* Messages */}
            <div ref={el => {
              if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
            }} style={{
              flex: 1, overflowY: 'auto', padding: '16px 20px',
              display: 'flex', flexDirection: 'column', gap: 6,
              background: '#f8f9fb',
            }}>
              {previewCol.messages.map((msg: Message) => {
                const isOutgoing = msg.direction === 'outgoing';
                const isDraft = msg.isAIDraft;
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isOutgoing ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '78%', padding: '9px 14px',
                      borderRadius: isOutgoing ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isDraft ? '#FEF3C7' : isOutgoing ? '#2678FF' : '#fff',
                      color: isDraft ? '#92400E' : isOutgoing ? '#fff' : '#0c0f1a',
                      fontSize: 13, lineHeight: 1.45,
                      border: isDraft ? '1px solid rgba(245,158,11,0.3)' : isOutgoing ? 'none' : '1px solid rgba(0,0,0,0.06)',
                      wordBreak: 'break-word',
                    }}>
                      {msg.text}
                      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: isOutgoing ? 'right' : 'left', fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmtMsgTime(msg.timestamp)}
                        {isDraft && ' · AI Draft'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Reply input */}
            <div style={{
              padding: '12px 16px', borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', gap: 8, alignItems: 'center', background: '#fff',
            }}>
              <input
                autoFocus
                value={inputValues[previewCol.id] || ''}
                onChange={e => setInputValues(prev => ({ ...prev, [previewCol.id]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const text = (inputValues[previewCol.id] || '').trim();
                    if (!text) return;
                    sendMessage(previewCol.id);
                  }
                }}
                placeholder="iMessage..."
                style={{
                  flex: 1, padding: '9px 14px', borderRadius: 18,
                  border: '1px solid rgba(0,0,0,0.1)', outline: 'none',
                  fontSize: 13, fontFamily: "'Inter', sans-serif",
                }}
              />
              <button
                onClick={() => {
                  const text = (inputValues[previewCol.id] || '').trim();
                  if (!text) return;
                  sendMessage(previewCol.id);
                }}
                disabled={!(inputValues[previewCol.id] || '').trim()}
                style={{
                  padding: '8px 14px', borderRadius: 18, border: 'none',
                  background: (inputValues[previewCol.id] || '').trim() ? '#2678FF' : 'rgba(0,0,0,0.06)',
                  color: (inputValues[previewCol.id] || '').trim() ? '#fff' : '#9ca3af',
                  fontSize: 12, fontWeight: 700,
                  cursor: (inputValues[previewCol.id] || '').trim() ? 'pointer' : 'default',
                }}
              >Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Chat row context menu (right-click on sidebar conversation) */}
      {chatContextMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setChatContextMenu(null)}>
          <div style={{
            position: 'absolute', left: chatContextMenu.x, top: Math.max(10, chatContextMenu.y - 10),
            background: '#fff', borderRadius: 10, padding: 4,
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.08)',
            minWidth: 220,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '8px 12px 6px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              {chatContextMenu.name}
            </div>
            {[
              ...(pinnedLeftColId === chatContextMenu.colId
                ? [{ label: 'Unpin from top', action: () => { setPinnedLeftColId(null); } }]
                : [{ label: 'Move to top', action: () => {
                    setPinnedLeftColId(chatContextMenu.colId);
                    setRecentlySentCols(prev => new Set(prev).add(chatContextMenu.colId));
                    // Ensure it's also open as a stream
                    const col = allConversations.find(c => c.id === chatContextMenu.colId);
                    if (col) {
                      setColumns(prev => prev.some(c => c.id === col.id)
                        ? [col, ...prev.filter(c => c.id !== col.id)]
                        : [col, ...prev]);
                    }
                  }}]
              ),
              { label: 'Mark as unread', action: () => {
                setReadConversations(prev => {
                  const next = new Set(prev); next.delete(chatContextMenu.colId); return next;
                });
              }},
              { label: 'Remove from streams', action: () => {
                if (pinnedLeftColId === chatContextMenu.colId) setPinnedLeftColId(null);
                removeColumn(chatContextMenu.colId);
              }},
              { label: 'Remove from stack', action: () => {
                if (pinnedLeftColId === chatContextMenu.colId) setPinnedLeftColId(null);
                const next = new Set(stackHidden); next.add(chatContextMenu.colId);
                persistStackHidden(next);
                removeColumn(chatContextMenu.colId);
              }},
              { label: 'Hide this number (permanent)', action: () => {
                if (!chatContextMenu.phone) return;
                const key = normalizePhone(chatContextMenu.phone);
                const next = new Set(hiddenPhones); next.add(key);
                persistHiddenPhones(next);
                removeColumn(chatContextMenu.colId);
              }},
            ].map(item => (
              <button key={item.label} onClick={() => { item.action(); setChatContextMenu(null); }} style={{
                display: 'block', width: '100%', padding: '9px 14px', border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                fontSize: 13, fontWeight: 500, color: '#0c0f1a', borderRadius: 6,
                fontFamily: "'Inter', sans-serif",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {item.label}
              </button>
            ))}
            {(hiddenPhones.size + stackHidden.size) > 0 && (
              <button onClick={() => { persistHiddenPhones(new Set()); persistStackHidden(new Set()); setChatContextMenu(null); }} style={{
                display: 'block', width: '100%', padding: '9px 14px', border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                fontSize: 12, fontWeight: 500, color: '#9ca3af', borderRadius: 6,
                fontFamily: "'Inter', sans-serif", borderTop: '1px solid rgba(0,0,0,0.04)', marginTop: 4,
              }}>
                Unhide all ({hiddenPhones.size + stackHidden.size})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
