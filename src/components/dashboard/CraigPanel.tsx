'use client';

import { useState, useEffect, useRef } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';

export default function CraigPanel() {
  const {
    showAICopilot, setShowAICopilot,
    aiCopilotMessages, setAiCopilotMessages,
    aiCopilotModel, setAiCopilotModel,
    orgId, columns, contacts, allConversations,
    craigKnowledge, orgKnowledge,
    dbInitiatives, setColumns,
  } = useDashboard();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiCopilotMessages]);

  const sendToCraig = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user' as const, text };
    setAiCopilotMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build context for Craig
      const contactSummary = columns.slice(0, 30).map(col => {
        if (!col.contact) return null;
        const lastMsgs = col.messages.slice(-3).map(m =>
          `${m.direction === 'outgoing' ? 'You' : 'Them'}: ${m.text}`
        ).join('\n');
        return `${col.contact.name} (${col.contact.phone}):\n${lastMsgs}`;
      }).filter(Boolean).join('\n\n');

      const initiativeList = dbInitiatives.map(i => i.title).join(', ');

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...aiCopilotMessages, userMsg].map(m => ({
            role: m.role, content: m.text,
          })),
          model: aiCopilotModel,
          orgId,
          context: {
            contacts: contactSummary,
            initiatives: initiativeList,
            knowledge: craigKnowledge,
            orgKnowledge,
          },
        }),
      });

      const data = await res.json();
      const reply = data.response || data.message || 'No response';

      setAiCopilotMessages(prev => [...prev, { role: 'assistant', text: reply }]);

      // Handle Craig action tags
      handleCraigActions(reply);
    } catch {
      setAiCopilotMessages(prev => [...prev, { role: 'assistant', text: 'Failed to reach Craig. Check your connection.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCraigActions = (text: string) => {
    // Handle [SEND:name:message] — create AI draft in conversation
    const sendMatch = text.match(/\[SEND:([^:]+):([^\]]+)\]/);
    if (sendMatch) {
      const [, target, message] = sendMatch;
      const targetDigits = target.replace(/\D/g, '').slice(-10);
      const col = columns.find(c => {
        if (!c.contact) return false;
        const nameMatch = c.contact.name.toLowerCase().includes(target.toLowerCase());
        const phoneMatch = targetDigits.length >= 10 && c.contact.phone?.replace(/\D/g, '').slice(-10) === targetDigits;
        return nameMatch || phoneMatch;
      });
      if (col) {
        const draftMsg = {
          id: `ai-draft-${Date.now()}`,
          text: message.trim(),
          direction: 'outgoing' as const,
          timestamp: new Date().toISOString(),
          isAIDraft: true,
          status: 'Draft',
        };
        setColumns(prev => prev.map(c => c.id === col.id ? { ...c, messages: [...c.messages, draftMsg] } : c));
      }
    }
  };

  return (
    <div style={{
      width: 380, minWidth: 380,
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: '#0c0f1a',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #2678FF, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(38,120,255,0.3)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 2A5.5 5.5 0 0 0 4 7.5V16a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V7.5A5.5 5.5 0 0 0 14.5 2z" />
              <circle cx="9" cy="10" r="1.5" fill="#fff" stroke="none" />
              <circle cx="15" cy="10" r="1.5" fill="#fff" stroke="none" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Craig</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>AI Copilot · {aiCopilotModel}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={aiCopilotModel}
            onChange={e => setAiCopilotModel(e.target.value as typeof aiCopilotModel)}
            style={{
              padding: '4px 8px', borderRadius: 6,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600,
              cursor: 'pointer', outline: 'none',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <option value="haiku">Haiku</option>
            <option value="sonnet">Sonnet</option>
            <option value="opus">Opus</option>
          </select>
          <button
            onClick={() => setShowAICopilot(false)}
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'rgba(255,255,255,0.06)', border: 'none',
              color: 'rgba(255,255,255,0.4)', fontSize: 14,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            x
          </button>
        </div>
      </div>

      {/* Messages */}
      <div id="craig-messages" style={{
        flex: 1, overflowY: 'auto', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {aiCopilotMessages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(38,120,255,0.15), rgba(99,102,241,0.15))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2678FF" strokeWidth="1.5" strokeLinecap="round">
                <path d="M9.5 2A5.5 5.5 0 0 0 4 7.5V16a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V7.5A5.5 5.5 0 0 0 14.5 2z" />
                <circle cx="9" cy="10" r="1.5" fill="#2678FF" stroke="none" />
                <circle cx="15" cy="10" r="1.5" fill="#2678FF" stroke="none" />
                <path d="M9 15c1.5 1.5 4.5 1.5 6 0" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Hey, I&apos;m Craig</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>
              Your AI copilot. I can draft messages, search contacts, manage initiatives, and more.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 20 }}>
              {[
                'Draft a message to my VIP contacts',
                'Show me recent activity',
                'Search for contacts in NJ',
              ].map(prompt => (
                <button key={prompt} onClick={() => { setInput(prompt); }} style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(38,120,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(38,120,255,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {aiCopilotMessages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? '#2678FF' : 'rgba(255,255,255,0.06)',
              color: msg.role === 'user' ? '#fff' : 'rgba(255,255,255,0.8)',
              fontSize: 13, lineHeight: 1.5,
              fontFamily: "'Inter', sans-serif",
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: 3,
                background: 'rgba(38,120,255,0.5)',
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '4px 4px 4px 14px',
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendToCraig(); }
            }}
            placeholder="Ask Craig anything..."
            rows={1}
            style={{
              flex: 1, resize: 'none', border: 'none', outline: 'none',
              background: 'transparent', color: '#fff', fontSize: 13,
              fontFamily: "'Inter', sans-serif", padding: '8px 0',
              maxHeight: 100,
            }}
          />
          <button
            onClick={sendToCraig}
            disabled={!input.trim() || loading}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: input.trim() ? '#2678FF' : 'rgba(255,255,255,0.06)',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#fff' : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
