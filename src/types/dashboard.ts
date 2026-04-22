// ── Vernacular Dashboard Types ─────────────────────────────────────────────

export type NavTab = 'dashboard' | 'conversations' | 'contacts' | 'team' | 'stations' | 'ai-drafts' | 'calendar' | 'integrations' | 'profile' | 'settings';

export type ConversationViewMode = 'streams' | 'summary' | 'schedule' | 'matrix' | 'messages';

export interface Message {
  id: string;
  text: string;
  direction: 'outgoing' | 'incoming';
  timestamp: string;
  isAIDraft?: boolean;
  draftDbId?: string; // UUID of matching pending_drafts row — present only on AI drafts
  attachmentUrl?: string;
  attachmentType?: string;
  status?: string; // Queued, Sending, Sent, Delivered, Draft, failed
}

export interface Contact {
  id: string;
  name: string;
  initials: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  avatar?: string;
  phone?: string;
}

export interface ConversationColumn {
  id: string;
  contact: Contact | null;
  messages: Message[];
  conversationId?: string;
  aiMode?: string;
  goal?: string;
  channel?: 'imessage' | 'discord' | 'telegram' | 'email' | 'sms';
}

export interface DashboardMetrics {
  messagesToday: number;
  messagesAllTime: number;
  responseRate: number;
  activeConversations: number;
  aiDrafts: number;
}

export interface RecentMessage {
  id: string;
  contactName: string;
  contactPhone: string;
  preview: string;
  direction: string;
  aiGenerated: boolean;
  sentAt: string;
}

export interface Station {
  id: string;
  name: string;
  phone_number: string;
  status: string;
  last_heartbeat: string;
  auto_reply_enabled: boolean;
  apple_id?: string;
  machine_name?: string;
  system_prompt?: string;
  model?: string;
}

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export interface OrgSettings {
  company_name: string;
  ai_auto_draft: boolean;
  ai_auto_send: boolean;
  ai_model: string;
  default_system_prompt: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;
  max_messages_per_day: number;
  max_ai_drafts_per_day: number;
  max_blast_recipients: number;
  notify_on_inbound: boolean;
  notify_on_flag: boolean;
  notify_on_station_offline: boolean;
  slack_webhook_url: string;
}

export interface ContactRecord {
  id: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  school: string;
  greek_org: string;
  position: string;
  state: string;
  campaign_status: string;
  source: string;
  company?: string;
  job_title?: string;
  linkedin_url?: string;
  instagram_handle?: string;
  twitter_handle?: string;
  website?: string;
  address?: string;
  city?: string;
  zip?: string;
  venmo_handle?: string;
  notes?: string;
  tags?: string[];
  import_source?: string;
  referred_by?: string;
  dob?: string;
  last_contacted_at?: string;
  total_messages?: number;
  response_rate?: number;
  created_at?: string;
}

export interface OrgIntegration {
  id: string;
  organization_id: string;
  provider: 'notion' | 'slack' | 'ai_providers';
  enabled: boolean;
  config: Record<string, unknown>;
  status: 'connected' | 'disconnected' | 'error';
  last_synced_at: string | null;
}

export interface Notification {
  id: string;
  type: string;
  subject: string;
  body: string;
  read: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface GhostConfig {
  name: string;
  color: string;
  role: string;
  purpose: string;
}

export interface Initiative {
  id: string;
  title: string;
  content: string;
  parent_id: string | null;
}

export interface StagedContact {
  name: string;
  phone: string;
  firstName: string;
  initials: string;
  state?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  contact_name: string;
  contact_phone: string;
  scheduled_at: string | null;
  status: string;
  source: string;
  description: string;
  detected_from_message: string | null;
  created_at: string;
}
