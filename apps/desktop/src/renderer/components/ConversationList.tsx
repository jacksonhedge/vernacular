import React, { useState } from 'react';
import type { Conversation } from '../../shared/types';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  collapsed: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  collapsed,
}: ConversationListProps) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) =>
    c.displayName.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search),
  );

  return (
    <div style={styles.container}>
      {/* Search bar */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Conversation list */}
      <div style={styles.list}>
        {filtered.length === 0 && (
          <div style={styles.empty}>
            {conversations.length === 0
              ? 'No conversations yet. Grant Full Disk Access to read iMessage.'
              : 'No results found.'}
          </div>
        )}

        {filtered.map((convo) => {
          const isSelected = convo.id === selectedId;
          return (
            <button
              key={convo.id}
              onClick={() => onSelect(convo)}
              style={{
                ...styles.conversationItem,
                backgroundColor: isSelected
                  ? 'rgba(55, 138, 221, 0.12)'
                  : 'transparent',
              }}
            >
              {/* Fruit icon avatar */}
              <div style={styles.avatar}>
                <span style={styles.avatarEmoji}>{convo.fruitIcon}</span>
              </div>

              {/* Content */}
              <div style={styles.content}>
                <div style={styles.topRow}>
                  <span style={{
                    ...styles.name,
                    color: isSelected ? '#fff' : '#e0e0e0',
                  }}>
                    {convo.displayName}
                  </span>
                  <span style={styles.time}>{formatTime(convo.lastMessageTime)}</span>
                </div>
                <div style={styles.bottomRow}>
                  <span style={styles.preview}>
                    {convo.lastMessage.length > 50
                      ? convo.lastMessage.substring(0, 50) + '...'
                      : convo.lastMessage}
                  </span>
                  {convo.unreadCount > 0 && (
                    <div style={styles.unreadDot} />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 300,
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#16162a',
    flexShrink: 0,
  },
  searchContainer: {
    padding: '12px 12px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e0e0e0',
    fontSize: 13,
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '4px 0',
  },
  empty: {
    padding: '24px 16px',
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 1.5,
  },
  conversationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    transition: 'background 0.15s',
    textAlign: 'left' as const,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  time: {
    fontSize: 11,
    color: '#6b7280',
    flexShrink: 0,
    marginLeft: 8,
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    fontSize: 12,
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#378ADD',
    flexShrink: 0,
    marginLeft: 8,
  },
};
