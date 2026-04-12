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
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiCopilotMessages, streamingText]);

  // Auto-focus input when panel opens
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [showAICopilot]);

  const sendToCraig = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user' as const, text };
    setAiCopilotMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setStreamingText('');

    try {
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

      // Simulate streaming effect for better UX
      setStreamingText('');
      const words = reply.split(' ');
      let accumulated = '';
      for (let i = 0; i < words.length; i++) {
        accumulated += (i > 0 ? ' ' : '') + words[i];
        setStreamingText(accumulated);
        await new Promise(r => setTimeout(r, 18));
      }
      setStreamingText('');
      setAiCopilotMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      handleCraigActions(reply);
    } catch {
      setStreamingText('');
      setAiCopilotMessages(prev => [...prev, { role: 'assistant', text: 'Failed to reach Craig. Check your connection.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCraigActions = (text: string) => {
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

  const clearChat = () => {
    setAiCopilotMessages([]);
    setStreamingText('');
  };

  const formatCraigMessage = (text: string) => {
    // Bold action tags
    return text.replace(/\[(SEND|LOOKUP|BULK_SEND|UPDATE|INITIATIVE|SCHEDULE):[^\]]+\]/g, (match) => {
      return match; // keep as-is, styled differently below
    });
  };

  return (
    <div style={{
      width: 400, minWidth: 400,
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: '#0a0d18',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(38,120,255,0.06) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg, #2678FF, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(38,120,255,0.35)',
              position: 'relative',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
                <circle cx="12" cy="12" r="11" fill="#FFE000" />
                <circle cx="10" cy="7" r="1.4" fill="#1c1c00" />
                <path d="M12 12 L24 4 L24 20 Z" fill="#2678FF">
                </path>
              </svg>
              {/* Online indicator */}
              <div style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 10, height: 10, borderRadius: 5,
                background: '#22C55E', border: '2px solid #0a0d18',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Craig</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>
                {loading ? 'Thinking...' : 'AI Copilot'} · {aiCopilotModel}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <select
              value={aiCopilotModel}
              onChange={e => setAiCopilotModel(e.target.value as typeof aiCopilotModel)}
              style={{
                padding: '5px 8px', borderRadius: 6,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600,
                cursor: 'pointer', outline: 'none',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <option value="haiku">Haiku</option>
              <option value="sonnet">Sonnet</option>
              <option value="opus">Opus</option>
            </select>
            {aiCopilotMessages.length > 0 && (
              <button onClick={clearChat} title="New chat" style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setShowAICopilot(false)}
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.3)', fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div id="craig-messages" style={{
        flex: 1, overflowY: 'auto', padding: '20px 16px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {aiCopilotMessages.length === 0 && !streamingText && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            {/* Craig avatar */}
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: 'radial-gradient(circle at 50% 50%, rgba(255,224,0,0.08), transparent 70%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="56" height="56" viewBox="0 0 24 24" style={{ overflow: 'visible', filter: 'drop-shadow(0 4px 12px rgba(255,224,0,0.3))' }}>
                <circle cx="12" cy="12" r="11" fill="#FFE000" />
                <circle cx="10" cy="7" r="1.5" fill="#1c1c00" />
                <path d="M12 12 L24 4 L24 20 Z" fill="#0a0d18">
                </path>
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
              Hey, I&apos;m Craig
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto 24px' }}>
              Your AI copilot for messaging. I can draft replies, search contacts, analyze conversations, and manage initiatives.
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: '💬', text: 'Draft a message to my VIP contacts' },
                { icon: '🔍', text: 'Show me recent activity' },
                { icon: '📊', text: 'Who needs a follow-up?' },
                { icon: '🗺️', text: 'Search for contacts in NJ' },
              ].map(prompt => (
                <button key={prompt.text} onClick={() => { setInput(prompt.text); setTimeout(() => inputRef.current?.focus(), 50); }} style={{
                  padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(38,120,255,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(38,120,255,0.15)';
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

        {aiCopilotMessages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10,
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-start',
          }}>
            {/* Craig avatar for assistant messages */}
            {msg.role === 'assistant' && (
              <div style={{
                width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                background: '#0a0d18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 2, padding: 3,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
                  <circle cx="12" cy="12" r="11" fill="#FFE000" />
                  <circle cx="10" cy="7" r="1.4" fill="#1c1c00" />
                  <path d="M12 12 L24 4 L24 20 Z" fill="#0a0d18">
                  </path>
                </svg>
              </div>
            )}
            <div style={{
              maxWidth: msg.role === 'user' ? '82%' : '85%',
              padding: '11px 15px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #2678FF, #1a5fd4)'
                : 'rgba(255,255,255,0.05)',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
              color: msg.role === 'user' ? '#fff' : 'rgba(255,255,255,0.85)',
              fontSize: 13, lineHeight: 1.55,
              fontFamily: "'Inter', sans-serif",
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              boxShadow: msg.role === 'user' ? '0 2px 8px rgba(38,120,255,0.2)' : 'none',
            }}>
              {/* Render action tags with special styling */}
              {msg.text.split(/(\[[A-Z_]+:[^\]]+\])/).map((part, pi) => {
                if (part.match(/^\[[A-Z_]+:[^\]]+\]$/)) {
                  return (
                    <span key={pi} style={{
                      display: 'inline-block', margin: '4px 0',
                      padding: '4px 8px', borderRadius: 6,
                      background: 'rgba(38,120,255,0.15)',
                      border: '1px solid rgba(38,120,255,0.25)',
                      fontSize: 11, fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#60A5FA',
                    }}>
                      {part}
                    </span>
                  );
                }
                return <span key={pi}>{part}</span>;
              })}
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {streamingText && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 9, flexShrink: 0,
              background: '#0a0d18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 2, padding: 3,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
                <circle cx="12" cy="12" r="11" fill="#FFE000" />
                <circle cx="10" cy="7" r="1.4" fill="#1c1c00" />
                <path d="M12 12 L24 4 L24 20 Z" fill="#0a0d18">
                </path>
              </svg>
            </div>
            <div style={{
              maxWidth: '85%', padding: '11px 15px',
              borderRadius: '4px 16px 16px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13, lineHeight: 1.55,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {streamingText}
              <span style={{
                display: 'inline-block', width: 2, height: 15,
                background: '#2678FF', marginLeft: 2,
                animation: 'blink 1s step-end infinite',
                verticalAlign: 'text-bottom',
              }} />
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && !streamingText && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 9, flexShrink: 0,
              background: 'linear-gradient(135deg, #2678FF, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 2,
              animation: 'craigThink 2s ease-in-out infinite',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M9.5 2A5.5 5.5 0 0 0 4 7.5V16a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V7.5A5.5 5.5 0 0 0 14.5 2z" />
                <circle cx="9" cy="10" r="1.2" fill="#fff" stroke="none" />
                <circle cx="15" cy="10" r="1.2" fill="#fff" stroke="none" />
              </svg>
            </div>
            <div style={{
              padding: '14px 18px',
              borderRadius: '4px 16px 16px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2678FF, #6366f1)',
                    animation: `craigDot 1.4s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                Craig is thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(0deg, rgba(38,120,255,0.03) 0%, transparent 100%)',
      }}>
        {/* Context hint */}
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
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '4px 4px 4px 16px',
          transition: 'border-color 0.15s',
        }}
          onFocus={() => {}}
        >
          <textarea
            ref={inputRef}
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
              maxHeight: 120,
            }}
          />
          <button
            onClick={sendToCraig}
            disabled={!input.trim() || loading}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: input.trim() ? 'linear-gradient(135deg, #2678FF, #1a5fd4)' : 'rgba(255,255,255,0.04)',
              border: 'none',
              cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
              flexShrink: 0,
              boxShadow: input.trim() ? '0 2px 8px rgba(38,120,255,0.3)' : 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={input.trim() ? '#fff' : 'rgba(255,255,255,0.15)'}
              strokeWidth="2" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Craig-specific animations */}
      <style>{`
        @keyframes craigDot {
          0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes craigThink {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(38,120,255,0); }
          50% { transform: scale(1.05); box-shadow: 0 0 12px rgba(38,120,255,0.3); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
