import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ConversationList from './components/ConversationList';
import MessagePane from './components/MessagePane';
import type { Conversation, NavSection, StationMode, LocalMessage } from '../shared/types';

const FRUIT_ICONS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🍑', '🥝', '🍒', '🥭', '🍍', '🍌'];

function getFruitIcon(index: number): string {
  return FRUIT_ICONS[index % FRUIT_ICONS.length];
}

declare global {
  interface Window {
    vernacular: {
      readMessages: (sinceRowId?: number) => Promise<{ ok: boolean; data?: LocalMessage[]; error?: string }>;
      sendMessage: (phone: string, text: string) => Promise<{ ok: boolean; error?: string }>;
      onNewMessage: (callback: (messages: LocalMessage[]) => void) => () => void;
      getStationStatus: () => Promise<{ ok: boolean; data?: any; error?: string }>;
      onStationStatusChanged: (callback: (online: boolean) => void) => () => void;
    };
  }
}

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSection>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [stationMode, setStationMode] = useState<StationMode>('online');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ghostAIEnabled, setGhostAIEnabled] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load messages from local chat.db on mount
  useEffect(() => {
    async function loadMessages() {
      if (!window.vernacular) return;
      const result = await window.vernacular.readMessages();
      if (result.ok && result.data) {
        const raw = result.data;
        // Group by phone to build conversation list
        const phoneMap = new Map<string, LocalMessage[]>();
        for (const msg of raw) {
          if (!msg.phone) continue;
          if (!phoneMap.has(msg.phone)) phoneMap.set(msg.phone, []);
          phoneMap.get(msg.phone)!.push(msg);
        }

        const convos: Conversation[] = [];
        let idx = 0;
        phoneMap.forEach((msgs, phone) => {
          const sorted = msgs.sort((a, b) => b.timestamp - a.timestamp);
          convos.push({
            id: phone,
            phone,
            displayName: phone,
            lastMessage: sorted[0]?.text || '',
            lastMessageTime: sorted[0]?.timestamp || 0,
            unreadCount: msgs.filter((m) => !m.isFromMe).length > 0 ? 1 : 0,
            fruitIcon: getFruitIcon(idx),
          });
          idx++;
        });

        convos.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        setConversations(convos);
        setMessages(raw);
      }
    }
    loadMessages();
  }, []);

  // Listen for new messages from main process
  useEffect(() => {
    if (!window.vernacular) return;
    const unsub = window.vernacular.onNewMessage((newMsgs) => {
      setMessages((prev) => [...newMsgs, ...prev]);
    });
    return unsub;
  }, []);

  // Listen for station status changes
  useEffect(() => {
    if (!window.vernacular) return;
    const unsub = window.vernacular.onStationStatusChanged((online) => {
      setStationMode(online ? 'online' : 'offline');
    });
    return unsub;
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (!selectedConversation || !window.vernacular) return;
    const result = await window.vernacular.sendMessage(selectedConversation.phone, text);
    if (result.ok) {
      const newMsg: LocalMessage = {
        rowId: Date.now(),
        phone: selectedConversation.phone,
        text,
        isFromMe: true,
        timestamp: Date.now(),
      };
      setMessages((prev) => [newMsg, ...prev]);
    }
  }, [selectedConversation]);

  const selectedMessages = selectedConversation
    ? messages
        .filter((m) => m.phone === selectedConversation.phone)
        .sort((a, b) => a.timestamp - b.timestamp)
    : [];

  return (
    <div style={styles.container}>
      <Sidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        stationMode={stationMode}
        onStationModeChange={setStationMode}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled(!soundEnabled)}
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversation?.id || null}
        onSelect={(c) => setSelectedConversation(c)}
        collapsed={sidebarCollapsed}
      />
      <MessagePane
        conversation={selectedConversation}
        messages={selectedMessages}
        onSend={handleSend}
        ghostAIEnabled={ghostAIEnabled}
        onGhostAIToggle={() => setGhostAIEnabled(!ghostAIEnabled)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    background: '#0f0f23',
  },
};
