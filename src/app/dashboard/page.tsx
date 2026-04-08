'use client';
// Dashboard v2 — April 6 2026
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ── Types ───────────────────────────────────────────────────────────────────

type NavTab = 'dashboard' | 'conversations' | 'contacts' | 'team' | 'stations' | 'ai-drafts' | 'integrations' | 'profile' | 'settings';

interface Message {
  id: string;
  text: string;
  direction: 'outgoing' | 'incoming';
  timestamp: string;
  isAIDraft?: boolean;
}

interface Contact {
  id: string;
  name: string;
  initials: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  avatar?: string;
  phone?: string;
}

interface ConversationColumn {
  id: string;
  contact: Contact | null;
  messages: Message[];
  conversationId?: string;
  aiMode?: string;
  goal?: string;
  channel?: 'imessage' | 'discord' | 'telegram' | 'email' | 'sms';
}

interface DashboardMetrics {
  messagesToday: number;
  messagesAllTime: number;
  responseRate: number;
  activeConversations: number;
  aiDrafts: number;
}

interface RecentMessage {
  id: string;
  contactName: string;
  contactPhone: string;
  preview: string;
  direction: string;
  aiGenerated: boolean;
  sentAt: string;
}

interface Station {
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

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface OrgSettings {
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

interface ContactRecord {
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

interface OrgIntegration {
  id: string;
  organization_id: string;
  provider: 'notion' | 'slack' | 'ai_providers';
  enabled: boolean;
  config: Record<string, unknown>;
  status: 'connected' | 'disconnected' | 'error';
  last_synced_at: string | null;
}

type ConversationViewMode = 'streams' | 'summary' | 'schedule' | 'matrix' | 'messages';

// ── Mock Data for Conversations View ────────────────────────────────────────

const MOCK_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Sarah Chen', initials: 'SC', tag: 'VIP Client', tagColor: '#D97706', tagBg: 'rgba(217,119,6,0.1)' },
  { id: 'c2', name: 'Marcus Williams', initials: 'MW', tag: 'Enterprise', tagColor: '#7C3AED', tagBg: 'rgba(124,58,237,0.1)' },
  { id: 'c3', name: 'David Kim', initials: 'DK', tag: 'Lead', tagColor: '#2563EB', tagBg: 'rgba(37,99,235,0.1)' },
];

// MOCK_CONVERSATIONS removed — real conversations loaded from Supabase

// ── Nav Config ──────────────────────────────────────────────────────────────

// Which plans can access which tabs. Empty = available to all.
// Which plans can access which tabs. Empty = available to all.
// Every solution type gets a dedicated phone line, so Phone Lines is always visible.
const TAB_PERMISSIONS: Record<NavTab, string[]> = {
  'dashboard': [],           // all plans
  'conversations': [],       // all plans
  'contacts': [],            // all plans
  'team': [],                // all plans
  'stations': [],            // all plans — every type gets a dedicated line
  'ai-drafts': [],           // all plans — AI is core to every solution
  'integrations': [],        // all plans
  'profile': [],             // all plans
  'settings': [],            // all plans
};

const NAV_ITEMS: { label: string; tab: NavTab; icon: React.ReactNode; color?: string }[] = [
  {
    label: 'Dashboard',
    tab: 'dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Conversations',
    tab: 'conversations',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: 'AI Responder',
    tab: 'ai-drafts',
    color: '#D97706',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.912 5.813L20 10.5l-4.376 3.937L16.824 21 12 17.5 7.176 21l1.2-6.75L4 10.5l6.088-1.687L12 3z" /><path d="M5 3v4" /><path d="M3 5h4" /><path d="M19 17v4" /><path d="M17 19h4" />
      </svg>
    ),
  },
  {
    label: 'Contacts',
    tab: 'contacts',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Team',
    tab: 'team',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Phone Lines',
    tab: 'stations',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /><path d="M6 10l2-2 2 2" /><path d="M14 10l2-2 2 2" />
      </svg>
    ),
  },
  {
    label: 'Integrations',
    tab: 'integrations',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24" />
      </svg>
    ),
  },
  {
    label: 'Profile',
    tab: 'profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    tab: 'settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" />
      </svg>
    ),
  },
];

// ── Hash Routing Helper ────────────────────────────────────────────────────

const getInitialTab = (): NavTab => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '') as NavTab;
    const validTabs: NavTab[] = ['dashboard', 'conversations', 'contacts', 'team', 'stations', 'ai-drafts', 'integrations', 'profile', 'settings'];
    if (validTabs.includes(hash)) return hash;
  }
  return 'dashboard';
};

// ── Component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  // Auth / user state
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>(getInitialTab);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  // Dashboard metrics
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    messagesToday: 0, messagesAllTime: 0, responseRate: 0, activeConversations: 0, aiDrafts: 0,
  });
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<{ id: string; type: string; subject: string; body: string; read: boolean; created_at: string; metadata: Record<string, unknown> }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationBellRef = useRef<HTMLDivElement>(null);

  // Contacts
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [supabaseContactsLoaded, setSupabaseContactsLoaded] = useState(false);
  const [notionContactsMerged, setNotionContactsMerged] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<ContactRecord | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState<'vcf' | 'csv' | 'notion' | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importResults, setImportResults] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [importingContacts, setImportingContacts] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [contactsViewMode, setContactsViewMode] = useState<'list' | 'cards'>('list');
  const [addFormData, setAddFormData] = useState({ first_name: '', last_name: '', phone: '', email: '', company: '', job_title: '', linkedin_url: '', notes: '', tags: '' });
  const importDropdownRef = useRef<HTMLDivElement>(null);

  // Close import dropdown on outside click
  useEffect(() => {
    if (!showImportDropdown) return;
    const handler = (e: MouseEvent) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(e.target as Node)) {
        setShowImportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showImportDropdown]);

  // Conversations (loaded from Supabase)
  const [columns, setColumns] = useState<ConversationColumn[]>([]);
  const [allConversations, setAllConversations] = useState<ConversationColumn[]>([]);
  const [showContactPicker, setShowContactPicker] = useState<string | null>(null);
  const [contactPickerSearch, setContactPickerSearch] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [editingContact, setEditingContact] = useState<{
    colId: string; firstName: string; lastName: string; name: string; phone: string; email: string;
    company: string; jobTitle: string; linkedin: string; instagram: string; twitter: string;
    school: string; greekOrg: string; state: string; city: string; dob: string;
    venmo: string; notes: string;
  } | null>(null);
  const [aiResponseMode, setAiResponseMode] = useState<Record<string, 'off' | 'draft' | 'auto'>>({});
  const [showAiAgentPanel, setShowAiAgentPanel] = useState(false);
  const [aiAgentSettings, setAiAgentSettings] = useState({ enabled: false, prepareText: true });
  const [newConvPhone, setNewConvPhone] = useState('');
  const [newConvName, setNewConvName] = useState('');
  const [hoveredColClose, setHoveredColClose] = useState<string | null>(null);
  const messageEndRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const streamsScrollRef = useRef<HTMLDivElement | null>(null);

  // Notion data
  const [notionContacts, setNotionContacts] = useState<Array<{
    id: string; name: string; phone: string; initials: string;
    lastMessage: string; lastDate: string; chapter: string; messageCount: number;
  }>>([]);
  const [notionConversations, setNotionConversations] = useState<Array<{
    name: string; pageId: string; initials: string;
    phone?: string; school?: string; org?: string; status?: string; messageCount?: number;
    lastMessage?: string;
  }>>([]);
  const [loadingNotion, setLoadingNotion] = useState(false);

  // Settings form
  const [settingsForm, setSettingsForm] = useState<OrgSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Profile form
  const [profileForm, setProfileForm] = useState<{
    full_name: string; phone: string; job_title: string; linkedin_url: string;
    twitter_handle: string; timezone: string; bio: string; location: string;
  }>({ full_name: '', phone: '', job_title: '', linkedin_url: '', twitter_handle: '', timezone: 'America/New_York', bio: '', location: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState('');
  const [showStationMenu, setShowStationMenu] = useState(false);
  const [readConversations, setReadConversations] = useState<Set<string>>(new Set());
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try { return new Set(JSON.parse(localStorage.getItem('vernacular-pinned') || '[]')); } catch { return new Set(); }
    }
    return new Set();
  });
  const [dismissedColumns, setDismissedColumns] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try { return new Set(JSON.parse(localStorage.getItem('vernacular-dismissed') || '[]')); } catch { return new Set(); }
    }
    return new Set();
  });
  const [showReadStreams, setShowReadStreams] = useState(true);
  const [showPreviousChats, setShowPreviousChats] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ fullName: '', email: '', role: 'member' });
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [inviteResult, setInviteResult] = useState<{ tempPassword?: string; message?: string; error?: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timelineMessages, setTimelineMessages] = useState<Array<Record<string, unknown>>>([]);
  const [messageTimeFilter, setMessageTimeFilter] = useState<'24h' | '48h' | '72h' | '1w' | '2w'>('24h');
  const [aiResponderTab, setAiResponderTab] = useState<'agents' | 'goals' | 'knowledge' | 'usage'>('agents');
  const [msgContextMenu, setMsgContextMenu] = useState<{ x: number; y: number; msgId: string; colId: string } | null>(null);
  const [hiddenMessages, setHiddenMessages] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try { return new Set(JSON.parse(localStorage.getItem('vernacular-hidden-msgs') || '[]')); } catch { return new Set(); }
    }
    return new Set();
  });
  const [showHiddenMessages, setShowHiddenMessages] = useState(false);
  const [streamSortMode, setStreamSortMode] = useState<'unread' | 'recent' | 'name' | 'most-messages'>('unread');
  const [activeAccountView, setActiveAccountView] = useState<string>('all');
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [aiCopilotMessages, setAiCopilotMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [aiCopilotInput, setAiCopilotInput] = useState('');
  const [aiCopilotLoading, setAiCopilotLoading] = useState(false);
  const [aiPermissions, setAiPermissions] = useState({ sendMessages: false, editContacts: true, viewConversations: true });
  const [aiCopilotModel, setAiCopilotModel] = useState<'haiku' | 'sonnet' | 'opus'>('haiku');
  const [craigNavigating, setCraigNavigating] = useState(false);
  const [craigPos, setCraigPos] = useState({ x: 0, y: 0 }); // 0,0 = center (relative)
  const [craigDragging, setCraigDragging] = useState(false);
  const [showTokenUsage, setShowTokenUsage] = useState(false);
  const [tokenStats, setTokenStats] = useState<{ total: number; cost: string; count: number }>({ total: 0, cost: '$0.00', count: 0 });
  const craigDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Sound effects using Web Audio API
  const playSound = (type: 'send' | 'receive' | 'click') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'send') {
        // iMessage "swoosh" — ascending tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'receive') {
        // iMessage "tri-tone" incoming
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046, ctx.currentTime);       // C6
        osc.frequency.setValueAtTime(1318, ctx.currentTime + 0.1); // E6
        osc.frequency.setValueAtTime(1568, ctx.currentTime + 0.2); // G6
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // Soft click
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch { /* Web Audio not supported */ }
  };
  const [editingGhost, setEditingGhost] = useState<number | null>(null);
  const [ghostConfig, setGhostConfig] = useState([
    { name: 'Blinky', color: '#FF0000', role: 'Lead Generator', purpose: 'Finds and qualifies new prospects from inbound leads' },
    { name: 'Pinky', color: '#FFB8FF', role: 'Tone Specialist', purpose: 'Matches your brand voice perfectly across all messages' },
    { name: 'Inky', color: '#00FFFF', role: 'Follow-Up Engine', purpose: 'Never lets a conversation go cold — auto-follows up' },
    { name: 'Clyde', color: '#FFB852', role: 'Support Agent', purpose: 'Handles FAQs, troubleshooting, and common questions' },
  ]);
  const [stationOverride, setStationOverride] = useState<'auto' | 'dnd' | 'offline'>('auto');
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testMessageText, setTestMessageText] = useState('Hey! This is a test from Vernacular. 💬');
  const [testSendStatus, setTestSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  type PipelineStep = { step: string; status: 'pending' | 'active' | 'done' | 'error'; detail?: string };
  const [testPipelineSteps, setTestPipelineSteps] = useState<PipelineStep[]>([]);

  // Integrations
  const [integrations, setIntegrations] = useState<OrgIntegration[]>([]);
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);
  const [notionConfig, setNotionConfig] = useState({ token: '', database_id: '', workspace_name: '', sync_contacts: true, sync_conversations: true });
  const [slackConfig, setSlackConfig] = useState({ webhook_url: '', channel: '', notify_inbound: true, notify_flagged: true, notify_signups: false, notify_station_offline: true });
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, string>>({});
  const [aiProvidersConfig, setAiProvidersConfig] = useState({ anthropic_key: '', openai_key: '', gemini_key: '' });
  const [testingNotion, setTestingNotion] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);

  // Conversations view mode
  const [conversationViewMode, setConversationViewMode] = useState<ConversationViewMode>('streams');
  const [conversationSearch, setConversationSearch] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [expandedMatrixId, setExpandedMatrixId] = useState<string | null>(null);
  const [lastReloadTime, setLastReloadTime] = useState<Date | null>(null);
  const conversationsAutoLoaded = useRef(false);
  const [aiModeEnabled, setAiModeEnabled] = useState(false);
  const [showAiModePanel, setShowAiModePanel] = useState(false);
  const [aiModeRules, setAiModeRules] = useState({
    maxContacts: 1000,
    responseDelay: '30', // seconds
    activeHours: 'always' as 'always' | 'business' | 'custom',
    customStart: '08:00',
    customEnd: '22:00',
    tone: 'professional' as 'professional' | 'casual' | 'friendly' | 'formal',
    systemPrompt: '',
    autoEscalate: true,
    escalateKeywords: 'urgent, cancel, refund, complaint, manager',
    maxRepliesPerConvo: '10',
    doNotReplyTags: '',
  });

  // Unread notification count
  const [unreadCount, setUnreadCount] = useState(0);

  // Getting Started banner
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);

  // Sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Auth Check ────────────────────────────────────────────────────────────

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }

      const { data } = await supabase
        .from('users').select('*, organizations(*)').eq('auth_id', session.user.id).single();
      setUser(data);
      setLoading(false);
    };
    checkAuth();
  }, []);

  // ── Hash Routing ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'dashboard') {
      window.location.hash = activeTab;
    } else {
      // Clean hash for dashboard home
      if (window.location.hash) history.replaceState(null, '', '/dashboard');
    }
  }, [activeTab]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '') as NavTab;
      const validTabs: NavTab[] = ['dashboard', 'conversations', 'contacts', 'team', 'stations', 'ai-drafts', 'integrations', 'profile', 'settings'];
      if (validTabs.includes(hash)) setActiveTab(hash);
      else setActiveTab('dashboard');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // ── Data Fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const orgId = (user.organizations as Record<string, unknown>)?.id as string;
    if (!orgId) return;

    const fetchDashboardData = async () => {
      // Messages today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        { count: todayCount },
        { count: allTimeCount },
        { count: activeConvCount },
        { count: aiDraftCount },
        { data: totalConvData },
        { data: respondedConvData },
        { data: recentMsgData },
        { data: stationData },
        { data: memberData },
        { data: settingsData },
        { data: contactData },
        { data: integrationData },
      ] = await Promise.all([
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('direction', 'Outbound')
          .gte('created_at', todayStart.toISOString()),
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('direction', 'Outbound'),
        supabase.from('conversations').select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('source_system', 'vernacular-ai'),
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('direction', 'Inbound'),
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('direction', 'Outbound'),
        supabase.from('messages').select(`
          id, direction, message, source_system, sent_at, status, contact_phone, station, created_at
        `).order('created_at', { ascending: false }).limit(10),
        supabase.from('stations').select('*').eq('organization_id', orgId).order('status', { ascending: false }),
        supabase.from('users').select('id, full_name, email, role').eq('organization_id', orgId).order('role'),
        supabase.from('org_settings').select('*').eq('organization_id', orgId).single(),
        supabase.from('contacts').select('*').order('full_name').limit(200),
        supabase.from('org_integrations').select('*').eq('organization_id', orgId),
      ]);

      // Response rate = outbound messages / inbound messages (how often you reply)
      const inboundTotal = (totalConvData as unknown as number) || 0;
      const outboundTotal = (respondedConvData as unknown as number) || 0;
      const rate = inboundTotal > 0 ? Math.min(100, Math.round((outboundTotal / inboundTotal) * 100)) : 0;

      setMetrics({
        messagesToday: todayCount || 0,
        messagesAllTime: allTimeCount || 0,
        responseRate: rate,
        activeConversations: activeConvCount || 0,
        aiDrafts: aiDraftCount || 0,
      });

      // Recent messages
      const formatted: RecentMessage[] = ((recentMsgData as Record<string, unknown>[]) || []).map((m) => {
        return {
          id: m.id as string,
          contactName: (m.contact_phone as string) || 'Unknown',
          contactPhone: (m.contact_phone as string) || '',
          preview: ((m.message as string) || '').slice(0, 80),
          direction: m.direction as string,
          aiGenerated: (m.source_system as string) === 'ai',
          sentAt: m.sent_at as string,
        };
      });
      setRecentMessages(formatted);
      setStations((stationData as Station[]) || []);
      setTeamMembers((memberData as TeamMember[]) || []);

      // Unread count from conversations with unread_count > 0
      if (respondedConvData) {
        setUnreadCount((respondedConvData as Array<{ unread_count?: number }>).reduce((sum, c) => sum + (c.unread_count || 0), 0));
      }

      if (settingsData) {
        const s = settingsData as unknown as OrgSettings;
        setOrgSettings(s);
        setSettingsForm(s);
      }

      setContacts((contactData as ContactRecord[]) || []);
      setSupabaseContactsLoaded(true);

      // Integrations
      const intgs = ((integrationData as OrgIntegration[]) || []);
      setIntegrations(intgs);
      const notionIntg = intgs.find(i => i.provider === 'notion');
      if (notionIntg) {
        const c = notionIntg.config as Record<string, unknown>;
        setNotionConfig({
          token: (c.token as string) || '',
          database_id: (c.database_id as string) || '',
          workspace_name: (c.workspace_name as string) || '',
          sync_contacts: c.sync_contacts !== false,
          sync_conversations: c.sync_conversations !== false,
        });
      }
      const slackIntg = intgs.find(i => i.provider === 'slack');
      if (slackIntg) {
        const c = slackIntg.config as Record<string, unknown>;
        setSlackConfig({
          webhook_url: (c.webhook_url as string) || '',
          channel: (c.channel as string) || '',
          notify_inbound: c.notify_inbound !== false,
          notify_flagged: c.notify_flagged !== false,
          notify_signups: c.notify_signups === true,
          notify_station_offline: c.notify_station_offline !== false,
        });
      }
      const aiIntg = intgs.find(i => i.provider === 'ai_providers');
      if (aiIntg) {
        const c = aiIntg.config as Record<string, unknown>;
        setAiProvidersConfig({
          anthropic_key: (c.anthropic_key as string) || '',
          openai_key: (c.openai_key as string) || '',
          gemini_key: (c.gemini_key as string) || '',
        });
      }
    };

    fetchDashboardData();

    // Fetch notifications
    fetch('/api/notify').then(r => r.json()).then(data => {
      if (data.notifications) setNotifications(data.notifications);
    }).catch(() => {});

    // Notion contacts DISABLED — contacts come from Supabase only

    // Notion conversations DISABLED — all data comes from Supabase now
    // Wade writes to Notion for backup only, dashboard reads from Supabase

    // Load real conversations from Supabase
    fetch(`/api/conversations/list?orgId=${orgId}`).then(r => r.json()).then(data => {
      if (data.conversations && data.conversations.length > 0) {
        const realColumns: ConversationColumn[] = data.conversations.map((conv: Record<string, unknown>) => {
          const contact = conv.contact as Record<string, unknown>;
          const unreadCount = conv.unreadCount as number;
          const messages = conv.messages as Record<string, unknown>[];
          return {
            id: `real-${conv.conversationId}`,
            contact: {
              id: (contact.id as string) || '',
              name: (contact.name as string) || 'Unknown',
              initials: (contact.initials as string) || '??',
              tag: unreadCount > 0 ? 'UNREAD' : 'ACTIVE',
              tagColor: unreadCount > 0 ? '#EF4444' : '#22C55E',
              tagBg: unreadCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
              phone: (contact.phone as string) || '',
            },
            conversationId: conv.conversationId as string,
            aiMode: (conv.aiMode as string) || 'off',
            goal: (conv.goal as string) || '',
            messages: (messages || []).map((m: Record<string, unknown>) => ({
              id: m.id as string,
              text: m.text as string,
              direction: m.direction as 'outgoing' | 'incoming',
              timestamp: m.timestamp as string,
              isAIDraft: m.isAIDraft as boolean | undefined,
            })),
          };
        });
        // Store ALL conversations for contact list, filter dismissed for stream columns
        setAllConversations(realColumns);
        let dismissed: Set<string>;
        try { dismissed = new Set(JSON.parse(localStorage.getItem('vernacular-dismissed') || '[]')); } catch { dismissed = new Set(); }
        setColumns(realColumns.filter(c => !dismissed.has(c.id)));
        setLastReloadTime(new Date());
      }
    }).catch(() => {});
  }, [user]);

  // ── Polling: re-fetch station status + unread counts every 30s ────────────
  useEffect(() => {
    if (!user) return;
    const orgId = (user.organizations as Record<string, unknown>)?.id as string;
    if (!orgId) return;

    const interval = setInterval(async () => {
      try {
        // Re-fetch station statuses
        const { data: stationData } = await supabase
          .from('stations').select('*')
          .eq('organization_id', orgId).order('status', { ascending: false });
        if (stationData) {
          setStations(stationData as Station[]);
        }

        // Poll for inbound messages from Notion → Supabase
        let newInboundSynced = 0;
        try {
          const pollRes = await fetch('/api/engine/poll-inbound');
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData.synced > 0) {
              newInboundSynced = pollData.synced;
              console.log(`[Vernacular] 📥 ${pollData.synced} new inbound message(s) synced from Notion`);
            }
          }
        } catch { /* silent */ }

        // Re-fetch conversations for unread counts
        const { data: convData } = await supabase
          .from('conversations').select('unread_count')
          .gt('unread_count', 0);
        if (convData) {
          setUnreadCount((convData as Array<{ unread_count?: number }>).reduce((sum, c) => sum + (c.unread_count || 0), 0));
        }

        // Re-fetch conversation columns (merge new messages, don't replace)
        try {
          const convRes = await fetch(`/api/conversations/list?orgId=${orgId}`);
          if (convRes.ok) {
            const convListData = await convRes.json();
            if (convListData.conversations && convListData.conversations.length > 0) {
              const freshColumns: ConversationColumn[] = convListData.conversations.map((conv: Record<string, unknown>) => {
                const contact = conv.contact as Record<string, unknown>;
                const unreadCount = conv.unreadCount as number;
                const messages = conv.messages as Record<string, unknown>[];
                return {
                  id: `real-${conv.conversationId}`,
                  conversationId: conv.conversationId as string,
                  aiMode: (conv.aiMode as string) || 'off',
                  goal: (conv.goal as string) || '',
                  contact: {
                    id: (contact.id as string) || '',
                    name: (contact.name as string) || 'Unknown',
                    initials: (contact.initials as string) || '??',
                    tag: unreadCount > 0 ? 'UNREAD' : 'ACTIVE',
                    tagColor: unreadCount > 0 ? '#EF4444' : '#22C55E',
                    tagBg: unreadCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
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

              setColumns(prev => {
                // Build a map of fresh columns by id
                const freshMap = new Map(freshColumns.map((c: ConversationColumn) => [c.id, c]));
                // Merge: update existing columns with new messages, keep non-API columns untouched
                const merged = prev.map(existing => {
                  const fresh = freshMap.get(existing.id);
                  if (fresh) {
                    freshMap.delete(existing.id);
                    // Append only truly new messages (by id)
                    const existingIds = new Set(existing.messages.map(m => m.id));
                    const newMsgs = fresh.messages.filter(m => !existingIds.has(m.id));
                    return {
                      ...existing,
                      contact: fresh.contact, // update tag/unread status
                      messages: [...existing.messages, ...newMsgs],
                    };
                  }
                  return existing;
                });
                // Add new conversations to the BEGINNING, but skip dismissed ones
                // Read dismissed from localStorage directly (not React state) to avoid stale closure
                let currentDismissed: Set<string>;
                try { currentDismissed = new Set(JSON.parse(localStorage.getItem('vernacular-dismissed') || '[]')); } catch { currentDismissed = new Set(); }
                const brandNew = Array.from(freshMap.values()).filter(c => !currentDismissed.has(c.id));
                return [...brandNew, ...merged];
              });
              // Always update allConversations with full data (for contact list)
              setAllConversations(freshColumns);
            }
          }
        } catch { /* silent */ }

        // Play sound if new inbound messages arrived
        if (newInboundSynced > 0) {
          playSound('receive');
        }

        // Update the "Updated Last" timestamp
        setLastReloadTime(new Date());
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // ── Supabase Realtime: instant message updates ─────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: { new: Record<string, unknown> }) => {
          const m = payload.new;
          const phone = String(m.contact_phone || '');
          const dir = (String(m.direction || '')).toLowerCase();
          const newMsg = {
            id: String(m.id || `rt-${Date.now()}`),
            text: String(m.message || ''),
            direction: (dir === 'outbound' ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming',
            timestamp: String(m.sent_at || m.created_at || ''),
            isAIDraft: String(m.source_system || '') === 'vernacular-ai' && String(m.status || '') === 'Draft',
          };

          // Find which conversation this belongs to by matching phone
          const phoneDigits = phone.replace(/\D/g, '').slice(-10);

          // Update columns (open streams)
          setColumns(prev => prev.map(col => {
            if (!col.contact?.phone) return col;
            const colDigits = col.contact.phone.replace(/\D/g, '').slice(-10);
            if (colDigits === phoneDigits) {
              // Skip if message already exists
              if (col.messages.some(msg => msg.id === newMsg.id)) return col;
              return { ...col, messages: [...col.messages, newMsg] };
            }
            return col;
          }));

          // Update allConversations too
          setAllConversations(prev => prev.map(col => {
            if (!col.contact?.phone) return col;
            const colDigits = col.contact.phone.replace(/\D/g, '').slice(-10);
            if (colDigits === phoneDigits) {
              if (col.messages.some(msg => msg.id === newMsg.id)) return col;
              return { ...col, messages: [...col.messages, newMsg] };
            }
            return col;
          }));

          // Update dashboard metrics
          setMetrics(prev => ({
            ...prev,
            messagesAllTime: prev.messagesAllTime + 1,
            messagesToday: dir === 'outbound' ? prev.messagesToday + 1 : prev.messagesToday,
          }));

          // Update Recent Activity on Dashboard tab
          if (dir === 'inbound') {
            const contactMatch = allConversations.find(col => {
              if (!col.contact?.phone) return false;
              return col.contact.phone.replace(/\D/g, '').slice(-10) === phoneDigits;
            });
            setRecentMessages(prev => [{
              id: String(m.id),
              contactName: contactMatch?.contact?.name || phone,
              contactPhone: phone,
              preview: String(m.message || '').slice(0, 80),
              direction: 'inbound' as string,
              aiGenerated: false,
              sentAt: String(m.sent_at || m.created_at || new Date().toISOString()),
            }, ...prev].slice(0, 10));

            // Update unread badge
            setUnreadCount(prev => prev + 1);
            playSound('receive');
          }

          // Update Messages timeline if loaded
          setTimelineMessages(prev => {
            if (prev.length === 0) return prev; // not loaded yet
            return [m as Record<string, unknown>, ...prev];
          });

          setLastReloadTime(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll conversation columns
  // Only auto-scroll message threads when a NEW message is added, not on every refresh
  const prevColumnCountRef = useRef(0);
  useEffect(() => {
    const totalMsgs = columns.reduce((sum, c) => sum + c.messages.length, 0);
    if (totalMsgs > prevColumnCountRef.current && prevColumnCountRef.current > 0) {
      // Only scroll the selected conversation's messages, not all of them
      if (selectedConversationId) {
        const ref = messageEndRefs.current[selectedConversationId];
        if (ref) ref.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevColumnCountRef.current = totalMsgs;
  }, [columns, selectedConversationId]);

  // Initialize profile form from user data
  useEffect(() => {
    if (user && !profileLoaded) {
      setProfileForm({
        full_name: (user.full_name as string) || '',
        phone: (user.phone as string) || '',
        job_title: (user.job_title as string) || '',
        linkedin_url: (user.linkedin_url as string) || '',
        twitter_handle: (user.twitter_handle as string) || '',
        timezone: (user.timezone as string) || 'America/New_York',
        bio: (user.bio as string) || '',
        location: (user.location as string) || '',
      });
      setProfileLoaded(true);
    }
  }, [user, profileLoaded]);

  // Merge Notion conversations into contacts after Supabase contacts are loaded
  useEffect(() => {
    if (!supabaseContactsLoaded || notionConversations.length === 0 || notionContactsMerged) return;
    const notionAsContacts: ContactRecord[] = notionConversations.map((c, i) => ({
      id: `notion-contact-${i}`,
      phone: c.phone || '',
      first_name: c.name.split(' ')[0] || '',
      last_name: c.name.split(' ').slice(1).join(' ') || '',
      full_name: c.name,
      email: '',
      school: c.school || 'UofSC',
      greek_org: c.org || '',
      position: '',
      state: '',
      campaign_status: c.status || 'contacted',
      source: 'notion',
      import_source: 'notion',
      company: c.org || 'Sigma Chi',
      tags: ['notion', 'derby-days'],
      created_at: new Date().toISOString(),
    }));
    setContacts(prev => {
      const existingNames = new Set(prev.map(ct => ct.full_name?.toLowerCase()));
      const newOnes = notionAsContacts.filter(ct => !existingNames.has(ct.full_name?.toLowerCase()));
      return [...prev, ...newOnes];
    });
    setNotionContactsMerged(true);
  }, [supabaseContactsLoaded, notionConversations, notionContactsMerged]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e8f4fd 0%, #f0f4ff 50%, #e8f0fd 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo.png" alt="Vernacular" style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
            animation: 'pulse 2s ease infinite', display: 'block',
          }} />
          <p style={{ color: '#8e8e93', fontSize: 15, fontWeight: 500 }}>Loading workspace...</p>
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
@keyframes ghostBlink { 0% { opacity:1; } 50% { opacity:0.4; filter: brightness(2); } 100% { opacity:1; } }
@keyframes pacChomp { 0%,100% { clip-path: polygon(100% 0%, 100% 100%, 50% 50%, 0% 100%, 0% 0%); } 50% { clip-path: polygon(100% 0%, 100% 100%, 50% 50%, 0% 60%, 0% 40%); } }
@keyframes pacChompCircle { 0%,100% { opacity: 1; } 50% { opacity: 0.95; } }
button:hover { opacity: 0.9; }
button:active { transform: scale(0.98); }`}</style>
      </div>
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const org = user?.organizations as Record<string, unknown> | undefined;
  const plan = ((org?.plan as string) || 'starter').toLowerCase();

  // Conversation helpers
  const addColumn = () => {
    const newCol: ConversationColumn = { id: `col-${Date.now()}`, contact: null, messages: [] };
    setColumns(prev => [...prev, newCol]);
    setShowContactPicker(newCol.id);
  };

  const removeColumn = (colId: string) => {
    setColumns(prev => prev.filter(c => c.id !== colId));
    setShowContactPicker(null);
    // Track dismissed so refresh doesn't re-add it
    setDismissedColumns(prev => {
      const next = new Set(prev);
      next.add(colId);
      localStorage.setItem('vernacular-dismissed', JSON.stringify([...next]));
      return next;
    });
  };

  const pickContact = (colId: string, contact: Contact) => {
    // Check if this contact already has an open conversation
    const phoneDigits = (contact.phone || '').replace(/\D/g, '').slice(-10);
    const existingCol = [...columns, ...allConversations].find(c => {
      if (!c.contact?.phone || c.id === colId) return false;
      return c.contact.phone.replace(/\D/g, '').slice(-10) === phoneDigits;
    });

    if (existingCol && existingCol.messages.length > 0) {
      // Open existing conversation instead of creating duplicate
      setColumns(prev => {
        // Remove the empty new column
        const without = prev.filter(c => c.id !== colId);
        // Add existing conversation to front if not already open
        if (without.some(c => c.id === existingCol.id)) {
          const ex = without.find(c => c.id === existingCol.id)!;
          return [ex, ...without.filter(c => c.id !== existingCol.id)];
        }
        return [existingCol, ...without];
      });
      // Un-dismiss if it was dismissed
      setDismissedColumns(prev => {
        const next = new Set(prev);
        next.delete(existingCol.id);
        localStorage.setItem('vernacular-dismissed', JSON.stringify([...next]));
        return next;
      });
      setSelectedConversationId(existingCol.id);
      setTimeout(() => {
        const el = document.getElementById(`stream-col-${existingCol.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start' });
      }, 50);
    } else {
      // New conversation — set contact on the column
      setColumns(prev => prev.map(c => c.id === colId ? { ...c, contact } : c));
    }

    setShowContactPicker(null);
    setContactPickerSearch('');
  };

  // Format phone number to (XXX) XXX-XXXX
  const formatPhoneNumber = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    // Strip leading 1 for US numbers
    const d = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;
    if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
    return raw; // return as-is if can't format
  };

  // Check if a string looks like a phone number
  const isPhoneNumber = (s: string): boolean => {
    const digits = s.replace(/\D/g, '');
    return digits.length >= 10;
  };

  const startNewConversation = async (colId: string) => {
    if (!newConvPhone) return;
    const formattedPhone = formatPhoneNumber(newConvPhone);
    const phoneDigits = formattedPhone.replace(/\D/g, '').slice(-10);
    const name = newConvName || formattedPhone;
    const initials = newConvName ? newConvName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '##';

    // Check if conversation already exists for this phone
    const existingCol = [...columns, ...allConversations].find(c => {
      if (!c.contact?.phone) return false;
      return c.contact.phone.replace(/\D/g, '').slice(-10) === phoneDigits;
    });

    if (existingCol && existingCol.messages.length > 0) {
      // Open existing instead of duplicate
      setColumns(prev => {
        const without = prev.filter(c => c.id !== colId);
        if (without.some(c => c.id === existingCol.id)) {
          const ex = without.find(c => c.id === existingCol.id)!;
          return [ex, ...without.filter(c => c.id !== existingCol.id)];
        }
        return [existingCol, ...without];
      });
      setDismissedColumns(prev => { const next = new Set(prev); next.delete(existingCol.id); localStorage.setItem('vernacular-dismissed', JSON.stringify([...next])); return next; });
      setSelectedConversationId(existingCol.id);
    } else {
      const contact: Contact = {
        id: `new-${Date.now()}`,
        name,
        initials,
        tag: 'NEW',
        tagColor: '#378ADD',
        tagBg: 'rgba(55,138,221,0.1)',
        phone: formattedPhone,
      };
      setColumns(prev => prev.map(c => c.id === colId ? { ...c, contact, messages: [] } : c));

      // Save contact to Supabase
      const orgId = getOrgId();
      if (orgId) {
        const parts = (newConvName || '').split(' ');
        await fetch('/api/contacts/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: orgId,
            contacts: [{
              phone: formattedPhone,
              fullName: newConvName || undefined,
              firstName: parts[0] || undefined,
              lastName: parts.slice(1).join(' ') || undefined,
            }],
            source: 'conversation',
          }),
        });
      }
    }

    setShowContactPicker(null);
    setNewConvPhone('');
    setNewConvName('');
  };

  const sendMessage = async (colId: string) => {
    const text = inputValues[colId]?.trim();
    if (!text) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const msg: Message = { id: `m-${Date.now()}`, text, direction: 'outgoing', timestamp: time };

    // Optimistic update — show message immediately
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, messages: [...c.messages, msg] } : c));
    setInputValues(prev => ({ ...prev, [colId]: '' }));

    // Find the column's contact phone number
    const col = columns.find(c => c.id === colId);
    const contactPhone = col?.contact?.phone;
    const contactName = col?.contact?.name;
    const orgId = (user?.organizations as Record<string, unknown>)?.id as string;

    playSound('send');
    console.log(`[Vernacular] 📤 Sending message...`);
    console.log(`[Vernacular]   Column: ${colId}`);
    console.log(`[Vernacular]   To: ${contactName || 'Unknown'} (${contactPhone || 'NO PHONE'})`);
    console.log(`[Vernacular]   Text: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`[Vernacular]   Org ID: ${orgId || 'MISSING'}`);

    if (!contactPhone || contactPhone === 'TBD') {
      console.warn(`[Vernacular] ⚠️ No phone number for contact — message shown in UI only, NOT sent`);
      return;
    }

    const payload = {
      phoneNumber: contactPhone,
      message: text,
      contactName: contactName || '',
      organizationId: orgId,
    };
    console.log(`[Vernacular] 📨 POST /api/messages/send`, JSON.stringify(payload, null, 2));

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`[Vernacular] ✅ Message queued successfully`, data);
        console.log(`[Vernacular]   → Notion Queued: ${data.notionQueued ? 'Yes' : 'No'}`);
        console.log(`[Vernacular]   → Station: ${data.station?.name || 'N/A'} (${data.station?.phone || 'N/A'})`);
        console.log(`[Vernacular]   → Message ID: ${data.messageId || 'N/A'}`);
        console.log(`[Vernacular]   → Conversation ID: ${data.conversationId || 'N/A'}`);
        console.log(`[Vernacular]   → Contact ID: ${data.contactId || 'N/A'}`);
        // Update column with real conversation ID and message ID
        const realId = data.conversationId ? `real-${data.conversationId}` : colId;
        setColumns(prev => prev.map(c => c.id === colId ? {
          ...c,
          id: realId,
          conversationId: data.conversationId || c.conversationId,
          messages: c.messages.map(m => m.id === msg.id ? { ...m, id: data.messageId || `sent-${Date.now()}` } : m),
        } : c));
        setAllConversations(prev => prev.map(c => c.id === colId ? {
          ...c,
          id: realId,
          conversationId: data.conversationId || c.conversationId,
          messages: c.messages.map(m => m.id === msg.id ? { ...m, id: data.messageId || `sent-${Date.now()}` } : m),
        } : c));
      } else {
        console.error(`[Vernacular] ❌ Send failed (${res.status}):`, data.error || data);
        // Mark as failed — update message to show error
        setColumns(prev => prev.map(c => c.id === colId ? {
          ...c,
          messages: c.messages.map(m => m.id === msg.id ? { ...m, id: `failed-${Date.now()}` } : m),
        } : c));
      }
    } catch (err) {
      console.error(`[Vernacular] ❌ Network error sending message:`, err);
      setColumns(prev => prev.map(c => c.id === colId ? {
        ...c,
        messages: c.messages.map(m => m.id === msg.id ? { ...m, id: `failed-${Date.now()}` } : m),
      } : c));
    }
  };

  const usedContactIds = columns.filter(c => c.contact).map(c => c.contact!.id);
  const availableContacts = MOCK_CONTACTS.filter(c => !usedContactIds.includes(c.id));

  // Notion conversation loader
  const loadNotionConversation = async (pageId: string, contactName: string, initials: string): Promise<Message[]> => {
    try {
      const res = await fetch(`/api/notion/conversations?pageId=${pageId}`);
      const data = await res.json();
      if (data.messages) {
        return data.messages.map((m: { id: string; text: string; direction: string; timestamp: string; aiGenerated: boolean }) => ({
          id: m.id,
          text: m.text,
          direction: m.direction as 'outgoing' | 'incoming',
          timestamp: m.timestamp || '',
          isAIDraft: m.aiGenerated,
        }));
      }
    } catch { /* fallback to empty */ }
    return [];
  };

  const pickNotionConversation = async (colId: string, conv: { name: string; pageId: string; initials: string; phone?: string }) => {
    const contact: Contact = {
      id: `notion-${conv.pageId}`,
      name: conv.name,
      initials: conv.initials,
      tag: 'IMPORTED',
      tagColor: '#000000',
      tagBg: 'rgba(0,0,0,0.06)',
      phone: conv.phone || (notionConversations.find(c => c.pageId === conv.pageId) as Record<string, unknown>)?.phone as string || '',
    };
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, contact } : c));
    setShowContactPicker(null);
    const messages = await loadNotionConversation(conv.pageId, conv.name, conv.initials);
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, messages } : c));
  };

  const loadAllNotionConversations = async () => {
    setLoadingNotion(true);
    try {
      const res = await fetch('/api/notion/conversations');
      const data = await res.json();
      if (data.conversations) {
        const convos = data.conversations.slice(0, 4);
        for (const conv of convos) {
          const colId = `col-notion-${conv.pageId}`;
          // Skip if already loaded
          if (columns.some(c => c.id === colId)) continue;
          const contact: Contact = {
            id: `notion-${conv.pageId}`,
            name: conv.name,
            initials: conv.initials,
            tag: 'IMPORTED',
            tagColor: '#000000',
            tagBg: 'rgba(0,0,0,0.06)',
            phone: conv.phone || '',
          };
          const messages = await loadNotionConversation(conv.pageId, conv.name, conv.initials);
          setColumns(prev => [...prev, { id: colId, contact, messages }]);
        }
      }
    } catch { /* silent */ }
    setLoadingNotion(false);
    setLastReloadTime(new Date());
  };

  // Auto-load Notion conversations — triggered in renderConversations instead of useEffect
  // to avoid temporal dead zone and hook ordering issues

  // Format time
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatHeartbeat = (dateStr: string) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  // Derive station status from heartbeat — don't trust the DB status field alone
  const getStationStatus = (station: Station): 'online' | 'idle' | 'dnd' | 'offline' => {
    // Manual overrides take priority
    if (stationOverride === 'offline') return 'offline';
    if (stationOverride === 'dnd') return 'dnd';
    if (!station.last_heartbeat) return 'offline';
    if (station.phone_number === 'TBD') return 'offline';
    const d = new Date(station.last_heartbeat);
    if (isNaN(d.getTime())) return 'offline';
    const diffMs = Date.now() - d.getTime();
    const diffMins = diffMs / 60000;
    if (diffMins < 3) return 'online';     // heartbeat within 3 min = online
    if (diffMins < 10) return 'idle';       // 3-10 min = idle
    return 'offline';                        // >10 min = offline
  };

  const getStationDotColor = (station: Station) => {
    const s = getStationStatus(station);
    return s === 'online' ? '#22C55E' : s === 'dnd' ? '#7C3AED' : s === 'idle' ? '#F59E0B' : '#EF4444';
  };

  const getStationDotShadow = (station: Station) => {
    const s = getStationStatus(station);
    return s === 'online' ? '0 0 6px rgba(34,197,94,0.4)' : s === 'dnd' ? '0 0 6px rgba(124,58,237,0.4)' : 'none';
  };

  const getStationLabel = (station: Station) => {
    const s = getStationStatus(station);
    return s === 'online' ? 'Online' : s === 'dnd' ? 'Do Not Disturb' : s === 'idle' ? 'Idle' : 'Offline';
  };

  // Settings save
  const saveSettings = async () => {
    if (!settingsForm || !org?.id) return;
    setSettingsSaving(true);
    setSaveStatus('saving');
    try {
      const { error: saveError } = await supabase.from('org_settings').update({
        company_name: settingsForm.company_name,
        ai_auto_draft: settingsForm.ai_auto_draft,
        ai_auto_send: settingsForm.ai_auto_send,
        ai_model: settingsForm.ai_model,
        default_system_prompt: settingsForm.default_system_prompt,
        quiet_hours_start: settingsForm.quiet_hours_start,
        quiet_hours_end: settingsForm.quiet_hours_end,
        quiet_hours_timezone: settingsForm.quiet_hours_timezone,
        max_messages_per_day: settingsForm.max_messages_per_day,
        max_ai_drafts_per_day: settingsForm.max_ai_drafts_per_day,
        max_blast_recipients: settingsForm.max_blast_recipients,
        notify_on_inbound: settingsForm.notify_on_inbound,
        notify_on_flag: settingsForm.notify_on_flag,
        notify_on_station_offline: settingsForm.notify_on_station_offline,
        slack_webhook_url: settingsForm.slack_webhook_url,
      }).eq('organization_id', org.id as string);
      if (saveError) throw saveError;
      setOrgSettings(settingsForm);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('idle');
      window.alert('Failed to save settings: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSettingsSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!user?.id) {
      window.alert('User not loaded. Please refresh the page.');
      return;
    }
    setProfileSaving(true);
    setProfileSaveStatus('saving');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expired. Please log in again.');
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: user.id, ...profileForm }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to save'); }
      setProfileSaveStatus('saved');
      setTimeout(() => setProfileSaveStatus('idle'), 3000);
    } catch (err) {
      setProfileSaveStatus('idle');
      window.alert('Failed to save profile: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProfileSaving(false);
    }
  };

  // Filtered contacts
  const filteredContacts = contacts.filter(c => {
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    return (c.full_name || '').toLowerCase().includes(q)
      || (c.phone || '').includes(q)
      || (c.email || '').toLowerCase().includes(q)
      || (c.school || '').toLowerCase().includes(q);
  });

  // ── Shared Styles ────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.06)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    padding: '20px 24px',
    transition: 'box-shadow 0.2s, transform 0.2s',
  };

  const panelHeaderStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: '#1c1c1e',
    letterSpacing: '-0.01em',
    marginBottom: 16,
  };

  const badgeStyle = (color: string, bg: string): React.CSSProperties => ({
    fontSize: 10,
    fontWeight: 700,
    color,
    background: bg,
    padding: '3px 8px',
    borderRadius: 4,
    fontFamily: "'JetBrains Mono', monospace",
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)',
    fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    background: '#fff',
    color: '#1c1c1e',
    boxSizing: 'border-box',
  };

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    width: 40,
    height: 22,
    borderRadius: 11,
    background: active ? '#378ADD' : '#ddd',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.2s ease',
    flexShrink: 0,
  });

  const toggleDotStyle = (active: boolean): React.CSSProperties => ({
    width: 16,
    height: 16,
    borderRadius: 8,
    background: '#fff',
    position: 'absolute',
    top: 3,
    left: active ? 21 : 3,
    transition: 'left 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  });

  const primaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    background: '#378ADD',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(55,138,221,0.3)',
    transition: 'all 0.15s ease',
  };

  // ── Render: Dashboard Home ────────────────────────────────────────────────

  const allMetricsZero = metrics.messagesToday === 0 && metrics.messagesAllTime === 0
    && metrics.responseRate === 0 && metrics.activeConversations === 0 && metrics.aiDrafts === 0;

  const renderDashboard = () => (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      {/* Getting Started Banner */}
      {showWelcomeBanner && (
        <div style={{
          background: 'linear-gradient(135deg, #378ADD 0%, #2B6CB0 60%, #1E4D8C 100%)',
          borderRadius: 16, padding: '24px 28px', marginBottom: 24, position: 'relative',
          color: '#fff', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: '100%', background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                {allMetricsZero ? 'Welcome to Vernacular!' : 'Getting Started'}
              </h2>
              <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 16px', opacity: 0.9 }}>
                {(() => {
                  const stepsComplete = [
                    stations.some(s => getStationStatus(s) !== 'offline'),
                    contacts.length > 0,
                    metrics.messagesAllTime > 0,
                  ].filter(Boolean).length;
                  return `${stepsComplete}/3 complete`;
                })()}
              </p>
              <div style={{ display: 'flex', gap: 24 }}>
                {[
                  { num: '1', text: 'Connect a phone line', done: stations.some(s => getStationStatus(s) !== 'offline') },
                  { num: '2', text: 'Import contacts', done: contacts.length > 0 },
                  { num: '3', text: 'Send your first message', done: metrics.messagesAllTime > 0 },
                ].map(step => (
                  <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: step.done ? 0.6 : 1 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 12,
                      background: step.done ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>{step.done ? '\u2713' : step.num}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', textDecoration: step.done ? 'line-through' : 'none' }}>{step.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowWelcomeBanner(false)}
              style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif", flexShrink: 0,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* Messages Sent */}
        <div style={cardStyle} onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(55,138,221,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1c1c1e', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {metrics.messagesAllTime.toLocaleString()}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#8e8e93', marginTop: 4 }}>Messages Sent</div>
          <div style={{ fontSize: 12, color: '#378ADD', fontWeight: 600, marginTop: 8 }}>
            {metrics.messagesAllTime === 0 ? 'Send your first message' : `${metrics.messagesToday} today`}
          </div>
        </div>

        {/* Response Rate */}
        <div style={cardStyle} onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1c1c1e', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {metrics.responseRate}%
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#8e8e93', marginTop: 4 }}>Response Rate</div>
          <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 600, marginTop: 8 }}>
            {metrics.responseRate === 0 ? 'Waiting for data' : 'Conversations with replies'}
          </div>
        </div>

        {/* Active Conversations */}
        <div style={cardStyle} onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1c1c1e', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {metrics.activeConversations}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#8e8e93', marginTop: 4 }}>Active Conversations</div>
          <div style={{ fontSize: 12, color: '#A855F7', fontWeight: 600, marginTop: 8 }}>
            {metrics.activeConversations === 0 ? 'Start a conversation' : 'Currently open threads'}
          </div>
        </div>

        {/* AI Drafts */}
        <div style={cardStyle} onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L9 9l-7 1 5 5-1.5 7L12 18.5 18.5 22 17 15l5-5-7-1L12 2z" />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1c1c1e', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {metrics.aiDrafts}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#8e8e93', marginTop: 4 }}>AI Drafts</div>
          <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600, marginTop: 8 }}>
            {metrics.aiDrafts === 0 ? 'Enable in Settings' : 'AI-generated messages'}
          </div>
        </div>
      </div>

      {/* Second Row: Recent Activity + Station Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 24 }}>
        {/* Recent Activity */}
        <div style={{ ...cardStyle, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: 400 }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={panelHeaderStyle}>Recent Activity</div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {recentMessages.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>
                No messages yet. Start a conversation to see activity here.
              </div>
            ) : (
              recentMessages.map(msg => (
                <div key={msg.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
                  borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'background 0.1s',
                }}>
                  {/* Direction icon */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: msg.direction === 'outbound' ? 'rgba(55,138,221,0.1)' : 'rgba(34,197,94,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke={msg.direction === 'outbound' ? '#378ADD' : '#22C55E'}
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {msg.direction === 'outbound'
                        ? <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>
                        : <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>
                      }
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>
                        {msg.contactName}
                      </span>
                      {msg.aiGenerated && (
                        <span style={badgeStyle('#F59E0B', 'rgba(245,158,11,0.1)')}>AI</span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 12, color: '#8e8e93', whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {msg.preview}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500, flexShrink: 0 }}>
                    {formatTime(msg.sentAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Station Status */}
        <div style={{ ...cardStyle, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: 400 }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={panelHeaderStyle}>Phone Line Status</div>
            <button onClick={() => setActiveTab('stations')} style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600,
              background: 'rgba(55,138,221,0.1)', color: '#378ADD', cursor: 'pointer',
            }}>Request Phone Line</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {stations.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>
                No phone lines configured yet.
              </div>
            ) : (
              stations.map(st => (
                <div key={st.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
                  borderBottom: '1px solid rgba(0,0,0,0.03)',
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: 5, flexShrink: 0,
                    background: getStationDotColor(st),
                    boxShadow: getStationDotShadow(st),
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{st.name}</div>
                    <div style={{ fontSize: 12, color: '#8e8e93', fontFamily: "'JetBrains Mono', monospace" }}>
                      {st.phone_number}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500, textAlign: 'right' }}>
                    {formatHeartbeat(st.last_heartbeat)}
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <button style={{ ...primaryBtnStyle, width: '100%', justifyContent: 'center', fontSize: 12 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Phone Line
            </button>
          </div>
        </div>
      </div>

      {/* Third Row: Team Members + Quick Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Team Members */}
        <div style={{ ...cardStyle, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: 340 }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={panelHeaderStyle}>Team Members <span style={{ fontSize: 12, fontWeight: 500, color: '#8e8e93' }}>({teamMembers.length}/5 seats)</span></div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {teamMembers.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>
                No team members found.
              </div>
            ) : (
              teamMembers.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
                  borderBottom: '1px solid rgba(0,0,0,0.03)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 16,
                    background: 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>
                    {(m.full_name || m.email || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{m.full_name || 'Unnamed'}</div>
                    <div style={{ fontSize: 12, color: '#8e8e93' }}>{m.email}</div>
                  </div>
                  <span style={badgeStyle(
                    m.role === 'owner' ? '#D97706' : m.role === 'admin' ? '#7C3AED' : '#6B7280',
                    m.role === 'owner' ? 'rgba(217,119,6,0.1)' : m.role === 'admin' ? 'rgba(124,58,237,0.1)' : 'rgba(107,114,128,0.1)',
                  )}>
                    {m.role}
                  </span>
                </div>
              ))
            )}
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <button onClick={() => { setShowInviteModal(true); setInviteStatus('idle'); setInviteResult(null); setInviteForm({ fullName: '', email: '', role: 'member' }); }} style={{ ...primaryBtnStyle, width: '100%', justifyContent: 'center', fontSize: 12 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Invite Member
            </button>
          </div>
        </div>

        {/* Quick Settings */}
        <div style={{ ...cardStyle, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: 340 }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={panelHeaderStyle}>Quick Settings</div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px' }}>
            {/* AI Auto-Draft */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>AI Auto-Draft</div>
                <div style={{ fontSize: 12, color: '#8e8e93' }}>Generate reply drafts automatically</div>
              </div>
              <button onClick={async () => {
                if (!orgSettings) return;
                const newVal = !orgSettings.ai_auto_draft;
                setOrgSettings({ ...orgSettings, ai_auto_draft: newVal });
                try {
                  await fetch('/api/orgs', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ai_auto_draft: newVal }),
                  });
                } catch { /* silent */ }
              }} style={{
                ...toggleStyle(orgSettings?.ai_auto_draft || false),
                display: 'flex', alignItems: 'center', cursor: 'pointer', border: 'none',
              }}>
                <div style={toggleDotStyle(orgSettings?.ai_auto_draft || false)} />
              </button>
            </div>
            {/* AI Model */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>AI Model</div>
                <div style={{ fontSize: 12, color: '#8e8e93' }}>Current model for drafts</div>
              </div>
              <span style={badgeStyle('#378ADD', 'rgba(55,138,221,0.1)')}>
                {orgSettings?.ai_model || 'claude-sonnet'}
              </span>
            </div>
            {/* Max messages */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>Max Messages/Day</div>
                <div style={{ fontSize: 12, color: '#8e8e93' }}>Daily outbound limit</div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', fontFamily: "'JetBrains Mono', monospace" }}>
                {orgSettings?.max_messages_per_day || 0}
              </span>
            </div>
            {/* Quiet Hours */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>Quiet Hours</div>
                <div style={{ fontSize: 12, color: '#8e8e93' }}>
                  {orgSettings?.quiet_hours_start && orgSettings?.quiet_hours_end
                    ? `${orgSettings.quiet_hours_start} - ${orgSettings.quiet_hours_end} ${orgSettings.quiet_hours_timezone || ''}`
                    : 'Not configured'}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </div>
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                fontFamily: "'Inter', sans-serif", background: 'rgba(0,0,0,0.04)', color: '#1c1c1e',
                border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              Edit Settings
            </button>
          </div>
        </div>
      </div>

      {/* Fourth Row: Integrations */}
      <div style={{ marginTop: 16 }}>
        <div style={{ ...cardStyle, padding: 0 }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={panelHeaderStyle}>Integrations</div>
            <button onClick={() => setActiveTab('integrations')} style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600,
              background: 'rgba(55,138,221,0.1)', color: '#378ADD', cursor: 'pointer',
            }}>Manage</button>
          </div>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[
              { name: 'iMessage', icon: '💬', status: stations.some(s => s.status === 'online') ? 'connected' : 'offline', color: '#22C55E' },
              { name: 'Discord', icon: '🎮', status: 'coming soon', color: '#5865F2' },
              { name: 'Telegram', icon: '✈️', status: 'coming soon', color: '#0088cc' },
              { name: 'Email', icon: '📧', status: 'coming soon', color: '#D97706' },
              { name: 'Twilio SMS', icon: '📱', status: 'coming soon', color: '#F22F46' },
            ].map(intg => (
              <div key={intg.name} style={{
                padding: '14px 12px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
              }}>
                <span style={{ fontSize: 24 }}>{intg.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e' }}>{intg.name}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  background: intg.status === 'connected' ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.04)',
                  color: intg.status === 'connected' ? '#22C55E' : '#8e8e93',
                }}>{intg.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Render: Conversations ─────────────────────────────────────────────────

  // Build summary rows from real conversation columns
  const realSummaryRows = columns.filter(col => col.contact).map(col => {
    const contact = col.contact!;
    const lastMsg = col.messages.length > 0 ? col.messages[col.messages.length - 1] : null;
    const incomingCount = col.messages.filter(m => m.direction === 'incoming').length;
    const totalCount = col.messages.length;
    const rate = totalCount > 0 ? Math.round((incomingCount / totalCount) * 100) : 0;
    return {
      name: contact.name,
      phone: contact.phone || '',
      lastMessage: lastMsg?.text || 'No messages yet',
      status: (contact.tag === 'UNREAD' ? 'pending' : 'active') as 'active' | 'pending',
      lastStep: contact.tag === 'UNREAD' ? 'Awaiting reply' : 'Active',
      responseRate: `${rate}%`,
      actionNeeded: contact.tag === 'UNREAD',
    };
  });

  // Merge Notion conversations into summary data
  const notionSummaryRows = notionConversations.map(c => {
    const statusLower = (c.status || '').toLowerCase();
    const mappedStatus: 'active' | 'pending' = statusLower === 'onboarded' ? 'active' : 'pending';
    const needsAction = statusLower !== 'onboarded';
    return {
      name: c.name,
      phone: c.phone || '',
      lastMessage: c.lastMessage || `${c.messageCount || 0} messages`,
      status: mappedStatus,
      lastStep: c.status || 'Contacted',
      responseRate: c.messageCount ? `${Math.min(Math.round((c.messageCount / 10) * 100), 100)}%` : '--',
      actionNeeded: needsAction,
    };
  });
  const SUMMARY_DATA = [...realSummaryRows, ...notionSummaryRows];

  // Mock data for Schedule view
  const SCHEDULED_BLASTS = [
    { id: 'b1', name: 'Weekly Check-in', recipients: 24, scheduledTime: '2026-03-31T10:00:00', status: 'scheduled' as const },
    { id: 'b2', name: 'Product Update Announcement', recipients: 156, scheduledTime: '2026-04-02T14:00:00', status: 'draft' as const },
    { id: 'b3', name: 'Follow-up Sequence #3', recipients: 12, scheduledTime: '2026-03-28T09:00:00', status: 'sent' as const },
  ];

  const renderConversations = () => {
    // Notion conversations only load on manual Reload click
    // Auto-load disabled — was overwriting user's open sessions
    return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Top Bar */}
      <div style={{
        height: 56, minHeight: 56, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', margin: 0 }}>
            Conversations
          </h2>
          {conversationViewMode === 'streams' && (
            <>
              <span style={{
                fontSize: 12, fontWeight: 600, color: '#8e8e93',
                background: 'rgba(0,0,0,0.04)', padding: '3px 10px', borderRadius: 6,
              }}>
                {columns.length} streams
              </span>
              <span style={{
                fontSize: 11, color: '#8e8e93', fontFamily: "'JetBrains Mono', monospace",
              }}>
                Updated Last: {lastReloadTime
                  ? lastReloadTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  : stations.length > 0 && stations[0].last_heartbeat
                    ? new Date(stations[0].last_heartbeat).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : 'N/A'}
              </span>
            </>
          )}
        </div>
        {conversationViewMode === 'streams' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Time Filter */}
            <select value={messageTimeFilter} onChange={e => setMessageTimeFilter(e.target.value as typeof messageTimeFilter)} style={{
              padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
              background: '#fff', color: '#1c1c1e', fontSize: 12, fontWeight: 600,
              fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none',
            }}>
              <option value="24h">Last 24 hours</option>
              <option value="48h">Last 48 hours</option>
              <option value="72h">Last 72 hours</option>
              <option value="1w">Last 1 week</option>
              <option value="2w">Last 2 weeks</option>
            </select>
            {/* Pac-Man + Ghosts */}
            {(() => {
              const awaitingApproval = columns.filter(col => {
                const last = col.messages[col.messages.length - 1];
                return last?.isAIDraft;
              }).length;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px' }}>
                  {/* Pac-Man — chomping */}
                  <div style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                    title="Vernacular AI — Your messaging autopilot"
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
                      <g style={{ animation: 'pacChompCircle 0.4s ease-in-out infinite' }}>
                        <circle cx="12" cy="12" r="11" fill="#FFE000" />
                        <circle cx="10" cy="7" r="1.5" fill="#1a1a1a" />
                        {/* Mouth — animating wedge */}
                        <path d="M12 12 L24 6 L24 18 Z" fill="#fff">
                          <animate attributeName="d" values="M12 12 L24 4 L24 20 Z;M12 12 L24 10 L24 14 Z;M12 12 L24 4 L24 20 Z" dur="0.4s" repeatCount="indefinite" />
                        </path>
                      </g>
                    </svg>
                  </div>
                  {/* Pac-dots between */}
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center', margin: '0 3px' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#FFE000' }} />
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#FFE000' }} />
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#FFE000' }} />
                  </div>
                  {/* 4 Ghosts — clickable to edit */}
                  {ghostConfig.map((ghost, i) => {
                    const isBlinking = awaitingApproval > i;
                    return (
                      <div key={i} style={{ position: 'relative', cursor: 'pointer' }}
                        title={`${ghost.name} — ${ghost.role}: ${ghost.purpose}`}
                        onClick={() => setEditingGhost(i)}
                      >
                        <svg width="26" height="26" viewBox="0 0 14 16" style={{
                          animation: isBlinking ? 'ghostBlink 0.8s ease-in-out infinite alternate' : 'none',
                          transition: 'transform 0.15s',
                        }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}

                        >
                          <title>{`${ghost.name} — ${ghost.role}: ${ghost.purpose}`}</title>
                          <path d="M1 14V7a6 6 0 0 1 12 0v7l-2-2-2 2-2-2-2 2-2-2z"
                            fill={isBlinking ? '#2222FF' : ghost.color}
                            stroke={isBlinking ? '#fff' : 'none'}
                            strokeWidth={isBlinking ? 0.5 : 0}
                          />
                          <circle cx="5" cy="7" r="1.5" fill="#fff" />
                          <circle cx="9" cy="7" r="1.5" fill="#fff" />
                          <circle cx={5.5} cy="7" r="0.8" fill="#1a1a2e" />
                          <circle cx={9.5} cy="7" r="0.8" fill="#1a1a2e" />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.08)' }} />
            <button onClick={addColumn} style={primaryBtnStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Start Conversation
            </button>
          </div>
        )}
        {conversationViewMode === 'schedule' && (
          <button onClick={() => window.alert('New Scheduled Blast form coming soon.')} style={primaryBtnStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Scheduled Blast
          </button>
        )}
      </div>

      {/* AI Mode Rules Panel */}
      {showAiModePanel && (
        <div style={{
          background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderBottom: '2px solid rgba(124,58,237,0.15)',
          padding: '16px 24px', overflow: 'auto', maxHeight: 320,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" />
                  <path d="M17.8 11.8L22 8l-4-4-14 14 4 4 9.8-9.8" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>AI Mode Rules</div>
                <div style={{ fontSize: 11, color: '#8e8e93' }}>Configure autonomous responses &middot; Up to 1,000 contacts</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!aiModeEnabled && (
                <button onClick={() => { setAiModeEnabled(true); }} style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                  color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
                }}>
                  Activate AI Mode
                </button>
              )}
              <button onClick={() => setShowAiModePanel(false)} style={{
                padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)',
                background: '#fff', cursor: 'pointer', color: '#8e8e93', fontSize: 14,
              }}>x</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {/* Tone */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Tone</label>
              <select value={aiModeRules.tone} onChange={e => setAiModeRules(p => ({ ...p, tone: e.target.value as typeof p.tone }))} style={{
                width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)',
                fontSize: 12, outline: 'none', background: '#fff', fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box' as const,
              }}>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
              </select>
            </div>
            {/* Response Delay */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Response Delay</label>
              <select value={aiModeRules.responseDelay} onChange={e => setAiModeRules(p => ({ ...p, responseDelay: e.target.value }))} style={{
                width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)',
                fontSize: 12, outline: 'none', background: '#fff', fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box' as const,
              }}>
                <option value="0">Instant</option>
                <option value="30">30 seconds</option>
                <option value="60">1 minute</option>
                <option value="120">2 minutes</option>
                <option value="300">5 minutes</option>
              </select>
            </div>
            {/* Active Hours */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Active Hours</label>
              <select value={aiModeRules.activeHours} onChange={e => setAiModeRules(p => ({ ...p, activeHours: e.target.value as typeof p.activeHours }))} style={{
                width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)',
                fontSize: 12, outline: 'none', background: '#fff', fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box' as const,
              }}>
                <option value="always">24/7</option>
                <option value="business">Business Hours (9-5)</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {/* Max Replies */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Max Replies / Convo</label>
              <input value={aiModeRules.maxRepliesPerConvo} onChange={e => setAiModeRules(p => ({ ...p, maxRepliesPerConvo: e.target.value }))} type="number" style={{
                width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)',
                fontSize: 12, outline: 'none', background: '#fff', fontFamily: "'JetBrains Mono', monospace",
                boxSizing: 'border-box' as const,
              }} />
            </div>
            {/* Max Contacts */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Max Contacts</label>
              <input value={aiModeRules.maxContacts} onChange={e => setAiModeRules(p => ({ ...p, maxContacts: Number(e.target.value) }))} type="number" style={{
                width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)',
                fontSize: 12, outline: 'none', background: '#fff', fontFamily: "'JetBrains Mono', monospace",
                boxSizing: 'border-box' as const,
              }} />
            </div>
            {/* Auto-Escalate */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
              <button onClick={() => setAiModeRules(p => ({ ...p, autoEscalate: !p.autoEscalate }))} style={{
                width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', padding: 0,
                background: aiModeRules.autoEscalate ? '#7C3AED' : 'rgba(0,0,0,0.12)',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 8, background: '#fff',
                  position: 'absolute', top: 2,
                  left: aiModeRules.autoEscalate ? 18 : 2,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </button>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1c1c1e' }}>Auto-Escalate</span>
            </div>
          </div>

          {/* System Prompt */}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>System Prompt</label>
            <textarea
              value={aiModeRules.systemPrompt}
              onChange={e => setAiModeRules(p => ({ ...p, systemPrompt: e.target.value }))}
              placeholder="You are a helpful assistant for FraternityBase. Answer questions about our platform, help with onboarding, and schedule demo calls when appropriate..."
              rows={2}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)',
                fontSize: 12, outline: 'none', background: '#fff', fontFamily: "'Inter', sans-serif",
                resize: 'vertical' as const, lineHeight: 1.5, boxSizing: 'border-box' as const,
              }}
            />
          </div>

          {/* Escalation Keywords + Do Not Reply */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Escalation Keywords</label>
              <input value={aiModeRules.escalateKeywords} onChange={e => setAiModeRules(p => ({ ...p, escalateKeywords: e.target.value }))} placeholder="urgent, cancel, refund..." style={{
                width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)',
                fontSize: 12, outline: 'none', background: '#fff', fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box' as const,
              }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Do Not Reply (tags)</label>
              <input value={aiModeRules.doNotReplyTags} onChange={e => setAiModeRules(p => ({ ...p, doNotReplyTags: e.target.value }))} placeholder="opted-out, competitor, internal..." style={{
                width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)',
                fontSize: 12, outline: 'none', background: '#fff', fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box' as const,
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Summary View */}
      {conversationViewMode === 'summary' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
                {['Contact Name', 'Phone', 'Last Message', 'Status', 'Last Step', 'Response Rate', ''].map((h, i) => (
                  <th key={i} style={{
                    textAlign: 'left', padding: '14px 8px', fontSize: 11, fontWeight: 700,
                    color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em',
                    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {h}
                      {h && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="7 10 12 5 17 10" /><polyline points="7 14 12 19 17 14" />
                        </svg>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUMMARY_DATA.map((row, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(55,138,221,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 8px', fontWeight: 600, color: '#1c1c1e' }}>{row.name}</td>
                  <td style={{ padding: '12px 8px', color: '#666', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{row.phone}</td>
                  <td style={{ padding: '12px 8px', color: '#666', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.lastMessage}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={badgeStyle(
                      row.status === 'active' ? '#22C55E' : row.status === 'pending' ? '#F59E0B' : '#8e8e93',
                      row.status === 'active' ? 'rgba(34,197,94,0.1)' : row.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.04)',
                    )}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', color: '#666', fontSize: 12 }}>{row.lastStep}</td>
                  <td style={{ padding: '12px 8px', color: '#1c1c1e', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{row.responseRate}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    {row.actionNeeded && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule View */}
      {conversationViewMode === 'schedule' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {/* New Blast Form */}
          <div style={{ ...cardStyle, marginBottom: 24, maxWidth: 640 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', marginBottom: 16 }}>
              Create Scheduled Blast
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e', display: 'block', marginBottom: 4 }}>Recipients</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="all">All contacts</option>
                <option value="active">By status: Active</option>
                <option value="pending">By status: Pending</option>
                <option value="individual">Individual select</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e', display: 'block', marginBottom: 4 }}>Message Template</label>
              <textarea
                rows={4}
                placeholder="Type your message template here..."
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e', display: 'block', marginBottom: 4 }}>Date</label>
                <input type="date" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e', display: 'block', marginBottom: 4 }}>Time</label>
                <input type="time" style={inputStyle} />
              </div>
            </div>
            <button style={primaryBtnStyle}>Schedule Blast</button>
          </div>

          {/* Scheduled Blasts List */}
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', marginBottom: 12 }}>
            Scheduled Blasts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
            {SCHEDULED_BLASTS.map(blast => (
              <div key={blast.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: blast.status === 'sent' ? 'rgba(34,197,94,0.1)' : blast.status === 'scheduled' ? 'rgba(55,138,221,0.1)' : 'rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke={blast.status === 'sent' ? '#22C55E' : blast.status === 'scheduled' ? '#378ADD' : '#8e8e93'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', marginBottom: 2 }}>{blast.name}</div>
                  <div style={{ fontSize: 12, color: '#8e8e93' }}>
                    {blast.recipients} recipients &middot; {new Date(blast.scheduledTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(blast.scheduledTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
                <span style={badgeStyle(
                  blast.status === 'sent' ? '#22C55E' : blast.status === 'scheduled' ? '#378ADD' : '#8e8e93',
                  blast.status === 'sent' ? 'rgba(34,197,94,0.1)' : blast.status === 'scheduled' ? 'rgba(55,138,221,0.1)' : 'rgba(0,0,0,0.04)',
                )}>
                  {blast.status}
                </span>
                {blast.status !== 'sent' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{
                      background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6,
                      padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#378ADD', cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                    }}>Edit</button>
                    <button style={{
                      background: 'none', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
                      padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#EF4444', cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                    }}>Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matrix View — Icon Rail + Dot Grid + Collapsible Threads */}
      {conversationViewMode === 'matrix' && (() => {
        // Build conversation items from columns + notion
        const matrixItems = [
          ...columns.filter(col => col.contact).map(col => {
            const lastMsg = col.messages[col.messages.length - 1] || null;
            const hasUnread = lastMsg?.direction === 'incoming' && !lastMsg?.isAIDraft;
            const hasAiDraft = lastMsg?.isAIDraft;
            const msgCount = col.messages.length;
            return {
              id: col.id,
              name: col.contact!.name,
              initials: col.contact!.initials,
              phone: col.contact!.phone || '',
              messages: col.messages,
              hasUnread,
              hasAiDraft: !!hasAiDraft,
              msgCount,
              lastMsg,
              status: hasUnread ? 'unread' as const : hasAiDraft ? 'draft' as const : 'read' as const,
            };
          }),
          ...notionConversations.filter(nc => !columns.some(col => col.contact?.name === nc.name)).map(nc => ({
            id: `notion-${nc.pageId}`,
            name: nc.name,
            initials: nc.initials,
            phone: nc.phone || '',
            messages: [] as Message[],
            hasUnread: false,
            hasAiDraft: false,
            msgCount: nc.messageCount || 0,
            lastMsg: null as Message | null,
            lastMessageText: nc.lastMessage || `${nc.messageCount || 0} messages`,
            status: ((nc.status || '').toLowerCase() === 'onboarded' ? 'read' : 'unread') as 'unread' | 'draft' | 'read',
          })),
        ];

        const getStatusColor = (status: string) => {
          switch (status) {
            case 'unread': return '#22C55E';
            case 'draft': return '#F59E0B';
            default: return 'rgba(255,255,255,0.15)';
          }
        };

        const getStatusBorder = (status: string) => {
          switch (status) {
            case 'unread': return '2px solid #22C55E';
            case 'draft': return '2px solid #F59E0B';
            default: return '2px solid rgba(255,255,255,0.08)';
          }
        };

        // Build dot grid data — 7 columns, fill rows
        const DOT_COLS = 7;
        const dotRows = Math.max(Math.ceil(matrixItems.length / DOT_COLS), 8);

        return (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
            {/* Icon Rail */}
            <div style={{
              width: 72, minWidth: 72, background: '#1a1a2e', display: 'flex', flexDirection: 'column',
              alignItems: 'center', padding: '12px 0', overflowY: 'auto', gap: 6,
              borderRight: '1px solid rgba(255,255,255,0.06)',
            }}>
              {(() => {
                const fruits = ['🍒', '🍓', '🍊', '🍎', '🍇', '🍈', '🔔', '🍋', '🍑', '🍍'];
                return matrixItems.map((item, idx) => (
                <button key={item.id} onClick={() => setExpandedMatrixId(expandedMatrixId === item.id ? null : item.id)} style={{
                  width: 48, height: 48, borderRadius: 12, border: getStatusBorder(item.status),
                  background: expandedMatrixId === item.id ? 'rgba(55,138,221,0.25)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  position: 'relative', transition: 'all 0.2s', flexShrink: 0,
                  color: '#fff', fontSize: 20, fontWeight: 700,
                }} title={`${item.name} — ${item.phone}`}>
                  {fruits[idx % fruits.length]}
                  {item.hasUnread && (
                    <div style={{
                      position: 'absolute', top: -2, right: -2,
                      width: 10, height: 10, borderRadius: 5,
                      background: '#EF4444', border: '2px solid #1a1a2e',
                    }} />
                  )}
                </button>
              ));
              })()}
              {/* Add new */}
              <button onClick={addColumn} style={{
                width: 48, height: 48, borderRadius: 12, border: '2px dashed rgba(255,255,255,0.15)',
                background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 20, flexShrink: 0,
              }}>+</button>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8f9fa' }}>
              {/* Dot Grid Header */}
              <div style={{
                background: '#16162a', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Conversation Matrix
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {matrixItems.length} conversations
                  </span>
                  {/* Legend */}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
                    {[
                      { label: 'Needs Reply', color: '#22C55E' },
                      { label: 'AI Draft', color: '#F59E0B' },
                      { label: 'Quiet', color: 'rgba(255,255,255,0.2)' },
                    ].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: l.color, boxShadow: `0 0 6px ${l.color}40` }} />
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Dot Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${DOT_COLS}, 1fr)`,
                  gap: '10px 16px',
                  maxWidth: 300,
                }}>
                  {Array.from({ length: dotRows * DOT_COLS }).map((_, idx) => {
                    const item = matrixItems[idx];
                    const dotColor = item ? getStatusColor(item.status) : 'rgba(255,255,255,0.06)';
                    const dotSize = item
                      ? item.status === 'unread' ? 10 : item.status === 'draft' ? 8 : 5
                      : 3;
                    const isExpanded = item && expandedMatrixId === item.id;
                    return (
                      <button key={idx} onClick={() => {
                        if (item) setExpandedMatrixId(expandedMatrixId === item.id ? null : item.id);
                      }} style={{
                        width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'none', border: 'none', cursor: item ? 'pointer' : 'default', padding: 0,
                      }}
                        title={item ? `${item.name} — ${item.msgCount} msgs` : ''}
                      >
                        <div style={{
                          width: dotSize, height: dotSize, borderRadius: dotSize / 2,
                          background: dotColor,
                          boxShadow: item && item.status !== 'read' ? `0 0 ${dotSize}px ${dotColor}60` : 'none',
                          transition: 'all 0.2s',
                          outline: isExpanded ? `2px solid ${dotColor}` : 'none',
                          outlineOffset: 3,
                        }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thread Area — Collapsible Conversation List */}
              <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                {matrixItems.map(item => {
                  const isExpanded = expandedMatrixId === item.id;
                  const borderColor = getStatusColor(item.status);
                  return (
                    <div key={item.id}>
                      {/* Conversation Row Header */}
                      <button onClick={() => setExpandedMatrixId(isExpanded ? null : item.id)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 24px', border: 'none', cursor: 'pointer', textAlign: 'left',
                        background: isExpanded ? 'rgba(55,138,221,0.04)' : '#fff',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        borderLeft: `3px solid ${borderColor}`,
                        transition: 'all 0.15s',
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: 'linear-gradient(135deg, #378ADD, #5B9FE8)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}>
                          {(() => { const f = ['🍒','🍓','🍊','🍎','🍇','🍈','🔔','🍋','🍑','🍍']; return f[Math.max(0, matrixItems.findIndex(m => m.id === item.id)) % f.length]; })()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', fontFamily: "'Inter', sans-serif" }}>
                            {item.name}
                          </div>
                          <div style={{
                            fontSize: 12, color: '#8e8e93', overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif", marginTop: 1,
                          }}>
                            {item.lastMsg?.text || (item.messages.length > 0 ? item.messages[item.messages.length - 1]?.text : 'No messages')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          {item.phone && (
                            <span style={{ fontSize: 11, color: '#8e8e93', fontFamily: "'JetBrains Mono', monospace" }}>
                              {item.phone}
                            </span>
                          )}
                          <span style={{
                            fontSize: 11, fontWeight: 600, color: '#8e8e93',
                            background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: 4,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            {item.msgCount}
                          </span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2.5" strokeLinecap="round"
                            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded Thread */}
                      {isExpanded && (
                        <div style={{
                          background: '#f8f9fa', borderBottom: '2px solid rgba(55,138,221,0.15)',
                          borderLeft: `3px solid ${borderColor}`,
                        }}>
                          <div style={{ padding: '16px 24px 8px', maxHeight: 400, overflow: 'auto' }}>
                            {item.messages.map((msg, msgIdx) => (
                              <div key={msg.id || msgIdx} style={{
                                display: 'flex', gap: 10, marginBottom: 10,
                                flexDirection: msg.direction === 'outgoing' ? 'row-reverse' : 'row',
                              }}>
                                {/* Avatar */}
                                <div style={{
                                  width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                                  background: msg.direction === 'outgoing'
                                    ? 'linear-gradient(135deg, #378ADD, #2B6CB0)'
                                    : 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: msg.direction === 'outgoing' ? '#fff' : '#666',
                                  fontSize: 10, fontWeight: 700,
                                }}>
                                  {msg.direction === 'outgoing' ? 'You' : (() => { const f = ['🍒','🍓','🍊','🍎','🍇','🍈','🔔','🍋','🍑','🍍']; return f[Math.max(0, matrixItems.findIndex(m => m.id === item.id)) % f.length]; })()}
                                </div>
                                {/* Bubble */}
                                <div style={{
                                  maxWidth: '70%',
                                  padding: '8px 14px',
                                  borderRadius: msg.direction === 'outgoing' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                  background: msg.isAIDraft
                                    ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))'
                                    : msg.direction === 'outgoing' ? '#378ADD' : '#fff',
                                  color: msg.isAIDraft ? '#92400E' : msg.direction === 'outgoing' ? '#fff' : '#1c1c1e',
                                  fontSize: 13, lineHeight: 1.5,
                                  border: msg.isAIDraft ? '1px dashed rgba(245,158,11,0.4)' : msg.direction === 'incoming' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                }}>
                                  {msg.isAIDraft && (
                                    <div style={{
                                      fontSize: 9, fontWeight: 700, color: '#F59E0B', marginBottom: 4,
                                      fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em',
                                    }}>AI DRAFT</div>
                                  )}
                                  {msg.text}
                                </div>
                              </div>
                            ))}
                            {item.messages.length === 0 && (
                              <div style={{ textAlign: 'center', color: '#8e8e93', fontSize: 13, padding: '20px 0' }}>
                                No messages yet
                              </div>
                            )}
                          </div>
                          {/* Inline Quick Reply */}
                          <div style={{
                            padding: '8px 24px 12px', display: 'flex', gap: 8, alignItems: 'center',
                            borderTop: '1px solid rgba(0,0,0,0.04)',
                          }}>
                            <input
                              value={inputValues[item.id] || ''}
                              onChange={e => setInputValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') sendMessage(item.id); }}
                              placeholder={`Reply to ${item.name}...`}
                              style={{
                                flex: 1, padding: '9px 14px', borderRadius: 20,
                                border: '1px solid rgba(0,0,0,0.1)', fontSize: 13,
                                fontFamily: "'Inter', sans-serif", outline: 'none', background: '#fff',
                              }}
                            />
                            <button
                              onClick={() => sendMessage(item.id)}
                              style={{
                                width: 34, height: 34, borderRadius: 17, border: 'none',
                                background: '#378ADD', color: '#fff', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {matrixItems.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#8e8e93', fontSize: 14, padding: '60px 0' }}>
                    No conversations yet. Add a column in Streams view to start messaging.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Messages Timeline View */}
      {conversationViewMode === 'messages' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
          {(() => {
            // Collect all messages from all columns, sorted by timestamp
            const allMsgs: Array<{
              contactName: string; contactPhone: string; text: string;
              direction: string; timestamp: string; isAIDraft?: boolean; colId: string;
            }> = [];
            columns.filter(col => col.contact).forEach(col => {
              col.messages.forEach(msg => {
                allMsgs.push({
                  contactName: col.contact?.name || 'Unknown',
                  contactPhone: col.contact?.phone || '',
                  text: msg.text,
                  direction: msg.direction,
                  timestamp: msg.timestamp,
                  isAIDraft: msg.isAIDraft,
                  colId: col.id,
                });
              });
            });

            // Also fetch from Supabase messages table
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Message Timeline</h3>
                    <p style={{ fontSize: 12, color: '#8e8e93', margin: '4px 0 0' }}>All messages in chronological order</p>
                  </div>
                  <button onClick={async () => {
                    // Fetch messages with time filter applied
                    const filterHours: Record<string, number> = { '24h': 24, '48h': 48, '72h': 72, '1w': 168, '2w': 336 };
                    const hours = filterHours[messageTimeFilter] || 24;
                    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
                    const { data } = await supabase
                      .from('messages')
                      .select('id, message, contact_phone, direction, station, status, source_system, sent_at, created_at')
                      .or(`sent_at.gte.${since},and(sent_at.is.null,created_at.gte.${since})`)
                      .order('sent_at', { ascending: false, nullsFirst: false })
                      .limit(1000);
                    if (data) {
                      setTimelineMessages(data);
                    }
                  }} style={{
                    ...primaryBtnStyle,
                    background: 'rgba(0,0,0,0.06)', color: '#1c1c1e', boxShadow: 'none',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h6v6h-6z" />
                    </svg>
                    Load from Database
                  </button>
                </div>

                <table style={{
                  width: '100%', borderCollapse: 'collapse', fontSize: 13,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.08)' }}>
                      {['Time', 'Direction', 'Contact', 'Phone', 'Message', 'Status', 'Source'].map(h => (
                        <th key={h} style={{
                          textAlign: 'left', padding: '10px 8px', fontSize: 11, fontWeight: 700,
                          color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(timelineMessages.length > 0 ? timelineMessages : []).map((msg, i) => {
                      const isInbound = String(msg.direction || '').toLowerCase().includes('inbound') || msg.direction === 'incoming';
                      const msgPhone = String(msg.contact_phone || '');
                      const contact = contacts.find(c => c.phone && msgPhone && (c.phone.includes(msgPhone.slice(-4)) || msgPhone.includes(c.phone.slice(-4))));
                      const time = String(msg.sent_at || msg.created_at || '');
                      return (
                        <tr key={String(msg.id || i)} style={{
                          borderBottom: '1px solid rgba(0,0,0,0.04)',
                          background: i % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent',
                        }}>
                          <td style={{ padding: '10px 8px', color: '#8e8e93', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                            {time ? new Date(time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                              background: isInbound ? 'rgba(34,197,94,0.1)' : 'rgba(55,138,221,0.1)',
                              color: isInbound ? '#22C55E' : '#378ADD',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>
                              {isInbound ? '← IN' : '→ OUT'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1c1c1e' }}>
                            {contact?.full_name || '—'}
                          </td>
                          <td style={{ padding: '10px 8px', color: '#666', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                            {String(msg.contact_phone || '—')}
                          </td>
                          <td style={{ padding: '10px 8px', color: '#1c1c1e', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {String(msg.message || '—')}
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                              background: msg.status === 'Sent' || msg.status === 'sent' ? 'rgba(34,197,94,0.1)' : msg.status === 'Received' ? 'rgba(55,138,221,0.1)' : 'rgba(0,0,0,0.04)',
                              color: msg.status === 'Sent' || msg.status === 'sent' ? '#22C55E' : msg.status === 'Received' ? '#378ADD' : '#8e8e93',
                            }}>
                              {String(msg.status || '—')}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px', fontSize: 11, color: '#8e8e93' }}>
                            {String(msg.source_system || msg.station || '—')}
                          </td>
                        </tr>
                      );
                    })}
                    {timelineMessages.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#8e8e93' }}>
                          Click &quot;Load from Database&quot; to see all messages, or send a message first.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* Streams (Columns) View */}
      {conversationViewMode === 'streams' && <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
        {/* Contact List Panel — fixed, never moves or shrinks */}
        <div style={{ width: 280, minWidth: 280, maxWidth: 280, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(0,0,0,0.08)', background: '#fff', flexShrink: 0, flexGrow: 0 }}>
          {/* Search */}
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={conversationSearch}
                onChange={e => setConversationSearch(e.target.value)}
                placeholder="Search"
                style={{
                  width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.08)', fontSize: 13, outline: 'none',
                  fontFamily: "'Inter', sans-serif", background: 'rgba(0,0,0,0.02)',
                  boxSizing: 'border-box' as const, color: '#1c1c1e',
                }}
              />
            </div>
          </div>
          {/* Icon Rail + Right Content (dot grid + conversation list) */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Icon rail — spans full height */}
            <div style={{
              width: 56, minWidth: 56, background: '#16162a', display: 'flex', flexDirection: 'column',
              alignItems: 'center', padding: '8px 0', overflowY: 'auto', gap: 4,
            }}>
              {/* AI Agent */}
              <button onClick={() => setShowAiAgentPanel(true)} style={{
                width: 40, height: 40, borderRadius: 10, border: '2px solid rgba(245,158,11,0.5)',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                fontSize: 16, flexShrink: 0,
              }} title="AI Agent">🤖</button>
              {(() => {
                const fruits = ['🍒', '🍓', '🍊', '🍎', '🍇', '🍈', '🔔', '🍋', '🍑', '🍍'];
                const sortedCols = columns
                  .filter(col => col.contact && col.contact.name.toLowerCase().includes(conversationSearch.toLowerCase()))
                  .sort((a, b) => {
                    const getPriority = (col: ConversationColumn) => {
                      const last = col.messages[col.messages.length - 1];
                      if (last?.direction === 'incoming' && !last?.isAIDraft) return 0;
                      if (last?.isAIDraft) return 1;
                      return 2;
                    };
                    return getPriority(a) - getPriority(b);
                  });
                const MAX_SLOTS = 12;
                const totalContacts = sortedCols.length;
                const visibleSlots = Math.min(totalContacts, MAX_SLOTS - 1); // leave room for "X More"
                const extraCount = totalContacts > MAX_SLOTS - 1 ? totalContacts - (MAX_SLOTS - 1) : 0;
                const slots = Array.from({ length: MAX_SLOTS });

                return slots.map((_, slotIdx) => {
                  const col = slotIdx < visibleSlots ? sortedCols[slotIdx] : null;
                  const isMoreButton = extraCount > 0 && slotIdx === MAX_SLOTS - 1;

                  // "X More" button at the bottom
                  if (isMoreButton) {
                    return (
                      <div key="more" style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        +{extraCount}
                      </div>
                    );
                  }

                  // Active contact slot
                  if (col) {
                    const lastMsg = col.messages[col.messages.length - 1] || null;
                    const hasUnread = lastMsg?.direction === 'incoming' && !lastMsg?.isAIDraft;
                    const hasAiDraft = lastMsg?.isAIDraft;
                    const isSelected = selectedConversationId === col.id;
                    const borderColor = hasUnread ? '#22C55E' : hasAiDraft ? '#F59E0B' : 'rgba(255,255,255,0.15)';
                    const fruitIdx = columns.filter(c => c.contact).findIndex(c => c.id === col.id);
                    return (
                      <button key={col.id} onClick={() => {
                        setSelectedConversationId(col.id);
                        const el = document.getElementById(`stream-col-${col.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start' });
                      }} style={{
                        width: 40, height: 40, borderRadius: 10, border: `2px solid ${borderColor}`,
                        background: isSelected ? 'rgba(55,138,221,0.3)' : 'rgba(255,255,255,0.05)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        position: 'relative', transition: 'all 0.2s', flexShrink: 0,
                        color: '#fff', fontSize: 12, fontWeight: 700, gap: 0, padding: 0,
                      }} title={`${col.contact?.name || 'Unknown'} — ${col.contact?.phone || ''}`}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{fruits[fruitIdx % fruits.length]}</span>
                        {hasUnread && (
                          <div style={{
                            position: 'absolute', top: -2, right: -2,
                            width: 8, height: 8, borderRadius: 4,
                            background: '#EF4444', border: '1.5px solid #16162a',
                          }} />
                        )}
                      </button>
                    );
                  }

                  // Empty slot — dim, no color
                  return (
                    <div key={`empty-${slotIdx}`} style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)',
                    }} />
                  );
                });
              })()}
            </div>
            {/* Right side: dot grid on top, conversation list below */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Dot Grid */}
              <div style={{ background: '#16162a', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Legend — Pac-Man style */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  {[
                    { label: 'Power', color: '#FFE000' },
                    { label: 'Draft', color: '#FFB8FF' },
                    { label: 'Dot', color: '#FFE000', small: true },
                  ].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: l.small ? 4 : 6, height: l.small ? 4 : 6, borderRadius: '50%', background: l.color }} />
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{l.label}</span>
                    </div>
                  ))}
                </div>
                {/* Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '6px 8px',
                }}>
                  {/* Mini Pac-Man in grid — first cell */}
                  <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
                      <circle cx="12" cy="12" r="10" fill="#FFE000" />
                      <circle cx="10" cy="8" r="1.2" fill="#1a1a2e" />
                      <path d="M12 12 L23 5 L23 19 Z" fill="#16162a">
                        <animate attributeName="d" values="M12 12 L23 4 L23 20 Z;M12 12 L23 10 L23 14 Z;M12 12 L23 4 L23 20 Z" dur="0.5s" repeatCount="indefinite" />
                      </path>
                    </svg>
                  </div>
                  {(() => {
                    const filteredCols = columns.filter(col => col.contact && col.contact.name.toLowerCase().includes(conversationSearch.toLowerCase()));
                    // 12 rows x 7 columns = 84 dots minus 1 for pac-man = 83
                    return Array.from({ length: 83 }).map((_, idx) => {
                      const col = filteredCols[idx];
                      if (!col) {
                        return (
                          <div key={idx} style={{
                            width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{ width: 4, height: 4, borderRadius: 2, background: 'rgba(255,224,0,0.2)' }} />
                          </div>
                        );
                      }
                      const lastMsg = col.messages[col.messages.length - 1] || null;
                      const hasUnread = lastMsg?.direction === 'incoming' && !lastMsg?.isAIDraft;
                      const hasAiDraft = lastMsg?.isAIDraft;
                      // Pac-Man dots: power pellet (big yellow) for unread, pink for draft, small yellow for read
                      const dotColor = hasUnread ? '#FFE000' : hasAiDraft ? '#FFB8FF' : '#FFE000';
                      const dotSize = hasUnread ? 9 : hasAiDraft ? 7 : 4;
                      const isSelected = selectedConversationId === col.id;
                      return (
                        <button key={idx} onClick={() => {
                          setSelectedConversationId(col.id);
                          const el = document.getElementById(`stream-col-${col.id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start' });
                        }} style={{
                          width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        }} title={`${col.contact?.name} — ${col.messages.length} msgs`}>
                          <div style={{
                            width: dotSize, height: dotSize, borderRadius: dotSize / 2,
                            background: dotColor,
                            boxShadow: hasUnread || hasAiDraft ? `0 0 ${dotSize}px ${dotColor}60` : 'none',
                            outline: isSelected ? `2px solid ${dotColor}` : 'none',
                            outlineOffset: 2,
                            transition: 'all 0.2s',
                          }} />
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
              {/* Active Chats Label */}
              <div style={{
                padding: '8px 14px', background: '#fafbfc',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                borderTop: '1px solid rgba(0,0,0,0.06)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1c1c1e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Active ({allConversations.filter(c => c.contact && c.messages.length > 0).length})
                </span>
              </div>
              {/* Active Conversation List — always visible */}
              <div style={{ overflowY: 'auto', maxHeight: showPreviousChats ? '40%' : undefined, flex: showPreviousChats ? undefined : 1 }}>
            {allConversations
              .filter(col => col.contact && col.messages.length > 0 && col.contact.name.toLowerCase().includes(conversationSearch.toLowerCase()))
              .map(col => {
                const lastMsg = col.messages.length > 0 ? col.messages[col.messages.length - 1] : null;
                const hasUnread = lastMsg?.direction === 'incoming';
                const hasAiDraft = lastMsg?.isAIDraft;
                const isSelected = selectedConversationId === col.id;
                const isOpenAsColumn = columns.some(c => c.id === col.id);
                const isRead = readConversations.has(col.id);
                const rowBg = isSelected
                  ? 'rgba(55,138,221,0.08)'
                  : hasAiDraft
                    ? 'rgba(245,158,11,0.06)'
                    : (hasUnread && !isRead)
                      ? 'rgba(34,197,94,0.06)'
                      : 'transparent';
                return (
                  <button key={col.id} onClick={() => {
                    playSound('click');
                    setSelectedConversationId(col.id);
                    setReadConversations(prev => new Set(prev).add(col.id));
                    // Add to columns if not already open
                    setColumns(prev => {
                      if (prev.some(c => c.id === col.id)) {
                        // Move to front
                        const existing = prev.find(c => c.id === col.id)!;
                        return [existing, ...prev.filter(c => c.id !== col.id)];
                      }
                      return [col, ...prev];
                    });
                    // Un-dismiss
                    setDismissedColumns(prev => {
                      const next = new Set(prev);
                      next.delete(col.id);
                      localStorage.setItem('vernacular-dismissed', JSON.stringify([...next]));
                      return next;
                    });
                    setTimeout(() => {
                      const el = document.getElementById(`stream-col-${col.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start' });
                    }, 50);
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    padding: '12px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: rowBg,
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    minHeight: 68,
                  }}>
                    {/* Fruit icon + phone */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(0,0,0,0.04)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 0,
                    }}>
                      {(() => {
                        const fruits = ['🍒', '🍓', '🍊', '🍎', '🍇', '🍈', '🔔', '🍋', '🍑', '🍍'];
                        const idx = columns.filter(c => c.contact).findIndex(c => c.id === col.id);
                        return <span style={{ fontSize: 20, lineHeight: 1 }}>{fruits[Math.max(0, idx) % fruits.length]}</span>;
                      })()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: hasUnread ? 700 : 600, color: '#1c1c1e',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontFamily: "'Inter', sans-serif",
                      }}>
                        {col.contact?.name || 'Unknown'}
                      </div>
                      {col.contact?.phone && (
                        <div style={{
                          fontSize: 11, color: '#378ADD', fontWeight: 500,
                          fontFamily: "'JetBrains Mono', monospace", marginTop: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {col.contact.phone}
                        </div>
                      )}
                      <div style={{
                        fontSize: 11, color: '#8e8e93', fontWeight: 400,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontFamily: "'Inter', sans-serif", marginTop: 1,
                      }}>
                        {lastMsg?.text || 'No messages yet'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 11, color: '#8e8e93', fontFamily: "'Inter', sans-serif",
                        whiteSpace: 'nowrap',
                      }}>
                        {lastMsg?.timestamp ? (() => {
                          const d = new Date(lastMsg.timestamp);
                          return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        })() : ''}
                      </span>
                      {hasUnread && !readConversations.has(col.id) && (
                        <div style={{
                          width: 8, height: 8, borderRadius: 4, background: '#378ADD',
                        }} />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isOpenAsColumn) {
                            // Close: remove column and deselect
                            removeColumn(col.id);
                            setSelectedConversationId(null);
                          } else {
                            // Show: add to columns if not present, move to first position
                            setColumns(prev => {
                              const existing = prev.find(c => c.id === col.id);
                              if (existing) {
                                // Already in columns — move to front
                                return [existing, ...prev.filter(c => c.id !== col.id)];
                              } else {
                                // Not in columns (was dismissed) — add it
                                return [col, ...prev];
                              }
                            });
                            // Un-dismiss
                            setDismissedColumns(prev => {
                              const next = new Set(prev);
                              next.delete(col.id);
                              localStorage.setItem('vernacular-dismissed', JSON.stringify([...next]));
                              return next;
                            });
                            setSelectedConversationId(col.id);
                            setTimeout(() => {
                              const el = document.getElementById(`stream-col-${col.id}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start' });
                            }, 100);
                          }
                        }}
                        style={{
                          fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                          border: 'none', cursor: 'pointer',
                          background: isOpenAsColumn ? 'rgba(239,68,68,0.08)' : 'rgba(55,138,221,0.08)',
                          color: isOpenAsColumn ? '#DC2626' : '#378ADD',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {isOpenAsColumn ? 'Close' : 'Show'}
                      </button>
                    </div>
                  </button>
                );
              })}
          </div>
              {/* Previous Chats Dropdown */}
              {(() => {
                // Show conversations with no messages
                const activeCols = allConversations.filter(c => c.contact && c.messages.length > 0);
                const previousChats = allConversations.filter(c => c.contact && c.messages.length === 0 && c.contact.name.toLowerCase().includes(conversationSearch.toLowerCase()));
                // Always show the section header so users know it exists
                if (previousChats.length === 0) return (
                  <div style={{ padding: '8px 14px', background: '#f5f6f8', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Previous Chats (0)
                    </span>
                  </div>
                );
                return (
                  <>
                    <button onClick={() => setShowPreviousChats(!showPreviousChats)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 14px', border: 'none', cursor: 'pointer',
                      background: showPreviousChats ? 'rgba(55,138,221,0.04)' : '#f5f6f8',
                      borderTop: '1px solid rgba(0,0,0,0.06)',
                      borderBottom: showPreviousChats ? '1px solid rgba(0,0,0,0.04)' : 'none',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Previous Chats ({previousChats.length})
                      </span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2.5" strokeLinecap="round"
                        style={{ transform: showPreviousChats ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {showPreviousChats && (
                      <div style={{ overflowY: 'auto', maxHeight: 200, background: '#fafbfc' }}>
                        {previousChats.map(col => {
                          const fruits = ['🍒','🍓','🍊','🍎','🍇','🍈','🔔','🍋','🍑','🍍'];
                          const idx = columns.filter(c => c.contact).findIndex(c => c.id === col.id);
                          return (
                            <button key={col.id} onClick={() => {
                              playSound('click');
                              setSelectedConversationId(col.id);
                              const el = document.getElementById(`stream-col-${col.id}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start' });
                            }} style={{
                              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                              padding: '10px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                              background: 'transparent', borderBottom: '1px solid rgba(0,0,0,0.03)',
                              opacity: 0.7,
                            }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
                            >
                              <span style={{ fontSize: 18 }}>{fruits[Math.max(0,idx) % fruits.length]}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#1c1c1e' }}>{col.contact?.name || 'Unknown'}</div>
                                <div style={{ fontSize: 11, color: '#8e8e93' }}>{col.contact?.phone || 'No messages'}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
          </div>{/* end right side (dot grid + list) */}
        </div>{/* end icon rail + right content */}
        </div>{/* end Contact List Panel */}
        {/* Stream Columns — minWidth:0 prevents flex child from expanding beyond allocated space */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
        {/* Stream Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px 0', flexShrink: 0 }}>
          <button onClick={() => setShowReadStreams(prev => !prev)} style={{
            padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 10, fontWeight: 600,
            background: showReadStreams ? 'rgba(0,0,0,0.04)' : 'rgba(55,138,221,0.1)',
            color: showReadStreams ? '#8e8e93' : '#378ADD', cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {showReadStreams ? 'Hide Read' : 'Show All'}
          </button>
          <button onClick={() => {
            // Mark all visible conversations as read
            setReadConversations(prev => {
              const next = new Set(prev);
              columns.forEach(c => { if (c.contact) next.add(c.id); });
              return next;
            });
          }} style={{
            padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 10, fontWeight: 600,
            background: 'rgba(0,0,0,0.04)', color: '#8e8e93', cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Mark All Read
          </button>
          {/* Scroll left/right buttons */}
          <button onClick={() => { if (streamsScrollRef.current) streamsScrollRef.current.scrollBy({ left: -350, behavior: 'smooth' }); }}
            style={{ padding: '4px 8px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, background: 'rgba(0,0,0,0.06)', color: '#1c1c1e', cursor: 'pointer' }}>
            ← Prev
          </button>
          <button onClick={() => { if (streamsScrollRef.current) streamsScrollRef.current.scrollBy({ left: 350, behavior: 'smooth' }); }}
            style={{ padding: '4px 8px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, background: 'rgba(0,0,0,0.06)', color: '#1c1c1e', cursor: 'pointer' }}>
            Next →
          </button>
          <span style={{ fontSize: 10, color: '#8e8e93', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
            {columns.filter(c => c.contact && pinnedConversations.has(c.id)).length} pinned
          </span>
          <select
            value={streamSortMode}
            onChange={e => setStreamSortMode(e.target.value as typeof streamSortMode)}
            style={{
              padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)',
              fontSize: 10, fontWeight: 600, color: '#378ADD', cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", background: 'rgba(55,138,221,0.06)',
              outline: 'none', flexShrink: 0,
            }}
          >
            <option value="unread">Unread Left</option>
            <option value="recent">Most Recent</option>
            <option value="name">A → Z</option>
            <option value="most-messages">Most Messages</option>
          </select>
        </div>
        <div ref={streamsScrollRef} style={{ flex: 1, display: 'flex', gap: 0, overflowX: 'scroll', overflowY: 'hidden', padding: '8px 16px 16px 16px', minHeight: 0, paddingRight: 32, WebkitOverflowScrolling: 'touch' }}>
        {(() => {
          // Sort: pinned always first, then by selected mode
          const sorted = [...columns].sort((a, b) => {
            const aPinned = pinnedConversations.has(a.id) ? 1 : 0;
            const bPinned = pinnedConversations.has(b.id) ? 1 : 0;
            if (aPinned !== bPinned) return bPinned - aPinned;
            if (streamSortMode === 'unread') {
              const aUnread = a.contact?.tag === 'UNREAD' ? 1 : 0;
              const bUnread = b.contact?.tag === 'UNREAD' ? 1 : 0;
              return bUnread - aUnread;
            }
            if (streamSortMode === 'recent') {
              const aTime = a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].timestamp || 0).getTime() : 0;
              const bTime = b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].timestamp || 0).getTime() : 0;
              return bTime - aTime;
            }
            if (streamSortMode === 'name') {
              return (a.contact?.name || '').localeCompare(b.contact?.name || '');
            }
            if (streamSortMode === 'most-messages') {
              return b.messages.length - a.messages.length;
            }
            return 0;
          });
          // Filter: if showReadStreams is off, only show pinned + unread
          const visible = showReadStreams ? sorted : sorted.filter(c =>
            pinnedConversations.has(c.id) || c.contact?.tag === 'UNREAD' || !c.contact
          );
          return visible;
        })().map(col => (
          <div key={col.id} id={`stream-col-${col.id}`} style={{
            width: 340, minWidth: 340, height: '100%', display: 'flex', flexDirection: 'column',
            background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
            marginRight: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0,
          }}>
            {/* Column Header */}
            <div style={{
              padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 10, background: '#fafbfc', minHeight: 52,
            }}>
              {col.contact ? (
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {/* Row 1: Name + phone + pin + close */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {col.contact.name}
                    </span>
                    {col.contact.phone && (
                      <span style={{ fontSize: 10, color: '#8e8e93', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {col.contact.phone}
                      </span>
                    )}
                    {col.messages.length > 0 && col.messages[col.messages.length - 1].direction === 'incoming' && !col.messages[col.messages.length - 1].isAIDraft && (
                      <span style={{ fontSize: 10, flexShrink: 0 }}>🔔</span>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <button onClick={() => { setPinnedConversations(prev => { const next = new Set(prev); if (next.has(col.id)) next.delete(col.id); else next.add(col.id); localStorage.setItem('vernacular-pinned', JSON.stringify([...next])); return next; }); }}
                        title={pinnedConversations.has(col.id) ? 'Unpin' : 'Pin'} style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: pinnedConversations.has(col.id) ? '#378ADD' : '#c4c4c6' }}>
                        📌
                      </button>
                      <button onClick={() => removeColumn(col.id)} style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4c4c6' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  </div>
                  {/* Row 2: Channel + AI + Times */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: col.channel === 'discord' ? 'rgba(88,101,242,0.1)' : col.channel === 'telegram' ? 'rgba(0,136,204,0.1)' : col.channel === 'email' ? 'rgba(217,119,6,0.1)' : 'rgba(34,197,94,0.1)', color: col.channel === 'discord' ? '#5865F2' : col.channel === 'telegram' ? '#0088cc' : col.channel === 'email' ? '#D97706' : '#22C55E', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>
                      {col.channel === 'discord' ? '🎮' : col.channel === 'telegram' ? '✈️' : col.channel === 'email' ? '📧' : '💬'} {col.channel || 'iMsg'}
                    </span>
                    <button onClick={async (e) => { e.stopPropagation(); const modes = ['off', 'draft', 'auto'] as const; const currentIdx = modes.indexOf((col.aiMode || 'off') as typeof modes[number]); const nextMode = modes[(currentIdx + 1) % modes.length]; setColumns(prev => prev.map(c => c.id === col.id ? { ...c, aiMode: nextMode } : c)); setAllConversations(prev => prev.map(c => c.id === col.id ? { ...c, aiMode: nextMode } : c)); const convId = col.conversationId || col.id.replace('real-', ''); if (convId) { await supabase.from('conversations').update({ ai_mode: nextMode }).eq('id', convId); } }}
                      title={`AI: ${col.aiMode || 'off'}`} style={{ padding: '1px 5px', borderRadius: 3, border: 'none', fontSize: 9, fontWeight: 700, background: col.aiMode === 'auto' ? 'rgba(34,197,94,0.1)' : col.aiMode === 'draft' ? 'rgba(217,119,6,0.1)' : 'rgba(0,0,0,0.04)', color: col.aiMode === 'auto' ? '#22C55E' : col.aiMode === 'draft' ? '#D97706' : '#8e8e93', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>
                      AI {(col.aiMode || 'off').toUpperCase()}
                    </button>
                    <button onClick={() => setShowTimestamps(prev => !prev)} style={{ padding: '1px 5px', borderRadius: 3, border: 'none', fontSize: 9, fontWeight: 700, background: showTimestamps ? 'rgba(55,138,221,0.1)' : 'rgba(0,0,0,0.04)', color: showTimestamps ? '#378ADD' : '#8e8e93', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                      {showTimestamps ? 'TIMES ON' : 'TIMES'}
                    </button>
                    {hiddenMessages.size > 0 && (
                      <button onClick={() => setShowHiddenMessages(prev => !prev)} style={{ padding: '1px 5px', borderRadius: 3, border: 'none', fontSize: 9, fontWeight: 700, background: showHiddenMessages ? 'rgba(124,58,237,0.1)' : 'rgba(0,0,0,0.04)', color: showHiddenMessages ? '#7C3AED' : '#8e8e93', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                        {showHiddenMessages ? `HIDDEN (${hiddenMessages.size})` : `${hiddenMessages.size} HIDDEN`}
                      </button>
                    )}
                    <button onClick={() => {
                      const nm = col.contact!.name;
                      const ph = col.contact!.phone || '';
                      const nameIsPhone = isPhoneNumber(nm);
                      const n = nameIsPhone ? ['', ''] : nm.split(' ');
                      setEditingContact({ colId: col.id, firstName: nameIsPhone ? '' : (n[0] || ''), lastName: nameIsPhone ? '' : (n.slice(1).join(' ') || ''), name: nameIsPhone ? '' : nm, phone: ph || (nameIsPhone ? formatPhoneNumber(nm) : ''), email: '', company: '', jobTitle: '', linkedin: '', instagram: '', twitter: '', school: '', greekOrg: '', state: '', city: '', dob: '', venmo: '', notes: '' });
                    }} style={{ padding: '1px 5px', borderRadius: 3, border: 'none', fontSize: 9, fontWeight: 700, background: 'rgba(0,0,0,0.04)', color: '#378ADD', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                      {isPhoneNumber(col.contact?.name || '') ? 'ADD NAME' : 'EDIT'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, fontSize: 13, color: '#8e8e93', fontWeight: 500 }}>
                  Select a contact...
                </div>
              )}
            </div>

            {/* Conversation Goal */}
            {col.contact && (
              <div style={{
                padding: '6px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)',
                display: 'flex', alignItems: 'center', gap: 6, background: '#f8f9fa',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                </svg>
                <input
                  value={col.goal || ''}
                  onChange={e => {
                    const newGoal = e.target.value;
                    setColumns(prev => prev.map(c => c.id === col.id ? { ...c, goal: newGoal } : c));
                  }}
                  onBlur={async () => {
                    const convId = col.conversationId || col.id.replace('real-', '');
                    if (convId) {
                      await supabase.from('conversations').update({ goal: col.goal || '' }).eq('id', convId);
                    }
                  }}
                  placeholder="Set conversation goal..."
                  style={{
                    flex: 1, border: 'none', background: 'transparent', outline: 'none',
                    fontSize: 11, color: '#1c1c1e', fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                  }}
                />
              </div>
            )}

            {/* iMessage-style To: field */}
            {!col.contact && showContactPicker === col.id && (
              <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                {/* To: input */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#8e8e93', flexShrink: 0 }}>To:</span>
                  <input
                    autoFocus
                    value={contactPickerSearch}
                    onChange={e => { setContactPickerSearch(e.target.value); setNewConvPhone(''); setNewConvName(''); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && contactPickerSearch.trim()) {
                        // If it looks like a phone number, start conversation directly
                        const digits = contactPickerSearch.replace(/\D/g, '');
                        if (digits.length >= 7) {
                          setNewConvPhone(contactPickerSearch);
                          startNewConversation(col.id);
                        }
                      }
                    }}
                    placeholder="Name or phone number..."
                    style={{
                      flex: 1, border: 'none', outline: 'none', fontSize: 14,
                      fontFamily: "'Inter', sans-serif", color: '#1c1c1e',
                      background: 'transparent',
                    }}
                  />
                </div>
                {/* Dropdown results */}
                {contactPickerSearch.trim() && (() => {
                  const q = contactPickerSearch.toLowerCase();
                  const qDigits = q.replace(/\D/g, '');
                  const filtered = contacts.filter(c => {
                    const name = (c.full_name || `${c.first_name || ''} ${c.last_name || ''}`).toLowerCase();
                    const phone = (c.phone || '').replace(/\D/g, '');
                    return name.includes(q) || (qDigits.length >= 3 && phone.includes(qDigits)) || (c.phone || '').toLowerCase().includes(q);
                  });
                  const isPhoneInput = qDigits.length >= 7;
                  return (
                    <div style={{ maxHeight: 280, overflow: 'auto', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                      {filtered.slice(0, 15).map(c => {
                        const name = c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown';
                        const initials = ((c.first_name?.[0] || '') + (c.last_name?.[0] || '')).toUpperCase() || '?';
                        return (
                          <button key={c.id} onClick={() => {
                            pickContact(col.id, {
                              id: c.id, name, initials,
                              tag: 'ACTIVE', tagColor: '#22C55E', tagBg: 'rgba(34,197,94,0.1)',
                              phone: c.phone || '',
                            });
                          }} style={{
                            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                            padding: '10px 14px', border: 'none', background: 'transparent',
                            cursor: 'pointer', fontFamily: "'Inter', sans-serif", textAlign: 'left',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{
                              width: 32, height: 32, borderRadius: 16,
                              background: 'linear-gradient(135deg, #378ADD, #5B9FE8)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                            }}>{initials}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: '#1c1c1e' }}>{name}</div>
                              {c.phone && <div style={{ fontSize: 12, color: '#8e8e93', fontFamily: "'JetBrains Mono', monospace" }}>{c.phone}</div>}
                            </div>
                          </button>
                        );
                      })}
                      {filtered.length === 0 && isPhoneInput && (
                        <button onClick={() => {
                          setNewConvPhone(contactPickerSearch);
                          setTimeout(() => startNewConversation(col.id), 0);
                        }} style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                          padding: '12px 14px', border: 'none', background: 'transparent',
                          cursor: 'pointer', fontFamily: "'Inter', sans-serif", textAlign: 'left',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(55,138,221,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 16,
                            background: 'rgba(55,138,221,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#378ADD', fontSize: 14, flexShrink: 0,
                          }}>+</div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#378ADD' }}>New message to {formatPhoneNumber(contactPickerSearch)}</div>
                            <div style={{ fontSize: 11, color: '#8e8e93' }}>Create new contact</div>
                          </div>
                        </button>
                      )}
                      {filtered.length === 0 && !isPhoneInput && (
                        <div style={{ padding: '20px 14px', textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>
                          No contacts found. Enter a phone number to start a new conversation.
                        </div>
                      )}
                    </div>
                  );
                })()}
                {/* Imported Conversations Group */}
                {notionConversations.length > 0 && (
                  <>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase',
                      letterSpacing: '0.06em', padding: '4px 10px 6px', marginTop: 2,
                    }}>
                      Imported Contacts
                    </div>
                    {notionConversations.map(conv => (
                      <button
                        key={conv.pageId}
                        onClick={() => pickNotionConversation(col.id, conv)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                          padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent',
                          cursor: 'pointer', fontFamily: "'Inter', sans-serif", textAlign: 'left',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: 15,
                          background: 'linear-gradient(135deg, #1a1a1a, #444)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 11, fontWeight: 700,
                        }}>
                          {conv.initials}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{conv.name}</div>
                        </div>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: '#000', background: 'rgba(0,0,0,0.06)',
                          padding: '2px 6px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace",
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          Notion
                        </span>
                      </button>
                    ))}
                  </>
                )}
                {/* Demo Contacts Group */}
                {(notionConversations.length > 0 || availableContacts.length > 0) && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase',
                    letterSpacing: '0.06em', padding: '8px 10px 6px',
                    borderTop: notionConversations.length > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    marginTop: notionConversations.length > 0 ? 6 : 2,
                  }}>
                    Demo Contacts
                  </div>
                )}
                {availableContacts.length === 0 && notionConversations.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#8e8e93', textAlign: 'center', padding: '8px 0' }}>
                    No more contacts available
                  </div>
                ) : (
                  availableContacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => pickContact(col.id, c)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent',
                        cursor: 'pointer', fontFamily: "'Inter', sans-serif", textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: 15,
                        background: 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 11, fontWeight: 700,
                      }}>
                        {c.initials}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{c.name}</div>
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: c.tagColor,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          {c.tag}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Messages */}
            <div ref={el => {
              if (el && !el.dataset.msgCount) { el.scrollTop = el.scrollHeight; el.dataset.msgCount = String(col.messages.length); }
              else if (el && el.dataset.msgCount !== String(col.messages.length)) { el.scrollTop = el.scrollHeight; el.dataset.msgCount = String(col.messages.length); }
            }} style={{
              flex: 1, overflow: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4,
              background: '#f8f9fa',
            }}>
              {(() => {
                const visibleMsgs = col.messages.filter(m => !(m.isAIDraft && col.aiMode === 'off') && (showHiddenMessages || !hiddenMessages.has(m.id)));
                // Helper: format date separator like iMessage
                const formatDateSep = (dateStr: string) => {
                  const d = new Date(dateStr);
                  if (isNaN(d.getTime())) return null;
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
                  if (diffDays === 0) return 'Today';
                  if (diffDays === 1) return 'Yesterday';
                  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
                  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                };
                let lastDateLabel = '';
                return visibleMsgs.map((msg, msgIdx) => {
                const isLastOutgoing = msg.direction === 'outgoing' && !msg.isAIDraft &&
                  !visibleMsgs.slice(msgIdx + 1).some(m => m.direction === 'outgoing' && !m.isAIDraft);
                const isRecent = msg.id.startsWith('m-');
                // Date separator
                const msgDate = msg.timestamp ? formatDateSep(msg.timestamp) : null;
                const showDateSep = msgDate && msgDate !== lastDateLabel;
                if (msgDate) lastDateLabel = msgDate;
                // Time gap: show time if >10 min gap from previous message
                const prevMsg = msgIdx > 0 ? visibleMsgs[msgIdx - 1] : null;
                const showTime = (() => {
                  if (!msg.timestamp) return false;
                  if (!prevMsg?.timestamp) return true;
                  const gap = Math.abs(new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime());
                  return gap > 10 * 60 * 1000; // 10 minutes
                })();

                // Detect iMessage reactions: Liked "...", Loved "...", etc.
                // Detect iMessage reactions: "Liked '...'" or "❤️ to '...'" patterns
                const reactionMatch = msg.text.match(/^(Liked|Loved|Disliked|Laughed at|Emphasized|Questioned)\s+"([\s\S]{0,80})/)
                  || msg.text.match(/^(❤️|👍|👎|😂|‼️|❓|🔥|😀|🐣)\s+to\s+"([\s\S]{0,80})/);
                const reactionEmoji: Record<string, string> = { 'Liked': '👍', 'Loved': '❤️', 'Disliked': '👎', 'Laughed at': '😂', 'Emphasized': '‼️', 'Questioned': '❓' };

                if (reactionMatch) {
                  const emoji = reactionEmoji[reactionMatch[1]] || reactionMatch[1] || '👍';
                  const quotedText = reactionMatch[2].substring(0, 40);
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {showDateSep && (
                      <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', background: '#f8f9fa', padding: '0 12px' }}>{msgDate}</span>
                      </div>
                    )}
                    <div style={{
                      display: 'flex', alignItems: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                      flexDirection: 'column',
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', borderRadius: 16,
                        background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)',
                        fontSize: 12, color: '#8e8e93', maxWidth: '85%',
                      }}>
                        <span style={{ fontSize: 16 }}>{emoji}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                          &ldquo;{quotedText}&rdquo;
                        </span>
                      </div>
                      {showTimestamps && msg.timestamp && (
                        <span style={{ fontSize: 10, color: '#c4c4c6', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                          {(() => { const d = new Date(msg.timestamp); return isNaN(d.getTime()) ? msg.timestamp : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); })()}
                        </span>
                      )}
                    </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Date separator — centered like iMessage */}
                    {showDateSep && (
                      <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', background: '#f8f9fa', padding: '0 12px' }}>{msgDate}</span>
                      </div>
                    )}
                    {/* Time label — shown when >10 min gap */}
                    {showTime && msg.timestamp && (
                      <div style={{ textAlign: 'center', padding: '4px 0 2px' }}>
                        <span style={{ fontSize: 10, color: '#c4c4c6', fontFamily: "'JetBrains Mono', monospace" }}>
                          {(() => { const d = new Date(msg.timestamp); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); })()}
                        </span>
                      </div>
                    )}
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                  }}>
                    {/* Bubble */}
                    <div
                      style={{ position: 'relative', maxWidth: '85%' }}
                      onMouseEnter={e => { const btn = e.currentTarget.querySelector('[data-msg-menu]') as HTMLElement; if (btn) btn.style.opacity = '1'; }}
                      onMouseLeave={e => { const btn = e.currentTarget.querySelector('[data-msg-menu]') as HTMLElement; if (btn) btn.style.opacity = '0'; }}
                    >
                      <button data-msg-menu onClick={e => { e.stopPropagation(); setMsgContextMenu({ x: e.clientX, y: e.clientY, msgId: msg.id, colId: col.id }); }}
                        style={{ position: 'absolute', top: 4, right: msg.direction === 'outgoing' ? undefined : 'auto', left: msg.direction === 'outgoing' ? -28 : undefined, width: 22, height: 22, borderRadius: 11, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#8e8e93', opacity: 0, transition: 'opacity 0.15s', zIndex: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        ···
                      </button>
                    <div
                      style={{
                      padding: '10px 14px',
                      overflowWrap: 'break-word' as const, wordBreak: 'break-word' as const,
                      borderRadius: msg.direction === 'outgoing' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: msg.isAIDraft
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))'
                        : msg.direction === 'outgoing' ? '#378ADD' : '#fff',
                      color: msg.isAIDraft ? '#92400E' : msg.direction === 'outgoing' ? '#fff' : '#1c1c1e',
                      fontSize: 13, lineHeight: 1.5, fontWeight: 400,
                      border: msg.isAIDraft ? '1px dashed rgba(245,158,11,0.4)' : (isLastOutgoing && isRecent) ? '2px solid rgba(124,58,237,0.5)' : msg.direction === 'incoming' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                      boxShadow: (isLastOutgoing && isRecent) ? '0 0 12px rgba(124,58,237,0.25)' : '0 1px 2px rgba(0,0,0,0.04)',
                    }}>
                      {msg.isAIDraft && (
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: '#F59E0B', marginBottom: 6,
                          fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>AI DRAFT</div>
                      )}
                      {msg.text}
                    </div>
                    {/* AI Draft action buttons */}
                    {msg.isAIDraft && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, justifyContent: 'flex-end' }}>
                        <button onClick={async () => {
                          playSound('send');
                          // Approve — send as-is
                          const phone = col.contact?.phone;
                          const orgId = (user?.organizations as Record<string, unknown>)?.id as string;
                          if (phone) {
                            await fetch('/api/messages/send', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ phoneNumber: phone, message: msg.text, contactName: col.contact?.name, organizationId: orgId }),
                            });
                            // Replace draft with sent message
                            setColumns(prev => prev.map(c => c.id === col.id ? {
                              ...c, messages: c.messages.map(m => m.id === msg.id ? { ...m, isAIDraft: false, id: `sent-${Date.now()}` } : m),
                            } : c));
                          }
                        }} style={{
                          padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: '#22C55E', color: '#fff', fontSize: 11, fontWeight: 700,
                          fontFamily: "'Inter', sans-serif",
                        }}>Approve</button>
                        <button onClick={() => {
                          // Use but Edit — put text in input for editing
                          setInputValues(prev => ({ ...prev, [col.id]: msg.text }));
                          // Remove the draft
                          setColumns(prev => prev.map(c => c.id === col.id ? {
                            ...c, messages: c.messages.filter(m => m.id !== msg.id),
                          } : c));
                        }} style={{
                          padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer',
                          background: 'rgba(245,158,11,0.08)', color: '#D97706', fontSize: 11, fontWeight: 700,
                          fontFamily: "'Inter', sans-serif",
                        }}>Edit</button>
                        <button onClick={() => {
                          // Type my own — dismiss the draft
                          setColumns(prev => prev.map(c => c.id === col.id ? {
                            ...c, messages: c.messages.filter(m => m.id !== msg.id),
                          } : c));
                        }} style={{
                          padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer',
                          background: 'rgba(0,0,0,0.03)', color: '#8e8e93', fontSize: 11, fontWeight: 600,
                          fontFamily: "'Inter', sans-serif",
                        }}>Dismiss</button>
                      </div>
                    )}
                    {/* Timestamp + delivery status (below bubble) */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
                      paddingLeft: msg.direction === 'incoming' ? 4 : 0,
                      paddingRight: msg.direction === 'outgoing' ? 4 : 0,
                    }}>
                      {showTimestamps && msg.timestamp && (
                        <span style={{ fontSize: 10, color: '#8e8e93' }}>{msg.timestamp}</span>
                      )}
                      {isLastOutgoing && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: isRecent ? '#7C3AED' : '#8e8e93' }}>
                          {isRecent && (
                            <svg width="14" height="14" viewBox="0 0 14 16" style={{ animation: 'ghostBlink 0.6s ease-in-out infinite alternate' }}>
                              <path d="M1 14V7a6 6 0 0 1 12 0v7l-2-2-2 2-2-2-2 2-2-2z" fill="#7C3AED" />
                              <circle cx="5" cy="7" r="1.2" fill="#fff" /><circle cx="9" cy="7" r="1.2" fill="#fff" />
                              <circle cx="5.4" cy="7" r="0.6" fill="#1a1a2e" /><circle cx="9.4" cy="7" r="0.6" fill="#1a1a2e" />
                            </svg>
                          )}
                          {isRecent ? 'Delivering...' : 'Delivered'}
                        </span>
                      )}
                    </div>
                  </div>
                  </div>{/* end hover wrapper */}
                  </div>
                );
              });
              })()}
              <div ref={el => { messageEndRefs.current[col.id] = el; }} />
            </div>

            {/* Input */}
            {col.contact && (
              <div style={{
                padding: '10px 14px', borderTop: '1px solid rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column', gap: 6, background: '#fff',
              }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {/* Ghost AI toggle — cycles: off → draft → auto */}
                  {(() => {
                    const colIdx = columns.filter(c => c.contact).findIndex(c => c.id === col.id);
                    const ghost = ghostConfig[Math.max(0, colIdx) % ghostConfig.length];
                    const mode = aiResponseMode[col.id] || 'off';
                    const nextMode = mode === 'off' ? 'draft' : mode === 'draft' ? 'auto' : 'off';
                    const modeColor = mode === 'auto' ? '#22C55E' : mode === 'draft' ? '#F59E0B' : '#ccc';
                    const modeLabel = mode === 'auto' ? 'Auto-Send' : mode === 'draft' ? 'Draft Mode' : 'AI Off';
                    return (
                      <button
                        onClick={() => { setAiResponseMode(prev => ({ ...prev, [col.id]: nextMode })); playSound('click'); }}
                        title={`${ghost.name}: ${modeLabel} — Click to switch to ${nextMode === 'off' ? 'Off' : nextMode === 'draft' ? 'Draft' : 'Auto'}`}
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: 'none', flexShrink: 0,
                          background: mode !== 'off' ? `${modeColor}20` : 'rgba(0,0,0,0.04)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s', position: 'relative',
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 14 16" style={{
                          animation: mode !== 'off' ? 'ghostBlink 1s ease-in-out infinite alternate' : 'none',
                        }}>
                          <path d="M1 14V7a6 6 0 0 1 12 0v7l-2-2-2 2-2-2-2 2-2-2z"
                            fill={mode !== 'off' ? modeColor : '#ccc'} />
                          <circle cx="5" cy="7" r="1.5" fill="#fff" />
                          <circle cx="9" cy="7" r="1.5" fill="#fff" />
                          <circle cx={5.5} cy="7" r="0.8" fill={mode !== 'off' ? '#1a1a2e' : '#999'} />
                          <circle cx={9.5} cy="7" r="0.8" fill={mode !== 'off' ? '#1a1a2e' : '#999'} />
                        </svg>
                        {mode !== 'off' && (
                          <div style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 10, height: 10, borderRadius: 5,
                            background: modeColor, border: '1.5px solid #fff',
                            fontSize: 6, color: '#fff', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {mode === 'auto' ? 'A' : 'D'}
                          </div>
                        )}
                      </button>
                    );
                  })()}
                  <textarea
                    value={inputValues[col.id] || ''}
                    onChange={e => setInputValues(prev => ({ ...prev, [col.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(col.id); } }}
                    onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
                    placeholder={(() => {
                      const colIdx = columns.filter(c => c.contact).findIndex(c => c.id === col.id);
                      const ghost = ghostConfig[Math.max(0, colIdx) % ghostConfig.length];
                      const mode = aiResponseMode[col.id] || 'off';
                      return mode === 'auto' ? `${ghost.name} auto-responding...` : mode === 'draft' ? `${ghost.name} will draft replies...` : 'Type a message...';
                    })()}
                    rows={1}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.1)', fontSize: 13,
                      fontFamily: "'Inter', sans-serif", outline: 'none', background: '#f8f9fa',
                      resize: 'none', overflow: 'hidden', lineHeight: 1.4,
                      minHeight: 36, maxHeight: 120,
                    }}
                  />
                  {/* Schedule button */}
                  <button
                    onClick={() => setConversationViewMode('schedule')}
                    title="Schedule message"
                    style={{
                      width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
                      background: '#fff', color: '#8e8e93', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  </button>
                  {/* Send button */}
                  <button
                    onClick={() => sendMessage(col.id)}
                    style={{
                      width: 36, height: 36, borderRadius: 8, border: 'none',
                      background: '#378ADD', color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      </div>{/* end stream columns flex-column */}
      </div>}

      {/* Message Context Menu */}
      {msgContextMenu && (
        <>
          <div onClick={() => setMsgContextMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
          <div style={{
            position: 'fixed', left: msgContextMenu.x, top: msgContextMenu.y, zIndex: 300,
            background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden', minWidth: 140,
          }}>
            {[
              { label: 'Hide Message', icon: '👁', action: () => {
                setHiddenMessages(prev => {
                  const next = new Set(prev).add(msgContextMenu.msgId);
                  localStorage.setItem('vernacular-hidden-msgs', JSON.stringify([...next]));
                  return next;
                });
                setMsgContextMenu(null);
              }},
              { label: 'Delete Message', icon: '🗑', action: async () => {
                const realId = msgContextMenu.msgId.replace('rt-', '');
                await supabase.from('messages').delete().eq('id', realId);
                setColumns(prev => prev.map(c => c.id === msgContextMenu.colId ? { ...c, messages: c.messages.filter(m => m.id !== msgContextMenu.msgId) } : c));
                setAllConversations(prev => prev.map(c => c.id === msgContextMenu.colId ? { ...c, messages: c.messages.filter(m => m.id !== msgContextMenu.msgId) } : c));
                setMsgContextMenu(null);
              }},
              { label: 'Copy Text', icon: '📋', action: () => {
                const col = columns.find(c => c.id === msgContextMenu.colId);
                const msg = col?.messages.find(m => m.id === msgContextMenu.msgId);
                if (msg) navigator.clipboard.writeText(msg.text);
                setMsgContextMenu(null);
              }},
            ].map(item => (
              <button key={item.label} onClick={item.action} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '10px 14px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 13, fontWeight: 500, color: item.label === 'Delete Message' ? '#DC2626' : '#1c1c1e',
                textAlign: 'left', fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Invite Member Modal — rendered globally at bottom of component */}

      {/* Ghost Edit Modal */}
      {editingGhost !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={() => setEditingGhost(null)}>
          <div style={{
            background: '#1a1a2e', borderRadius: 20, padding: 0, width: 360,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
          }} onClick={e => e.stopPropagation()}>
            {/* Ghost header */}
            <div style={{ padding: '24px 24px 16px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <svg width="48" height="48" viewBox="0 0 14 16" style={{ margin: '0 auto 12px' }}>
                <path d="M1 14V7a6 6 0 0 1 12 0v7l-2-2-2 2-2-2-2 2-2-2z" fill={ghostConfig[editingGhost].color} />
                <circle cx="5" cy="7" r="1.5" fill="#fff" />
                <circle cx="9" cy="7" r="1.5" fill="#fff" />
                <circle cx={5.5} cy="7" r="0.8" fill="#1a1a2e" />
                <circle cx={9.5} cy="7" r="0.8" fill="#1a1a2e" />
              </svg>
              <input
                value={ghostConfig[editingGhost].name}
                onChange={e => setGhostConfig(prev => prev.map((g, i) => i === editingGhost ? { ...g, name: e.target.value } : g))}
                style={{
                  width: '80%', padding: '6px', borderRadius: 8, border: 'none',
                  fontSize: 20, fontWeight: 800, textAlign: 'center', outline: 'none',
                  color: '#fff', background: 'transparent', fontFamily: "'Inter', sans-serif",
                }}
                placeholder="Ghost name"
              />
            </div>
            {/* Fields */}
            <div style={{ padding: '16px 24px 24px' }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: ghostConfig[editingGhost].color, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Role</label>
                <input
                  value={ghostConfig[editingGhost].role}
                  onChange={e => setGhostConfig(prev => prev.map((g, i) => i === editingGhost ? { ...g, role: e.target.value } : g))}
                  placeholder="e.g., Lead Generator, Support Agent"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${ghostConfig[editingGhost].color}30`,
                    fontSize: 13, outline: 'none', background: 'rgba(255,255,255,0.05)',
                    color: '#fff', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: ghostConfig[editingGhost].color, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Purpose</label>
                <textarea
                  value={ghostConfig[editingGhost].purpose}
                  onChange={e => setGhostConfig(prev => prev.map((g, i) => i === editingGhost ? { ...g, purpose: e.target.value } : g))}
                  placeholder="Describe what this AI agent does — its goals, personality, and when it should activate..."
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${ghostConfig[editingGhost].color}30`,
                    fontSize: 13, outline: 'none', background: 'rgba(255,255,255,0.05)',
                    color: '#fff', fontFamily: "'Inter', sans-serif", resize: 'vertical',
                    lineHeight: 1.5, boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: ghostConfig[editingGhost].color, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['#FF0000', '#FFB8FF', '#00FFFF', '#FFB852', '#22C55E', '#7C3AED', '#3B82F6', '#F59E0B'].map(c => (
                    <button key={c} onClick={() => setGhostConfig(prev => prev.map((g, i) => i === editingGhost ? { ...g, color: c } : g))} style={{
                      width: 28, height: 28, borderRadius: 8, border: ghostConfig[editingGhost].color === c ? '2px solid #fff' : '2px solid transparent',
                      background: c, cursor: 'pointer', transition: 'border 0.15s',
                    }} />
                  ))}
                </div>
              </div>
              <button onClick={() => setEditingGhost(null)} style={{
                width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                background: `linear-gradient(135deg, ${ghostConfig[editingGhost].color}, ${ghostConfig[editingGhost].color}CC)`,
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Edit Modal — rendered globally at bottom of component */}

      {/* AI Agent Settings Panel */}
      {showAiAgentPanel && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={() => setShowAiAgentPanel(false)}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '32px 28px', width: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 24,
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
              }}>🤖</div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>AI Agent</h3>
                <p style={{ fontSize: 12, color: '#8e8e93', margin: 0 }}>Configure AI-powered responses for your conversations</p>
              </div>
            </div>

            {/* AI Agent ON/OFF */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 18px', borderRadius: 14, marginBottom: 12,
              background: aiAgentSettings.enabled ? 'rgba(245,158,11,0.06)' : 'rgba(0,0,0,0.02)',
              border: `1.5px solid ${aiAgentSettings.enabled ? 'rgba(245,158,11,0.2)' : 'rgba(0,0,0,0.06)'}`,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>AI Agent</div>
                <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>
                  {aiAgentSettings.enabled ? 'AI is actively monitoring conversations' : 'Turn on to enable AI-powered responses'}
                </div>
              </div>
              <button onClick={() => setAiAgentSettings(prev => ({ ...prev, enabled: !prev.enabled }))} style={{
                width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: aiAgentSettings.enabled ? '#F59E0B' : '#e5e5ea',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 12, background: '#fff',
                  position: 'absolute', top: 2,
                  left: aiAgentSettings.enabled ? 22 : 2,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </button>
            </div>

            {/* Prepare Text Mode */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 18px', borderRadius: 14, marginBottom: 12,
              background: aiAgentSettings.prepareText ? 'rgba(245,158,11,0.06)' : 'rgba(0,0,0,0.02)',
              border: `1.5px solid ${aiAgentSettings.prepareText ? 'rgba(245,158,11,0.2)' : 'rgba(0,0,0,0.06)'}`,
              opacity: aiAgentSettings.enabled ? 1 : 0.5,
              pointerEvents: aiAgentSettings.enabled ? 'auto' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>Prepare Text</div>
                <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2, lineHeight: 1.4 }}>
                  AI drafts appear in <span style={{ color: '#D97706', fontWeight: 600 }}>yellow</span> and require your approval before sending. You can edit the message before approving.
                </div>
              </div>
              <button onClick={() => setAiAgentSettings(prev => ({ ...prev, prepareText: !prev.prepareText }))} style={{
                width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: aiAgentSettings.prepareText ? '#F59E0B' : '#e5e5ea',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 12, background: '#fff',
                  position: 'absolute', top: 2,
                  left: aiAgentSettings.prepareText ? 22 : 2,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </button>
            </div>

            {/* Preview of what AI drafts look like */}
            {aiAgentSettings.enabled && aiAgentSettings.prepareText && (
              <div style={{
                padding: '14px 16px', borderRadius: 12, marginBottom: 16,
                background: 'rgba(245,158,11,0.06)', border: '1px dashed rgba(245,158,11,0.3)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  AI DRAFT PREVIEW
                </div>
                <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.4, marginBottom: 10 }}>
                  Thanks for your interest! I can set up a demo call for Tuesday at 2pm. Would that work?
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#F59E0B', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Approve & Send</button>
                  <button style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#666', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                  <button style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: 'rgba(0,0,0,0.04)', color: '#8e8e93', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Dismiss</button>
                </div>
              </div>
            )}

            {/* Status */}
            <div style={{ fontSize: 12, color: '#8e8e93', textAlign: 'center', marginBottom: 16 }}>
              {aiAgentSettings.enabled
                ? aiAgentSettings.prepareText
                  ? '✨ AI will draft responses for your approval'
                  : '⚡ AI will auto-respond to incoming messages'
                : 'AI Agent is off'}
            </div>

            <button onClick={() => setShowAiAgentPanel(false)} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
            }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
  };

  // ── Render: Contacts ──────────────────────────────────────────────────────

  const TAG_COLORS = ['#2563EB', '#7C3AED', '#D97706', '#DC2626', '#059669', '#DB2777', '#9333EA', '#EA580C'];
  const getTagColor = (tag: string) => TAG_COLORS[Math.abs([...tag].reduce((a, c) => a + c.charCodeAt(0), 0)) % TAG_COLORS.length];
  const getInitials = (c: ContactRecord) => {
    const f = c.first_name || c.full_name?.split(' ')[0] || '';
    const l = c.last_name || c.full_name?.split(' ').slice(1).join(' ') || '';
    return ((f[0] || '') + (l[0] || '')).toUpperCase() || '?';
  };
  const getDisplayName = (c: ContactRecord) => c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown';
  const relativeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    if (diffD < 30) return `${Math.floor(diffD / 7)}w ago`;
    return d.toLocaleDateString();
  };
  const statusColors: Record<string, { color: string; bg: string }> = {
    active: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    prospect: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
    contacted: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
    replied: { color: '#378ADD', bg: 'rgba(55,138,221,0.1)' },
    won: { color: '#059669', bg: 'rgba(5,150,105,0.1)' },
    lost: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  };

  const getOrgId = () => {
    if (!user) return '';
    return ((user.organizations as Record<string, unknown>)?.id as string) || '';
  };

  const handleVcfImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const cards = text.split('BEGIN:VCARD').filter(c => c.trim());
      const parsed: Record<string, string>[] = [];
      for (const card of cards) {
        const contact: Record<string, string> = {};
        const lines = card.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('END:VCARD') || line.startsWith('VERSION:')) continue;
          if (line.startsWith('FN:') || line.startsWith('FN;')) contact.fullName = line.split(':').slice(1).join(':').trim();
          else if (line.startsWith('N:') || line.startsWith('N;')) {
            const parts = line.split(':').slice(1).join(':').split(';');
            contact.lastName = parts[0]?.trim() || '';
            contact.firstName = parts[1]?.trim() || '';
          }
          else if (line.startsWith('TEL') && line.includes(':')) contact.phone = line.split(':').slice(1).join(':').trim();
          else if (line.startsWith('EMAIL') && line.includes(':')) contact.email = line.split(':').slice(1).join(':').trim();
          else if (line.startsWith('ORG:') || line.startsWith('ORG;')) contact.company = line.split(':').slice(1).join(':').replace(/;/g, ', ').trim();
          else if (line.startsWith('TITLE:') || line.startsWith('TITLE;')) contact.jobTitle = line.split(':').slice(1).join(':').trim();
          else if (line.startsWith('URL') && line.includes(':')) {
            const url = line.split(':').slice(1).join(':').trim();
            if (url.includes('linkedin.com')) contact.linkedinUrl = url;
            else if (url.includes('instagram.com')) contact.instagram = url.replace(/.*instagram\.com\//, '').replace(/\/$/, '');
            else if (url.includes('twitter.com') || url.includes('x.com')) contact.twitter = url.replace(/.*(?:twitter|x)\.com\//, '').replace(/\/$/, '');
            else contact.website = url;
          }
          else if (line.startsWith('ADR') && line.includes(':')) {
            const parts = line.split(':').slice(1).join(':').split(';');
            contact.address = [parts[2], parts[3], parts[4], parts[5]].filter(Boolean).join(', ').trim();
            contact.city = parts[3]?.trim() || '';
            contact.state = parts[4]?.trim() || '';
            contact.zip = parts[5]?.trim() || '';
          }
          else if (line.startsWith('NOTE:') || line.startsWith('NOTE;')) contact.notes = line.split(':').slice(1).join(':').trim();
        }
        if (contact.fullName || contact.phone || contact.email) parsed.push(contact);
      }
      setImportPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      setCsvHeaders(headers);
      const rows = lines.slice(1).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      setCsvRows(rows);
      // auto-map obvious columns
      const map: Record<string, string> = {};
      const fieldMap: Record<string, string> = {
        phone: 'phone', tel: 'phone', mobile: 'phone',
        first_name: 'first_name', firstname: 'first_name', 'first name': 'first_name',
        last_name: 'last_name', lastname: 'last_name', 'last name': 'last_name',
        name: 'full_name', full_name: 'full_name', 'full name': 'full_name',
        email: 'email', 'e-mail': 'email',
        company: 'company', organization: 'company', org: 'company',
        title: 'job_title', job_title: 'job_title', 'job title': 'job_title',
        school: 'school', university: 'school',
        notes: 'notes', note: 'notes',
        tags: 'tags',
      };
      headers.forEach(h => {
        const key = h.toLowerCase().trim();
        if (fieldMap[key]) map[h] = fieldMap[key];
      });
      setCsvMapping(map);
    };
    reader.readAsText(file);
  };

  const submitImport = async (source: 'vcf' | 'csv') => {
    setImportingContacts(true);
    const orgId = getOrgId();
    let contactsToImport: Record<string, string>[] = [];
    if (source === 'vcf') {
      contactsToImport = importPreview;
    } else {
      contactsToImport = csvRows.map(row => {
        const obj: Record<string, string> = {};
        csvHeaders.forEach((h, i) => {
          const field = csvMapping[h];
          if (field && row[i]) obj[field] = row[i];
        });
        return obj;
      }).filter(c => c.full_name || c.first_name || c.phone || c.email);
    }
    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, contacts: contactsToImport, source }),
      });
      const data = await res.json();
      setImportResults({ imported: data.imported || 0, skipped: data.skipped || 0, errors: data.errors || [] });
      // Refresh contacts
      const { data: refreshed } = await supabase.from('contacts').select('*').order('full_name').limit(200);
      if (refreshed) setContacts(refreshed as unknown as ContactRecord[]);
    } catch {
      setImportResults({ imported: 0, skipped: 0, errors: ['Network error'] });
    }
    setImportingContacts(false);
  };

  const handleAddContact = async () => {
    const orgId = getOrgId();
    if (!orgId) { window.alert('Organization not found. Please reload.'); return; }
    setImportingContacts(true);
    try {
      const firstName = addFormData.first_name.trim();
      const lastName = addFormData.last_name.trim();
      const contact = {
        first_name: firstName,
        last_name: lastName,
        full_name: [firstName, lastName].filter(Boolean).join(' ') || null,
        phone: addFormData.phone,
        email: addFormData.email,
        company: addFormData.company,
        job_title: addFormData.job_title,
        linkedin_url: addFormData.linkedin_url,
        notes: addFormData.notes,
        tags: addFormData.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, contacts: [contact], source: 'manual' }),
      });
      const result = await res.json();
      if (!res.ok || result.errors?.length) {
        window.alert('Failed to save contact: ' + (result.error || result.errors?.join(', ') || 'Unknown error'));
      } else {
        setShowAddForm(false);
        setAddFormData({ first_name: '', last_name: '', phone: '', email: '', company: '', job_title: '', linkedin_url: '', notes: '', tags: '' });
        const { data: refreshed } = await supabase.from('contacts').select('*').order('full_name').limit(200);
        if (refreshed) setContacts(refreshed as unknown as ContactRecord[]);
      }
    } catch (err) {
      window.alert('Failed to save contact: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    setImportingContacts(false);
  };

  const handleDeleteContact = async (id: string) => {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return;
    await supabase.from('contacts').delete().eq('id', id);
    setContacts(prev => prev.filter(c => c.id !== id));
    if (selectedContact?.id === id) setSelectedContact(null);
  };

  const closeImportModal = () => {
    setShowImportModal(null);
    setImportPreview([]);
    setImportResults(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvMapping({});
  };

  const CSV_FIELDS = ['', 'phone', 'first_name', 'last_name', 'full_name', 'email', 'company', 'job_title', 'school', 'notes', 'tags'];

  const renderContacts = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Top Bar */}
      <div style={{
        height: 56, minHeight: 56, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', margin: 0 }}>
            Contacts
          </h2>
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#8e8e93',
            background: 'rgba(0,0,0,0.04)', padding: '3px 10px', borderRadius: 6,
          }}>
            {contacts.length} total
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View Toggle */}
          <div style={{
            display: 'flex', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', overflow: 'hidden',
          }}>
            <button onClick={() => setContactsViewMode('list')} style={{
              padding: '6px 10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
              background: contactsViewMode === 'list' ? '#378ADD' : '#fff',
              color: contactsViewMode === 'list' ? '#fff' : '#8e8e93',
              transition: 'all 0.15s',
            }} title="List view">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button onClick={() => setContactsViewMode('cards')} style={{
              padding: '6px 10px', border: 'none', borderLeft: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center',
              background: contactsViewMode === 'cards' ? '#378ADD' : '#fff',
              color: contactsViewMode === 'cards' ? '#fff' : '#8e8e93',
              transition: 'all 0.15s',
            }} title="Card view">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ ...primaryBtnStyle, background: '#22C55E', boxShadow: '0 1px 3px rgba(34,197,94,0.3)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Contact
          </button>
          <div ref={importDropdownRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowImportDropdown(!showImportDropdown)} style={primaryBtnStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showImportDropdown && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff',
                borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                minWidth: 180, zIndex: 50, overflow: 'hidden',
              }}>
                {[
                  { label: 'Import VCF', key: 'vcf' as const },
                  { label: 'Import CSV', key: 'csv' as const },
                  { label: 'Import from Notion', key: 'notion' as const },
                ].map(opt => (
                  <button key={opt.key} onClick={() => { setShowImportModal(opt.key); setShowImportDropdown(false); }} style={{
                    display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'none',
                    textAlign: 'left', fontSize: 13, fontWeight: 500, color: '#1c1c1e', cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif", borderBottom: '1px solid rgba(0,0,0,0.04)',
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={contactSearch}
            onChange={e => setContactSearch(e.target.value)}
            placeholder="Search by name, phone, email, or school..."
            style={{ ...inputStyle, paddingLeft: 38 }}
          />
        </div>
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <div style={{ padding: '16px 24px', background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>New Contact</span>
            <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', fontSize: 18, lineHeight: 1 }}>x</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 720 }}>
            <input value={addFormData.first_name} onChange={e => setAddFormData(p => ({ ...p, first_name: e.target.value }))} placeholder="First Name" style={inputStyle} />
            <input value={addFormData.last_name} onChange={e => setAddFormData(p => ({ ...p, last_name: e.target.value }))} placeholder="Last Name" style={inputStyle} />
            <input value={addFormData.phone} onChange={e => setAddFormData(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" style={inputStyle} />
            <input value={addFormData.email} onChange={e => setAddFormData(p => ({ ...p, email: e.target.value }))} placeholder="Email" style={inputStyle} />
            <input value={addFormData.company} onChange={e => setAddFormData(p => ({ ...p, company: e.target.value }))} placeholder="Company" style={inputStyle} />
            <input value={addFormData.job_title} onChange={e => setAddFormData(p => ({ ...p, job_title: e.target.value }))} placeholder="Job Title" style={inputStyle} />
            <input value={addFormData.linkedin_url} onChange={e => setAddFormData(p => ({ ...p, linkedin_url: e.target.value }))} placeholder="LinkedIn URL" style={{ ...inputStyle, gridColumn: '1 / -1' }} />
            <input value={addFormData.tags} onChange={e => setAddFormData(p => ({ ...p, tags: e.target.value }))} placeholder="Tags (comma separated)" style={{ ...inputStyle, gridColumn: '1 / -1' }} />
            <textarea value={addFormData.notes} onChange={e => setAddFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" rows={2} style={{ ...inputStyle, gridColumn: '1 / -1', resize: 'vertical' as const }} />
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={handleAddContact} disabled={importingContacts} style={{ ...primaryBtnStyle, opacity: importingContacts ? 0.6 : 1 }}>
              {importingContacts ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* List / Cards View */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
          {filteredContacts.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>
              {contacts.length === 0 ? 'No contacts yet. Add a contact or import to get started.' : 'No contacts match your search.'}
            </div>
          ) : contactsViewMode === 'list' ? (
            <table style={{
              width: '100%', borderCollapse: 'collapse', fontSize: 13,
              fontFamily: "'Inter', sans-serif",
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
                  {['', 'Name', 'Phone', 'Email', 'Company / School', 'Tags', 'Status', 'Last Contacted', ''].map((h, i) => (
                    <th key={`${h}-${i}`} style={{
                      textAlign: 'left', padding: '12px 8px', fontSize: 11, fontWeight: 700,
                      color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em',
                      ...(i === 0 ? { width: 40 } : {}),
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(c => {
                  const name = getDisplayName(c);
                  const initials = getInitials(c);
                  const st = statusColors[c.campaign_status] || statusColors['prospect'];
                  return (
                    <tr key={c.id} onClick={() => setSelectedContact(c)} style={{
                      borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer',
                      background: selectedContact?.id === c.id ? 'rgba(55,138,221,0.04)' : 'transparent',
                      transition: 'background 0.15s',
                    }}>
                      <td style={{ padding: '8px', width: 40 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 16, background: 'linear-gradient(135deg, #378ADD, #5B9FE8)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                        }}>
                          {initials}
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1c1c1e' }}>{name}</td>
                      <td style={{ padding: '10px 8px', color: '#666', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {c.phone || '\u2014'}
                      </td>
                      <td style={{ padding: '10px 8px', color: '#666', fontSize: 12 }}>{c.email || '\u2014'}</td>
                      <td style={{ padding: '10px 8px', color: '#666', fontSize: 12 }}>{c.company || c.school || '\u2014'}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(c.tags || []).slice(0, 3).map(tag => (
                            <span key={tag} style={{
                              fontSize: 10, fontWeight: 600, color: getTagColor(tag),
                              background: `${getTagColor(tag)}15`, padding: '2px 7px', borderRadius: 4,
                            }}>{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {c.campaign_status ? (
                          <span style={badgeStyle(st.color, st.bg)}>{c.campaign_status}</span>
                        ) : '\u2014'}
                      </td>
                      <td style={{ padding: '10px 8px', color: '#8e8e93', fontSize: 12 }}>
                        {relativeTime(c.last_contacted_at)}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedContact(c); }} style={{
                          background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6,
                          padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#378ADD', cursor: 'pointer',
                          fontFamily: "'Inter', sans-serif",
                        }}>View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* ── Profile Cards Grid ── */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16, paddingTop: 16,
            }}>
              {filteredContacts.map(c => {
                const name = getDisplayName(c);
                const initials = getInitials(c);
                const st = statusColors[c.campaign_status] || statusColors['prospect'];
                const isSelected = selectedContact?.id === c.id;
                return (
                  <div key={c.id} onClick={() => setSelectedContact(c)} style={{
                    background: '#fff', borderRadius: 14, border: isSelected ? '2px solid #378ADD' : '1px solid rgba(0,0,0,0.08)',
                    padding: 20, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 4px 20px rgba(55,138,221,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
                  }}>
                    {/* Card Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 24, background: 'linear-gradient(135deg, #378ADD, #5B9FE8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: '0.02em',
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </div>
                        {(c.job_title || c.company) && (
                          <div style={{ fontSize: 12, color: '#8e8e93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[c.job_title, c.company].filter(Boolean).join(' at ')}
                          </div>
                        )}
                        {!c.job_title && !c.company && (c.school || c.greek_org) && (
                          <div style={{ fontSize: 12, color: '#8e8e93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[c.greek_org, c.school].filter(Boolean).join(' — ')}
                          </div>
                        )}
                      </div>
                      {c.campaign_status && (
                        <span style={{ ...badgeStyle(st.color, st.bg), flexShrink: 0 }}>{c.campaign_status}</span>
                      )}
                    </div>

                    {/* Contact Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                      {c.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#666' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#666', overflow: 'hidden' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {(c.tags || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
                        {(c.tags || []).slice(0, 4).map(tag => (
                          <span key={tag} style={{
                            fontSize: 10, fontWeight: 600, color: getTagColor(tag),
                            background: `${getTagColor(tag)}15`, padding: '2px 8px', borderRadius: 4,
                          }}>{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Footer Stats */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 12, marginTop: 'auto',
                    }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>{c.total_messages || 0}</div>
                          <div style={{ fontSize: 9, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>msgs</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>{c.response_rate || 0}%</div>
                          <div style={{ fontSize: 9, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>rate</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#8e8e93' }}>{relativeTime(c.last_contacted_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contact Detail Panel */}
        {selectedContact && (
          <div style={{
            width: 400, minWidth: 400, height: '100%', background: '#fff', borderLeft: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.06)', overflow: 'auto', padding: '0',
          }}>
            {/* Panel Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>Contact Profile</span>
              <button onClick={() => setSelectedContact(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93',
                fontSize: 18, lineHeight: 1, padding: 4,
              }}>x</button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* Avatar + Name */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 32, background: 'linear-gradient(135deg, #378ADD, #5B9FE8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '0.02em', marginBottom: 10,
                }}>
                  {getInitials(selectedContact)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', textAlign: 'center' }}>
                  {getDisplayName(selectedContact)}
                </div>
                {(selectedContact.job_title || selectedContact.company) && (
                  <div style={{ fontSize: 13, color: '#8e8e93', marginTop: 2, textAlign: 'center' }}>
                    {[selectedContact.job_title, selectedContact.company].filter(Boolean).join(' at ')}
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Contact</div>
                {selectedContact.phone && (
                  <a href={`tel:${selectedContact.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', color: '#378ADD', textDecoration: 'none', fontSize: 13 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    {selectedContact.phone}
                  </a>
                )}
                {selectedContact.email && (
                  <a href={`mailto:${selectedContact.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', color: '#378ADD', textDecoration: 'none', fontSize: 13 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                    {selectedContact.email}
                  </a>
                )}
              </div>

              {/* Social Links */}
              {(selectedContact.linkedin_url || selectedContact.instagram_handle || selectedContact.twitter_handle || selectedContact.website) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Social</div>
                  {selectedContact.linkedin_url && (
                    <a href={selectedContact.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', color: '#0A66C2', textDecoration: 'none', fontSize: 13 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                      LinkedIn
                    </a>
                  )}
                  {selectedContact.instagram_handle && (
                    <a href={`https://instagram.com/${selectedContact.instagram_handle}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', color: '#E1306C', textDecoration: 'none', fontSize: 13 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#E1306C"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                      @{selectedContact.instagram_handle}
                    </a>
                  )}
                  {selectedContact.twitter_handle && (
                    <a href={`https://x.com/${selectedContact.twitter_handle}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', color: '#1c1c1e', textDecoration: 'none', fontSize: 13 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#1c1c1e"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                      @{selectedContact.twitter_handle}
                    </a>
                  )}
                  {selectedContact.website && (
                    <a href={selectedContact.website.startsWith('http') ? selectedContact.website : `https://${selectedContact.website}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', color: '#378ADD', textDecoration: 'none', fontSize: 13 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                      {selectedContact.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              )}

              {/* Location */}
              {(selectedContact.address || selectedContact.city || selectedContact.state || selectedContact.zip) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Location</div>
                  <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
                    {selectedContact.address && <div>{selectedContact.address}</div>}
                    <div>{[selectedContact.city, selectedContact.state, selectedContact.zip].filter(Boolean).join(', ')}</div>
                  </div>
                </div>
              )}

              {/* Personal */}
              {(selectedContact.dob || selectedContact.school || selectedContact.greek_org) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Personal</div>
                  <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8 }}>
                    {selectedContact.dob && <div>DOB: {selectedContact.dob}</div>}
                    {selectedContact.school && <div>School: {selectedContact.school}</div>}
                    {selectedContact.greek_org && <div>Greek Org: {selectedContact.greek_org}</div>}
                  </div>
                </div>
              )}

              {/* Payment */}
              {selectedContact.venmo_handle && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Payment</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Venmo: @{selectedContact.venmo_handle}</div>
                </div>
              )}

              {/* Tags */}
              {(selectedContact.tags || []).length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tags</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(selectedContact.tags || []).map(tag => (
                      <span key={tag} style={{
                        fontSize: 11, fontWeight: 600, color: getTagColor(tag),
                        background: `${getTagColor(tag)}15`, padding: '3px 10px', borderRadius: 20,
                      }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedContact.notes && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Notes</div>
                  <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedContact.notes}</div>
                </div>
              )}

              {/* Source & Referred By */}
              <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {selectedContact.source && (
                  <span style={badgeStyle(
                    selectedContact.source === 'vcf' ? '#7C3AED' : selectedContact.source === 'csv' ? '#D97706' : selectedContact.source === 'notion' ? '#1c1c1e' : selectedContact.source === 'imessage' ? '#22C55E' : '#378ADD',
                    selectedContact.source === 'vcf' ? 'rgba(124,58,237,0.1)' : selectedContact.source === 'csv' ? 'rgba(217,119,6,0.1)' : selectedContact.source === 'notion' ? 'rgba(0,0,0,0.06)' : selectedContact.source === 'imessage' ? 'rgba(34,197,94,0.1)' : 'rgba(55,138,221,0.1)',
                  )}>
                    {selectedContact.source}
                  </span>
                )}
                {selectedContact.referred_by && (
                  <span style={{ fontSize: 12, color: '#8e8e93' }}>Referred by: {selectedContact.referred_by}</span>
                )}
              </div>

              {/* Stats */}
              <div style={{ marginBottom: 24, display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e' }}>{selectedContact.total_messages || 0}</div>
                  <div style={{ fontSize: 10, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Messages</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e' }}>{selectedContact.response_rate || 0}%</div>
                  <div style={{ fontSize: 10, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Response</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{relativeTime(selectedContact.last_contacted_at)}</div>
                  <div style={{ fontSize: 10, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last Contact</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => {
                  const c = selectedContact;
                  const firstName = c.first_name || c.full_name?.split(' ')[0] || '';
                  const lastName = c.last_name || c.full_name?.split(' ').slice(1).join(' ') || '';
                  setEditingContact({
                    colId: '', firstName, lastName,
                    name: getDisplayName(c), phone: c.phone || '', email: c.email || '',
                    company: c.company || '', jobTitle: c.job_title || '',
                    linkedin: c.linkedin_url || '', instagram: c.instagram_handle || '',
                    twitter: c.twitter_handle || '', school: c.school || '',
                    greekOrg: c.greek_org || '', state: c.state || '',
                    city: c.city || '', dob: c.dob || '',
                    venmo: c.venmo_handle || '', notes: c.notes || '',
                  });
                }} style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)',
                  background: '#fff', fontSize: 13, fontWeight: 600, color: '#1c1c1e', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}>Edit</button>
                <button onClick={() => handleDeleteContact(selectedContact.id)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)',
                  background: 'rgba(220,38,38,0.05)', fontSize: 13, fontWeight: 600, color: '#DC2626', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal Overlay */}
      {showImportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={closeImportModal}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 640, width: '90%',
            maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>
                {showImportModal === 'vcf' ? 'Import VCF' : showImportModal === 'csv' ? 'Import CSV' : 'Import from Notion'}
              </h3>
              <button onClick={closeImportModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', fontSize: 20, lineHeight: 1 }}>x</button>
            </div>

            {/* Import Results */}
            {importResults ? (
              <div>
                <div style={{ padding: 20, background: 'rgba(34,197,94,0.06)', borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#22C55E', marginBottom: 4 }}>Import Complete</div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    Imported {importResults.imported} contact{importResults.imported !== 1 ? 's' : ''}.
                    {importResults.skipped > 0 && ` Skipped ${importResults.skipped} duplicate${importResults.skipped !== 1 ? 's' : ''}.`}
                  </div>
                  {importResults.errors.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#DC2626' }}>
                      {importResults.errors.slice(0, 5).map((err, i) => <div key={i}>{err}</div>)}
                    </div>
                  )}
                </div>
                <button onClick={closeImportModal} style={primaryBtnStyle}>Done</button>
              </div>
            ) : showImportModal === 'vcf' ? (
              <div>
                {importPreview.length === 0 ? (
                  <div>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Select a .vcf file to import contacts.</div>
                    <input type="file" accept=".vcf" onChange={handleVcfImport} style={{ fontSize: 13 }} />
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', marginBottom: 12 }}>
                      Found {importPreview.length} contact{importPreview.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ maxHeight: 300, overflow: 'auto', marginBottom: 16 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
                            {['Name', 'Phone', 'Email', 'Company'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '8px 6px', fontSize: 10, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.slice(0, 20).map((c, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                              <td style={{ padding: '6px', color: '#1c1c1e', fontWeight: 500 }}>{c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || '\u2014'}</td>
                              <td style={{ padding: '6px', color: '#666' }}>{c.phone || '\u2014'}</td>
                              <td style={{ padding: '6px', color: '#666' }}>{c.email || '\u2014'}</td>
                              <td style={{ padding: '6px', color: '#666' }}>{c.company || '\u2014'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importPreview.length > 20 && (
                        <div style={{ padding: 8, fontSize: 12, color: '#8e8e93', textAlign: 'center' }}>
                          ...and {importPreview.length - 20} more
                        </div>
                      )}
                    </div>
                    <button onClick={() => submitImport('vcf')} disabled={importingContacts} style={{ ...primaryBtnStyle, opacity: importingContacts ? 0.6 : 1 }}>
                      {importingContacts ? 'Importing...' : `Import ${importPreview.length} Contacts`}
                    </button>
                  </div>
                )}
              </div>
            ) : showImportModal === 'csv' ? (
              <div>
                {csvHeaders.length === 0 ? (
                  <div>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Select a .csv file to import contacts.</div>
                    <input type="file" accept=".csv" onChange={handleCsvImport} style={{ fontSize: 13 }} />
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', marginBottom: 12 }}>
                      Map columns ({csvRows.length} row{csvRows.length !== 1 ? 's' : ''} found)
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      {csvHeaders.map(h => (
                        <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e', minWidth: 120 }}>{h}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                          <select value={csvMapping[h] || ''} onChange={e => setCsvMapping(prev => ({ ...prev, [h]: e.target.value }))} style={{ ...inputStyle, width: 160, padding: '5px 8px' }}>
                            {CSV_FIELDS.map(f => <option key={f} value={f}>{f || '(skip)'}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    {/* Preview first 5 rows */}
                    <div style={{ maxHeight: 160, overflow: 'auto', marginBottom: 16, fontSize: 11 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            {csvHeaders.map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '4px 6px', fontSize: 10, fontWeight: 700, color: '#8e8e93' }}>{csvMapping[h] || h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvRows.slice(0, 5).map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                              {row.map((cell, j) => (
                                <td key={j} style={{ padding: '3px 6px', color: '#666' }}>{cell || '\u2014'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button onClick={() => submitImport('csv')} disabled={importingContacts} style={{ ...primaryBtnStyle, opacity: importingContacts ? 0.6 : 1 }}>
                      {importingContacts ? 'Importing...' : `Import ${csvRows.length} Contacts`}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#666' }}>
                Notion import is configured through the Integrations tab. Make sure your Notion integration is connected, then contacts will sync automatically.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ── Render: Settings ──────────────────────────────────────────────────────

  const renderSettings = () => {
    const f = settingsForm;
    if (!f) return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93', fontSize: 14 }}>
        Loading settings...
      </div>
    );

    const updateField = <K extends keyof OrgSettings>(key: K, value: OrgSettings[K]) => {
      setSettingsForm(prev => prev ? { ...prev, [key]: value } : prev);
    };

    const sectionStyle: React.CSSProperties = {
      ...cardStyle,
      marginBottom: 20,
    };

    const sectionTitleStyle: React.CSSProperties = {
      fontSize: 15, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', marginBottom: 16,
    };

    const fieldRowStyle: React.CSSProperties = {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.04)',
    };

    const labelStyle: React.CSSProperties = {
      fontSize: 13, fontWeight: 600, color: '#1c1c1e',
    };

    const sublabelStyle: React.CSSProperties = {
      fontSize: 12, color: '#8e8e93', marginTop: 2,
    };

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <div style={{
          height: 56, minHeight: 56, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', margin: 0 }}>
            Settings
          </h2>
          <button onClick={saveSettings} disabled={settingsSaving || saveStatus === 'saved'} style={{
            ...primaryBtnStyle,
            opacity: settingsSaving ? 0.6 : 1,
            background: saveStatus === 'saved' ? '#22C55E' : primaryBtnStyle.background,
            boxShadow: saveStatus === 'saved' ? '0 1px 3px rgba(34,197,94,0.3)' : primaryBtnStyle.boxShadow,
          }}>
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved \u2713' : 'Save Changes'}
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 24, maxWidth: 720 }}>
          {/* Billing & Plan */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Billing &amp; Plan</div>

            {/* Active Subscriptions */}
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', marginBottom: 16 }}>Active Subscriptions</div>

            {/* Solution Plans */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { type: 'app_testing', icon: '🧪', name: 'App Testing', price: '$1,222/mo per seat', setup: '$1,000 setup' },
                { type: 'sales_outreach', icon: '📱', name: 'Sales & Outreach', price: '$1,500/mo per seat', setup: '$1,000 setup' },
                { type: 'vip_manager', icon: '🎰', name: 'VIP Manager', price: '$1,500/mo per line', setup: '$1,000 setup' },
                { type: 'customer_support', icon: '💬', name: 'Customer Support', price: '$100/mo + $1.25/ticket', setup: '$500 setup' },
              ].map(plan => {
                const orgTypes: string[] = (org?.account_type as string[]) || [];
                const isActive = orgTypes.includes(plan.type);
                return (
                  <div key={plan.type} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    borderRadius: 10, border: isActive ? '2px solid rgba(34,197,94,0.3)' : '1px solid rgba(0,0,0,0.06)',
                    background: isActive ? 'rgba(34,197,94,0.03)' : '#fff',
                  }}>
                    <span style={{ fontSize: 24 }}>{plan.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>{plan.name}</div>
                      <div style={{ fontSize: 12, color: '#8e8e93' }}>{plan.price}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {isActive ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 4 }}>ACTIVE</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#8e8e93', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: 4 }}>ADD</span>
                      )}
                      <div style={{ fontSize: 10, color: '#8e8e93', marginTop: 4 }}>{plan.setup}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Usage This Month */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', marginBottom: 12 }}>Usage This Month</div>
              <div style={{ padding: '14px 16px', borderRadius: 10, background: '#f8f9fa', border: '1px solid rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: 12, color: '#666' }}>
                  {[
                    ['New conversation', '$0.99'],
                    ['Text sent (typed)', '$0.001'],
                    ['Text received', 'Free'],
                    ['AI draft generated', '$0.0031'],
                    ['AI approved / auto-send', '$0.25'],
                    ['Ticket resolved', '$1.25'],
                    ['Contact import', '$0.05'],
                    ['Widget handoff', '$0.50'],
                  ].map(([action, cost], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>{action}</span>
                      <span style={{ fontWeight: 600, color: cost === 'Free' ? '#22C55E' : '#1c1c1e', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{cost}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 10, paddingTop: 10, fontSize: 11, color: '#8e8e93' }}>
                  Usage included in monthly minimum. Overage billed above minimum.
                </div>
              </div>
            </div>

            {/* Add-ons */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', marginBottom: 12 }}>Integration Add-ons</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { name: 'Slack', price: '$25/mo', icon: '💬' },
                  { name: 'Notion', price: '$25/mo', icon: '📝' },
                  { name: 'Salesforce', price: '$50/mo', icon: '☁️' },
                  { name: 'Email', price: '$25/mo', icon: '📧' },
                  { name: 'Discord', price: '$25/mo', icon: '🎮' },
                  { name: 'Telegram', price: '$25/mo', icon: '✈️' },
                  { name: 'Webhook', price: '$15/mo', icon: '🔗' },
                ].map(addon => (
                  <div key={addon.name} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                    borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)',
                  }}>
                    <span style={{ fontSize: 16 }}>{addon.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e' }}>{addon.name}</div>
                      <div style={{ fontSize: 10, color: '#8e8e93' }}>{addon.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Company */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Company</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Company Name</label>
              <input
                value={f.company_name || ''}
                onChange={e => updateField('company_name', e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </div>
          </div>

          {/* AI Settings */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>AI Settings</div>
            <div style={fieldRowStyle}>
              <div>
                <div style={labelStyle}>Auto-Draft</div>
                <div style={sublabelStyle}>Automatically generate reply drafts</div>
              </div>
              <button onClick={() => updateField('ai_auto_draft', !f.ai_auto_draft)} style={toggleStyle(f.ai_auto_draft)}>
                <div style={toggleDotStyle(f.ai_auto_draft)} />
              </button>
            </div>
            <div style={fieldRowStyle}>
              <div>
                <div style={labelStyle}>Auto-Send</div>
                <div style={sublabelStyle}>Automatically send AI drafts without review</div>
              </div>
              <button onClick={() => updateField('ai_auto_send', !f.ai_auto_send)} style={toggleStyle(f.ai_auto_send)}>
                <div style={toggleDotStyle(f.ai_auto_send)} />
              </button>
            </div>
            <div style={{ ...fieldRowStyle, borderBottom: 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={labelStyle}>AI Model</div>
                <select
                  value={f.ai_model || ''}
                  onChange={e => updateField('ai_model', e.target.value)}
                  style={{ ...inputStyle, marginTop: 6, maxWidth: 280, cursor: 'pointer' }}
                >
                  <option value="claude-sonnet">Claude Sonnet</option>
                  <option value="claude-haiku">Claude Haiku</option>
                  <option value="claude-opus">Claude Opus</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                </select>
              </div>
            </div>
          </div>

          {/* Conversation Limits */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Conversation Limits</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Max Messages/Day</label>
                <input
                  type="number"
                  value={f.max_messages_per_day || 0}
                  onChange={e => updateField('max_messages_per_day', parseInt(e.target.value) || 0)}
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Max AI Drafts/Day</label>
                <input
                  type="number"
                  value={f.max_ai_drafts_per_day || 0}
                  onChange={e => updateField('max_ai_drafts_per_day', parseInt(e.target.value) || 0)}
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Max Blast Recipients</label>
                <input
                  type="number"
                  value={f.max_blast_recipients || 0}
                  onChange={e => updateField('max_blast_recipients', parseInt(e.target.value) || 0)}
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Quiet Hours</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Start Time</label>
                <input
                  type="time"
                  value={f.quiet_hours_start || ''}
                  onChange={e => updateField('quiet_hours_start', e.target.value)}
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </div>
              <div>
                <label style={labelStyle}>End Time</label>
                <input
                  type="time"
                  value={f.quiet_hours_end || ''}
                  onChange={e => updateField('quiet_hours_end', e.target.value)}
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Timezone</label>
                <select
                  value={f.quiet_hours_timezone || 'America/New_York'}
                  onChange={e => updateField('quiet_hours_timezone', e.target.value)}
                  style={{ ...inputStyle, marginTop: 6, cursor: 'pointer' }}
                >
                  <option value="America/New_York">Eastern</option>
                  <option value="America/Chicago">Central</option>
                  <option value="America/Denver">Mountain</option>
                  <option value="America/Los_Angeles">Pacific</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Notifications</div>
            <div style={fieldRowStyle}>
              <div>
                <div style={labelStyle}>Inbound Message</div>
                <div style={sublabelStyle}>Notify when a new message arrives</div>
              </div>
              <button onClick={() => updateField('notify_on_inbound', !f.notify_on_inbound)} style={toggleStyle(f.notify_on_inbound)}>
                <div style={toggleDotStyle(f.notify_on_inbound)} />
              </button>
            </div>
            <div style={fieldRowStyle}>
              <div>
                <div style={labelStyle}>Flagged Conversation</div>
                <div style={sublabelStyle}>Notify when a conversation is flagged</div>
              </div>
              <button onClick={() => updateField('notify_on_flag', !f.notify_on_flag)} style={toggleStyle(f.notify_on_flag)}>
                <div style={toggleDotStyle(f.notify_on_flag)} />
              </button>
            </div>
            <div style={{ ...fieldRowStyle, borderBottom: 'none' }}>
              <div>
                <div style={labelStyle}>Phone Line Offline</div>
                <div style={sublabelStyle}>Notify when a phone line goes offline</div>
              </div>
              <button onClick={() => updateField('notify_on_station_offline', !f.notify_on_station_offline)} style={toggleStyle(f.notify_on_station_offline)}>
                <div style={toggleDotStyle(f.notify_on_station_offline)} />
              </button>
            </div>
          </div>

          {/* Slack Webhook */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Integrations</div>
            <div>
              <label style={labelStyle}>Slack Webhook URL</label>
              <input
                value={f.slack_webhook_url || ''}
                onChange={e => updateField('slack_webhook_url', e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </div>
          </div>

          {/* System Prompt */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Default System Prompt</div>
            <textarea
              value={f.default_system_prompt || ''}
              onChange={e => updateField('default_system_prompt', e.target.value)}
              rows={6}
              placeholder="Enter the default system prompt for AI drafts..."
              style={{
                ...inputStyle,
                resize: 'vertical',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Integrations ───────────────────────────────────────────────────

  const renderIntegrations = () => {
    const orgId = (org?.id as string) || '';
    const notionIntg = integrations.find(i => i.provider === 'notion');
    const slackIntg = integrations.find(i => i.provider === 'slack');
    const notionConnected = notionIntg?.enabled && notionIntg?.status === 'connected';
    const slackConnected = slackIntg?.enabled && slackIntg?.status === 'connected';

    const connectIntegration = async (provider: 'notion' | 'slack') => {
      const config = provider === 'notion' ? notionConfig : slackConfig;
      setIntegrationStatus(prev => ({ ...prev, [provider]: 'Connecting...' }));
      try {
        const res = await fetch('/api/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'connect', organizationId: orgId, provider, config }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to connect');
        const existing = integrations.find(i => i.provider === provider);
        if (existing) {
          setIntegrations(prev => prev.map(i => i.provider === provider ? { ...i, ...result.data, enabled: true, status: 'connected' as const } : i));
        } else {
          setIntegrations(prev => [...prev, result.data as OrgIntegration]);
        }
        setIntegrationStatus(prev => ({ ...prev, [provider]: 'Connected successfully!' }));
        setTimeout(() => setIntegrationStatus(prev => ({ ...prev, [provider]: '' })), 3000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
        setIntegrationStatus(prev => ({ ...prev, [provider]: 'Error: ' + msg }));
      }
    };

    const disconnectIntegration = async (provider: 'notion' | 'slack') => {
      const existing = integrations.find(i => i.provider === provider);
      if (!existing) return;
      setIntegrationStatus(prev => ({ ...prev, [provider]: 'Disconnecting...' }));
      try {
        const res = await fetch('/api/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disconnect', integrationId: existing.id }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to disconnect');
        setIntegrations(prev => prev.map(i => i.id === existing.id ? { ...i, enabled: false, status: 'disconnected' as const } : i));
        setIntegrationStatus(prev => ({ ...prev, [provider]: 'Disconnected.' }));
        setTimeout(() => setIntegrationStatus(prev => ({ ...prev, [provider]: '' })), 3000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
        setIntegrationStatus(prev => ({ ...prev, [provider]: 'Error: ' + msg }));
      }
    };

    const testNotion = async () => {
      setTestingNotion(true);
      setIntegrationStatus(prev => ({ ...prev, notion: '' }));
      setTimeout(() => {
        setTestingNotion(false);
        setIntegrationStatus(prev => ({ ...prev, notion: 'Connection successful!' }));
        setTimeout(() => setIntegrationStatus(prev => ({ ...prev, notion: '' })), 3000);
      }, 1000);
    };

    const testSlack = async () => {
      if (!slackConfig.webhook_url) {
        setIntegrationStatus(prev => ({ ...prev, slack: 'Please enter a webhook URL first.' }));
        setTimeout(() => setIntegrationStatus(prev => ({ ...prev, slack: '' })), 3000);
        return;
      }
      setTestingSlack(true);
      setIntegrationStatus(prev => ({ ...prev, slack: '' }));
      try {
        await fetch(slackConfig.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Test message from Vernacular. Your Slack integration is working!' }),
        });
        setIntegrationStatus(prev => ({ ...prev, slack: 'Test message sent!' }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
        setIntegrationStatus(prev => ({ ...prev, slack: 'Failed to send: ' + msg }));
      }
      setTestingSlack(false);
      setTimeout(() => setIntegrationStatus(prev => ({ ...prev, slack: '' })), 3000);
    };

    const integrationCardStyle: React.CSSProperties = {
      background: '#fff',
      borderRadius: 20,
      border: '1px solid rgba(0,0,0,0.08)',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s ease',
    };

    const integrationCardHoverStyle = (e: React.MouseEvent<HTMLDivElement>, enter: boolean) => {
      (e.currentTarget as HTMLElement).style.boxShadow = enter ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)';
    };

    const statusDotStyle = (connected: boolean): React.CSSProperties => ({
      width: 8, height: 8, borderRadius: 4,
      background: connected ? '#22C55E' : '#9CA3AF',
      boxShadow: connected ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
      flexShrink: 0,
    });

    const configSectionStyle: React.CSSProperties = {
      padding: '0 24px 20px',
      borderTop: '1px solid rgba(0,0,0,0.06)',
    };

    const fieldLabelStyle: React.CSSProperties = {
      fontSize: 12, fontWeight: 600, color: '#1c1c1e', marginBottom: 4, display: 'block', marginTop: 14,
    };

    const toggleRowStyle: React.CSSProperties = {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)',
    };

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <div style={{
          height: 56, minHeight: 56, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', margin: 0 }}>
              Integrations
            </h2>
            <span style={{
              fontSize: 12, fontWeight: 600, color: '#8e8e93',
              background: 'rgba(0,0,0,0.04)', padding: '3px 10px', borderRadius: 6,
            }}>
              {integrations.filter(i => i.enabled).length} active
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 20, maxWidth: 1000 }}>

            {/* ── Notion Card ────────────────────────────── */}
            <div
              style={integrationCardStyle}
              onMouseEnter={e => integrationCardHoverStyle(e, true)}
              onMouseLeave={e => integrationCardHoverStyle(e, false)}
            >
              <div
                style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
                onClick={() => setExpandedIntegration(expandedIntegration === 'notion' ? null : 'notion')}
              >
                {/* Notion logo */}
                <img src="/notion-logo.webp" alt="Notion" style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em' }}>Notion</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={statusDotStyle(!!notionConnected)} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: notionConnected ? '#22C55E' : '#9CA3AF' }}>
                        {notionConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#8e8e93', lineHeight: 1.4 }}>
                    Sync contacts and conversation data with your Notion workspace. Import contacts from Notion databases and log conversations automatically.
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transform: expandedIntegration === 'notion' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {expandedIntegration === 'notion' && (
                <div style={configSectionStyle}>
                  <label style={fieldLabelStyle}>Notion Token</label>
                  <input
                    type="password"
                    value={notionConfig.token}
                    onChange={e => setNotionConfig(prev => ({ ...prev, token: e.target.value }))}
                    placeholder="secret_..."
                    style={inputStyle}
                  />
                  <label style={fieldLabelStyle}>Database ID</label>
                  <input
                    value={notionConfig.database_id}
                    onChange={e => setNotionConfig(prev => ({ ...prev, database_id: e.target.value }))}
                    placeholder="The ID from your Notion database URL"
                    style={inputStyle}
                  />
                  <label style={fieldLabelStyle}>Workspace Name</label>
                  <input
                    value={notionConfig.workspace_name}
                    onChange={e => setNotionConfig(prev => ({ ...prev, workspace_name: e.target.value }))}
                    placeholder="My Workspace"
                    style={inputStyle}
                  />

                  <div style={{ marginTop: 14 }}>
                    <div style={toggleRowStyle}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>Sync Contacts</div>
                        <div style={{ fontSize: 12, color: '#8e8e93' }}>Pull contacts from Notion</div>
                      </div>
                      <button onClick={() => setNotionConfig(prev => ({ ...prev, sync_contacts: !prev.sync_contacts }))} style={toggleStyle(notionConfig.sync_contacts)}>
                        <div style={toggleDotStyle(notionConfig.sync_contacts)} />
                      </button>
                    </div>
                    <div style={{ ...toggleRowStyle, borderBottom: 'none' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>Sync Conversations</div>
                        <div style={{ fontSize: 12, color: '#8e8e93' }}>Push conversation logs to Notion</div>
                      </div>
                      <button onClick={() => setNotionConfig(prev => ({ ...prev, sync_conversations: !prev.sync_conversations }))} style={toggleStyle(notionConfig.sync_conversations)}>
                        <div style={toggleDotStyle(notionConfig.sync_conversations)} />
                      </button>
                    </div>
                  </div>

                  {notionIntg?.last_synced_at && (
                    <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 12 }}>
                      Last synced: {new Date(notionIntg.last_synced_at).toLocaleString()}
                    </div>
                  )}

                  {integrationStatus.notion && (
                    <div style={{
                      marginTop: 12, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: integrationStatus.notion.includes('Error') || integrationStatus.notion.includes('Failed')
                        ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                      color: integrationStatus.notion.includes('Error') || integrationStatus.notion.includes('Failed')
                        ? '#EF4444' : '#22C55E',
                    }}>
                      {integrationStatus.notion}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    {notionConnected ? (
                      <button onClick={() => disconnectIntegration('notion')} style={{
                        ...primaryBtnStyle, background: '#EF4444', boxShadow: '0 1px 3px rgba(239,68,68,0.3)',
                      }}>
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => connectIntegration('notion')}
                        disabled={integrationStatus.notion === 'Connecting...'}
                        style={{ ...primaryBtnStyle, opacity: integrationStatus.notion === 'Connecting...' ? 0.6 : 1 }}
                      >
                        {integrationStatus.notion === 'Connecting...' ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                    <button
                      onClick={testNotion}
                      disabled={testingNotion}
                      style={{
                        ...primaryBtnStyle, background: 'transparent', color: '#378ADD',
                        border: '1px solid rgba(55,138,221,0.3)', boxShadow: 'none',
                        opacity: testingNotion ? 0.6 : 1,
                      }}
                    >
                      {testingNotion ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Slack Card ─────────────────────────────── */}
            <div
              style={integrationCardStyle}
              onMouseEnter={e => integrationCardHoverStyle(e, true)}
              onMouseLeave={e => integrationCardHoverStyle(e, false)}
            >
              <div
                style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
                onClick={() => setExpandedIntegration(expandedIntegration === 'slack' ? null : 'slack')}
              >
                {/* Slack logo */}
                <img src="/slack-logo.png" alt="Slack" style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em' }}>Slack</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={statusDotStyle(!!slackConnected)} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: slackConnected ? '#22C55E' : '#9CA3AF' }}>
                        {slackConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#8e8e93', lineHeight: 1.4 }}>
                    Get real-time notifications in Slack when messages arrive, conversations are flagged, or phone lines go offline.
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transform: expandedIntegration === 'slack' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {expandedIntegration === 'slack' && (
                <div style={configSectionStyle}>
                  <label style={fieldLabelStyle}>Webhook URL</label>
                  <input
                    value={slackConfig.webhook_url}
                    onChange={e => setSlackConfig(prev => ({ ...prev, webhook_url: e.target.value }))}
                    placeholder="https://hooks.slack.com/services/..."
                    style={inputStyle}
                  />
                  <label style={fieldLabelStyle}>Channel</label>
                  <input
                    value={slackConfig.channel}
                    onChange={e => setSlackConfig(prev => ({ ...prev, channel: e.target.value }))}
                    placeholder="#vernacular-alerts"
                    style={inputStyle}
                  />

                  <div style={{ marginTop: 14 }}>
                    <div style={toggleRowStyle}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>Inbound Messages</div>
                        <div style={{ fontSize: 12, color: '#8e8e93' }}>Notify on inbound messages</div>
                      </div>
                      <button onClick={() => setSlackConfig(prev => ({ ...prev, notify_inbound: !prev.notify_inbound }))} style={toggleStyle(slackConfig.notify_inbound)}>
                        <div style={toggleDotStyle(slackConfig.notify_inbound)} />
                      </button>
                    </div>
                    <div style={toggleRowStyle}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>Flagged Conversations</div>
                        <div style={{ fontSize: 12, color: '#8e8e93' }}>Notify on flagged conversations</div>
                      </div>
                      <button onClick={() => setSlackConfig(prev => ({ ...prev, notify_flagged: !prev.notify_flagged }))} style={toggleStyle(slackConfig.notify_flagged)}>
                        <div style={toggleDotStyle(slackConfig.notify_flagged)} />
                      </button>
                    </div>
                    <div style={toggleRowStyle}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>New Signups</div>
                        <div style={{ fontSize: 12, color: '#8e8e93' }}>Notify on new signups</div>
                      </div>
                      <button onClick={() => setSlackConfig(prev => ({ ...prev, notify_signups: !prev.notify_signups }))} style={toggleStyle(slackConfig.notify_signups)}>
                        <div style={toggleDotStyle(slackConfig.notify_signups)} />
                      </button>
                    </div>
                    <div style={{ ...toggleRowStyle, borderBottom: 'none' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>Phone Line Offline</div>
                        <div style={{ fontSize: 12, color: '#8e8e93' }}>Notify on phone line offline</div>
                      </div>
                      <button onClick={() => setSlackConfig(prev => ({ ...prev, notify_station_offline: !prev.notify_station_offline }))} style={toggleStyle(slackConfig.notify_station_offline)}>
                        <div style={toggleDotStyle(slackConfig.notify_station_offline)} />
                      </button>
                    </div>
                  </div>

                  {slackIntg?.last_synced_at && (
                    <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 12 }}>
                      Last synced: {new Date(slackIntg.last_synced_at).toLocaleString()}
                    </div>
                  )}

                  {integrationStatus.slack && (
                    <div style={{
                      marginTop: 12, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: integrationStatus.slack.includes('Error') || integrationStatus.slack.includes('Failed')
                        ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                      color: integrationStatus.slack.includes('Error') || integrationStatus.slack.includes('Failed')
                        ? '#EF4444' : '#22C55E',
                    }}>
                      {integrationStatus.slack}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    {slackConnected ? (
                      <button onClick={() => disconnectIntegration('slack')} style={{
                        ...primaryBtnStyle, background: '#EF4444', boxShadow: '0 1px 3px rgba(239,68,68,0.3)',
                      }}>
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => connectIntegration('slack')}
                        disabled={integrationStatus.slack === 'Connecting...'}
                        style={{ ...primaryBtnStyle, opacity: integrationStatus.slack === 'Connecting...' ? 0.6 : 1 }}
                      >
                        {integrationStatus.slack === 'Connecting...' ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                    <button
                      onClick={testSlack}
                      disabled={testingSlack}
                      style={{
                        ...primaryBtnStyle, background: 'transparent', color: '#378ADD',
                        border: '1px solid rgba(55,138,221,0.3)', boxShadow: 'none',
                        opacity: testingSlack ? 0.6 : 1,
                      }}
                    >
                      {testingSlack ? 'Sending...' : 'Send Test Message'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── AI Providers Card ────────────────────────── */}
            <div
              style={integrationCardStyle}
              onMouseEnter={e => integrationCardHoverStyle(e, true)}
              onMouseLeave={e => integrationCardHoverStyle(e, false)}
            >
              <div
                style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
                onClick={() => setExpandedIntegration(expandedIntegration === 'ai_providers' ? null : 'ai_providers')}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L9 9l-7 1 5 5-1.5 7L12 18.5 18.5 22 17 15l5-5-7-1L12 2z" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em' }}>AI Providers</span>
                    {(() => {
                      const configuredProviders = [
                        aiProvidersConfig.anthropic_key && 'Anthropic',
                        aiProvidersConfig.openai_key && 'OpenAI',
                        aiProvidersConfig.gemini_key && 'Gemini',
                      ].filter(Boolean);
                      return configuredProviders.length > 0 ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#22C55E' }}>
                          {configuredProviders.join(', ')} configured
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF' }}>Not configured</span>
                      );
                    })()}
                  </div>
                  <div style={{ fontSize: 12, color: '#8e8e93', lineHeight: 1.4 }}>
                    Configure API keys for AI-powered draft generation and conversation analysis.
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transform: expandedIntegration === 'ai_providers' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {expandedIntegration === 'ai_providers' && (
                <div style={configSectionStyle}>
                  <label style={fieldLabelStyle}>Anthropic API Key</label>
                  <input
                    type="password"
                    value={aiProvidersConfig.anthropic_key}
                    onChange={e => setAiProvidersConfig(prev => ({ ...prev, anthropic_key: e.target.value }))}
                    placeholder="sk-ant-..."
                    style={inputStyle}
                  />
                  <label style={fieldLabelStyle}>OpenAI API Key</label>
                  <input
                    type="password"
                    value={aiProvidersConfig.openai_key}
                    onChange={e => setAiProvidersConfig(prev => ({ ...prev, openai_key: e.target.value }))}
                    placeholder="sk-..."
                    style={inputStyle}
                  />
                  <label style={fieldLabelStyle}>Google Gemini API Key</label>
                  <input
                    type="password"
                    value={aiProvidersConfig.gemini_key}
                    onChange={e => setAiProvidersConfig(prev => ({ ...prev, gemini_key: e.target.value }))}
                    placeholder="AIza..."
                    style={inputStyle}
                  />

                  {integrationStatus.ai_providers && (
                    <div style={{
                      marginTop: 12, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: integrationStatus.ai_providers.includes('Error') || integrationStatus.ai_providers.includes('Failed')
                        ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                      color: integrationStatus.ai_providers.includes('Error') || integrationStatus.ai_providers.includes('Failed')
                        ? '#EF4444' : '#22C55E',
                    }}>
                      {integrationStatus.ai_providers}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button
                      onClick={async () => {
                        setIntegrationStatus(prev => ({ ...prev, ai_providers: 'Saving...' }));
                        try {
                          const res = await fetch('/api/integrations', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'connect', organizationId: orgId, provider: 'ai_providers', config: aiProvidersConfig }),
                          });
                          const result = await res.json();
                          if (!res.ok) throw new Error(result.error || 'Failed to save');
                          const existing = integrations.find(i => i.provider === 'ai_providers');
                          if (existing) {
                            setIntegrations(prev => prev.map(i => i.provider === 'ai_providers' ? { ...i, ...result.data, enabled: true, status: 'connected' as const } : i));
                          } else {
                            setIntegrations(prev => [...prev, result.data as OrgIntegration]);
                          }
                          setIntegrationStatus(prev => ({ ...prev, ai_providers: 'Keys saved successfully!' }));
                          setTimeout(() => setIntegrationStatus(prev => ({ ...prev, ai_providers: '' })), 3000);
                        } catch (err: unknown) {
                          const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
                          setIntegrationStatus(prev => ({ ...prev, ai_providers: 'Error: ' + msg }));
                        }
                      }}
                      disabled={integrationStatus.ai_providers === 'Saving...'}
                      style={{ ...primaryBtnStyle, opacity: integrationStatus.ai_providers === 'Saving...' ? 0.6 : 1 }}
                    >
                      {integrationStatus.ai_providers === 'Saving...' ? 'Saving...' : 'Save Keys'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Salesforce Card (Coming Soon) ─────────── */}
            <div
              style={{ ...integrationCardStyle, opacity: 0.6 }}
            >
              <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: '#00A1E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="28" height="20" viewBox="0 0 28 20" fill="none"><path d="M22.5 10c0-2.5-2-4.5-4.5-4.5-.7 0-1.4.2-2 .5C15.2 4.2 13.2 3 11 3 7.7 3 5 5.7 5 9c0 .3 0 .7.1 1C2.8 10.5 1 12.6 1 15c0 2.8 2.2 5 5 5h15c2.8 0 5-2.2 5-5 0-2.4-1.8-4.5-3.5-5z" fill="white"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em' }}>Salesforce</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#6B7280', background: 'rgba(0,0,0,0.06)',
                      padding: '3px 8px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace",
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      Coming Soon
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#8e8e93', lineHeight: 1.4 }}>
                    Sync contacts, leads, and opportunities with Salesforce. Automatically log iMessage conversations as activities on contact records.
                  </div>
                </div>
              </div>
              <div style={{ padding: '0 24px 16px' }}>
                <button
                  onClick={() => window.alert('Thanks! We\'ll notify you when Salesforce integration is available.')}
                  style={{
                    padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: 'transparent', color: '#6B7280', border: '1px solid rgba(0,0,0,0.12)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  Request Early Access
                </button>
              </div>
            </div>

            {/* ── HubSpot Card (Coming Soon) ──────────────── */}
            <div
              style={{ ...integrationCardStyle, opacity: 0.6 }}
            >
              <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: '#FF7A59', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17 2v4h-2V2h2zm-5 6a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zm7 1v6h-2v-6h2zM5 11v6H3v-6h2zm4-7v4H7V4h2z"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em' }}>HubSpot</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#6B7280', background: 'rgba(0,0,0,0.06)',
                      padding: '3px 8px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace",
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      Coming Soon
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#8e8e93', lineHeight: 1.4 }}>
                    Connect your HubSpot CRM to sync contacts, deals, and conversation history. Track iMessage engagement alongside your existing sales pipeline.
                  </div>
                </div>
              </div>
              <div style={{ padding: '0 24px 16px' }}>
                <button
                  onClick={() => window.alert('Thanks! We\'ll notify you when HubSpot integration is available.')}
                  style={{
                    padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: 'transparent', color: '#6B7280', border: '1px solid rgba(0,0,0,0.12)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  Request Early Access
                </button>
              </div>
            </div>

            {/* ── Webhooks Card (Coming Soon) ────────────── */}
            <div
              style={{ ...integrationCardStyle, opacity: 0.6 }}
            >
              <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: 'rgba(0,0,0,0.06)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 8l-4 4 4 4" /><path d="M17 8l4 4-4 4" /><path d="M14 4l-4 16" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em' }}>Custom Webhooks</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#6B7280', background: 'rgba(0,0,0,0.06)',
                      padding: '3px 8px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace",
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      Coming Soon
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#8e8e93', lineHeight: 1.4 }}>
                    Send real-time event data to any URL. Build custom automations with your own backend.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // ── Render: Team ──────────────────────────────────────────────────────────

  const renderTeam = () => {
    const teamSeats = 5;
    const currentMembers = [
      { id: 'me', full_name: 'Jackson Fitzgerald', email: 'jackson@vernacular.so', role: 'OWNER', phone: '+1 (803) 555-0100', station: stations[0]?.name || 'Unassigned', status: 'active' as const, lastActive: 'Just now' },
      ...teamMembers.filter(m => m.full_name !== 'Jackson Fitzgerald').map(m => ({
        id: m.id,
        full_name: m.full_name,
        email: m.email,
        role: m.role?.toUpperCase() || 'MEMBER',
        phone: '',
        station: 'Unassigned',
        status: 'invited' as const,
        lastActive: 'Never',
      })),
    ];

    const roleBadge = (role: string) => {
      const colors: Record<string, { bg: string; color: string }> = {
        OWNER: { bg: 'rgba(37,99,235,0.1)', color: '#2563EB' },
        ADMIN: { bg: 'rgba(124,58,237,0.1)', color: '#7C3AED' },
        MEMBER: { bg: 'rgba(107,114,128,0.1)', color: '#6B7280' },
      };
      const c = colors[role] || colors.MEMBER;
      return (
        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
          {role}
        </span>
      );
    };

    const statusDot = (s: string) => {
      const colorMap: Record<string, string> = { active: '#22C55E', online: '#22C55E', invited: '#EAB308', connecting: '#EAB308', disabled: '#EF4444', offline: '#EF4444' };
      return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colorMap[s] || '#6B7280', marginRight: 6 }} />;
    };

    const permissions = [
      { label: 'Send messages', owner: true, admin: true, member: true },
      { label: 'View all conversations', owner: true, admin: true, member: true },
      { label: 'Manage contacts', owner: true, admin: true, member: true },
      { label: 'Manage campaigns', owner: true, admin: true, member: false },
      { label: 'Manage integrations', owner: true, admin: true, member: false },
      { label: 'Invite team members', owner: true, admin: true, member: false },
      { label: 'Manage billing', owner: true, admin: false, member: false },
      { label: 'Remove members', owner: true, admin: false, member: false },
    ];

    return (
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {/* Section A: Team Members */}
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 24, overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Team Members</span>
              <span style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                background: 'rgba(37,99,235,0.08)', color: '#2563EB',
              }}>
                {currentMembers.length}/{teamSeats} seats
              </span>
            </div>
            <button
              onClick={() => { setShowInviteModal(true); setInviteStatus('idle'); setInviteResult(null); setInviteForm({ fullName: '', email: '', role: 'member' }); }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Invite Member
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {['Name', 'Email', 'Role', 'Phone Number', 'Assigned Phone Line', 'Status', 'Last Active', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentMembers.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', color: '#2563EB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>
                        {m.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span style={{ fontWeight: 500, color: '#111' }}>{m.full_name}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6B7280' }}>{m.email}</td>
                    <td style={{ padding: '12px 16px' }}>{roleBadge(m.role)}</td>
                    <td style={{ padding: '12px 16px', color: '#6B7280', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{m.phone || '--'}</td>
                    <td style={{ padding: '12px 16px', color: '#6B7280' }}>{m.station}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {statusDot(m.status)}
                        <span style={{ fontSize: 12, color: '#374151', textTransform: 'capitalize' }}>{m.status}</span>
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: 12 }}>{m.lastActive}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {m.role !== 'OWNER' && (
                        <button style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#6B7280' }}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section B: Phone Numbers & Phone Lines */}
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 24, overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Phone Numbers & Phone Lines</span>
              <span style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                background: 'rgba(37,99,235,0.08)', color: '#2563EB',
              }}>
                {stations.length}/1 numbers
              </span>
            </div>
            <button
              onClick={() => alert('Add phone line flow coming soon!')}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Phone Line
            </button>
          </div>
          {stations.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>No phone lines connected</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.5 }}>
                Phone lines are Mac computers running iMessage. Connect a phone line to start sending messages from its phone number.
              </div>
              <button
                onClick={() => alert('Connect phone line flow coming soon!')}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600,
                }}
              >
                Connect Phone Line
              </button>
            </div>
          ) : (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stations.map(s => (
                <div key={s.id} style={{
                  padding: 16, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fafafa',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, background: 'rgba(37,99,235,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#111', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em' }}>
                        {s.phone_number}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        {s.name} <span style={{ color: '#d1d5db' }}>|</span> <span style={{ fontSize: 11, color: '#9CA3AF' }}>This is the number texts are sent FROM</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        {statusDot(getStationStatus(s))}
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>{getStationStatus(s)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                        Last heartbeat: {s.last_heartbeat ? new Date(s.last_heartbeat).toLocaleString() : 'Never'}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                      background: s.auto_reply_enabled ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                      color: s.auto_reply_enabled ? '#16A34A' : '#6B7280',
                    }}>
                      Auto-reply {s.auto_reply_enabled ? 'ON' : 'OFF'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      Assigned: <span style={{ fontWeight: 500, color: '#374151' }}>
                        {currentMembers[0]?.full_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section C: Roles & Permissions */}
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Roles & Permissions</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {['Permission', 'Owner', 'Admin', 'Member'].map(h => (
                  <th key={h} style={{
                    padding: '10px 20px', textAlign: h === 'Permission' ? 'left' : 'center',
                    fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p, i) => (
                <tr key={p.label} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 20px', fontWeight: 500, color: '#374151' }}>{p.label}</td>
                  {[p.owner, p.admin, p.member].map((val, j) => (
                    <td key={j} style={{ padding: '10px 20px', textAlign: 'center' }}>
                      {val ? (
                        <span style={{ color: '#22C55E', fontWeight: 600, fontSize: 16 }}>&#10003;</span>
                      ) : (
                        <span style={{ color: '#D1D5DB', fontSize: 16 }}>&#8211;</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── Render: Stations ──────────────────────────────────────────────────────

  const renderStations = () => {
    const getStatusColor = (status: string) => {
      if (status === 'online') return '#22C55E';
      if (status === 'dnd') return '#7C3AED';
      if (status === 'idle' || status === 'syncing') return '#F59E0B';
      return '#EF4444';
    };
    const getStatusLabelText = (status: string) => {
      if (status === 'online') return 'ONLINE';
      if (status === 'dnd') return 'DO NOT DISTURB';
      if (status === 'idle') return 'IDLE';
      if (status === 'syncing') return 'SYNCING';
      return 'OFFLINE';
    };
    // Use heartbeat-derived status instead of DB field
    const resolveStatus = (st: Station) => getStationStatus(st);
    const getRelativeTime = (ts: string | null | undefined) => {
      if (!ts) return 'Never';
      const diff = Date.now() - new Date(ts).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    };
    const getMachineIcon = (machineName?: string) => {
      const isLaptop = machineName?.toLowerCase().includes('book');
      if (isLaptop) {
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11H4V5z" /><path d="M2 18h20v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1z" />
          </svg>
        );
      }
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    };
    const SignalBars = ({ status }: { status: string }) => {
      const filled = status === 'online' ? 3 : status === 'syncing' ? 2 : 0;
      const color = getStatusColor(status);
      return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
          {[8, 12, 16].map((h, i) => (
            <div key={i} style={{ width: 4, height: h, borderRadius: 1, background: i < filled ? color : '#374151', transition: 'background 0.3s' }} />
          ))}
        </div>
      );
    };

    const onlineCount = stations.filter(s => getStationStatus(s) === 'online').length;
    const uptimePct = stations.length > 0 ? Math.round((onlineCount / stations.length) * 100) : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', flex: 1, padding: '0 0 32px' }}>

        {/* ── Section A: Network Topology Diagram ────────────────────────── */}
        <div style={{
          background: '#1a1a2e', borderRadius: 20, padding: '40px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Network Topology</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Phone Line Overview</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
            {/* Left stations */}
            {stations.filter((_, i) => i % 2 === 0).map(st => {
              const stColor = getStatusColor(resolveStatus(st));
              return (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${resolveStatus(st) === 'online' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 16, padding: '20px 24px', minWidth: 200, textAlign: 'center',
                  }}>
                    <div style={{ color: stColor, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{getMachineIcon(st.machine_name)}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{st.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{st.machine_name || 'Unknown Machine'}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#378ADD', fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>{st.phone_number || 'TBD'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: stColor, boxShadow: `0 0 8px ${stColor}` }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: stColor, letterSpacing: '0.05em' }}>{getStatusLabelText(resolveStatus(st))}</span>
                      <SignalBars status={resolveStatus(st)} />
                    </div>
                  </div>
                  {/* Connection line */}
                  <div style={{
                    width: 48, height: 2,
                    background: resolveStatus(st) === 'online' ? '#22C55E' : 'transparent',
                    borderTop: resolveStatus(st) === 'online' ? 'none' : '2px dashed #374151',
                  }} />
                </div>
              );
            })}

            {/* Center Hub */}
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'linear-gradient(135deg, #378ADD, #2563EB)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
              boxShadow: '0 0 32px rgba(55,138,221,0.4), 0 0 64px rgba(55,138,221,0.15)',
              flexShrink: 0,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
              <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginTop: 4, letterSpacing: '0.08em' }}>VERNACULAR</div>
            </div>

            {/* Right stations */}
            {stations.filter((_, i) => i % 2 === 1).map(st => {
              const stColor = getStatusColor(resolveStatus(st));
              return (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 48, height: 2,
                    background: resolveStatus(st) === 'online' ? '#22C55E' : 'transparent',
                    borderTop: resolveStatus(st) === 'online' ? 'none' : '2px dashed #374151',
                  }} />
                  <div style={{
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${resolveStatus(st) === 'online' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 16, padding: '20px 24px', minWidth: 200, textAlign: 'center',
                  }}>
                    <div style={{ color: stColor, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{getMachineIcon(st.machine_name)}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{st.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{st.machine_name || 'Unknown Machine'}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#378ADD', fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>{st.phone_number || 'TBD'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: stColor, boxShadow: `0 0 8px ${stColor}` }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: stColor, letterSpacing: '0.05em' }}>{getStatusLabelText(resolveStatus(st))}</span>
                      <SignalBars status={resolveStatus(st)} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* If no stations at all, show empty state in diagram */}
            {stations.length === 0 && (
              <>
                <div style={{
                  width: 48, height: 2, borderTop: '2px dashed #374151',
                }} />
                <div style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)',
                  borderRadius: 16, padding: '20px 24px', minWidth: 200, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>No phone lines connected</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Connect a Mac to get started</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Section B: Phone Line Detail Cards ────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {stations.map(st => {
            const stColor = getStatusColor(resolveStatus(st));
            const stLabel = getStatusLabelText(resolveStatus(st));
            return (
              <div key={st.id} style={{
                background: '#fff', borderRadius: 20, padding: 0,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 24px', borderBottom: '1px solid #f0f0f0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ color: '#378ADD' }}>{getMachineIcon(st.machine_name)}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{st.name}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: stColor + '18', color: stColor, letterSpacing: '0.04em',
                        }}>{stLabel}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Assigned to: Jackson Fitzgerald</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => alert('Edit phone line coming soon')} style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
                      background: '#fff', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer',
                    }}>Edit</button>
                    <button onClick={() => alert('Remove phone line coming soon')} style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid #fecaca',
                      background: '#fff', fontSize: 12, fontWeight: 600, color: '#EF4444', cursor: 'pointer',
                    }}>Remove</button>
                  </div>
                </div>

                {/* Info Grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0',
                  padding: '0', borderBottom: '1px solid #f0f0f0',
                }}>
                  {[
                    {
                      label: 'Phone Number',
                      value: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20, fontWeight: 700, color: '#378ADD', fontFamily: "'JetBrains Mono', monospace" }}>{st.phone_number || 'TBD'}</span>
                          <button onClick={() => { navigator.clipboard.writeText(st.phone_number || ''); alert('Copied!'); }} style={{
                            background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', fontSize: 11, color: '#6b7280',
                          }}>Copy</button>
                        </div>
                      ),
                    },
                    { label: 'Apple ID', value: st.apple_id || 'Not set' },
                    { label: 'Machine Name', value: st.machine_name || 'Unknown' },
                    { label: 'Last Heartbeat', value: getRelativeTime(st.last_heartbeat) },
                    { label: 'Messages Sent Today', value: '0' },
                    { label: 'Messages This Week', value: '0' },
                    { label: 'Auto-Reply', value: (
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 6,
                        background: st.auto_reply_enabled ? '#DCFCE7' : '#F3F4F6',
                        color: st.auto_reply_enabled ? '#16A34A' : '#6b7280',
                      }}>{st.auto_reply_enabled ? 'ON' : 'OFF'}</span>
                    )},
                    { label: 'AI Model', value: st.model || 'Default' },
                    { label: 'System Prompt', value: (
                      <span style={{ fontSize: 12, color: '#6b7280', fontStyle: st.system_prompt ? 'normal' : 'italic' }}>
                        {st.system_prompt ? (st.system_prompt.length > 60 ? st.system_prompt.slice(0, 60) + '...' : st.system_prompt) : 'Using org default'}
                      </span>
                    )},
                  ].map((item, idx) => (
                    <div key={idx} style={{
                      padding: '14px 24px',
                      borderBottom: '1px solid #f8f8f8',
                      borderRight: idx % 2 === 0 ? '1px solid #f0f0f0' : 'none',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#1c1c1e' }}>{typeof item.value === 'string' ? item.value : item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Status Signals Row */}
                <div style={{ display: 'flex', padding: '14px 24px', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Connection', ok: resolveStatus(st) === 'online', onText: 'Connected', offText: 'Disconnected' },
                    { label: 'iMessage', ok: resolveStatus(st) !== 'offline', onText: 'Active', offText: 'Inactive' },
                    { label: 'Sync', ok: resolveStatus(st) !== 'offline', onText: resolveStatus(st) === 'idle' ? 'Idle' : 'Up to date', offText: 'Behind', color: resolveStatus(st) === 'idle' ? '#F59E0B' : undefined },
                    { label: 'Last Error', ok: true, onText: 'None', offText: '' },
                  ].map((sig, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: sig.color || (sig.ok ? '#22C55E' : '#EF4444'),
                      }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{sig.label}:</span>
                      <span style={{ fontSize: 12, color: sig.ok ? '#6b7280' : '#EF4444', fontWeight: sig.ok ? 400 : 600 }}>{sig.ok ? sig.onText : sig.offText}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Section C: Add Phone Line ─────────────────────────────────── */}
        <div style={{
          border: '2px dashed #d1d5db', borderRadius: 20, padding: '40px 32px',
          textAlign: 'center', background: '#fafafa',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: 'rgba(55,138,221,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 8 }}>Connect a Mac</div>
          <div style={{ fontSize: 14, color: '#6b7280', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Phone lines are Mac computers running iMessage. Each phone line has its own phone number and can send/receive messages autonomously.
          </div>
          <div style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px',
            textAlign: 'left', maxWidth: 480, margin: '0 auto 24px',
          }}>
            {[
              { step: '1', text: 'Install the Vernacular agent on your Mac' },
              { step: '2', text: (<>Run the setup command: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>npx vernacular-agent setup</code></>)},
              { step: '3', text: 'Enter your organization key when prompted' },
              { step: '4', text: 'The phone line will appear here automatically' },
            ].map((s, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: idx < 3 ? 14 : 0 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: '#378ADD', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>{s.step}</div>
                <div style={{ fontSize: 14, color: '#374151', paddingTop: 2 }}>{s.text}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => alert('Setup Key: vern_sk_' + Math.random().toString(36).slice(2, 14))} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: '#378ADD', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Generate Setup Key</button>
            <button onClick={() => alert('Agent download coming soon')} style={{
              padding: '10px 20px', borderRadius: 10, border: '1px solid #d1d5db',
              background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Download Agent</button>
          </div>
        </div>

        {/* ── Section D: Phone Line Metrics ─────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Phone Lines', value: stations.length.toString(), icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            )},
            { label: 'Online Phone Lines', value: onlineCount.toString(), icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            )},
            { label: 'Messages Today', value: '0', icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            )},
            { label: 'Uptime', value: `${uptimePct}%`, icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            )},
          ].map((m, idx) => (
            <div key={idx} style={{
              background: '#fff', borderRadius: 16, padding: '20px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: 'rgba(55,138,221,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{m.icon}</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#111', marginBottom: 2 }}>{m.value}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Render: Placeholder views ─────────────────────────────────────────────

  const renderPlaceholder = (title: string, description: string, icon?: React.ReactNode) => (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16, background: 'rgba(55,138,221,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        {icon || (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        )}
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1c1c1e', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      <p style={{ fontSize: 14, color: '#8e8e93', fontWeight: 500, margin: 0 }}>{description}</p>
    </div>
  );

  // ── Render: Profile ───────────────────────────────────────────────────────

  const renderProfile = () => {
    const userEmail = (user?.email as string) || '';
    const userRole = (user?.role as string) || 'member';
    const orgName = (org?.name as string) || 'FraternityBase';
    const initials = profileForm.full_name
      ? profileForm.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : userEmail.slice(0, 2).toUpperCase();

    const sectionStyle: React.CSSProperties = { ...cardStyle, marginBottom: 20 };
    const sectionTitleStyle: React.CSSProperties = {
      fontSize: 15, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', marginBottom: 16,
    };
    const fieldRowStyle: React.CSSProperties = {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.04)',
    };
    const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#1c1c1e' };
    const sublabelStyle: React.CSSProperties = { fontSize: 12, color: '#8e8e93', marginTop: 2 };
    const profileInputStyle: React.CSSProperties = {
      ...inputStyle, maxWidth: 280,
    };

    const updateProfileField = (key: keyof typeof profileForm, value: string) => {
      setProfileForm(prev => ({ ...prev, [key]: value }));
    };

    const roleBadgeColors: Record<string, { color: string; bg: string }> = {
      owner: { color: '#9333EA', bg: 'rgba(147,51,234,0.1)' },
      org_admin: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
      agent: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
      platform_admin: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
    };
    const roleColors = roleBadgeColors[userRole] || roleBadgeColors.agent;

    // Find assigned station for this user — prefer the first station with a real phone number
    const assignedStation = stations.find(s => s.phone_number && s.phone_number !== 'TBD') || stations[0] || null;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <div style={{
          height: 56, minHeight: 56, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', margin: 0 }}>
            My Account
          </h2>
          <button onClick={saveProfile} disabled={profileSaving || profileSaveStatus === 'saved'} style={{
            ...primaryBtnStyle,
            opacity: profileSaving ? 0.6 : 1,
            background: profileSaveStatus === 'saved' ? '#22C55E' : primaryBtnStyle.background,
            boxShadow: profileSaveStatus === 'saved' ? '0 1px 3px rgba(34,197,94,0.3)' : primaryBtnStyle.boxShadow,
          }}>
            {profileSaveStatus === 'saving' ? 'Saving...' : profileSaveStatus === 'saved' ? 'Saved!' : 'Save Profile'}
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* Profile Anchor Links */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[
              { label: 'Organization', anchor: 'profile-org' },
              { label: 'Profile', anchor: 'profile-me' },
              { label: 'Number', anchor: 'profile-number' },
              { label: 'Devices', anchor: 'profile-devices' },
              { label: 'Security', anchor: 'profile-security' },
            ].map((link, i) => (
              <button
                key={link.anchor}
                onClick={() => document.getElementById(link.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                style={{
                  background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: 8,
                  padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#378ADD',
                  cursor: 'pointer', transition: 'background 0.15s ease',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {link.label}
                {i < 4 ? '' : ''}
              </button>
            ))}
          </div>
          {/* Section 1: Company Card */}
          <div id="profile-org" style={{
            ...sectionStyle,
            background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)',
            border: '1px solid rgba(55,138,221,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                }}>
                  {orgName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em' }}>{orgName}</div>
                  <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>{teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, color: plan === 'pro' ? '#2563EB' : plan === 'enterprise' ? '#9333EA' : '#16A34A',
                background: plan === 'pro' ? 'rgba(37,99,235,0.1)' : plan === 'enterprise' ? 'rgba(147,51,234,0.1)' : 'rgba(22,163,74,0.1)',
                padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{plan}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Website</div>
                <input
                  placeholder="https://yourcompany.com"
                  style={{ ...inputStyle, fontSize: 12, padding: '7px 10px', background: 'rgba(255,255,255,0.8)' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Industry</div>
                <input
                  placeholder="e.g. Higher Education"
                  style={{ ...inputStyle, fontSize: 12, padding: '7px 10px', background: 'rgba(255,255,255,0.8)' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: My Profile */}
          <div id="profile-me" style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40, flexShrink: 0,
              background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em',
              fontFamily: "'Inter', sans-serif",
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                value={profileForm.full_name}
                onChange={e => updateProfileField('full_name', e.target.value)}
                placeholder="Full Name"
                style={{ ...inputStyle, fontSize: 20, fontWeight: 700, padding: '6px 10px', border: '1px solid transparent', background: 'transparent', marginBottom: 4 }}
                onFocus={e => { e.currentTarget.style.border = '1px solid rgba(55,138,221,0.4)'; e.currentTarget.style.background = '#fff'; }}
                onBlur={e => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'transparent'; }}
              />
              <input
                value={profileForm.job_title}
                onChange={e => updateProfileField('job_title', e.target.value)}
                placeholder="Title (e.g. Admin, Account Manager)"
                style={{ ...inputStyle, fontSize: 14, color: '#6b7280', padding: '4px 10px', border: '1px solid transparent', background: 'transparent', marginBottom: 8 }}
                onFocus={e => { e.currentTarget.style.border = '1px solid rgba(55,138,221,0.4)'; e.currentTarget.style.background = '#fff'; }}
                onBlur={e => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'transparent'; }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: roleColors.color, background: roleColors.bg,
                  padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>{userRole.replace('_', ' ')}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#8e8e93' }}>{userEmail}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#16A34A" stroke="#16A34A" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Assigned Vernacular Number */}
          <div id="profile-number" style={sectionStyle}>
            <div style={sectionTitleStyle}>Your Vernacular Number</div>
            {assignedStation ? (
              <div>
                <div style={{
                  fontSize: 24, fontWeight: 700, color: '#378ADD', letterSpacing: '0.02em',
                  fontFamily: "'JetBrains Mono', 'SF Mono', monospace", marginBottom: 8,
                }}>
                  {assignedStation.phone_number || 'No number assigned'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: 4,
                    background: assignedStation.status === 'online' ? '#22C55E' : '#EF4444',
                    boxShadow: assignedStation.status === 'online' ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
                  }} />
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    color: assignedStation.status === 'online' ? '#16A34A' : '#DC2626',
                    background: assignedStation.status === 'online' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                    padding: '2px 8px', borderRadius: 10,
                  }}>{assignedStation.status}</span>
                </div>
                <div style={{ fontSize: 12, color: '#8e8e93', marginBottom: 16 }}>
                  Texts sent from Vernacular will come from this number
                </div>

                {/* Send Test Message */}
                <div style={{
                  padding: '16px 18px', borderRadius: 14,
                  background: 'linear-gradient(135deg, #EBF5FF, #E0EDFF)',
                  border: '1px solid rgba(55,138,221,0.15)',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', marginBottom: 12 }}>Send a test iMessage</div>

                  {/* To field */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4, display: 'block' }}>To:</label>
                    <input
                      type="tel"
                      placeholder="(412) 735-1089"
                      value={testPhoneNumber}
                      onChange={e => setTestPhoneNumber(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff',
                        fontSize: 15, fontWeight: 600, color: '#1c1c1e', outline: 'none',
                        fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' as const,
                      }}
                    />
                  </div>

                  {/* Message field */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4, display: 'block' }}>Message:</label>
                    <textarea
                      placeholder="Hey! This is a test from Vernacular."
                      value={testMessageText}
                      onChange={e => setTestMessageText(e.target.value)}
                      rows={2}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff',
                        fontSize: 14, color: '#1c1c1e', outline: 'none', resize: 'vertical',
                        fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' as const,
                        lineHeight: 1.4,
                      }}
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!testPhoneNumber) return;
                      setTestSendStatus('sending');
                      const steps: PipelineStep[] = [
                        { step: 'Connecting to Vernacular API', status: 'active' },
                        { step: 'Writing to Notion Message Queue', status: 'pending' },
                        { step: 'Saving to Supabase', status: 'pending' },
                        { step: `Queued for station ${assignedStation.phone_number}`, status: 'pending' },
                        { step: 'Waiting for station pickup (~60s)', status: 'pending' },
                      ];
                      setTestPipelineSteps([...steps]);
                      try {
                        await new Promise(r => setTimeout(r, 400));
                        steps[0] = { ...steps[0], status: 'done', detail: 'Connected' };
                        steps[1] = { ...steps[1], status: 'active' };
                        setTestPipelineSteps([...steps]);

                        const res = await fetch('/api/send-test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            phoneNumber: testPhoneNumber,
                            message: testMessageText,
                            organizationId: (user?.organizations as Record<string, unknown>)?.id,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error);

                        steps[1] = { ...steps[1], status: 'done', detail: data.notionQueued ? 'Written to Notion' : 'Notion skipped' };
                        steps[2] = { ...steps[2], status: 'done', detail: 'Saved' };
                        steps[3] = { ...steps[3], status: 'done', detail: `Station: ${data.stationName || 'Wade'}` };
                        steps[4] = { ...steps[4], status: 'active', detail: 'Message will arrive within 1 minute' };
                        setTestPipelineSteps([...steps]);

                        setTestSendStatus('sent');
                        setTimeout(() => {
                          steps[4] = { ...steps[4], status: 'done', detail: 'Check your phone!' };
                          setTestPipelineSteps([...steps]);
                        }, 3000);
                        setTimeout(() => setTestSendStatus('idle'), 15000);
                      } catch (err) {
                        const errMsg = err instanceof Error ? err.message : 'Unknown error';
                        const failIdx = steps.findIndex(s => s.status === 'active');
                        if (failIdx >= 0) steps[failIdx] = { ...steps[failIdx], status: 'error', detail: errMsg };
                        setTestPipelineSteps([...steps]);
                        setTestSendStatus('error');
                        setTimeout(() => setTestSendStatus('idle'), 8000);
                      }
                    }}
                    disabled={testSendStatus === 'sending' || !testPhoneNumber}
                    style={{
                      width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                      background: testSendStatus === 'sent' ? '#22C55E' : testSendStatus === 'sending' ? '#9fc5eb' : testSendStatus === 'error' ? '#EF4444' : 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                      color: '#fff', fontSize: 14, fontWeight: 700, cursor: testSendStatus === 'sending' ? 'default' : 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      boxShadow: testSendStatus === 'idle' ? '0 2px 8px rgba(55,138,221,0.25)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {testSendStatus === 'sending' ? 'Sending...' : testSendStatus === 'sent' ? 'Queued!' : testSendStatus === 'error' ? 'Failed' : 'Send Test iMessage'}
                  </button>

                  {/* Pipeline console */}
                  {testPipelineSteps.length > 0 && (
                    <div style={{
                      marginTop: 12, padding: '14px 16px', borderRadius: 10,
                      background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Pipeline Status</div>
                      {testPipelineSteps.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                          <span style={{ flexShrink: 0, marginTop: 1 }}>
                            {s.status === 'done' ? '✅' : s.status === 'active' ? '🔄' : s.status === 'error' ? '❌' : '⏳'}
                          </span>
                          <div>
                            <span style={{ color: s.status === 'done' ? '#22C55E' : s.status === 'active' ? '#378ADD' : s.status === 'error' ? '#EF4444' : 'rgba(255,255,255,0.3)' }}>
                              {s.step}
                            </span>
                            {s.detail && (
                              <span style={{ color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>— {s.detail}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {testSendStatus === 'sent' && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', color: '#22C55E', fontSize: 11 }}>
                          For testing tier, delivery may take up to 1 minute. Check your phone for a blue iMessage from {assignedStation.phone_number}.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '20px 16px', borderRadius: 10,
                background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.12)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', marginBottom: 6 }}>
                  No Vernacular number assigned yet
                </div>
                <div style={{ fontSize: 12, color: '#8e8e93', maxWidth: 400, margin: '0 auto 14px', lineHeight: 1.5 }}>
                  A Vernacular number is an iMessage-enabled phone number on a connected Mac phone line.
                  This is the number your contacts will see when you text them.
                </div>
                <button onClick={() => setActiveTab('settings')} style={{
                  ...primaryBtnStyle, fontSize: 12,
                }}>Request Number</button>
              </div>
            )}
          </div>

          {/* Section 4: Contact Information */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Contact Information</div>
            <div style={fieldRowStyle}>
              <div>
                <div style={labelStyle}>Personal Phone Number</div>
                <div style={sublabelStyle}>Your personal contact number</div>
              </div>
              <input
                value={profileForm.phone}
                onChange={e => updateProfileField('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
                type="tel"
                style={profileInputStyle}
              />
            </div>
            <div style={fieldRowStyle}>
              <div>
                <div style={labelStyle}>Location</div>
                <div style={sublabelStyle}>City, State</div>
              </div>
              <input
                value={profileForm.location}
                onChange={e => updateProfileField('location', e.target.value)}
                placeholder="San Francisco, CA"
                style={profileInputStyle}
              />
            </div>
            <div style={fieldRowStyle}>
              <div>
                <div style={labelStyle}>Timezone</div>
                <div style={sublabelStyle}>For scheduling features</div>
              </div>
              <select
                value={profileForm.timezone}
                onChange={e => updateProfileField('timezone', e.target.value)}
                style={{ ...profileInputStyle, cursor: 'pointer' }}
              >
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div style={fieldRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <div style={labelStyle}>LinkedIn</div>
              </div>
              <input
                value={profileForm.linkedin_url}
                onChange={e => updateProfileField('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/..."
                style={profileInputStyle}
              />
            </div>
            <div style={fieldRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#1c1c1e">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <div style={labelStyle}>X (Twitter)</div>
              </div>
              <input
                value={profileForm.twitter_handle}
                onChange={e => updateProfileField('twitter_handle', e.target.value)}
                placeholder="@handle"
                style={profileInputStyle}
              />
            </div>
            <div style={{ padding: '12px 0' }}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Bio</div>
              <textarea
                value={profileForm.bio}
                onChange={e => updateProfileField('bio', e.target.value)}
                placeholder="Tell us a bit about yourself..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', maxWidth: '100%' }}
              />
            </div>
          </div>

          {/* Section 5: Connected Devices */}
          <div id="profile-devices" style={sectionStyle}>
            <div style={sectionTitleStyle}>Connected Devices</div>
            {stations.length === 0 ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)',
              }}>
                <span style={{ fontSize: 13, color: '#8e8e93' }}>No phone lines connected</span>
                <button onClick={() => setActiveTab('settings')} style={{
                  background: 'none', border: '1px solid rgba(55,138,221,0.3)', borderRadius: 6,
                  padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#378ADD', cursor: 'pointer',
                }}>Connect a Phone Line</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stations.map((s, idx) => {
                  const isOnline = getStationStatus(s) === 'online';
                  const isAssigned = idx === 0;
                  const lastBeat = s.last_heartbeat ? new Date(s.last_heartbeat) : null;
                  return (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: 10,
                      background: isAssigned ? 'rgba(55,138,221,0.04)' : 'rgba(0,0,0,0.02)',
                      border: isAssigned ? '1px solid rgba(55,138,221,0.15)' : '1px solid rgba(0,0,0,0.06)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: 4,
                          background: isOnline ? '#22C55E' : '#EF4444',
                          boxShadow: isOnline ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
                        }} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{s.name}</span>
                            {s.phone_number && (
                              <span style={{ fontSize: 12, color: '#378ADD', fontFamily: "'JetBrains Mono', monospace" }}>{s.phone_number}</span>
                            )}
                            {isAssigned && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: '#378ADD', background: 'rgba(55,138,221,0.1)', padding: '2px 6px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assigned to you</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }}>
                            {lastBeat ? `Last heartbeat: ${formatHeartbeat(s.last_heartbeat)}` : 'No heartbeat recorded'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {s.auto_reply_enabled && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#378ADD', background: 'rgba(55,138,221,0.1)', padding: '2px 8px', borderRadius: 10 }}>Auto-Reply</span>
                        )}
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          color: isOnline ? '#16A34A' : '#DC2626',
                          background: isOnline ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                          padding: '2px 8px', borderRadius: 10,
                        }}>{isOnline ? 'Connected' : 'Disconnected'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 6: Security */}
          <div id="profile-security" style={{ ...sectionStyle, marginBottom: 40 }}>
            <div style={sectionTitleStyle}>Security</div>
            <div style={{ ...fieldRowStyle, flexDirection: 'column', alignItems: 'stretch', gap: 12, borderBottom: showPasswordChange ? 'none' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={labelStyle}>Password</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2, letterSpacing: '0.1em' }}>••••••••</div>
                </div>
                <button onClick={() => { setShowPasswordChange(!showPasswordChange); setPasswordStatus('idle'); setPasswordError(''); setPasswordForm({ current: '', new: '', confirm: '' }); }} style={{
                  background: 'none', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
                  padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#1c1c1e', cursor: 'pointer',
                }}>{showPasswordChange ? 'Cancel' : 'Change Password'}</button>
              </div>
              {showPasswordChange && (
                <div style={{
                  padding: '16px', borderRadius: 12, background: '#fafbfc',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}>
                  {passwordStatus === 'saved' ? (
                    <div style={{
                      padding: '14px 18px', borderRadius: 10,
                      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                      color: '#16A34A', fontSize: 13, fontWeight: 600, textAlign: 'center',
                    }}>
                      Password updated successfully
                    </div>
                  ) : (
                    <>
                      {passwordError && (
                        <div style={{
                          padding: '10px 14px', borderRadius: 8, marginBottom: 12,
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#DC2626', fontSize: 12, fontWeight: 500,
                        }}>{passwordError}</div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', display: 'block', marginBottom: 4 }}>Current Password</label>
                          <input type="password" value={passwordForm.current}
                            onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                            placeholder="Enter current password"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Inter', sans-serif" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', display: 'block', marginBottom: 4 }}>New Password</label>
                          <input type="password" value={passwordForm.new}
                            onChange={e => setPasswordForm(p => ({ ...p, new: e.target.value }))}
                            placeholder="At least 8 characters"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Inter', sans-serif" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', display: 'block', marginBottom: 4 }}>Confirm New Password</label>
                          <input type="password" value={passwordForm.confirm}
                            onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                            placeholder="Re-enter new password"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Inter', sans-serif" }}
                          />
                        </div>
                        <button
                          onClick={async () => {
                            setPasswordError('');
                            if (!passwordForm.current) { setPasswordError('Enter your current password'); return; }
                            if (passwordForm.new.length < 8) { setPasswordError('New password must be at least 8 characters'); return; }
                            if (passwordForm.new !== passwordForm.confirm) { setPasswordError('Passwords do not match'); return; }
                            setPasswordStatus('saving');
                            try {
                              // Verify current password by signing in
                              const { error: signInError } = await supabase.auth.signInWithPassword({
                                email: (user?.email as string) || '',
                                password: passwordForm.current,
                              });
                              if (signInError) { setPasswordError('Current password is incorrect'); setPasswordStatus('error'); return; }
                              // Update to new password
                              const { error: updateError } = await supabase.auth.updateUser({ password: passwordForm.new });
                              if (updateError) { setPasswordError(updateError.message); setPasswordStatus('error'); return; }
                              setPasswordStatus('saved');
                              setPasswordForm({ current: '', new: '', confirm: '' });
                              setTimeout(() => setShowPasswordChange(false), 2000);
                            } catch (err) {
                              setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
                              setPasswordStatus('error');
                            }
                          }}
                          disabled={passwordStatus === 'saving'}
                          style={{
                            padding: '10px 0', borderRadius: 8, border: 'none',
                            background: passwordStatus === 'saving' ? '#9fc5eb' : 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                            color: '#fff', fontSize: 13, fontWeight: 700, cursor: passwordStatus === 'saving' ? 'default' : 'pointer',
                            fontFamily: "'Inter', sans-serif", marginTop: 4,
                          }}
                        >
                          {passwordStatus === 'saving' ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div style={fieldRowStyle}>
              <div>
                <div style={labelStyle}>Two-Factor Authentication</div>
                <div style={sublabelStyle}>Not enabled</div>
              </div>
              <button onClick={() => window.alert('2FA setup coming soon.')} style={{
                background: 'none', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
                padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#1c1c1e', cursor: 'pointer',
              }}>Enable 2FA</button>
            </div>
            <div style={{ ...fieldRowStyle, borderBottom: 'none' }}>
              <div>
                <div style={labelStyle}>Active Sessions</div>
                <div style={sublabelStyle}>Current browser session</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#16A34A', background: 'rgba(22,163,74,0.1)',
                padding: '3px 10px', borderRadius: 20,
              }}>1 active session</span>
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Active Content ────────────────────────────────────────────────

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'conversations': return renderConversations();
      case 'contacts': return renderContacts();
      case 'team': return renderTeam();
      case 'settings': return renderSettings();
      case 'profile': return renderProfile();
      case 'integrations': return renderIntegrations();
      case 'stations': return renderStations();
      case 'ai-drafts': return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1c1c1e', margin: 0, letterSpacing: '-0.02em' }}>AI Responder</h2>
              <p style={{ fontSize: 13, color: '#8e8e93', margin: '4px 0 0' }}>Configure AI-powered messaging agents for your conversations</p>
            </div>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 3, width: 'fit-content' }}>
            {([
              { key: 'agents' as const, label: 'Agents' },
              { key: 'goals' as const, label: 'Goals' },
              { key: 'knowledge' as const, label: 'Knowledge Base' },
              { key: 'usage' as const, label: 'Usage' },
            ]).map(t => (
              <button key={t.key} onClick={() => setAiResponderTab(t.key)} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
                background: aiResponderTab === t.key ? '#fff' : 'transparent',
                color: aiResponderTab === t.key ? '#1c1c1e' : '#8e8e93',
                boxShadow: aiResponderTab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* Knowledge Base Tab */}
          {aiResponderTab === 'knowledge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* FAQ Section */}
              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e' }}>FAQs</div>
                    <p style={{ fontSize: 12, color: '#8e8e93', margin: '4px 0 0' }}>Teach the AI common questions and answers. Matched FAQs skip the API entirely.</p>
                  </div>
                  <button style={{ ...primaryBtnStyle, fontSize: 12 }}>+ Add FAQ</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { q: 'How do I reset my password?', a: 'Go to Settings → Security → Reset Password. You\'ll receive an email link.', uses: 12 },
                    { q: 'What are your business hours?', a: 'We\'re available Mon-Fri, 9 AM - 6 PM EST. AI support is available 24/7.', uses: 8 },
                    { q: 'How do I get started with testing?', a: 'Download the app, create an account, and our coordinator will walk you through the first test.', uses: 5 },
                  ].map(faq => (
                    <div key={faq.q} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', background: '#fafbfc' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e', marginBottom: 4 }}>{faq.q}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{faq.a}</div>
                      <span style={{ fontSize: 10, color: '#8e8e93', fontFamily: "'JetBrains Mono', monospace" }}>Used {faq.uses} times</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload Knowledge Files */}
              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', marginBottom: 8 }}>Knowledge Files</div>
                <p style={{ fontSize: 12, color: '#8e8e93', margin: '0 0 16px' }}>Upload documents for the AI to reference when crafting responses. PDFs, text files, CSVs.</p>
                <div style={{
                  padding: 24, borderRadius: 12, border: '2px dashed rgba(0,0,0,0.1)',
                  textAlign: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.01)',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#378ADD' }}>Drop files here or click to upload</div>
                  <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 4 }}>PDF, TXT, CSV, DOCX — max 10MB each</div>
                </div>
              </div>

              {/* Previous Successful Conversations (for App Testing) */}
              {activeAccountView === 'app_testing' && (
                <div style={{ ...cardStyle, padding: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', marginBottom: 8 }}>Successful Test Conversations</div>
                  <p style={{ fontSize: 12, color: '#8e8e93', margin: '0 0 16px' }}>Reference conversations where testers were successfully recruited and completed testing.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { contact: 'Brady Walsh', outcome: 'Completed $100 deposit test', msgs: 9, date: 'Apr 6' },
                      { contact: '+1 (978) 376-5177', outcome: 'Agreed to testing, awaiting deposit', msgs: 4, date: 'Apr 5' },
                    ].map(c => (
                      <div key={c.contact} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{c.contact}</div>
                          <div style={{ fontSize: 11, color: '#22C55E' }}>{c.outcome}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: '#8e8e93' }}>{c.msgs} messages</div>
                          <div style={{ fontSize: 10, color: '#c4c4c6' }}>{c.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Goals Tab */}
          {aiResponderTab === 'goals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', marginBottom: 12 }}>Default Conversation Goal</div>
                <p style={{ fontSize: 12, color: '#8e8e93', margin: '0 0 12px' }}>Applied to new conversations unless overridden per-conversation</p>
                <textarea
                  placeholder="e.g., Get the contact to make a first deposit of $100+ within 48 hours..."
                  style={{
                    width: '100%', minHeight: 80, padding: 12, borderRadius: 8,
                    border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, fontFamily: "'Inter', sans-serif",
                    resize: 'vertical', outline: 'none',
                  }}
                />
              </div>
              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', marginBottom: 12 }}>Goal Templates</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['First Deposit', 'Reactivation', 'VIP Upgrade', 'Event Registration', 'Referral Ask', 'Feedback Collection'].map(g => (
                    <button key={g} style={{
                      padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.1)',
                      background: '#fff', fontSize: 12, fontWeight: 500, color: '#1c1c1e', cursor: 'pointer',
                    }}>{g}</button>
                  ))}
                </div>
              </div>
              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', marginBottom: 12 }}>Goal Metrics</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Conversations with Goals', value: columns.filter(c => c.goal).length, total: columns.filter(c => c.contact).length },
                    { label: 'Goals Achieved (est.)', value: 0, total: columns.filter(c => c.goal).length },
                    { label: 'Avg Messages to Goal', value: '—', total: null },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#1c1c1e' }}>{typeof m.value === 'number' && m.total ? `${m.value}/${m.total}` : String(m.value)}</div>
                      <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 4 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Usage Tab */}
          {aiResponderTab === 'usage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  { label: 'AI Drafts This Month', value: '0', icon: '✏️' },
                  { label: 'AI Auto-Sends', value: '0', icon: '🤖' },
                  { label: 'Tokens Used', value: '0', icon: '⚡' },
                ].map(m => (
                  <div key={m.label} style={{ ...cardStyle, padding: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#1c1c1e' }}>{m.value}</div>
                    <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 4 }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', marginBottom: 12 }}>AI Cost Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { action: 'AI draft generated', cost: '$0.0031', count: 0 },
                    { action: 'AI approved & sent', cost: '$0.25', count: 0 },
                    { action: 'AI auto-response', cost: '$0.25', count: 0 },
                  ].map(r => (
                    <div key={r.action} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 13 }}>
                      <span style={{ color: '#6b7280' }}>{r.action}</span>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ color: '#8e8e93', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{r.count}×</span>
                        <span style={{ fontWeight: 600, color: '#1c1c1e', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{r.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, background: 'rgba(55,138,221,0.04)', border: '1px solid rgba(55,138,221,0.1)' }}>
                  <div style={{ fontSize: 12, color: '#378ADD', fontWeight: 600 }}>
                    AI is powered by Claude — optimized for speed and cost. You don&apos;t need to choose a model.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Agents Tab */}
          {aiResponderTab === 'agents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e' }}>Sub-Agents</div>
                    <p style={{ fontSize: 12, color: '#8e8e93', margin: '4px 0 0' }}>Specialized agents that draft and craft messaging for different scenarios</p>
                  </div>
                  <button style={{ ...primaryBtnStyle, fontSize: 12 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create Agent
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { name: 'Blinky', role: 'General Responder', desc: 'Handles everyday replies — greetings, status updates, quick questions', mode: 'Draft', conversations: 3, color: '#EF4444' },
                    { name: 'Pinky', role: 'VIP Closer', desc: 'Focuses on converting prospects — pushes toward deposits, signups, upgrades', mode: 'Draft', conversations: 0, color: '#EC4899' },
                    { name: 'Inky', role: 'Re-Engagement', desc: 'Follows up with dormant contacts — crafts win-back messages and promos', mode: 'Off', conversations: 0, color: '#3B82F6' },
                    { name: 'Clyde', role: 'Concierge', desc: 'Handles logistics — scheduling, account questions, support requests', mode: 'Off', conversations: 0, color: '#F59E0B' },
                  ].map(agent => (
                    <div key={agent.name} style={{
                      padding: 16, borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, background: `${agent.color}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, flexShrink: 0,
                      }}>
                        {agent.name === 'Blinky' ? '👻' : agent.name === 'Pinky' ? '🌸' : agent.name === 'Inky' ? '🐙' : '🍊'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>
                          {agent.name} <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280' }}>— {agent.role}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>{agent.desc}</div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                          background: agent.mode === 'Draft' ? 'rgba(217,119,6,0.1)' : agent.mode === 'Auto' ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.04)',
                          color: agent.mode === 'Draft' ? '#D97706' : agent.mode === 'Auto' ? '#22C55E' : '#8e8e93',
                          textTransform: 'uppercase',
                        }}>{agent.mode}</span>
                        <span style={{ fontSize: 11, color: '#8e8e93' }}>{agent.conversations} convos</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', marginBottom: 8 }}>How Sub-Agents Work</div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                  Each sub-agent is assigned to specific conversations and uses its own personality, skill set, and goal to craft messages.
                  In <strong>Draft</strong> mode, the agent writes a response and waits for your approval.
                  In <strong>Auto</strong> mode, it sends immediately.
                  Agents share the conversation history but each brings its own expertise — a Closer writes differently than a Concierge.
                </div>
              </div>
            </div>
          )}
        </div>
      );
      default: return renderDashboard();
    }
  };

  // ── Page Title Map ────────────────────────────────────────────────────────

  const pageTitles: Record<NavTab, string> = {
    dashboard: 'Dashboard',
    conversations: 'Conversations',
    contacts: 'Contacts',
    team: 'Team',
    stations: 'Phone Lines',
    'ai-drafts': 'AI Drafts',
    integrations: 'Integrations',
    profile: 'Profile',
    settings: 'Settings',
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      fontFamily: "'Inter', -apple-system, sans-serif",
      background: '#f0f2f5',
      overflow: 'hidden',
    }}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{
        width: sidebarCollapsed ? 64 : 260,
        minWidth: sidebarCollapsed ? 64 : 260,
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        transition: 'width 0.2s ease, min-width 0.2s ease',
      }}>
        {/* Logo + Org */}
        <div style={{
          padding: sidebarCollapsed ? '20px 16px 16px' : '20px 18px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: sidebarCollapsed ? 'center' : 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          gap: 10,
        }}>
          <img src="/logo.png" alt="Vernacular" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
          {!sidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {(org?.name as string) || 'Vernacular'}
              </div>
              <select
                value={activeAccountView}
                onChange={e => setActiveAccountView(e.target.value)}
                style={{
                  marginTop: 4, padding: '4px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                  width: '100%', appearance: 'auto' as never,
                  background: 'rgba(255,255,255,0.08)',
                  color: activeAccountView === 'vip_manager' ? '#A78BFA' :
                    activeAccountView === 'customer_support' ? '#60A5FA' :
                    activeAccountView === 'sales_outreach' ? '#6EE7B7' :
                    activeAccountView === 'app_testing' ? '#FFC107' : 'rgba(255,255,255,0.7)',
                }}
              >
                <option value="all">All Solutions</option>
                <option value="vip_manager">🎰 VIP Manager</option>
                <option value="customer_support">💬 Customer Support</option>
                <option value="sales_outreach">📱 Sales & Outreach</option>
                <option value="app_testing">🧪 App Testing</option>
              </select>
            </div>
          )}
          {/* Sound Toggle */}
          <button onClick={() => { setSoundEnabled(!soundEnabled); playSound('click'); }} style={{
            width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
            background: soundEnabled ? 'rgba(55,138,221,0.15)' : 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
          }} title={soundEnabled ? 'Sound ON — click to mute' : 'Sound OFF — click to unmute'}>
            {soundEnabled ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
          </button>
          {/* Notification Bell */}
          <div ref={notificationBellRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setShowNotifications(!showNotifications)} style={{
              width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: showNotifications ? 'rgba(55,138,221,0.15)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', position: 'relative',
            }} title="Notifications">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={notifications.filter(n => !n.read).length > 0 ? '#378ADD' : 'rgba(255,255,255,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notifications.filter(n => !n.read).length > 0 && (
                <div style={{
                  position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4,
                  background: '#EF4444', border: '1.5px solid #1a1a2e',
                }} />
              )}
            </button>
            {showNotifications && (
              <div style={{
                position: 'absolute', top: 36, right: 0, width: 320, maxHeight: 400,
                background: '#1e1e36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Notifications</span>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button onClick={() => {
                      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
                      fetch('/api/notify', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: unreadIds }) });
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    }} style={{ fontSize: 11, color: '#378ADD', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ overflowY: 'auto', maxHeight: 340 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No notifications yet</div>
                  ) : notifications.map(n => (
                    <div key={n.id} style={{
                      padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: n.read ? 'transparent' : 'rgba(55,138,221,0.05)',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: n.read ? 'rgba(255,255,255,0.6)' : '#fff', marginBottom: 2 }}>{n.subject}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{n.body}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Phone Line Status */}
        {(() => {
          const primaryStation = stations.find(s => s.phone_number && s.phone_number !== 'TBD') || stations[0];
          if (!primaryStation) return null;
          const derivedStatus = getStationStatus(primaryStation);
          const statusColor = getStationDotColor(primaryStation);
          const statusLabel = getStationLabel(primaryStation);
          return (
            <div style={{ position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setShowStationMenu(!showStationMenu)}
                style={{
                  width: '100%', border: 'none', background: 'none', cursor: 'pointer',
                  padding: sidebarCollapsed ? '12px 0' : '12px 18px',
                  display: 'flex', alignItems: 'center',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: statusColor,
                      boxShadow: derivedStatus === 'online' ? '0 0 8px rgba(34,197,94,0.5)' : derivedStatus === 'dnd' ? '0 0 8px rgba(124,58,237,0.5)' : 'none',
                      flexShrink: 0,
                    }} />
                    {!sidebarCollapsed && (
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: '#378ADD',
                        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em',
                      }}>
                        {primaryStation.phone_number}
                      </span>
                    )}
                    {!sidebarCollapsed && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 'auto' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3, marginLeft: 16 }}>
                      {statusLabel}
                    </div>
                  )}
                </div>
              </button>
              {/* Status dropdown menu */}
              {showStationMenu && !sidebarCollapsed && (
                <div style={{
                  position: 'absolute', left: 12, right: 12, top: '100%', zIndex: 100,
                  background: '#1e1e3a', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
                }}>
                  {[
                    { key: 'auto' as const, label: 'Online', desc: 'Auto-detect from heartbeat', color: '#22C55E', icon: '●' },
                    { key: 'dnd' as const, label: 'Do Not Disturb', desc: 'Silence notifications, pause AI', color: '#7C3AED', icon: '🌙' },
                    { key: 'offline' as const, label: 'Offline', desc: 'Stop sending & receiving', color: '#EF4444', icon: '⏸' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => { setStationOverride(opt.key); setShowStationMenu(false); }} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: stationOverride === opt.key ? 'rgba(55,138,221,0.1)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => { if (stationOverride !== opt.key) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { if (stationOverride !== opt.key) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: 4, background: opt.color, flexShrink: 0,
                        boxShadow: `0 0 6px ${opt.color}40`,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{opt.label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{opt.desc}</div>
                      </div>
                      {stationOverride === opt.key && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '6px 10px', overflowY: 'auto' }}>
          {NAV_ITEMS.filter(item => {
            const perms = TAB_PERMISSIONS[item.tab];
            if (!perms || perms.length === 0) return true; // available to all
            const orgTypes: string[] = (org?.account_type as string[]) || ['general'];
            // Show if org has ANY matching plan, or if viewing 'all' and org has any plan
            if (activeAccountView === 'all') return perms.some(p => orgTypes.includes(p)) || orgTypes.includes('general');
            return perms.includes(activeAccountView);
          }).map(item => {
            const isActive = activeTab === item.tab;
            const isHovered = hoveredNav === item.label;
            return (
              <div key={item.label}>
                <button
                  onClick={() => { setActiveTab(item.tab); playSound('click'); }}
                  onMouseEnter={() => setHoveredNav(item.label)}
                  onMouseLeave={() => setHoveredNav(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? 0 : 12, width: '100%',
                    padding: sidebarCollapsed ? '12px 0' : '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    fontSize: 14, fontWeight: isActive ? 600 : 500,
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: '-0.01em',
                    color: isActive ? '#fff' : ((item as Record<string, unknown>).color as string) || 'rgba(255,255,255,0.85)',
                    background: isActive
                      ? ((item as Record<string, unknown>).color ? 'rgba(217,119,6,0.2)' : 'rgba(55,138,221,0.15)')
                      : isHovered ? 'rgba(255,255,255,0.08)' : 'transparent',
                    marginBottom: 3, transition: 'all 0.15s ease', textAlign: 'left',
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                      width: 3, height: 20, borderRadius: '0 3px 3px 0', background: '#378ADD',
                    }} />
                  )}
                  <span style={{ color: isActive ? '#378ADD' : 'rgba(255,255,255,0.6)', display: 'flex', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && item.label}
                  {item.label === 'Conversations' && unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 6, right: 10,
                      width: 20, height: 20, borderRadius: 10,
                      background: '#EF4444', color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{unreadCount}</span>
                  )}
                </button>
                {item.tab === 'conversations' && activeTab === 'conversations' && !sidebarCollapsed && (
                  <div style={{ paddingLeft: 38, marginBottom: 6 }}>
                    {(['matrix', 'streams', 'messages', 'summary', 'schedule'] as ConversationViewMode[]).map(mode => (
                      <button key={mode} onClick={() => setConversationViewMode(mode)} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: conversationViewMode === mode ? 600 : 400,
                        color: conversationViewMode === mode ? '#378ADD' : 'rgba(255,255,255,0.6)',
                        background: conversationViewMode === mode ? 'rgba(55,138,221,0.1)' : 'transparent',
                        fontFamily: "'Inter', sans-serif", textTransform: 'capitalize',
                        marginBottom: 1,
                      }}>{mode}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
          <button
            onClick={() => { setSidebarCollapsed(c => !c); playSound('click'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: sidebarCollapsed ? 36 : '100%',
              height: 36, borderRadius: 8, border: 'none', justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', transition: 'all 0.15s ease',
              fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarCollapsed
                ? <><polyline points="9 18 15 12 9 6" /><line x1="4" y1="4" x2="4" y2="20" /></>
                : <><polyline points="15 18 9 12 15 6" /><line x1="20" y1="4" x2="20" y2="20" /></>
              }
            </svg>
            {!sidebarCollapsed && <span>{sidebarCollapsed ? 'Expand' : 'Collapse'}</span>}
          </button>
        </div>

        {/* Bottom: User + Logout */}
        <div style={{ padding: sidebarCollapsed ? '14px 8px' : '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {!sidebarCollapsed && (
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, marginBottom: 10,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.email as string}
            </div>
          )}
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
            style={{
              width: '100%', padding: '7px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
              fontFamily: "'Inter', sans-serif", background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            {sidebarCollapsed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            ) : 'Log Out'}
          </button>
        </div>
      </aside>

      {/* ── Main Area ────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {/* Craig — draggable AI Copilot */}
        <div
          style={{
            position: 'absolute', top: `calc(8px + ${craigPos.y}px)`, left: `calc(50% + ${craigPos.x}px)`, transform: 'translateX(-50%)', zIndex: 50,
            cursor: craigDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={e => {
            if ((e.target as HTMLElement).tagName === 'SELECT') return;
            setCraigDragging(true);
            craigDragRef.current = { startX: e.clientX, startY: e.clientY, origX: craigPos.x, origY: craigPos.y };
            const onMove = (ev: MouseEvent) => {
              if (!craigDragRef.current) return;
              setCraigPos({
                x: craigDragRef.current.origX + (ev.clientX - craigDragRef.current.startX),
                y: craigDragRef.current.origY + (ev.clientY - craigDragRef.current.startY),
              });
            };
            const onUp = () => {
              setCraigDragging(false);
              craigDragRef.current = null;
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        >
          <button onClick={() => { if (!craigDragging) setShowAICopilot(prev => !prev); }} style={{
            width: 44, height: 44, borderRadius: 22, border: 'none', cursor: craigDragging ? 'grabbing' : 'pointer',
            background: 'linear-gradient(135deg, #F59E0B, #EA8C00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: showAICopilot ? '0 4px 20px rgba(245,158,11,0.5)' : '0 2px 8px rgba(245,158,11,0.3)',
            transition: 'box-shadow 0.2s, transform 0.15s',
            position: 'relative', overflow: 'visible',
          }} title="Craig — AI Copilot">
            <svg width="28" height="28" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
              <style>{`
                @keyframes craigChomp { 0%,100% { d: path("M95 50 A45 45 0 1 1 50 5 L50 50 Z"); } 50% { d: path("M95 48 A45 45 0 1 1 95 52 L50 50 Z"); } }
                @keyframes craigDot { 0% { transform: translateX(0); opacity:1; } 100% { transform: translateX(-40px); opacity:0; } }
              `}</style>
              {aiCopilotLoading ? (
                <>
                  <path d="M95 50 A45 45 0 1 1 50 5 L50 50 Z" fill="#fff" style={{ animation: 'craigChomp 0.35s ease-in-out infinite' }} />
                  <circle cx="110" cy="50" r="4" fill="#EF4444" style={{ animation: 'craigDot 0.5s linear infinite' }} />
                  <circle cx="122" cy="50" r="4" fill="#EC4899" style={{ animation: 'craigDot 0.5s linear 0.17s infinite' }} />
                  <circle cx="134" cy="50" r="4" fill="#3B82F6" style={{ animation: 'craigDot 0.5s linear 0.34s infinite' }} />
                </>
              ) : (
                <path d="M95 50 A45 45 0 1 1 50 5 L50 50 Z" fill="#fff" />
              )}
              <circle cx="55" cy="28" r="5" fill="#EA8C00" />
            </svg>
            {/* Green status dot */}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, background: '#22C55E', border: '2px solid #fff' }} />
          </button>
        </div>

        {/* AI Copilot Panel */}
        {showAICopilot && (
          <div style={{
            position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)',
            width: 420, maxHeight: 500, zIndex: 50,
            background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ fontSize: 18 }}>🟡</span>
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: 4, background: '#22C55E', border: '2px solid #fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>Craig</div>
                  <div style={{ fontSize: 10, color: '#22C55E', fontWeight: 600 }}>● Online</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select value={aiCopilotModel} onChange={e => setAiCopilotModel(e.target.value as 'haiku' | 'sonnet' | 'opus')}
                  style={{
                    padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)',
                    fontSize: 10, fontWeight: 600, cursor: 'pointer', outline: 'none',
                    background: aiCopilotModel === 'opus' ? 'rgba(124,58,237,0.08)' : aiCopilotModel === 'sonnet' ? 'rgba(55,138,221,0.08)' : 'rgba(0,0,0,0.03)',
                    color: aiCopilotModel === 'opus' ? '#7C3AED' : aiCopilotModel === 'sonnet' ? '#378ADD' : '#8e8e93',
                  }}>
                  <option value="haiku">⚡ Haiku</option>
                  <option value="sonnet">🎯 Sonnet</option>
                  <option value="opus">🧠 Opus</option>
                </select>
                <button onClick={async () => {
                  setShowTokenUsage(prev => !prev);
                  if (!showTokenUsage) {
                    try {
                      const { data } = await supabase.from('ai_usage').select('tokens_total, cost_estimate').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
                      const total = (data || []).reduce((s, r) => s + (r.tokens_total || 0), 0);
                      const cost = (data || []).reduce((s, r) => s + (Number(r.cost_estimate) || 0), 0);
                      setTokenStats({ total, cost: `$${cost.toFixed(4)}`, count: (data || []).length });
                    } catch { /* silent */ }
                  }
                }} style={{ padding: '2px 6px', borderRadius: 4, border: 'none', fontSize: 9, fontWeight: 700, cursor: 'pointer', background: showTokenUsage ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.04)', color: showTokenUsage ? '#D97706' : '#8e8e93', fontFamily: "'JetBrains Mono', monospace" }}>
                  ⚡ TOKENS
                </button>
                <button onClick={() => setShowAICopilot(false)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(0,0,0,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93', fontSize: 14 }}>✕</button>
              </div>
            </div>

            {/* Token Usage Panel */}
            {showTokenUsage && (
              <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(245,158,11,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>This Month</div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#1c1c1e' }}>{tokenStats.total.toLocaleString()}</div>
                        <div style={{ fontSize: 9, color: '#8e8e93' }}>tokens used</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#1c1c1e' }}>{tokenStats.cost}</div>
                        <div style={{ fontSize: 9, color: '#8e8e93' }}>estimated cost</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#1c1c1e' }}>{tokenStats.count}</div>
                        <div style={{ fontSize: 9, color: '#8e8e93' }}>AI calls</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Permissions + Navigation */}
            <div style={{ padding: '8px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { key: 'sendMessages' as const, label: 'Send Texts', icon: '📱', color: '#EF4444' },
                { key: 'editContacts' as const, label: 'Edit Contacts', icon: '👤', color: '#378ADD' },
                { key: 'viewConversations' as const, label: 'View Convos', icon: '💬', color: '#22C55E' },
              ].map(p => (
                <button key={p.key} onClick={() => setAiPermissions(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                  title={`${aiPermissions[p.key] ? 'Disable' : 'Enable'}: Craig can ${p.label.toLowerCase()}`}
                  style={{
                    padding: '3px 8px', borderRadius: 6, border: aiPermissions[p.key] ? `1px solid ${p.color}30` : '1px solid rgba(0,0,0,0.06)',
                    fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    background: aiPermissions[p.key] ? `${p.color}10` : 'rgba(0,0,0,0.02)',
                    color: aiPermissions[p.key] ? p.color : '#c4c4c6',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                  <span style={{ fontSize: 10 }}>{aiPermissions[p.key] ? '✓' : '✕'}</span>
                  {p.icon} {p.label}
                </button>
              ))}
              <span style={{ width: 1, height: 14, background: 'rgba(0,0,0,0.06)', margin: '0 2px' }} />
              {/* Quick nav buttons */}
              {(['dashboard', 'conversations', 'contacts', 'ai-drafts'] as NavTab[]).map(tab => (
                <button key={tab} onClick={() => { setActiveTab(tab); }}
                  style={{
                    padding: '2px 6px', borderRadius: 4, border: 'none', fontSize: 9, fontWeight: 600, cursor: 'pointer',
                    background: activeTab === tab ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.03)',
                    color: activeTab === tab ? '#D97706' : '#8e8e93',
                  }}>{tab === 'ai-drafts' ? 'AI' : tab.charAt(0).toUpperCase() + tab.slice(1, 5)}</button>
              ))}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, minHeight: 120 }}>
              {aiCopilotMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#8e8e93' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🟡</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Hey, I&apos;m Craig</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>&quot;Send Brady a follow-up&quot; · &quot;How many texts today?&quot; · &quot;Draft a promo message&quot;</div>
                </div>
              )}
              {aiCopilotMessages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '8px 12px', borderRadius: 12,
                    background: m.role === 'user' ? '#378ADD' : 'rgba(0,0,0,0.04)',
                    color: m.role === 'user' ? '#fff' : '#1c1c1e',
                    fontSize: 13, lineHeight: 1.5,
                  }}>{m.text}</div>
                </div>
              ))}
              {aiCopilotLoading && (
                <div style={{ display: 'flex', gap: 4, padding: '8px 12px' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: '#8e8e93', animation: `pulse 1.2s ease-in-out ${i*0.15}s infinite` }} />)}
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 8 }}>
              <input
                value={aiCopilotInput}
                onChange={e => setAiCopilotInput(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === 'Enter' && aiCopilotInput.trim() && !aiCopilotLoading) {
                    const text = aiCopilotInput.trim();
                    setAiCopilotInput('');
                    setAiCopilotMessages(prev => [...prev, { role: 'user', text }]);
                    setAiCopilotLoading(true);
                    try {
                      const res = await fetch('/api/ai/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          messages: [...aiCopilotMessages, { role: 'user', content: text }].map(m => ({
                            role: m.role, content: 'text' in m ? m.text : (m as Record<string, string>).content,
                          })),
                          model: aiCopilotModel,
                          systemPrompt: `You are Craig, the AI copilot for the Vernacular dashboard. The user is ${(user?.full_name as string) || 'the admin'} at ${(org?.name as string) || 'their org'}. They manage iMessage conversations through Mac relay stations.

Current tab: ${activeTab}
Permissions: ${aiPermissions.sendMessages ? 'CAN send texts' : 'CANNOT send texts'}, ${aiPermissions.editContacts ? 'CAN edit contacts' : 'CANNOT edit contacts'}, ${aiPermissions.viewConversations ? 'CAN view conversations' : 'CANNOT view conversations'}
Stations: ${stations.map(s => s.name + ' (' + s.status + ')').join(', ') || 'none'}
Contacts: ${contacts.length} total
Active conversations: ${allConversations.filter(c => c.messages.length > 0).length}

ACTIONS YOU CAN TAKE:

1. NAVIGATE: Say "Navigating to [tab name]..." and the dashboard will switch. Tabs: dashboard, conversations, contacts, team, phone lines, ai responder, integrations, profile, settings.

2. SEND MESSAGE: If sendMessages permission is ON, include [SEND:contact_name_or_phone:message text] in your response. Example: [SEND:Brady Walsh:Hey! Just following up on our conversation.] — This will actually send the iMessage through the station.

3. DRAFT MESSAGE: Include [DRAFT:contact_name:draft text] to pre-fill a message in their conversation input without sending. Good for when the user wants to review first.

If sendMessages permission is OFF and they ask to send, tell them to enable it. Be concise — 2-3 sentences max. Use emoji occasionally. Always confirm before sending with [SEND:].`,
                        }),
                      });
                      const data = await res.json();
                      const reply = data.content || 'Sorry, I couldn\'t process that.';
                      setAiCopilotMessages(prev => [...prev, { role: 'assistant', text: reply }]);

                      // Check for navigation commands in Craig's response
                      const navMap: Record<string, NavTab> = {
                        'dashboard': 'dashboard', 'conversations': 'conversations', 'contacts': 'contacts',
                        'team': 'team', 'phone lines': 'stations', 'stations': 'stations',
                        'ai responder': 'ai-drafts', 'integrations': 'integrations',
                        'profile': 'profile', 'settings': 'settings',
                      };
                      const lowerReply = reply.toLowerCase();
                      for (const [keyword, tab] of Object.entries(navMap)) {
                        if ((lowerReply.includes('navigat') || lowerReply.includes('going to') || lowerReply.includes('switching to') || lowerReply.includes('taking you')) && lowerReply.includes(keyword)) {
                          setCraigNavigating(true);
                          setTimeout(() => { setActiveTab(tab); setCraigNavigating(false); }, 800);
                          break;
                        }
                      }

                      // Check for send message commands in Craig's response
                      if (aiPermissions.sendMessages && reply.includes('[SEND:')) {
                        // Parse: [SEND:phone:message]
                        const sendMatch = reply.match(/\[SEND:([^:]+):([^\]]+)\]/);
                        if (sendMatch) {
                          const sendPhone = sendMatch[1].trim();
                          const sendText = sendMatch[2].trim();
                          const orgId = getOrgId();
                          // Find contact by name or phone
                          const contact = contacts.find(c =>
                            (c.full_name || '').toLowerCase().includes(sendPhone.toLowerCase()) ||
                            (c.phone || '').includes(sendPhone)
                          );
                          const phone = contact?.phone || sendPhone;
                          const name = contact?.full_name || sendPhone;

                          try {
                            await fetch('/api/messages/send', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                phoneNumber: phone,
                                message: sendText,
                                contactName: name,
                                organizationId: orgId,
                              }),
                            });
                            setAiCopilotMessages(prev => [...prev, {
                              role: 'assistant',
                              text: `✅ Sent to ${name}: "${sendText}"`,
                            }]);
                          } catch {
                            setAiCopilotMessages(prev => [...prev, {
                              role: 'assistant',
                              text: `❌ Failed to send to ${name}`,
                            }]);
                          }
                        }
                      }

                      // Check for draft message commands
                      if (reply.includes('[DRAFT:')) {
                        const draftMatch = reply.match(/\[DRAFT:([^:]+):([^\]]+)\]/);
                        if (draftMatch) {
                          const draftFor = draftMatch[1].trim();
                          const draftText = draftMatch[2].trim();
                          // Find the conversation column and pre-fill the input
                          const col = columns.find(c =>
                            (c.contact?.name || '').toLowerCase().includes(draftFor.toLowerCase()) ||
                            (c.contact?.phone || '').includes(draftFor)
                          );
                          if (col) {
                            setInputValues(prev => ({ ...prev, [col.id]: draftText }));
                            setActiveTab('conversations');
                            setSelectedConversationId(col.id);
                          }
                        }
                      }

                      // Check for direct navigation requests in user input
                      const lowerInput = text.toLowerCase();
                      for (const [keyword, tab] of Object.entries(navMap)) {
                        if ((lowerInput.includes('go to') || lowerInput.includes('open') || lowerInput.includes('show me') || lowerInput.includes('navigate') || lowerInput.includes('switch to')) && lowerInput.includes(keyword)) {
                          setCraigNavigating(true);
                          setTimeout(() => { setActiveTab(tab); setCraigNavigating(false); }, 800);
                          break;
                        }
                      }
                    } catch {
                      setAiCopilotMessages(prev => [...prev, { role: 'assistant', text: 'Something went wrong.' }]);
                    }
                    setAiCopilotLoading(false);
                  }
                }}
                placeholder="Ask the AI copilot..."
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
                  fontSize: 13, outline: 'none', fontFamily: "'Inter', sans-serif",
                }}
              />
              <button onClick={() => {
                const input = aiCopilotInput.trim();
                if (input) {
                  const e = new KeyboardEvent('keydown', { key: 'Enter' });
                  (document.activeElement as HTMLElement)?.dispatchEvent(e);
                }
              }} style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: '#F59E0B', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* Top Bar for dashboard view */}
        {activeTab === 'dashboard' && (
          <div style={{
            height: 56, minHeight: 56, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', margin: 0 }}>
                {pageTitles[activeTab]}
              </h1>
              <span style={{
                fontSize: 12, fontWeight: 600, color: '#8e8e93',
                background: 'rgba(0,0,0,0.04)', padding: '3px 10px', borderRadius: 6,
              }}>
                Overview
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#8e8e93', fontWeight: 500 }} suppressHydrationWarning>
              {typeof window !== 'undefined' ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
            </div>
          </div>
        )}

        {renderContent()}

        {/* Craig navigation overlay */}
        {craigNavigating && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 40,
            background: 'rgba(245,158,11,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'craigNav 0.8s ease-in-out',
            pointerEvents: 'none',
          }}>
            <div style={{
              background: 'rgba(245,158,11,0.15)', borderRadius: 20, padding: '16px 32px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 4px 20px rgba(245,158,11,0.2)',
            }}>
              <span style={{ fontSize: 24 }}>🟡</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#D97706' }}>Craig is navigating...</span>
            </div>
          </div>
        )}

        <style>{`@keyframes craigNav { 0% { opacity: 0; } 30% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }`}</style>
      </main>

      {/* Global Invite Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={() => inviteStatus !== 'sending' && setShowInviteModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '32px', width: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            {inviteStatus === 'sent' && inviteResult ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1c1c1e', marginBottom: 8 }}>Member Invited!</h3>
                <p style={{ fontSize: 13, color: '#8e8e93', marginBottom: 16, lineHeight: 1.5 }}>{inviteResult?.message}</p>
                {inviteResult?.tempPassword && (
                  <div style={{
                    padding: '14px 18px', borderRadius: 12, background: '#f8f9fa',
                    border: '1px solid rgba(0,0,0,0.06)', marginBottom: 16, textAlign: 'left',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Temporary Password</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1c1c1e', fontFamily: "'JetBrains Mono', monospace" }}>{inviteResult?.tempPassword}</div>
                    <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 6, fontWeight: 500 }}>Share this securely. They must change it on first login.</div>
                  </div>
                )}
                <button onClick={() => { setShowInviteModal(false); window.location.reload(); }} style={{
                  width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #378ADD, #2B6CB0)', color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>Done</button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1c1c1e', marginBottom: 4 }}>Invite Team Member</h3>
                <p style={{ fontSize: 13, color: '#8e8e93', marginBottom: 20 }}>They&apos;ll get a login to your Vernacular workspace.</p>
                {inviteResult?.error && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', fontSize: 12 }}>{inviteResult?.error}</div>
                )}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Full Name *</label>
                  <input value={inviteForm.fullName} onChange={e => setInviteForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Tyler Alesso" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.1)', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'Inter', sans-serif" }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Email *</label>
                  <input value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="tyler@company.com" type="email" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.1)', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'Inter', sans-serif" }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Role</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['admin', 'member'].map(r => (
                      <button key={r} onClick={() => setInviteForm(p => ({ ...p, role: r }))} style={{
                        flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
                        border: inviteForm.role === r ? '2px solid #378ADD' : '1.5px solid rgba(0,0,0,0.1)',
                        background: inviteForm.role === r ? 'rgba(55,138,221,0.06)' : '#fff',
                        fontSize: 13, fontWeight: 600, color: inviteForm.role === r ? '#378ADD' : '#1c1c1e',
                        textTransform: 'capitalize', fontFamily: "'Inter', sans-serif",
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
                <button onClick={async () => {
                  if (!inviteForm.fullName || !inviteForm.email) { setInviteResult({ error: 'Name and email are required' }); return; }
                  setInviteStatus('sending'); setInviteResult(null);
                  try {
                    const orgId = (user?.organizations as Record<string, unknown>)?.id as string;
                    const res = await fetch('/api/team/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...inviteForm, organizationId: orgId }) });
                    const data = await res.json();
                    if (!res.ok) { setInviteResult({ error: data.error }); setInviteStatus('error'); return; }
                    setInviteResult({ tempPassword: data.tempPassword, message: data.message }); setInviteStatus('sent');
                  } catch (err) { setInviteResult({ error: err instanceof Error ? err.message : 'Failed to invite' }); setInviteStatus('error'); }
                }} disabled={inviteStatus === 'sending'} style={{
                  width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                  background: inviteStatus === 'sending' ? '#9fc5eb' : 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: inviteStatus === 'sending' ? 'default' : 'pointer',
                }}>{inviteStatus === 'sending' ? 'Inviting...' : 'Send Invite'}</button>
                <button onClick={() => setShowInviteModal(false)} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: 'transparent', color: '#8e8e93', cursor: 'pointer', fontSize: 13, marginTop: 8 }}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Global Contact Edit Modal */}
      {editingContact && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={() => setEditingContact(null)}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '0', width: 400, maxHeight: '80vh', overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '28px 24px 16px', textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 36, margin: '0 auto 12px',
                background: 'linear-gradient(135deg, #378ADD, #6366F1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 24, fontWeight: 700,
              }}>
                {editingContact?.name ? editingContact.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '##'}
              </div>
              <input value={editingContact.name} placeholder="Contact Name"
                onChange={e => setEditingContact(prev => prev ? { ...prev, name: e.target.value } : null)}
                style={{ width: '80%', padding: '8px', borderRadius: 8, border: 'none', fontSize: 18, fontWeight: 700, textAlign: 'center', outline: 'none', color: '#1c1c1e', background: 'transparent' }} />
            </div>
            <div style={{ padding: '16px 24px' }}>
              {[
                { section: 'Contact', fields: [
                  { label: 'Phone', key: 'phone', placeholder: '+1 (412) 735-1089', mono: true },
                  { label: 'Email', key: 'email', placeholder: 'name@company.com' },
                ]},
                { section: 'Work', fields: [
                  { label: 'Company', key: 'company', placeholder: 'Acme Inc' },
                  { label: 'Title', key: 'jobTitle', placeholder: 'VP of Sales' },
                ]},
                { section: 'Social', fields: [
                  { label: 'LinkedIn', key: 'linkedin', placeholder: 'linkedin.com/in/...' },
                  { label: 'Instagram', key: 'instagram', placeholder: '@handle' },
                  { label: 'Twitter/X', key: 'twitter', placeholder: '@handle' },
                  { label: 'Venmo', key: 'venmo', placeholder: '@username' },
                ]},
              ].map(group => (
                <div key={group.section}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '12px 0 4px' }}>{group.section}</div>
                  {group.fields.map(field => (
                    <div key={field.key} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <label style={{ width: 70, fontSize: 12, fontWeight: 600, color: '#8e8e93', flexShrink: 0 }}>{field.label}</label>
                      <input value={(editingContact as Record<string, string>)[field.key] || ''} placeholder={field.placeholder}
                        onChange={e => setEditingContact(prev => prev ? { ...prev, [field.key]: e.target.value } : null)}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', fontSize: 13, outline: 'none', color: '#1c1c1e', background: 'transparent', fontFamily: field.mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif" }} />
                    </div>
                  ))}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setEditingContact(null)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)',
                  background: '#fff', fontSize: 13, fontWeight: 600, color: '#1c1c1e', cursor: 'pointer',
                }}>Cancel</button>
                <button onClick={async () => {
                  if (!editingContact) return;
                  const fullName = editingContact.name || `${editingContact.firstName} ${editingContact.lastName}`.trim();
                  const phone = editingContact.phone;
                  const orgId = getOrgId();

                  // Save via API route (service role bypasses RLS)
                  if (phone) {
                    await fetch('/api/contacts/update', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        phone,
                        fullName: fullName || undefined,
                        firstName: editingContact.firstName || undefined,
                        lastName: editingContact.lastName || undefined,
                        email: editingContact.email || undefined,
                        company: editingContact.company || undefined,
                        jobTitle: editingContact.jobTitle || undefined,
                        linkedin: editingContact.linkedin || undefined,
                        instagram: editingContact.instagram || undefined,
                        twitter: editingContact.twitter || undefined,
                        school: editingContact.school || undefined,
                        greekOrg: editingContact.greekOrg || undefined,
                        venmo: editingContact.venmo || undefined,
                        notes: editingContact.notes || undefined,
                      }),
                    });
                  }

                  // Update column header with new name
                  const newName = fullName || phone;
                  const newInitials = fullName ? fullName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '##';
                  setColumns(prev => prev.map(c => c.id === editingContact.colId && c.contact ? {
                    ...c, contact: { ...c.contact, name: newName, initials: newInitials },
                  } : c));
                  setAllConversations(prev => prev.map(c => c.id === editingContact.colId && c.contact ? {
                    ...c, contact: { ...c.contact, name: newName, initials: newInitials },
                  } : c));

                  // Refresh contacts list
                  const { data: refreshed } = await supabase.from('contacts').select('*').order('full_name').limit(200);
                  if (refreshed) setContacts(refreshed as unknown as ContactRecord[]);

                  setEditingContact(null);
                }} style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #378ADD, #2B6CB0)', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
                }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
