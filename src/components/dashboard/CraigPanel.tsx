'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { supabase } from '@/lib/supabase';

const APP_MAP = `# App Layout (you can navigate here using [NAV:<route>])
The Vernacular dashboard has these views. When a user asks you to take them somewhere, emit a [NAV:<route>] tag and a short confirmation.

Main workspace:
- [NAV:/dashboard/streams] Streams — iMessage-style conversation columns. The primary workspace. Left sidebar ("Stack") lists all conversations; right side shows opened ones as columns. Users can right-click a stack row for Move to top / Mark as unread / Remove / Hide.
- [NAV:/dashboard/matrix] Matrix — 10x10 grid of contact tiles, color-coded by status. Used for bulk initiative staging.
- [NAV:/dashboard/messages] Messages — flat timeline of every message across conversations.
- [NAV:/dashboard/summary] Summary — table view: contact, last message, status, response rate.
- [NAV:/dashboard/schedule] Schedule — events you or Craig scheduled (Overdue / Today / Upcoming / Unscheduled).

Left nav:
- [NAV:/dashboard] Dashboard home
- [NAV:/dashboard/contacts] Contacts — full contact list.
- [NAV:/dashboard/initiatives] Initiatives — grid of campaigns / groups. Each initiative has contacts, tone, examples.
- [NAV:/dashboard/stations] Phone Lines — Mac stations that send/receive iMessages.
- [NAV:/dashboard/team] Team — users in this org and their roles.
- [NAV:/dashboard/integrations] Integrations — Intercom, Notion, Gmail, etc.
- [NAV:/dashboard/settings] Settings — org info, default Craig model, sounds, sign out.
- [NAV:/dashboard/profile] Profile — current user account.

Rules:
- You CAN navigate. Never tell the user "I can't control the UI" or "tap it yourself." Instead emit the [NAV:<route>] tag.
- One nav per reply. Keep the rest of the reply short — just confirm where you took them.
- If unsure which view, ask a single clarifying question.

# Drafting texts
You CAN stage outbound texts as drafts that show up in the Streams view outlined in yellow, awaiting user approval. You NEVER send them directly (AUTO-TEXT is OFF).

Use [SEND:<name_or_phone>:<message>] to stage a draft. You can emit multiple [SEND] tags in one reply to queue several messages at once. If the target phone number isn't already open as a stream, a new stream column is auto-created and the draft appears inside it. The user then reviews and taps Send to actually send.

When a user asks you to "send" or "draft" a text:
1. Emit one [SEND:target:message] tag per message (include all of them in the same reply).
2. Navigate the user to streams with [NAV:/dashboard/streams] so they can see and approve.
3. Keep your spoken reply under 2 sentences — just acknowledge.`;

function PacMan({ size = 22 }: { size?: number; mouthFill?: string }) {
  return (
    <img src="/pacman.png" alt="Craig" width={size} height={size} style={{ display: 'block', objectFit: 'contain' }} />
  );
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function fmtDay(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const ACTION_META: Record<string, { icon: string; bg: string; border: string; color: string }> = {
  SEND: { icon: '📤', bg: 'rgba(38,120,255,0.15)', border: 'rgba(38,120,255,0.3)', color: '#60A5FA' },
  BULK_SEND: { icon: '📢', bg: 'rgba(38,120,255,0.2)', border: 'rgba(38,120,255,0.35)', color: '#60A5FA' },
  LOOKUP: { icon: '🔍', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', color: '#C4B5FD' },
  SCHEDULE: { icon: '📅', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', color: '#FCD34D' },
  INITIATIVE: { icon: '⭐', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: '#4ADE80' },
  UPDATE: { icon: '✏️', bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.3)', color: '#F472B6' },
};

function renderInline(text: string, keyPrefix: string): React.ReactNode {
  const tagPattern = /(\[[A-Z_]+:[^\]]+\])/g;
  const parts = text.split(tagPattern);
  return parts.map((part, pi) => {
    const tagMatch = part.match(/^\[([A-Z_]+):([^\]]+)\]$/);
    if (tagMatch) {
      const [, type, arg] = tagMatch;
      const meta = ACTION_META[type] || { icon: '⚙', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', color: '#9CA3AF' };
      return (
        <span key={`${keyPrefix}-p${pi}`} title={arg} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 9px', margin: '2px 2px',
          borderRadius: 6, background: meta.bg, border: `1px solid ${meta.border}`,
          fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
          color: meta.color, verticalAlign: 'baseline',
        }}>
          <span style={{ fontSize: 10 }}>{meta.icon}</span>
          <span>{type}</span>
          <span style={{ opacity: 0.6, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{arg.split(':')[0]}</span>
        </span>
      );
    }
    const nodes: React.ReactNode[] = [];
    let idx = 0;
    const boldCodeRegex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let match;
    let cursor = 0;
    while ((match = boldCodeRegex.exec(part)) !== null) {
      if (match.index > cursor) nodes.push(<span key={`${keyPrefix}-p${pi}-t${idx++}`}>{part.slice(cursor, match.index)}</span>);
      const matched = match[0];
      if (matched.startsWith('**')) {
        nodes.push(<strong key={`${keyPrefix}-p${pi}-t${idx++}`} style={{ fontWeight: 700, color: '#fff' }}>{matched.slice(2, -2)}</strong>);
      } else {
        nodes.push(<code key={`${keyPrefix}-p${pi}-t${idx++}`} style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 4, padding: '1px 6px', fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace", color: '#FCD34D',
        }}>{matched.slice(1, -1)}</code>);
      }
      cursor = match.index + matched.length;
    }
    if (cursor < part.length) nodes.push(<span key={`${keyPrefix}-p${pi}-t${idx++}`}>{part.slice(cursor)}</span>);
    return <span key={`${keyPrefix}-p${pi}`}>{nodes.length ? nodes : part}</span>;
  });
}

function renderFormatted(text: string, keyPrefix: string): React.ReactNode {
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, bi) => {
    if (block.startsWith('```')) {
      const code = block.replace(/^```\w*\n?/, '').replace(/```$/, '');
      return (
        <pre key={`${keyPrefix}-b${bi}`} style={{
          background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: '10px 14px', margin: '6px 0',
          fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
          color: '#E5E7EB', overflowX: 'auto', lineHeight: 1.5,
        }}>{code}</pre>
      );
    }
    const lines = block.split('\n');
    const isList = lines.every(l => /^[\-•*]\s/.test(l.trim()) || l.trim() === '');
    if (isList && lines.some(l => l.trim())) {
      return (
        <ul key={`${keyPrefix}-b${bi}`} style={{ margin: '4px 0', paddingLeft: 18, listStyle: 'none' }}>
          {lines.filter(l => l.trim()).map((l, li) => (
            <li key={li} style={{ position: 'relative', padding: '2px 0' }}>
              <span style={{ position: 'absolute', left: -14, color: 'rgba(255,224,0,0.7)' }}>•</span>
              {renderInline(l.replace(/^[\-•*]\s/, ''), `${keyPrefix}-b${bi}-l${li}`)}
            </li>
          ))}
        </ul>
      );
    }
    if (lines.every(l => l.startsWith('>') || !l.trim())) {
      return (
        <blockquote key={`${keyPrefix}-b${bi}`} style={{
          borderLeft: '3px solid rgba(255,224,0,0.4)',
          paddingLeft: 12, margin: '6px 0',
          color: 'rgba(255,255,255,0.6)', fontStyle: 'italic',
        }}>
          {lines.map(l => l.replace(/^>\s?/, '')).join('\n')}
        </blockquote>
      );
    }
    return (
      <p key={`${keyPrefix}-b${bi}`} style={{ margin: bi === 0 ? 0 : '6px 0 0', lineHeight: 1.55 }}>
        {block.split('\n').map((line, li, arr) => (
          <span key={li}>
            {renderInline(line, `${keyPrefix}-b${bi}-l${li}`)}
            {li < arr.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

export default function CraigPanel() {
  const {
    setShowAICopilot, aiCopilotMessages, setAiCopilotMessages,
    aiCopilotModel, setAiCopilotModel,
    orgId, columns, contacts,
    craigKnowledge, orgKnowledge,
    dbInitiatives, setColumns, setAllConversations, showAICopilot,
    aiChatSessionId, setAiChatSessionId,
  } = useDashboard();
  const router = useRouter();

  const [conversationalLearning, setConversationalLearning] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('vernacular-craig-learning');
    return saved === null ? true : saved === '1';
  });
  useEffect(() => {
    try { localStorage.setItem('vernacular-craig-learning', conversationalLearning ? '1' : '0'); } catch {}
  }, [conversationalLearning]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [loadingStage, setLoadingStage] = useState<'dots' | 'breathing' | 'streaming'>('dots');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messageRuns = useMemo(() => {
    const runs: Array<{ role: 'user' | 'assistant'; items: typeof aiCopilotMessages; firstTs?: number; lastTs?: number }> = [];
    for (const msg of aiCopilotMessages) {
      const last = runs[runs.length - 1];
      if (last && last.role === msg.role) {
        last.items.push(msg);
        last.lastTs = msg.ts;
      } else {
        runs.push({ role: msg.role, items: [msg], firstTs: msg.ts, lastTs: msg.ts });
      }
    }
    return runs;
  }, [aiCopilotMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiCopilotMessages, streamingText]);

  // Auto-reset chat when panel opens if last activity was >2 minutes ago
  useEffect(() => {
    if (!showAICopilot) return;
    setTimeout(() => inputRef.current?.focus(), 100);

    if (aiCopilotMessages.length > 0) {
      const lastMsg = aiCopilotMessages[aiCopilotMessages.length - 1];
      const lastTs = lastMsg.ts || 0;
      const idleMs = Date.now() - lastTs;
      if (idleMs > 2 * 60 * 1000) {
        setAiCopilotMessages([]);
        setStreamingText('');
      }
    }
  }, [showAICopilot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also auto-reset while panel is OPEN if user goes idle for 2 minutes
  useEffect(() => {
    if (!showAICopilot || aiCopilotMessages.length === 0) return;
    const lastMsg = aiCopilotMessages[aiCopilotMessages.length - 1];
    const lastTs = lastMsg.ts || Date.now();
    const msRemaining = 2 * 60 * 1000 - (Date.now() - lastTs);
    if (msRemaining <= 0) {
      setAiCopilotMessages([]);
      return;
    }
    const timer = setTimeout(() => {
      setAiCopilotMessages([]);
      setStreamingText('');
    }, msRemaining);
    return () => clearTimeout(timer);
  }, [aiCopilotMessages, showAICopilot]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const handler = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollBtn(!nearBottom);
    };
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const sendToCraig = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user' as const, text, ts: Date.now() };
    setAiCopilotMessages(prev => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
    setLoading(true);
    setLoadingStage('dots');
    setStreamingText('');

    const breathTimer = setTimeout(() => setLoadingStage('breathing'), 500);

    try {
      const contactSummary = columns.slice(0, 30).map(col => {
        if (!col.contact) return null;
        const lastMsgs = col.messages.slice(-3).map(m => {
          // Sanitize inbound text to strip fake action tags (prompt-injection guard)
          const safe = m.direction === 'incoming'
            ? (m.text || '').replace(/\[[A-Z_]+:[^\]]*\]/g, '[redacted]')
            : m.text;
          return `${m.direction === 'outgoing' ? 'You' : 'Them'}: ${safe}`;
        }).join('\n');
        return `${col.contact.name} (${col.contact.phone}):\n${lastMsgs}`;
      }).filter(Boolean).join('\n\n');

      const initiativeList = dbInitiatives.map(i => i.title).join(', ');

      const systemPrompt = [
        craigKnowledge || '',
        `\n\n${APP_MAP}`,
        orgKnowledge ? `\n\n# Org Knowledge\n${orgKnowledge}` : '',
        initiativeList ? `\n\n# Initiatives\n${initiativeList}` : '',
        contactSummary ? `\n\n# Recent Contacts (top 30, last 3 msgs each)\n${contactSummary}` : '',
      ].join('').trim();

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: [...aiCopilotMessages, userMsg].map(m => ({ role: m.role, content: m.text })),
          model: aiCopilotModel,
          organizationId: orgId,
          systemPrompt,
        }),
      });

      clearTimeout(breathTimer);
      const data = await res.json();

      if (!res.ok) {
        let friendly: string;
        switch (data.errorCode) {
          case 'vernacular_credits':
            friendly = data.reason === 'subscription_canceled'
              ? '⚠️ Your Vernacular subscription is canceled. Craig is paused until billing is restored.'
              : '⚠️ Your Vernacular demo has expired. Upgrade your plan to keep using Craig.';
            break;
          case 'anthropic_credits':
            friendly = "⚠️ Vernacular is temporarily out of Claude API credits — this is on our side, not yours. We've been notified. If you just purchased credits, start a new chat to retry.";
            break;
          case 'anthropic_rate_limit':
            friendly = '⏳ Craig is being rate-limited. Try again in a moment.';
            break;
          case 'anthropic_not_configured':
            friendly = '⚠️ Craig is not configured (missing API key). Contact support.';
            break;
          default:
            friendly = `⚠️ ${data.error || 'Craig failed to respond.'}`;
        }
        setStreamingText('');
        setAiCopilotMessages(prev => [...prev, { role: 'assistant', text: friendly, ts: Date.now(), errorCode: data.errorCode }]);
        return;
      }

      const reply = data.content || data.response || data.message || 'No response';

      setLoadingStage('streaming');
      const words = reply.split(' ');
      let accumulated = '';
      for (let i = 0; i < words.length; i++) {
        accumulated += (i > 0 ? ' ' : '') + words[i];
        setStreamingText(accumulated);
        await new Promise(r => setTimeout(r, 18));
      }
      setStreamingText('');
      setAiCopilotMessages(prev => [...prev, { role: 'assistant', text: reply, ts: Date.now() }]);
      handleCraigActions(reply);
    } catch {
      clearTimeout(breathTimer);
      setStreamingText('');
      setAiCopilotMessages(prev => [...prev, { role: 'assistant', text: 'Failed to reach Craig. Check your connection.', ts: Date.now() }]);
    } finally {
      setLoading(false);
      setLoadingStage('dots');
    }
  };

  // AUTO-TEXT SAFETY GUARANTEE:
  // Craig may only create pending AI drafts (isAIDraft: true). He must NEVER
  // call sendMessage(), write to outbound_queue, or bypass human approval.
  // Any change that calls a real send from this function breaks the product promise.
  const CRAIG_AUTO_SEND_DISABLED = true;
  const handleCraigActions = (text: string) => {
    // Navigation — Craig can move the user between dashboard views
    const navMatch = text.match(/\[NAV:([^\]]+)\]/);
    if (navMatch) {
      const raw = navMatch[1].trim();
      const allowed = [
        '/dashboard', '/dashboard/streams', '/dashboard/matrix', '/dashboard/messages',
        '/dashboard/summary', '/dashboard/schedule', '/dashboard/contacts',
        '/dashboard/initiatives', '/dashboard/stations', '/dashboard/team',
        '/dashboard/integrations', '/dashboard/settings', '/dashboard/profile',
      ];
      if (allowed.includes(raw)) router.push(raw);
    }
    // Support MULTIPLE [SEND:...] tags per reply + auto-create a synthetic column
    // when Craig is texting a phone that isn't already open as a stream.
    const sendMatches = [...text.matchAll(/\[SEND:([^:]+):([^\]]+)\]/g)];
    if (sendMatches.length && CRAIG_AUTO_SEND_DISABLED) {
      // Track synthetic columns created this run so we don't re-create for the same phone
      const createdPhoneIds = new Map<string, string>();
      sendMatches.forEach((m, idx) => {
        const target = m[1];
        const message = m[2].trim();
        const targetDigits = target.replace(/\D/g, '').slice(-10);

        // 1) Try to match an existing column (by name or phone last-10)
        let matchedCol = columns.find(c => {
          if (!c.contact) return false;
          const nameMatch = c.contact.name.toLowerCase().includes(target.toLowerCase());
          const phoneMatch = targetDigits.length >= 10 && c.contact.phone?.replace(/\D/g, '').slice(-10) === targetDigits;
          return nameMatch || phoneMatch;
        });

        // 2) If nothing matches AND the target is a phone number, synthesize a new column per phone
        if (!matchedCol && targetDigits.length >= 10) {
          const existingId = createdPhoneIds.get(targetDigits);
          const newId = existingId || `draft-col-${targetDigits}`;
          if (!existingId) {
            createdPhoneIds.set(targetDigits, newId);
            const nameLabel = `(${targetDigits.slice(0, 3)}) ${targetDigits.slice(3, 6)}-${targetDigits.slice(6)}`;
            const newCol = {
              id: newId,
              contact: {
                id: `phone-${targetDigits}`,
                name: nameLabel,
                initials: targetDigits.slice(-4),
                phone: `+1${targetDigits}`,
                tag: 'NEW' as const,
                tagColor: '#2678FF',
                tagBg: 'rgba(38,120,255,0.1)',
              },
              messages: [],
            };
            setColumns(prev => prev.some(c => c.id === newId) ? prev : [newCol, ...prev]);
          }
          matchedCol = { id: newId, contact: null, messages: [] };
        }

        if (matchedCol) {
          const draftMsg = {
            id: `ai-draft-${Date.now()}-${idx}`,
            text: message,
            direction: 'outgoing' as const,
            timestamp: new Date().toISOString(),
            isAIDraft: true,
            status: 'Draft',
          };
          const targetId = matchedCol.id;
          setColumns(prev => prev.map(c => c.id === targetId
            ? { ...c, messages: [...c.messages, draftMsg] }
            : c));
          // Mirror into stack so the orange AI-draft dot shows on the sidebar row too
          setAllConversations(prev => {
            const idx2 = prev.findIndex(c => c.id === targetId);
            if (idx2 >= 0) {
              return prev.map(c => c.id === targetId ? { ...c, messages: [...c.messages, draftMsg] } : c);
            }
            return matchedCol ? [{ ...matchedCol, messages: [...matchedCol.messages, draftMsg] }, ...prev] : prev;
          });
        }
      });
    }
  };

  const copyMessage = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const clearChat = () => {
    const oldId = aiChatSessionId;
    setAiCopilotMessages([]);
    setStreamingText('');
    setAiChatSessionId(null);
    try { localStorage.setItem('vernacular-craig-fresh-at', String(Date.now())); } catch {}
    if (oldId) {
      supabase.from('ai_chat_sessions').delete().eq('id', oldId).then(() => {});
    }
  };

  return (
    <div style={{
      width: 400, minWidth: 400, height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: '#1a1f2e', borderLeft: '1px solid rgba(255,255,255,0.06)',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(255,224,0,0.04) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, padding: 4,
              background: '#1a1f2e', border: '1.5px solid rgba(255,224,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              animation: loading && loadingStage === 'breathing' ? 'craigBreath 2s ease-in-out infinite' : 'none',
            }}>
              <PacMan size={26} mouthFill="#0a0d18" />
              <div style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 10, height: 10, borderRadius: 5,
                background: '#22C55E', border: '2px solid #1a1f2e',
              }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Craig</div>
                <div
                  title="Auto-text is OFF. Craig can draft replies but cannot send them — every message requires your approval."
                  style={{
                    display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start',
                    padding: '3px 8px', borderRadius: 8,
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
                    fontFamily: "'Inter', sans-serif", cursor: 'default', lineHeight: 1.1,
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', color: '#FCA5A5' }}>AUTO-TEXT OFF</span>
                  <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(252,165,165,0.7)', marginTop: 1 }}>DRAFTS ONLY</span>
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                {loading ? (loadingStage === 'streaming' ? 'Writing...' : 'Thinking...') : 'AI Copilot'} · {aiCopilotModel}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <select value={aiCopilotModel} onChange={e => setAiCopilotModel(e.target.value as typeof aiCopilotModel)} style={{
              padding: '5px 8px', borderRadius: 6,
              background: '#fff', border: '1px solid rgba(255,255,255,0.2)',
              color: '#0c0f1a', fontSize: 10, fontWeight: 700,
              cursor: 'pointer', outline: 'none', fontFamily: "'JetBrains Mono', monospace",
              appearance: 'none', WebkitAppearance: 'none',
              paddingRight: 22,
              backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230c0f1a\' stroke-width=\'3\' stroke-linecap=\'round\'><polyline points=\'6 9 12 15 18 9\'/></svg>")',
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
            }}>
              <optgroup label="Haiku">
                <option value="haiku-4.5">Haiku 4.5</option>
                <option value="haiku-3">Haiku 3</option>
              </optgroup>
              <optgroup label="Sonnet">
                <option value="sonnet-4.6">Sonnet 4.6</option>
                <option value="sonnet-4.5">Sonnet 4.5</option>
              </optgroup>
              <optgroup label="Opus">
                <option value="opus-4.6">Opus 4.6</option>
                <option value="opus-4.5">Opus 4.5</option>
              </optgroup>
            </select>
            <button onClick={clearChat} title="New chat" style={{
              height: 28, padding: '0 10px', borderRadius: 7,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
              fontFamily: "'Inter', sans-serif",
            }}>New</button>
            <button onClick={() => setShowAICopilot(false)} title="Close Craig" style={{
              height: 28, padding: '0 10px', borderRadius: 7,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
              fontFamily: "'Inter', sans-serif",
            }}>Close</button>
          </div>
        </div>
        {/* Conversational Learning toggle */}
        <div style={{
          marginTop: 10, padding: '8px 10px', borderRadius: 8,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em' }}>
              Conversational Learning
            </span>
            <span
              title="When on, Craig studies your approved messages on a regular basis to learn your texting style and tone, so future drafts match your voice more closely."
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 14, height: 14, borderRadius: 7,
                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
                fontSize: 9, fontWeight: 800, cursor: 'help',
              }}
            >i</span>
          </div>
          <button
            onClick={() => setConversationalLearning(v => !v)}
            role="switch"
            aria-checked={conversationalLearning}
            style={{
              width: 34, height: 18, borderRadius: 9, border: 'none',
              background: conversationalLearning ? '#22C55E' : 'rgba(255,255,255,0.12)',
              position: 'relative', cursor: 'pointer', padding: 0,
              transition: 'background 0.15s',
            }}
          >
            <span style={{
              position: 'absolute', top: 2, left: conversationalLearning ? 18 : 2,
              width: 14, height: 14, borderRadius: 7, background: '#fff',
              transition: 'left 0.15s',
            }} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesRef} style={{
        flex: 1, overflowY: 'auto', padding: '20px 16px',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>
        {aiCopilotMessages.length === 0 && !streamingText && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: 'radial-gradient(circle at 50% 50%, rgba(255,224,0,0.08), transparent 70%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <div style={{ filter: 'drop-shadow(0 4px 12px rgba(255,224,0,0.3))' }}>
                <PacMan size={56} mouthFill="#0a0d18" />
              </div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
              Hey, I&apos;m Craig
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto 24px' }}>
              Your AI copilot for messaging. I can draft replies, search contacts, analyze conversations, and manage initiatives.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: '💬', text: 'Draft a message to my VIP contacts' },
                { icon: '🔍', text: 'Show me recent activity' },
                { icon: '📊', text: 'Who needs a follow-up?' },
                { icon: '🗺️', text: 'Search for contacts in NJ' },
              ].map(prompt => (
                <button key={prompt.text} onClick={() => { setInput(prompt.text); setTimeout(() => inputRef.current?.focus(), 50); }} style={{
                  padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10,
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,224,0,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255,224,0,0.15)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                  }}
                >
                  <span style={{ fontSize: 16 }}>{prompt.icon}</span>
                  {prompt.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messageRuns.map((run, ri) => {
          const prevRun = ri > 0 ? messageRuns[ri - 1] : null;
          const showDaySeparator = !prevRun || (run.firstTs && prevRun.lastTs && fmtDay(run.firstTs) !== fmtDay(prevRun.lastTs));
          const showTimeGap = prevRun?.lastTs && run.firstTs && (run.firstTs - prevRun.lastTs) > 30 * 60 * 1000;

          return (
            <div key={`run-${ri}`}>
              {showDaySeparator && run.firstTs && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmtDay(run.firstTs)}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>
              )}

              {!showDaySeparator && showTimeGap && run.firstTs && (
                <div style={{ textAlign: 'center', margin: '14px 0 8px' }}>
                  <span style={{
                    fontSize: 10, color: 'rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.04)', padding: '3px 10px', borderRadius: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {fmtTime(run.firstTs)}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 14 }}>
                {run.items.map((msg, mi) => {
                  const isFirst = mi === 0;
                  const isLast = mi === run.items.length - 1;
                  const globalIdx = aiCopilotMessages.indexOf(msg);
                  const isShort = msg.text.length < 60 && !msg.text.includes('\n');
                  const isLong = msg.text.length > 300;

                  return (
                    <div key={`run-${ri}-msg-${mi}`} style={{
                      display: 'flex', gap: 10,
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      alignItems: 'flex-start',
                    }}>
                      {msg.role === 'assistant' && (
                        <div style={{ width: 28, flexShrink: 0 }}>
                          {isFirst && (
                            <div style={{
                              width: 28, height: 28, borderRadius: 9, padding: 3,
                              background: '#0c0f1a', border: '1px solid rgba(255,224,0,0.15)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              marginTop: 2,
                            }}>
                              <PacMan size={22} mouthFill="#0c0f1a" />
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: isLong ? '92%' : isShort ? 'max-content' : '80%',
                        minWidth: 0,
                      }}>
                        <div style={{
                          padding: isShort ? '8px 13px' : '10px 15px',
                          borderRadius: msg.role === 'user'
                            ? (isFirst ? '16px 16px 4px 16px' : '16px 4px 4px 16px')
                            : (isFirst ? '4px 16px 16px 16px' : '16px 16px 16px 4px'),
                          background: msg.role === 'user'
                            ? 'linear-gradient(135deg, #2678FF, #1a5fd4)'
                            : 'rgba(255,255,255,0.05)',
                          border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
                          color: msg.role === 'user' ? '#fff' : 'rgba(255,255,255,0.88)',
                          fontSize: 13, lineHeight: 1.55,
                          wordBreak: 'break-word',
                          boxShadow: msg.role === 'user' ? '0 2px 8px rgba(38,120,255,0.2)' : 'none',
                        }}>
                          {msg.role === 'user' ? msg.text : renderFormatted(msg.text, `r${ri}m${mi}`)}
                        </div>

                        {isLast && msg.ts && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
                            padding: '0 4px',
                          }}>
                            <span style={{
                              fontSize: 9, color: 'rgba(255,255,255,0.25)',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>
                              {fmtTime(msg.ts)}
                            </span>
                            {msg.role === 'assistant' && (
                              <button onClick={() => copyMessage(msg.text, globalIdx)} style={{
                                padding: '2px 6px', borderRadius: 4, border: 'none',
                                background: 'transparent', cursor: 'pointer',
                                fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
                                fontFamily: "'Inter', sans-serif", transition: 'color 0.15s',
                              }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#FCD34D'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
                              >
                                {copiedIdx === globalIdx ? '✓ COPIED' : 'COPY'}
                              </button>
                            )}
                          </div>
                        )}
                        {isLast && msg.errorCode === 'anthropic_credits' && (
                          <button onClick={clearChat} style={{
                            marginTop: 8, padding: '7px 14px', borderRadius: 8, border: 'none',
                            background: 'rgba(255,224,0,0.12)', cursor: 'pointer',
                            fontSize: 11, fontWeight: 700, color: '#FCD34D',
                            fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em',
                            alignSelf: 'flex-start',
                            transition: 'background 0.15s',
                          }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,224,0,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,224,0,0.12)'; }}
                          >
                            Start new chat →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {streamingText && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 9, flexShrink: 0, padding: 3,
              background: '#0c0f1a', border: '1px solid rgba(255,224,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
            }}>
              <PacMan size={22} mouthFill="#0c0f1a" />
            </div>
            <div style={{
              maxWidth: '85%', padding: '10px 15px',
              borderRadius: '4px 16px 16px 16px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 1.55,
              wordBreak: 'break-word',
            }}>
              {renderFormatted(streamingText, 'streaming')}
              <span style={{
                display: 'inline-block', width: 2, height: 14,
                background: '#FCD34D', marginLeft: 2,
                animation: 'blink 1s step-end infinite',
                verticalAlign: 'text-bottom',
              }} />
            </div>
          </div>
        )}

        {loading && !streamingText && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 9, flexShrink: 0, padding: 3,
              background: '#0c0f1a',
              border: loadingStage === 'breathing' ? '1px solid rgba(255,224,0,0.4)' : '1px solid rgba(255,224,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
              animation: loadingStage === 'breathing' ? 'craigBreath 2s ease-in-out infinite' : 'none',
              boxShadow: loadingStage === 'breathing' ? '0 0 12px rgba(255,224,0,0.25)' : 'none',
            }}>
              <PacMan size={22} mouthFill="#0c0f1a" />
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: '4px 16px 16px 16px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#FFE000',
                    animation: `craigDot 1.4s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                {loadingStage === 'breathing' ? 'Almost there...' : 'Craig is thinking...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {showScrollBtn && (
        <button onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{
          position: 'absolute', bottom: 90, right: 20, zIndex: 10,
          width: 34, height: 34, borderRadius: 17,
          background: 'rgba(38,120,255,0.2)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(38,120,255,0.3)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#60A5FA',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          animation: 'fadeSlideUp 0.2s ease-out',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      <div style={{
        padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(0deg, rgba(255,224,0,0.02) 0%, transparent 100%)',
      }}>
        {aiCopilotMessages.length === 0 && (
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.2)', marginBottom: 8,
            fontFamily: "'JetBrains Mono', monospace", textAlign: 'center',
          }}>
            Craig sees {columns.filter(c => c.contact).length} conversations · {contacts.length} contacts · {dbInitiatives.length} initiatives
          </div>
        )}
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '4px 4px 4px 16px',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendToCraig(); } }}
            placeholder="Ask Craig anything..."
            rows={3}
            style={{
              flex: 1, resize: 'none', border: 'none', outline: 'none',
              background: 'transparent', color: '#fff', fontSize: 13,
              fontFamily: "'Inter', sans-serif", padding: '8px 0',
              minHeight: 60, maxHeight: 260, overflowY: 'auto',
              lineHeight: 1.5,
            }}
          />
          <button onClick={sendToCraig} disabled={!input.trim() || loading} style={{
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: input.trim() ? 'linear-gradient(135deg, #FFE000, #F59E0B)' : 'rgba(255,255,255,0.04)',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', flexShrink: 0,
            boxShadow: input.trim() ? '0 2px 8px rgba(245,158,11,0.3)' : 'none',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={input.trim() ? '#1c1c00' : 'rgba(255,255,255,0.15)'}
              strokeWidth="2.2" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes craigDot {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes craigBreath {
          0%, 100% { transform: scale(1); box-shadow: 0 0 8px rgba(255,224,0,0.1); }
          50% { transform: scale(1.06); box-shadow: 0 0 16px rgba(255,224,0,0.4); }
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
