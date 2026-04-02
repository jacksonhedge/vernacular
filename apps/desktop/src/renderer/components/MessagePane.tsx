import React, { useState, useRef, useEffect } from 'react';
import type { Conversation, LocalMessage } from '../../shared/types';

interface MessagePaneProps {
  conversation: Conversation | null;
  messages: LocalMessage[];
  onSend: (text: string) => void;
  ghostAIEnabled: boolean;
  onGhostAIToggle: () => void;
}

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function MessagePane({
  conversation,
  messages,
  onSend,
  ghostAIEnabled,
  onGhostAIToggle,
}: MessagePaneProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    onSend(input.trim());
    setInput('');
    setTimeout(() => setSending(false), 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state
  if (!conversation) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.pacmanRow}>
          <span style={styles.pacman}>ᗧ</span>
          <span style={styles.ghostBlue}>ᗣ</span>
          <span style={styles.ghostPink}>ᗣ</span>
          <span style={styles.ghostOrange}>ᗣ</span>
          <span style={styles.ghostRed}>ᗣ</span>
        </div>
        <div style={styles.emptyTitle}>Vernacular</div>
        <div style={styles.emptySubtitle}>Select a conversation to start messaging</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>{conversation.fruitIcon}</span>
          <div>
            <div style={styles.headerName}>{conversation.displayName}</div>
            <div style={styles.headerPhone}>{conversation.phone}</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.pacmanSmall}>ᗧ</span>
          <span style={styles.ghostSmallBlue}>ᗣ</span>
          <span style={styles.ghostSmallPink}>ᗣ</span>
          <span style={styles.ghostSmallOrange}>ᗣ</span>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messagesArea}>
        {messages.map((msg, i) => {
          const isMe = msg.isFromMe;
          return (
            <div
              key={msg.rowId + '-' + i}
              style={{
                ...styles.messageRow,
                justifyContent: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  ...styles.bubble,
                  backgroundColor: isMe ? '#378ADD' : '#2a2a3e',
                  color: isMe ? '#fff' : '#e0e0e0',
                  borderBottomRightRadius: isMe ? 4 : 16,
                  borderBottomLeftRadius: isMe ? 16 : 4,
                }}
              >
                <div style={styles.bubbleText}>{msg.text}</div>
                <div style={{
                  ...styles.bubbleTime,
                  color: isMe ? 'rgba(255,255,255,0.6)' : '#6b7280',
                }}>
                  {formatMessageTime(msg.timestamp)}
                </div>
              </div>
            </div>
          );
        })}

        {/* AI draft indicator */}
        {ghostAIEnabled && (
          <div style={{ ...styles.messageRow, justifyContent: 'flex-end' }}>
            <div style={styles.aiDraftBubble}>
              <span style={styles.aiDraftGhost}>👻</span>
              <span style={styles.aiDraftText}>Ghost is thinking...</span>
            </div>
          </div>
        )}

        {/* Sending indicator */}
        {sending && (
          <div style={{ ...styles.messageRow, justifyContent: 'flex-end' }}>
            <div style={styles.sendingIndicator}>
              <span style={styles.sendingGhost}>👻</span>
              <span>Delivering...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={styles.inputBar}>
        {/* Ghost AI toggle */}
        <button
          onClick={onGhostAIToggle}
          style={{
            ...styles.ghostToggle,
            backgroundColor: ghostAIEnabled ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
            color: ghostAIEnabled ? '#8B5CF6' : '#6b7280',
          }}
          title={ghostAIEnabled ? 'Ghost AI: ON' : 'Ghost AI: OFF'}
        >
          👻
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          style={styles.textInput}
        />

        {/* Schedule button */}
        <button style={styles.scheduleButton} title="Schedule message">
          🕐
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            ...styles.sendButton,
            opacity: input.trim() && !sending ? 1 : 0.4,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0f0f23',
    minWidth: 0,
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f23',
    gap: 12,
  },
  pacmanRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 8,
  },
  pacman: { fontSize: 36, color: '#FFE000' },
  ghostBlue: { fontSize: 36, color: '#378ADD' },
  ghostPink: { fontSize: 36, color: '#FF69B4' },
  ghostOrange: { fontSize: 36, color: '#FF8C00' },
  ghostRed: { fontSize: 36, color: '#EF4444' },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.02em',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(26, 26, 46, 0.5)',
    backdropFilter: 'blur(20px)',
    WebkitAppRegion: 'drag' as any,
    minHeight: 60,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    WebkitAppRegion: 'no-drag' as any,
  },
  headerIcon: { fontSize: 28 },
  headerName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
  },
  headerPhone: {
    fontSize: 12,
    color: '#6b7280',
  },
  headerRight: {
    display: 'flex',
    gap: 4,
    WebkitAppRegion: 'no-drag' as any,
  },
  pacmanSmall: { fontSize: 18, color: '#FFE000' },
  ghostSmallBlue: { fontSize: 18, color: '#378ADD' },
  ghostSmallPink: { fontSize: 18, color: '#FF69B4' },
  ghostSmallOrange: { fontSize: 18, color: '#FF8C00' },
  messagesArea: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  messageRow: {
    display: 'flex',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '65%',
    padding: '8px 14px',
    borderRadius: 16,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right' as const,
  },
  aiDraftBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 224, 0, 0.12)',
    border: '1px dashed rgba(255, 224, 0, 0.3)',
    maxWidth: '65%',
  },
  aiDraftGhost: { fontSize: 16 },
  aiDraftText: {
    fontSize: 13,
    color: '#FFE000',
    fontStyle: 'italic' as const,
  },
  sendingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    fontSize: 12,
    color: '#8B5CF6',
  },
  sendingGhost: {
    fontSize: 14,
    animation: 'pulse 1s infinite',
  },
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(26, 26, 46, 0.3)',
  },
  ghostToggle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    fontFamily: 'Inter, sans-serif',
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e0e0e0',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    resize: 'none' as const,
    lineHeight: 1.4,
    minHeight: 36,
    maxHeight: 120,
  },
  scheduleButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    flexShrink: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: '#378ADD',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 18,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
};
