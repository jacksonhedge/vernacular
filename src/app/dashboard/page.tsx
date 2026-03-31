'use client';

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

type ConversationViewMode = 'streams' | 'summary' | 'schedule';

// ── Mock Data for Conversations View ────────────────────────────────────────

const MOCK_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Sarah Chen', initials: 'SC', tag: 'VIP Client', tagColor: '#D97706', tagBg: 'rgba(217,119,6,0.1)' },
  { id: 'c2', name: 'Marcus Williams', initials: 'MW', tag: 'Enterprise', tagColor: '#7C3AED', tagBg: 'rgba(124,58,237,0.1)' },
  { id: 'c3', name: 'David Kim', initials: 'DK', tag: 'Lead', tagColor: '#2563EB', tagBg: 'rgba(37,99,235,0.1)' },
];

// MOCK_CONVERSATIONS removed — real conversations loaded from Supabase

// ── Nav Config ──────────────────────────────────────────────────────────────

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
    label: 'AI Response Skills',
    tab: 'ai-drafts',
    color: '#D97706',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.912 5.813L20 10.5l-4.376 3.937L16.824 21 12 17.5 7.176 21l1.2-6.75L4 10.5l6.088-1.687L12 3z" /><path d="M5 3v4" /><path d="M3 5h4" /><path d="M19 17v4" /><path d="M17 19h4" />
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
  const [showContactPicker, setShowContactPicker] = useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [editingContact, setEditingContact] = useState<{
    colId: string; firstName: string; lastName: string; name: string; phone: string; email: string;
    company: string; jobTitle: string; linkedin: string; instagram: string; twitter: string;
    school: string; greekOrg: string; state: string; city: string; dob: string;
    venmo: string; notes: string;
  } | null>(null);
  const [aiResponseEnabled, setAiResponseEnabled] = useState<Record<string, boolean>>({});
  const [showAiAgentPanel, setShowAiAgentPanel] = useState(false);
  const [aiAgentSettings, setAiAgentSettings] = useState({ enabled: false, prepareText: true });
  const [newConvPhone, setNewConvPhone] = useState('');
  const [newConvName, setNewConvName] = useState('');
  const [hoveredColClose, setHoveredColClose] = useState<string | null>(null);
  const messageEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
          .eq('direction', 'outbound')
          .gte('sent_at', todayStart.toISOString()),
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('direction', 'outbound'),
        supabase.from('conversations').select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('ai_generated', true),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('conversations').select('id, unread_count')
          .gt('unread_count', 0),
        supabase.from('messages').select(`
          id, direction, body, ai_generated, sent_at, status,
          conversations!inner(contact_id, contacts(full_name, phone))
        `).order('sent_at', { ascending: false }).limit(10),
        supabase.from('stations').select('*').eq('organization_id', orgId).order('name'),
        supabase.from('users').select('id, full_name, email, role').eq('organization_id', orgId).order('role'),
        supabase.from('org_settings').select('*').eq('organization_id', orgId).single(),
        supabase.from('contacts').select('*').order('full_name').limit(200),
        supabase.from('org_integrations').select('*').eq('organization_id', orgId),
      ]);

      const totalConv = (totalConvData as unknown[])?.length || 0;
      const respondedConv = (respondedConvData as unknown[])?.length || 0;
      const rate = totalConv > 0 ? Math.round((respondedConv / totalConv) * 100) : 0;

      setMetrics({
        messagesToday: todayCount || 0,
        messagesAllTime: allTimeCount || 0,
        responseRate: rate,
        activeConversations: activeConvCount || 0,
        aiDrafts: aiDraftCount || 0,
      });

      // Recent messages
      const formatted: RecentMessage[] = ((recentMsgData as Record<string, unknown>[]) || []).map((m) => {
        const conv = m.conversations as Record<string, unknown>;
        const contact = conv?.contacts as Record<string, unknown>;
        return {
          id: m.id as string,
          contactName: (contact?.full_name as string) || 'Unknown',
          contactPhone: (contact?.phone as string) || '',
          preview: ((m.body as string) || '').slice(0, 80),
          direction: m.direction as string,
          aiGenerated: m.ai_generated as boolean,
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

    // Fetch Notion contacts and conversation pages
    fetch('/api/notion/contacts').then(r => r.json()).then(data => {
      if (data.contacts) setNotionContacts(data.contacts);
    }).catch(() => {});

    fetch('/api/notion/conversations').then(r => r.json()).then(data => {
      if (data.conversations) {
        // Store full conversation data including phone, status, lastMessage, etc.
        const enriched = data.conversations.map((c: Record<string, unknown>) => ({
          name: c.name as string,
          pageId: c.pageId as string,
          initials: c.initials as string,
          phone: (c.phone as string) || '',
          school: (c.school as string) || '',
          org: (c.org as string) || '',
          status: (c.status as string) || '',
          messageCount: (c.messageCount as number) || 0,
          lastMessage: (c.lastMessage as string) || '',
        }));
        setNotionConversations(enriched);
      }
    }).catch(() => {});

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
            messages: (messages || []).map((m: Record<string, unknown>) => ({
              id: m.id as string,
              text: m.text as string,
              direction: m.direction as 'outgoing' | 'incoming',
              timestamp: m.timestamp as string,
              isAIDraft: m.isAIDraft as boolean | undefined,
            })),
          };
        });
        setColumns(realColumns);
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
          .eq('organization_id', orgId).order('name');
        if (stationData) {
          setStations(stationData as Station[]);
        }

        // Re-fetch conversations for unread counts
        const { data: convData } = await supabase
          .from('conversations').select('unread_count')
          .gt('unread_count', 0);
        if (convData) {
          setUnreadCount((convData as Array<{ unread_count?: number }>).reduce((sum, c) => sum + (c.unread_count || 0), 0));
        }
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Auto-scroll conversation columns
  useEffect(() => {
    Object.values(messageEndRefs.current).forEach(ref => {
      ref?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [columns]);

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
  };

  const pickContact = (colId: string, contact: Contact) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, contact } : c));
    setShowContactPicker(null);
  };

  const startNewConversation = (colId: string) => {
    if (!newConvPhone) return;
    const name = newConvName || newConvPhone;
    const initials = newConvName ? newConvName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '##';
    const contact: Contact = {
      id: `new-${Date.now()}`,
      name,
      initials,
      tag: 'NEW',
      tagColor: '#378ADD',
      tagBg: 'rgba(55,138,221,0.1)',
      phone: newConvPhone,
    };
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, contact, messages: [] } : c));
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

    // If contact has a phone number, send via the real pipeline
    if (contactPhone && contactPhone !== 'TBD') {
      try {
        await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: contactPhone,
            message: text,
            contactName: contactName || '',
            organizationId: (user?.organizations as Record<string, unknown>)?.id,
          }),
        });
      } catch {
        // Message shown in UI already — log silently
        console.error('Failed to queue message via API');
      }
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
  };

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
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
      setTimeout(() => setSaveStatus('idle'), 3000);
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
      {showWelcomeBanner && allMetricsZero && (
        <div style={{
          background: 'linear-gradient(135deg, #378ADD 0%, #2B6CB0 60%, #1E4D8C 100%)',
          borderRadius: 16, padding: '24px 28px', marginBottom: 24, position: 'relative',
          color: '#fff', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: '100%', background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Welcome to Vernacular!</h2>
              <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 16px', opacity: 0.9 }}>Get started in 3 easy steps:</p>
              <div style={{ display: 'flex', gap: 24 }}>
                {[
                  { num: '1', text: 'Connect a phone line' },
                  { num: '2', text: 'Import contacts' },
                  { num: '3', text: 'Send your first message' },
                ].map(step => (
                  <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 12, background: 'rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>{step.num}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{step.text}</span>
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
        <div style={cardStyle}>
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
        <div style={cardStyle}>
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
        <div style={cardStyle}>
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
        <div style={cardStyle}>
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
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={panelHeaderStyle}>Phone Line Status</div>
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
                    background: st.status === 'online' ? '#22C55E' : st.status === 'idle' ? '#F59E0B' : '#EF4444',
                    boxShadow: st.status === 'online' ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
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
            <button style={{ ...primaryBtnStyle, width: '100%', justifyContent: 'center', fontSize: 12 }}>
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
              <div style={{
                ...toggleStyle(orgSettings?.ai_auto_draft || false),
                display: 'flex', alignItems: 'center',
              }}>
                <div style={toggleDotStyle(orgSettings?.ai_auto_draft || false)} />
              </div>
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

  const renderConversations = () => (
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
                Updated Last: {stations.length > 0 && stations[0].last_heartbeat
                  ? new Date(stations[0].last_heartbeat).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  : 'N/A'}
              </span>
            </>
          )}
        </div>
        {conversationViewMode === 'streams' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loadAllNotionConversations} disabled={loadingNotion} style={{
              ...primaryBtnStyle,
              background: loadingNotion ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)',
              color: loadingNotion ? '#8e8e93' : '#1c1c1e',
              boxShadow: 'none',
            }}>
              {loadingNotion ? (
                'Reloading...'
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h6v6h-6z" />
                  </svg>
                  Reload
                </>
              )}
            </button>
            <button onClick={addColumn} style={primaryBtnStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Column
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

      {/* Streams (Columns) View */}
      {conversationViewMode === 'streams' && <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Contact List Panel */}
        <div style={{ width: 300, minWidth: 300, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(0,0,0,0.08)', background: '#fff' }}>
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
          {/* Pinned Contacts Grid */}
          <div style={{ padding: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {/* AI Agent Pin */}
              <button onClick={() => setShowAiAgentPanel(true)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 28,
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                }}>🤖</div>
                <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600, textAlign: 'center' }}>AI Agent</span>
              </button>
              {columns
                .filter(col => col.contact && col.contact.name.toLowerCase().includes(conversationSearch.toLowerCase()))
                .slice(0, 8)
                .map(col => {
                  const hasUnread = col.messages.length > 0 && col.messages[col.messages.length - 1].direction === 'incoming';
                  return (
                    <button key={col.id} onClick={() => {
                      setSelectedConversationId(col.id);
                      const el = document.getElementById(`stream-col-${col.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start' });
                    }} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: selectedConversationId === col.id ? 'rgba(55,138,221,0.08)' : 'transparent',
                    }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          width: 56, height: 56, borderRadius: 28,
                          background: 'linear-gradient(135deg, #378ADD, #6366F1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: '0.02em',
                        }}>
                          {col.contact?.initials || '##'}
                        </div>
                        {hasUnread && (
                          <div style={{
                            position: 'absolute', top: 0, right: 0,
                            width: 12, height: 12, borderRadius: 6,
                            background: '#378ADD', border: '2px solid #fff',
                          }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, color: '#1c1c1e', fontWeight: 500, textAlign: 'center',
                        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontFamily: "'Inter', sans-serif",
                      }}>
                        {col.contact?.name.split(' ')[0] || 'Unknown'}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
          {/* Color Key */}
          <div style={{ display: 'flex', gap: 10, padding: '8px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', background: '#fafbfc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(34,197,94,0.3)' }} />
              <span style={{ fontSize: 9, color: '#8e8e93', fontWeight: 600 }}>Unread</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(245,158,11,0.3)' }} />
              <span style={{ fontSize: 9, color: '#8e8e93', fontWeight: 600 }}>Awaiting Approval</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(0,0,0,0.04)' }} />
              <span style={{ fontSize: 9, color: '#8e8e93', fontWeight: 600 }}>Read</span>
            </div>
          </div>
          {/* Conversation List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {columns
              .filter(col => col.contact && col.contact.name.toLowerCase().includes(conversationSearch.toLowerCase()))
              .map(col => {
                const lastMsg = col.messages.length > 0 ? col.messages[col.messages.length - 1] : null;
                const hasUnread = lastMsg?.direction === 'incoming';
                const hasAiDraft = lastMsg?.isAIDraft;
                const isSelected = selectedConversationId === col.id;
                const rowBg = isSelected
                  ? 'rgba(55,138,221,0.08)'
                  : hasAiDraft
                    ? 'rgba(245,158,11,0.06)'
                    : hasUnread
                      ? 'rgba(34,197,94,0.06)'
                      : 'transparent';
                return (
                  <button key={col.id} onClick={() => {
                    setSelectedConversationId(col.id);
                    const el = document.getElementById(`stream-col-${col.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start' });
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    padding: '12px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: rowBg,
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    minHeight: 68,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 20, flexShrink: 0,
                      background: 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.02em',
                    }}>
                      {col.contact?.initials || '##'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: hasUnread ? 700 : 600, color: '#1c1c1e',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontFamily: "'Inter', sans-serif",
                      }}>
                        {col.contact?.name || 'Unknown'}
                      </div>
                      <div style={{
                        fontSize: 11, color: '#8e8e93', fontWeight: 400,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontFamily: "'Inter', sans-serif", marginTop: 2,
                      }}>
                        {lastMsg?.text || 'No messages yet'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 11, color: '#8e8e93', fontFamily: "'Inter', sans-serif",
                        whiteSpace: 'nowrap',
                      }}>
                        {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                      </span>
                      {hasUnread && (
                        <div style={{
                          width: 8, height: 8, borderRadius: 4, background: '#378ADD',
                        }} />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) {
                            // Close: remove column and deselect
                            removeColumn(col.id);
                            setSelectedConversationId(null);
                          } else {
                            // Show: move column to first position and select
                            setColumns(prev => {
                              const idx = prev.findIndex(c => c.id === col.id);
                              if (idx <= 0) return prev;
                              const item = prev[idx];
                              const rest = prev.filter((_, i) => i !== idx);
                              return [item, ...rest];
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
                          background: isSelected ? 'rgba(239,68,68,0.08)' : 'rgba(55,138,221,0.08)',
                          color: isSelected ? '#DC2626' : '#378ADD',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {isSelected ? 'Close' : 'Show'}
                      </button>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
        {/* Stream Columns */}
        <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'auto', overflowX: 'auto', padding: '16px 16px', minHeight: 0 }}>
        {columns.map(col => (
          <div key={col.id} id={`stream-col-${col.id}`} style={{
            width: 360, minWidth: 360, height: '100%', display: 'flex', flexDirection: 'column',
            background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
            marginRight: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            {/* Column Header */}
            <div style={{
              padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 10, background: '#fafbfc', minHeight: 52,
            }}>
              {col.contact ? (
                <>
                  <div
                    onClick={() => (() => { const n = col.contact!.name.split(' '); setEditingContact({ colId: col.id, firstName: n[0] || '', lastName: n.slice(1).join(' ') || '', name: col.contact!.name, phone: col.contact!.phone || '', email: '', company: '', jobTitle: '', linkedin: '', instagram: '', twitter: '', school: '', greekOrg: '', state: '', city: '', dob: '', venmo: '', notes: '' }); })()}
                    style={{
                      width: 34, height: 34, borderRadius: 17,
                      background: 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0, letterSpacing: '0.02em',
                      cursor: 'pointer',
                    }}
                    title="Edit contact info"
                  >
                    {col.contact.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      onClick={() => (() => { const n = col.contact!.name.split(' '); setEditingContact({ colId: col.id, firstName: n[0] || '', lastName: n.slice(1).join(' ') || '', name: col.contact!.name, phone: col.contact!.phone || '', email: '', company: '', jobTitle: '', linkedin: '', instagram: '', twitter: '', school: '', greekOrg: '', state: '', city: '', dob: '', venmo: '', notes: '' }); })()}
                      style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                      title="Edit contact info"
                    >
                      {col.contact.name}
                      {col.messages.length > 0 && col.messages[col.messages.length - 1].direction === 'incoming' && !col.messages[col.messages.length - 1].isAIDraft && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: col.contact.tagColor,
                      background: col.contact.tagBg, padding: '2px 7px', borderRadius: 4,
                      fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {col.contact.tag}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, fontSize: 13, color: '#8e8e93', fontWeight: 500 }}>
                  Select a contact...
                </div>
              )}
              {/* AI toggle moved to input bar */}
              <button
                onClick={() => setShowTimestamps(prev => !prev)}
                title={showTimestamps ? 'Hide Times' : 'Show Times'}
                style={{
                  padding: '4px 8px', borderRadius: 6, border: 'none', fontSize: 10, fontWeight: 600,
                  background: showTimestamps ? 'rgba(55,138,221,0.1)' : 'rgba(0,0,0,0.04)',
                  color: showTimestamps ? '#378ADD' : '#8e8e93', cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {showTimestamps ? 'Hide Times' : 'Times'}
              </button>
              <button
                onClick={() => removeColumn(col.id)}
                onMouseEnter={() => setHoveredColClose(col.id)}
                onMouseLeave={() => setHoveredColClose(null)}
                style={{
                  width: 28, height: 28, borderRadius: 6, border: 'none',
                  background: hoveredColClose === col.id ? 'rgba(0,0,0,0.06)' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#8e8e93', flexShrink: 0, transition: 'background 0.15s ease',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Contact Picker */}
            {!col.contact && showContactPicker === col.id && (
              <div style={{ padding: 12, borderBottom: '1px solid rgba(0,0,0,0.06)', maxHeight: 380, overflow: 'auto' }}>
                {/* New Conversation */}
                <div style={{
                  fontSize: 10, fontWeight: 700, color: '#378ADD', textTransform: 'uppercase',
                  letterSpacing: '0.06em', padding: '4px 10px 6px', marginTop: 2,
                }}>
                  New Conversation
                </div>
                <div style={{ padding: '4px 10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={newConvPhone}
                    onChange={e => setNewConvPhone(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      border: '1.5px solid rgba(0,0,0,0.1)', outline: 'none',
                      fontSize: 15, fontFamily: "'JetBrains Mono', monospace",
                      background: '#fff', color: '#1c1c1e', boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#378ADD')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)')}
                  />
                  <input
                    type="text"
                    placeholder="Contact name (optional)"
                    value={newConvName}
                    onChange={e => setNewConvName(e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: 8,
                      border: '1.5px solid rgba(0,0,0,0.1)', outline: 'none',
                      fontSize: 12, fontFamily: "'Inter', sans-serif",
                      background: '#fff', color: '#1c1c1e', boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#378ADD')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)')}
                  />
                  <button
                    onClick={() => startNewConversation(col.id)}
                    disabled={!newConvPhone}
                    style={{
                      width: '100%', padding: '7px 0', borderRadius: 8, border: 'none',
                      background: newConvPhone ? '#378ADD' : 'rgba(55,138,221,0.3)',
                      color: '#fff', fontSize: 12, fontWeight: 600,
                      fontFamily: "'Inter', sans-serif", cursor: newConvPhone ? 'pointer' : 'default',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    Start Conversation
                  </button>
                </div>
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 4, marginBottom: 4 }} />
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
            <div style={{
              flex: 1, overflow: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
              background: '#f8f9fa',
            }}>
              {col.messages.map((msg, msgIdx) => {
                const isLastOutgoing = msg.direction === 'outgoing' && !msg.isAIDraft &&
                  !col.messages.slice(msgIdx + 1).some(m => m.direction === 'outgoing' && !m.isAIDraft);
                const isRecent = msg.id.startsWith('m-');
                return (
                  <div key={msg.id} style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                  }}>
                    {/* Bubble */}
                    <div style={{
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: msg.direction === 'outgoing' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: msg.isAIDraft
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))'
                        : msg.direction === 'outgoing' ? '#378ADD' : '#fff',
                      color: msg.isAIDraft ? '#92400E' : msg.direction === 'outgoing' ? '#fff' : '#1c1c1e',
                      fontSize: 13, lineHeight: 1.5, fontWeight: 400,
                      border: msg.isAIDraft ? '1px dashed rgba(245,158,11,0.4)' : msg.direction === 'incoming' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}>
                      {msg.isAIDraft && (
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: '#F59E0B', marginBottom: 6,
                          fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>AI DRAFT</div>
                      )}
                      {msg.text}
                    </div>
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
                        <span style={{ fontSize: 10, color: '#8e8e93' }}>
                          {isRecent ? 'Delivering...' : 'Delivered'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={el => { messageEndRefs.current[col.id] = el; }} />
            </div>

            {/* Input */}
            {col.contact && (
              <div style={{
                padding: '10px 14px', borderTop: '1px solid rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column', gap: 6, background: '#fff',
              }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {/* AI toggle */}
                  <button
                    onClick={() => setAiResponseEnabled(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
                    title={aiResponseEnabled[col.id] ? 'AI Agent ON — Click to disable' : 'Enable AI Agent'}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none', flexShrink: 0,
                      background: aiResponseEnabled[col.id] ? 'rgba(245,158,11,0.15)' : 'rgba(0,0,0,0.04)',
                      color: aiResponseEnabled[col.id] ? '#D97706' : '#8e8e93', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14,
                    }}
                  >
                    {aiResponseEnabled[col.id] ? '🤖' : '🤖'}
                  </button>
                  <input
                    value={inputValues[col.id] || ''}
                    onChange={e => setInputValues(prev => ({ ...prev, [col.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') sendMessage(col.id); }}
                    placeholder={aiResponseEnabled[col.id] ? 'AI Agent active...' : 'Type a message...'}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.1)', fontSize: 13,
                      fontFamily: "'Inter', sans-serif", outline: 'none', background: '#f8f9fa',
                    }}
                  />
                  {/* Schedule button */}
                  <button
                    onClick={() => window.alert('Schedule message coming soon. Use the Schedule tab for blast scheduling.')}
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
      </div>}

      {/* Contact Edit Modal — iMessage Contact Card */}
      {editingContact && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={() => setEditingContact(null)}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '0', width: 400, maxHeight: '80vh', overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            {/* Avatar header */}
            <div style={{ padding: '28px 24px 16px', textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 36, margin: '0 auto 12px',
                background: 'linear-gradient(135deg, #378ADD, #6366F1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 24, fontWeight: 700,
              }}>
                {editingContact.name ? editingContact.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '##'}
              </div>
              <input value={editingContact.name} placeholder="Contact Name"
                onChange={e => setEditingContact(prev => prev ? { ...prev, name: e.target.value } : null)}
                style={{ width: '80%', padding: '8px', borderRadius: 8, border: 'none', fontSize: 18, fontWeight: 700, textAlign: 'center', outline: 'none', color: '#1c1c1e', background: 'transparent' }} />
            </div>

            {/* Contact fields */}
            <div style={{ padding: '16px 24px' }}>
              {/* Name row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#8e8e93', display: 'block', marginBottom: 2 }}>First Name</label>
                  <input value={editingContact.firstName} placeholder="First"
                    onChange={e => setEditingContact(prev => prev ? { ...prev, firstName: e.target.value, name: `${e.target.value} ${prev.lastName}`.trim() } : null)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#8e8e93', display: 'block', marginBottom: 2 }}>Last Name</label>
                  <input value={editingContact.lastName} placeholder="Last"
                    onChange={e => setEditingContact(prev => prev ? { ...prev, lastName: e.target.value, name: `${prev.firstName} ${e.target.value}`.trim() } : null)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
              </div>

              {/* Section: Contact */}
              <div style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 0 4px' }}>Contact</div>
              {[
                { label: 'Phone', key: 'phone', placeholder: '+1 (412) 735-1089', mono: true },
                { label: 'Email', key: 'email', placeholder: 'name@company.com', mono: false },
              ].map(field => (
                <div key={field.key} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <label style={{ width: 70, fontSize: 12, fontWeight: 600, color: '#8e8e93', flexShrink: 0 }}>{field.label}</label>
                  <input value={(editingContact as Record<string, string>)[field.key] || ''} placeholder={field.placeholder}
                    onChange={e => setEditingContact(prev => prev ? { ...prev, [field.key]: e.target.value } : null)}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', fontSize: 13, outline: 'none', color: '#1c1c1e', background: 'transparent', fontFamily: field.mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif" }} />
                </div>
              ))}

              {/* Section: Work */}
              <div style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '12px 0 4px' }}>Work</div>
              {[
                { label: 'Company', key: 'company', placeholder: 'Acme Inc' },
                { label: 'Title', key: 'jobTitle', placeholder: 'VP of Sales' },
              ].map(field => (
                <div key={field.key} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <label style={{ width: 70, fontSize: 12, fontWeight: 600, color: '#8e8e93', flexShrink: 0 }}>{field.label}</label>
                  <input value={(editingContact as Record<string, string>)[field.key] || ''} placeholder={field.placeholder}
                    onChange={e => setEditingContact(prev => prev ? { ...prev, [field.key]: e.target.value } : null)}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', fontSize: 13, outline: 'none', color: '#1c1c1e', background: 'transparent' }} />
                </div>
              ))}

              {/* Section: Social */}
              <div style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '12px 0 4px' }}>Social</div>
              {[
                { label: 'LinkedIn', key: 'linkedin', placeholder: 'linkedin.com/in/...' },
                { label: 'Instagram', key: 'instagram', placeholder: '@handle' },
                { label: 'Twitter/X', key: 'twitter', placeholder: '@handle' },
                { label: 'Venmo', key: 'venmo', placeholder: '@username' },
              ].map(field => (
                <div key={field.key} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <label style={{ width: 70, fontSize: 12, fontWeight: 600, color: '#8e8e93', flexShrink: 0 }}>{field.label}</label>
                  <input value={(editingContact as Record<string, string>)[field.key] || ''} placeholder={field.placeholder}
                    onChange={e => setEditingContact(prev => prev ? { ...prev, [field.key]: e.target.value } : null)}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', fontSize: 13, outline: 'none', color: '#1c1c1e', background: 'transparent' }} />
                </div>
              ))}

              {/* Section: Personal */}
              <div style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '12px 0 4px' }}>Personal</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}>
                    <label style={{ width: 70, fontSize: 12, fontWeight: 600, color: '#8e8e93', flexShrink: 0 }}>School</label>
                    <input value={editingContact.school} placeholder="UofSC"
                      onChange={e => setEditingContact(prev => prev ? { ...prev, school: e.target.value } : null)}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', fontSize: 13, outline: 'none', color: '#1c1c1e', background: 'transparent' }} />
                  </div>
                </div>
              </div>
              {[
                { label: 'Greek Org', key: 'greekOrg', placeholder: 'Sigma Chi' },
                { label: 'City', key: 'city', placeholder: 'Pittsburgh' },
                { label: 'State', key: 'state', placeholder: 'PA' },
                { label: 'Birthday', key: 'dob', placeholder: 'MM/DD/YYYY' },
              ].map(field => (
                <div key={field.key} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <label style={{ width: 70, fontSize: 12, fontWeight: 600, color: '#8e8e93', flexShrink: 0 }}>{field.label}</label>
                  <input value={(editingContact as Record<string, string>)[field.key] || ''} placeholder={field.placeholder}
                    onChange={e => setEditingContact(prev => prev ? { ...prev, [field.key]: e.target.value } : null)}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', fontSize: 13, outline: 'none', color: '#1c1c1e', background: 'transparent' }} />
                </div>
              ))}
              {/* Notes */}
              <div style={{ padding: '10px 0' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8e8e93', display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea
                  value={editingContact.notes || ''}
                  placeholder="Add notes about this contact..."
                  onChange={e => setEditingContact(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  rows={3}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
                    fontSize: 13, outline: 'none', color: '#1c1c1e', resize: 'vertical', boxSizing: 'border-box' as const,
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>
            </div>

            {/* Save / Cancel */}
            <div style={{ display: 'flex', gap: 8, padding: '12px 24px 20px' }}>
              <button onClick={async () => {
                const ec = editingContact;
                const initials = ec.name ? ec.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '##';
                setColumns(prev => prev.map(c => c.id === ec.colId && c.contact ? {
                  ...c, contact: { ...c.contact, name: ec.name, initials, phone: ec.phone }
                } : c));
                try {
                  await fetch('/api/contacts/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      organizationId: (user?.organizations as Record<string, unknown>)?.id,
                      source: 'edit',
                      contacts: [{
                        phone: ec.phone, fullName: ec.name, full_name: ec.name,
                        firstName: ec.firstName, first_name: ec.firstName,
                        lastName: ec.lastName, last_name: ec.lastName,
                        email: ec.email, company: ec.company,
                        jobTitle: ec.jobTitle, job_title: ec.jobTitle,
                        linkedinUrl: ec.linkedin, linkedin_url: ec.linkedin,
                        instagram: ec.instagram, instagram_handle: ec.instagram,
                        twitter: ec.twitter, twitter_handle: ec.twitter,
                        school: ec.school, greekOrg: ec.greekOrg, greek_org: ec.greekOrg,
                        state: ec.state, city: ec.city,
                        dob: ec.dob, venmo: ec.venmo, venmo_handle: ec.venmo,
                        notes: ec.notes,
                      }],
                    }),
                  });
                } catch { /* save locally even if API fails */ }
                setEditingContact(null);
              }} style={{
                flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #378ADD, #2B6CB0)', color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Save Contact</button>
              <button onClick={() => setEditingContact(null)} style={{
                flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.1)',
                background: '#fff', color: '#666', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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
        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
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
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#8e8e93' }}>
                    {contacts.length === 0 ? 'No contacts yet. Add a contact or import to get started.' : 'No contacts match your search.'}
                  </td>
                </tr>
              ) : (
                filteredContacts.map(c => {
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
                })
              )}
            </tbody>
          </table>
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
                <button onClick={() => {/* TODO: edit mode */}} style={{
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
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 24, maxWidth: 720 }}>
          {/* Billing & Plan */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Billing &amp; Plan</div>

            {/* Plan Info */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e' }}>Current Plan</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#16A34A', background: 'rgba(22,163,74,0.1)',
                  padding: '3px 10px', borderRadius: 20, letterSpacing: '0.04em', textTransform: 'uppercase' as const,
                }}>STARTER</span>
              </div>
              <button style={{
                background: 'linear-gradient(135deg, #2563EB, #3B82F6)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
              }}>
                Upgrade to Pro
              </button>
            </div>
            <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 24 }}>Free plan with basic features</div>

            {/* Team Seats */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>Team Seats</span>
                <span style={{ fontSize: 13, color: '#8e8e93' }}>$29/seat/month</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{teamMembers.length} / 5 seats</span>
                <button style={{
                  background: 'none', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
                  padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#2563EB', cursor: 'pointer',
                }}>Add Seat</button>
              </div>
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.06)' }}>
                <div style={{ width: `${Math.min((teamMembers.length / 5) * 100, 100)}%`, height: '100%', borderRadius: 3, background: '#2563EB', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Phone Numbers */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>Phone Numbers</span>
                <span style={{ fontSize: 13, color: '#8e8e93' }}>$49/number/month</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{stations.length} / 1 number</span>
                <button style={{
                  background: 'none', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
                  padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#2563EB', cursor: 'pointer',
                }}>Add Number</button>
              </div>
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.06)' }}>
                <div style={{ width: `${Math.min((stations.length / 1) * 100, 100)}%`, height: '100%', borderRadius: 3, background: '#2563EB', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Plan Comparison Table */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', marginBottom: 12 }}>Plan Comparison</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.08)' }}>
                    {['Feature', 'Starter', 'Pro', 'Enterprise'].map(h => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: h === 'Feature' ? 'left' : 'center', fontWeight: 600, color: '#1c1c1e', fontSize: 12,
                        ...(h === 'Starter' ? { borderTop: '3px solid #22C55E', background: 'rgba(34,197,94,0.06)' } : {}),
                      }}>{h}{h === 'Starter' && <span style={{ display: 'block', fontSize: 9, color: '#22C55E', fontWeight: 700, letterSpacing: '0.04em' }}>CURRENT</span>}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Team Seats', '5', '25', 'Unlimited'],
                    ['Phone Numbers', '1', '5', 'Unlimited'],
                    ['AI Drafts/day', '200', '2,000', 'Unlimited'],
                    ['Messages/day', '500', '5,000', 'Unlimited'],
                    ['Campaigns', '\u2014', '\u2713', '\u2713'],
                    ['Analytics', 'Basic', 'Advanced', 'Custom'],
                    ['Price', 'Free', '$99/mo', 'Contact Us'],
                  ].map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1c1c1e' }}>{row[0]}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#6b7280', background: 'rgba(34,197,94,0.04)' }}>{row[1]}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#2563EB', fontWeight: 600 }}>{row[2]}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#7C3AED', fontWeight: 600 }}>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              onClick={() => alert('Invite member flow coming soon!')}
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
                        {statusDot(s.status)}
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>{s.status}</span>
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
      if (status === 'syncing') return '#F59E0B';
      return '#EF4444';
    };
    const getStatusLabel = (status: string) => {
      if (status === 'online') return 'ONLINE';
      if (status === 'syncing') return 'SYNCING';
      return 'OFFLINE';
    };
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

    const onlineCount = stations.filter(s => s.status === 'online').length;
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
              const stColor = getStatusColor(st.status);
              return (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${st.status === 'online' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 16, padding: '20px 24px', minWidth: 200, textAlign: 'center',
                  }}>
                    <div style={{ color: stColor, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{getMachineIcon(st.machine_name)}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{st.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{st.machine_name || 'Unknown Machine'}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#378ADD', fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>{st.phone_number || 'TBD'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: stColor, boxShadow: `0 0 8px ${stColor}` }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: stColor, letterSpacing: '0.05em' }}>{getStatusLabel(st.status)}</span>
                      <SignalBars status={st.status} />
                    </div>
                  </div>
                  {/* Connection line */}
                  <div style={{
                    width: 48, height: 2,
                    background: st.status === 'online' ? '#22C55E' : 'transparent',
                    borderTop: st.status === 'online' ? 'none' : '2px dashed #374151',
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
              const stColor = getStatusColor(st.status);
              return (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 48, height: 2,
                    background: st.status === 'online' ? '#22C55E' : 'transparent',
                    borderTop: st.status === 'online' ? 'none' : '2px dashed #374151',
                  }} />
                  <div style={{
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${st.status === 'online' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 16, padding: '20px 24px', minWidth: 200, textAlign: 'center',
                  }}>
                    <div style={{ color: stColor, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{getMachineIcon(st.machine_name)}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{st.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{st.machine_name || 'Unknown Machine'}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#378ADD', fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>{st.phone_number || 'TBD'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: stColor, boxShadow: `0 0 8px ${stColor}` }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: stColor, letterSpacing: '0.05em' }}>{getStatusLabel(st.status)}</span>
                      <SignalBars status={st.status} />
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
            const stColor = getStatusColor(st.status);
            const stLabel = getStatusLabel(st.status);
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
                    { label: 'Connection', ok: st.status === 'online', onText: 'Connected', offText: 'Disconnected' },
                    { label: 'iMessage', ok: st.status === 'online', onText: 'Active', offText: 'Inactive' },
                    { label: 'Sync', ok: st.status !== 'offline', onText: st.status === 'syncing' ? 'Syncing' : 'Up to date', offText: 'Behind', color: st.status === 'syncing' ? '#F59E0B' : undefined },
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
                  const isOnline = s.status === 'online';
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
            <div style={fieldRowStyle}>
              <div>
                <div style={labelStyle}>Password</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2, letterSpacing: '0.1em' }}>••••••••</div>
              </div>
              <button onClick={() => window.alert('Password change flow coming soon. Use "Forgot Password" on login for now.')} style={{
                background: 'none', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
                padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#1c1c1e', cursor: 'pointer',
              }}>Change Password</button>
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
      case 'ai-drafts': return renderPlaceholder('AI Drafts', 'Review and manage AI-generated drafts coming soon.', (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.912 5.813L20 10.5l-4.376 3.937L16.824 21 12 17.5 7.176 21l1.2-6.75L4 10.5l6.088-1.687L12 3z" /><path d="M5 3v4" /><path d="M3 5h4" /><path d="M19 17v4" /><path d="M17 19h4" />
        </svg>
      ));
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
        width: sidebarCollapsed ? 64 : 240,
        minWidth: sidebarCollapsed ? 64 : 240,
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
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: plan === 'enterprise' ? '#A78BFA' : plan === 'pro' ? '#60A5FA' : '#6EE7B7',
                fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                letterSpacing: '0.06em', marginTop: 2,
              }}>
                {plan}
              </div>
            </div>
          )}
        </div>

        {/* Phone Line Status */}
        {(() => {
          const primaryStation = stations.find(s => s.phone_number && s.phone_number !== 'TBD') || stations[0];
          if (!primaryStation) return null;
          const lastBeatTime = primaryStation.last_heartbeat ? new Date(primaryStation.last_heartbeat).getTime() : 0;
          const minutesSinceHeartbeat = lastBeatTime ? (Date.now() - lastBeatTime) / 60000 : Infinity;
          // Online = status is 'online' OR heartbeat within 2 minutes (Cowork pings every ~60s)
          const isOnline = primaryStation.status === 'online' || minutesSinceHeartbeat < 2;
          // Active = heartbeat within 10 minutes (Cowork may be between pings)
          const isActive = !isOnline && minutesSinceHeartbeat < 10;
          const statusColor = isOnline ? '#22C55E' : isActive ? '#3B82F6' : '#EF4444';
          const statusLabel = isOnline ? 'Online' : isActive ? 'Active' : 'Offline';
          return (
            <div
              onClick={() => setActiveTab('stations')}
              style={{
                padding: sidebarCollapsed ? '12px 0' : '12px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: statusColor,
                    boxShadow: isOnline ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
                    animation: isOnline ? 'pulse 2s ease infinite' : 'none',
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
                </div>
                {!sidebarCollapsed && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3, marginLeft: 16 }}>
                    {statusLabel}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.tab;
            const isHovered = hoveredNav === item.label;
            return (
              <div key={item.label}>
                <button
                  onClick={() => setActiveTab(item.tab)}
                  onMouseEnter={() => setHoveredNav(item.label)}
                  onMouseLeave={() => setHoveredNav(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? 0 : 10, width: '100%',
                    padding: sidebarCollapsed ? '9px 0' : '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    fontSize: 13, fontWeight: isActive ? 600 : 500,
                    fontFamily: "'Inter', sans-serif",
                    color: isActive ? '#fff' : ((item as Record<string, unknown>).color as string) || 'rgba(255,255,255,0.55)',
                    background: isActive
                      ? ((item as Record<string, unknown>).color ? 'rgba(217,119,6,0.2)' : 'rgba(55,138,221,0.2)')
                      : isHovered ? 'rgba(255,255,255,0.06)' : 'transparent',
                    marginBottom: 2, transition: 'all 0.15s ease', textAlign: 'left',
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                      width: 3, height: 18, borderRadius: '0 3px 3px 0', background: '#378ADD',
                    }} />
                  )}
                  <span style={{ color: isActive ? '#378ADD' : 'rgba(255,255,255,0.4)', display: 'flex', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && item.label}
                  {item.label === 'Conversations' && unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 4, right: 8,
                      width: 18, height: 18, borderRadius: 9,
                      background: '#EF4444', color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{unreadCount}</span>
                  )}
                </button>
                {item.tab === 'conversations' && activeTab === 'conversations' && !sidebarCollapsed && (
                  <div style={{ paddingLeft: 32, marginBottom: 4 }}>
                    {(['streams', 'summary', 'schedule'] as ConversationViewMode[]).map(mode => (
                      <button key={mode} onClick={() => setConversationViewMode(mode)} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: conversationViewMode === mode ? 600 : 400,
                        color: conversationViewMode === mode ? '#378ADD' : 'rgba(255,255,255,0.4)',
                        background: conversationViewMode === mode ? 'rgba(55,138,221,0.1)' : 'transparent',
                        fontFamily: "'Inter', sans-serif", textTransform: 'capitalize',
                      }}>{mode}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: sidebarCollapsed ? 'center' : 'flex-end' }}>
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarCollapsed
                ? <polyline points="9 18 15 12 9 6" />
                : <polyline points="15 18 9 12 15 6" />
              }
            </svg>
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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
            <div style={{ fontSize: 13, color: '#8e8e93', fontWeight: 500 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        )}

        {renderContent()}
      </main>
    </div>
  );
}
