/** A message read from the local iMessage chat.db */
export interface LocalMessage {
  rowId: number;
  phone: string;
  text: string;
  isFromMe: boolean;
  timestamp: number;
}

/** A conversation in the sidebar list */
export interface Conversation {
  id: string;
  phone: string;
  displayName: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  fruitIcon: string;
}

/** Station status returned from main process */
export interface StationStatus {
  online: boolean;
  hostname: string;
  platform: string;
  uptime: number;
}

/** Navigation sections in sidebar */
export type NavSection = 'conversations' | 'contacts' | 'settings';

/** Station mode for status dropdown */
export type StationMode = 'online' | 'offline' | 'dnd';

/** Message bubble type for styling */
export type MessageType = 'outgoing' | 'incoming' | 'ai-draft';

/** Global app state */
export interface AppState {
  activeNav: NavSection;
  selectedConversation: Conversation | null;
  stationMode: StationMode;
  soundEnabled: boolean;
  ghostAIEnabled: boolean;
  sidebarCollapsed: boolean;
}
