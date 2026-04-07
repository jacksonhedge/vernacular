'use client';
import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: string;
}

const MODELS = [
  { id: 'haiku', name: 'Haiku', desc: 'Fast & light', icon: '⚡', color: '#22C55E' },
  { id: 'sonnet', name: 'Sonnet', desc: 'Balanced', icon: '🎯', color: '#378ADD' },
  { id: 'opus', name: 'Opus', desc: 'Most capable', icon: '🧠', color: '#7C3AED' },
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('sonnet');
  const [isLoading, setIsLoading] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant for Vernacular, an iMessage CRM platform. Be concise, friendly, and professional.');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[1];

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
          systemPrompt,
        }),
      });

      const data = await res.json();

      if (data.content) {
        const assistantMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          model: currentModel.name,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: '#0a0a0f', color: '#fff', fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #378ADD, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>💬</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Vernacular AI</div>
            <div style={{ fontSize: 11, color: '#8e8e93' }}>Powered by Claude</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Model Picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowModelPicker(prev => !prev)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{currentModel.icon}</span>
              <span>{currentModel.name}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
            </button>

            {showModelPicker && (
              <>
                <div onClick={() => setShowModelPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 6, zIndex: 100,
                  background: '#1a1a2e', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.4)', overflow: 'hidden', minWidth: 220,
                }}>
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '12px 16px', border: 'none', cursor: 'pointer',
                        background: selectedModel === m.id ? 'rgba(55,138,221,0.1)' : 'transparent',
                        color: '#fff', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{m.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: '#8e8e93' }}>{m.desc}</div>
                      </div>
                      {selectedModel === m.id && (
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: m.color }} />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(prev => !prev)}
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: showSettings ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
              color: '#8e8e93', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={{
          padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>System Prompt</div>
          <textarea
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            style={{
              width: '100%', minHeight: 60, padding: 10, borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              color: '#fff', fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
              resize: 'vertical', outline: 'none',
            }}
          />
          <button onClick={() => { setMessages([]); setShowSettings(false); }} style={{
            marginTop: 8, padding: '6px 14px', borderRadius: 6, border: 'none',
            background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>Clear Chat</button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, opacity: 0.6 }}>
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Start a conversation</div>
            <div style={{ fontSize: 13, color: '#8e8e93', textAlign: 'center', maxWidth: 300 }}>
              Ask anything. Switch models anytime with the picker above.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {['What can you do?', 'Help me write a message', 'Explain Vernacular'].map(q => (
                <button key={q} onClick={() => { setInput(q); }} style={{
                  padding: '6px 12px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)', color: '#c4c4c6', fontSize: 11, cursor: 'pointer',
                }}>{q}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            gap: 4,
          }}>
            <div style={{
              maxWidth: '75%', padding: '12px 16px', borderRadius: 16,
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #378ADD, #2B6CB0)'
                : 'rgba(255,255,255,0.06)',
              color: '#fff', fontSize: 14, lineHeight: 1.6,
              border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
              <span style={{ fontSize: 10, color: '#6b7280' }}>
                {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
              {msg.model && (
                <span style={{ fontSize: 9, color: '#6b7280', fontFamily: "'JetBrains Mono', monospace" }}>
                  {msg.model}
                </span>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{
              padding: '12px 16px', borderRadius: 16,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', gap: 4,
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: 3, background: '#8e8e93',
                  animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
            padding: '0 4px 0 16px',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message..."
              style={{
                flex: 1, padding: '12px 0', border: 'none', outline: 'none',
                background: 'transparent', color: '#fff', fontSize: 14,
                fontFamily: "'Inter', sans-serif",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              style={{
                width: 36, height: 36, borderRadius: 8, border: 'none',
                background: input.trim() ? currentModel.color : 'rgba(255,255,255,0.05)',
                color: '#fff', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 10, color: '#6b7280' }}>
            {currentModel.icon} Using {currentModel.name} — {currentModel.desc}
          </span>
          <span style={{ fontSize: 10, color: '#6b7280' }}>
            Press Enter to send
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
