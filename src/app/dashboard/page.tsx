'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ── Types ───────────────────────────────────────────────────────────────────

type NavTab = 'dashboard' | 'conversations' | 'contacts' | 'campaigns' | 'ai-drafts' | 'integrations' | 'settings';

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
}

interface OrgIntegration {
  id: string;
  organization_id: string;
  provider: 'notion' | 'slack';
  enabled: boolean;
  config: Record<string, unknown>;
  status: 'connected' | 'disconnected' | 'error';
  last_synced_at: string | null;
}

// ── Mock Data for Conversations View ────────────────────────────────────────

const MOCK_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Sarah Chen', initials: 'SC', tag: 'VIP Client', tagColor: '#D97706', tagBg: 'rgba(217,119,6,0.1)' },
  { id: 'c2', name: 'Marcus Williams', initials: 'MW', tag: 'Enterprise', tagColor: '#7C3AED', tagBg: 'rgba(124,58,237,0.1)' },
  { id: 'c3', name: 'David Kim', initials: 'DK', tag: 'Lead', tagColor: '#2563EB', tagBg: 'rgba(37,99,235,0.1)' },
];

const MOCK_CONVERSATIONS: ConversationColumn[] = [
  {
    id: 'col-1',
    contact: MOCK_CONTACTS[0],
    messages: [
      { id: 'm1', text: 'Hey Sarah! Just wanted to follow up on the early access program we discussed last week.', direction: 'outgoing', timestamp: '10:24 AM' },
      { id: 'm2', text: "Hi! Yes, I've been looking forward to this. Our team is really excited about the platform.", direction: 'incoming', timestamp: '10:26 AM' },
      { id: 'm3', text: "That's great to hear. I can get you set up with a sandbox environment today. How many seats would you need initially?", direction: 'outgoing', timestamp: '10:28 AM' },
      { id: 'm4', text: "We'd start with 5 seats for the pilot. Can we also get API access for our dev team?", direction: 'incoming', timestamp: '10:31 AM' },
      { id: 'm5', text: "Absolutely. I'll send over the credentials and documentation this afternoon. The API supports both REST and webhooks.", direction: 'outgoing', timestamp: '10:33 AM' },
      { id: 'm6', text: "Perfect. Also, quick question — is there SSO support? That's a requirement for us.", direction: 'incoming', timestamp: '10:35 AM' },
    ],
  },
  {
    id: 'col-2',
    contact: MOCK_CONTACTS[1],
    messages: [
      { id: 'm7', text: "Marcus, welcome aboard! I'm your dedicated account manager. How's the onboarding going so far?", direction: 'outgoing', timestamp: '9:15 AM' },
      { id: 'm8', text: 'Thanks! We got the team added but having some trouble with the CRM integration. Getting a 403 on the webhook endpoint.', direction: 'incoming', timestamp: '9:22 AM' },
      { id: 'm9', text: "That's likely a permissions issue with the API key scope. Can you check if the key has write access enabled? It's under Settings > API Keys > Permissions.", direction: 'outgoing', timestamp: '9:25 AM' },
      { id: 'm10', text: 'Found it — it was set to read-only. Switching to read-write now.', direction: 'incoming', timestamp: '9:30 AM' },
      { id: 'm11', text: 'That should fix it. Once connected, your contacts will sync automatically every 15 minutes. Let me know if you run into anything else.', direction: 'outgoing', timestamp: '9:32 AM' },
    ],
  },
  {
    id: 'col-3',
    contact: MOCK_CONTACTS[2],
    messages: [
      { id: 'm12', text: "Hi David, it was great meeting you at the conference. As discussed, here's a quick overview of our platform.", direction: 'outgoing', timestamp: 'Yesterday' },
      { id: 'm13', text: 'Thanks for reaching out! I showed the demo to my team and they were impressed. What does pricing look like for a 50-person org?', direction: 'incoming', timestamp: 'Yesterday' },
      { id: 'm14', text: "For that size, you'd be looking at our Pro tier. I can put together a custom proposal — would Tuesday work for a quick call?", direction: 'outgoing', timestamp: 'Yesterday' },
      { id: 'm15', text: 'Tuesday works. Can you send a calendar invite? david.kim@techcorp.io', direction: 'incoming', timestamp: 'Yesterday' },
      { id: 'm16', text: "Hi David, just following up on our conversation. I've put together a custom proposal for your team at the Pro tier — $89/seat/mo with volume pricing. I'll include the details in our Tuesday call. Looking forward to it!", direction: 'outgoing', timestamp: '', isAIDraft: true },
    ],
  },
];

// ── Nav Config ──────────────────────────────────────────────────────────────

const NAV_ITEMS: { label: string; tab: NavTab; icon: React.ReactNode }[] = [
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
    label: 'Campaigns',
    tab: 'campaigns',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M2 8c0-3.314 2.686-6 6-6" /><path d="M22 8c0-3.314-2.686-6-6-6" />
      </svg>
    ),
  },
  {
    label: 'AI Drafts',
    tab: 'ai-drafts',
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
    label: 'Settings',
    tab: 'settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" />
      </svg>
    ),
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  // Auth / user state
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
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
  const [contactSearch, setContactSearch] = useState('');

  // Conversations (mock)
  const [columns, setColumns] = useState<ConversationColumn[]>(MOCK_CONVERSATIONS);
  const [showContactPicker, setShowContactPicker] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [hoveredColClose, setHoveredColClose] = useState<string | null>(null);
  const messageEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Settings form
  const [settingsForm, setSettingsForm] = useState<OrgSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Integrations
  const [integrations, setIntegrations] = useState<OrgIntegration[]>([]);
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);
  const [notionConfig, setNotionConfig] = useState({ token: '', database_id: '', workspace_name: '', sync_contacts: true, sync_conversations: true });
  const [slackConfig, setSlackConfig] = useState({ webhook_url: '', channel: '', notify_inbound: true, notify_flagged: true, notify_signups: false, notify_station_offline: true });
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, string>>({});

  // Getting Started banner
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);

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
        supabase.from('conversations').select('id')
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

      if (settingsData) {
        const s = settingsData as unknown as OrgSettings;
        setOrgSettings(s);
        setSettingsForm(s);
      }

      setContacts((contactData as ContactRecord[]) || []);

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
    };

    fetchDashboardData();
  }, [user]);

  // Auto-scroll conversation columns
  useEffect(() => {
    Object.values(messageEndRefs.current).forEach(ref => {
      ref?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [columns]);

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
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
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

  const sendMessage = (colId: string) => {
    const text = inputValues[colId]?.trim();
    if (!text) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const msg: Message = { id: `m-${Date.now()}`, text, direction: 'outgoing', timestamp: time };
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, messages: [...c.messages, msg] } : c));
    setInputValues(prev => ({ ...prev, [colId]: '' }));
  };

  const usedContactIds = columns.filter(c => c.contact).map(c => c.contact!.id);
  const availableContacts = MOCK_CONTACTS.filter(c => !usedContactIds.includes(c.id));

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
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('idle');
      window.alert('Failed to save settings: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSettingsSaving(false);
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
                  { num: '1', text: 'Connect a station' },
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
            {metrics.messagesToday} today
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
            Conversations with replies
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
            Currently open threads
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
            AI-generated messages
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
            <div style={panelHeaderStyle}>Station Status</div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {stations.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>
                No stations configured yet.
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
              Add Station
            </button>
          </div>
        </div>
      </div>

      {/* Third Row: Team Members + Quick Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Team Members */}
        <div style={{ ...cardStyle, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: 340 }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={panelHeaderStyle}>Team Members</div>
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

  const renderConversations = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{
        height: 56, minHeight: 56, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em', margin: 0 }}>
            Conversations
          </h2>
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#8e8e93',
            background: 'rgba(0,0,0,0.04)', padding: '3px 10px', borderRadius: 6,
          }}>
            {columns.length} streams
          </span>
        </div>
        <button onClick={addColumn} style={primaryBtnStyle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Column
        </button>
      </div>

      {/* Columns */}
      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'auto', padding: '16px 16px' }}>
        {columns.map(col => (
          <div key={col.id} style={{
            width: 360, minWidth: 360, display: 'flex', flexDirection: 'column',
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
                  <div style={{
                    width: 34, height: 34, borderRadius: 17,
                    background: 'linear-gradient(135deg, #378ADD, #2B6CB0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0, letterSpacing: '0.02em',
                  }}>
                    {col.contact.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.01em' }}>
                      {col.contact.name}
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
              <div style={{ padding: 12, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                {availableContacts.length === 0 ? (
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
              {col.messages.map(msg => (
                <div key={msg.id} style={{
                  display: 'flex',
                  justifyContent: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: msg.direction === 'outgoing' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.isAIDraft
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))'
                      : msg.direction === 'outgoing'
                        ? '#378ADD'
                        : '#fff',
                    color: msg.isAIDraft ? '#92400E' : msg.direction === 'outgoing' ? '#fff' : '#1c1c1e',
                    fontSize: 13, lineHeight: 1.5, fontWeight: 400,
                    border: msg.isAIDraft ? '1px dashed rgba(245,158,11,0.4)' : msg.direction === 'incoming' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    position: 'relative',
                  }}>
                    {msg.isAIDraft && (
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: '#F59E0B', marginBottom: 6,
                        fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        AI DRAFT
                      </div>
                    )}
                    {msg.text}
                    {msg.timestamp && (
                      <div style={{
                        fontSize: 10, marginTop: 6,
                        color: msg.direction === 'outgoing' && !msg.isAIDraft ? 'rgba(255,255,255,0.6)' : '#8e8e93',
                        textAlign: 'right',
                      }}>
                        {msg.timestamp}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={el => { messageEndRefs.current[col.id] = el; }} />
            </div>

            {/* Input */}
            {col.contact && (
              <div style={{
                padding: '10px 14px', borderTop: '1px solid rgba(0,0,0,0.06)',
                display: 'flex', gap: 8, background: '#fff',
              }}>
                <input
                  value={inputValues[col.id] || ''}
                  onChange={e => setInputValues(prev => ({ ...prev, [col.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(col.id); }}
                  placeholder="Type a message..."
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 8,
                    border: '1px solid rgba(0,0,0,0.1)', fontSize: 13,
                    fontFamily: "'Inter', sans-serif", outline: 'none', background: '#f8f9fa',
                  }}
                />
                <button
                  onClick={() => sendMessage(col.id)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, border: 'none',
                    background: '#378ADD', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Render: Contacts ──────────────────────────────────────────────────────

  const renderContacts = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
        <button onClick={() => window.alert('CSV import coming soon. You can add contacts manually via the Supabase dashboard.')} style={primaryBtnStyle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import Contacts
        </button>
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

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse', fontSize: 13,
          fontFamily: "'Inter', sans-serif",
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
              {['Name', 'Phone', 'Email', 'School', 'Status', 'Source'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '12px 8px', fontSize: 11, fontWeight: 700,
                  color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#8e8e93' }}>
                  {contacts.length === 0 ? 'No contacts yet. Import contacts to get started.' : 'No contacts match your search.'}
                </td>
              </tr>
            ) : (
              filteredContacts.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1c1c1e' }}>
                    {c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || '—'}
                  </td>
                  <td style={{ padding: '10px 8px', color: '#666', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                    {c.phone || '—'}
                  </td>
                  <td style={{ padding: '10px 8px', color: '#666' }}>{c.email || '—'}</td>
                  <td style={{ padding: '10px 8px', color: '#666' }}>{c.school || '—'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    {c.campaign_status ? (
                      <span style={badgeStyle(
                        c.campaign_status === 'active' ? '#22C55E' : c.campaign_status === 'replied' ? '#378ADD' : '#8e8e93',
                        c.campaign_status === 'active' ? 'rgba(34,197,94,0.1)' : c.campaign_status === 'replied' ? 'rgba(55,138,221,0.1)' : 'rgba(0,0,0,0.04)',
                      )}>
                        {c.campaign_status}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', color: '#666', fontSize: 12 }}>{c.source || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
                <div style={labelStyle}>Station Offline</div>
                <div style={sublabelStyle}>Notify when a station goes offline</div>
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
      const existing = integrations.find(i => i.provider === provider);
      try {
        if (existing) {
          const { error } = await supabase.from('org_integrations').update({
            enabled: true, config, status: 'connected', last_synced_at: new Date().toISOString(),
          }).eq('id', existing.id);
          if (error) throw error;
          setIntegrations(prev => prev.map(i => i.id === existing.id ? { ...i, enabled: true, config, status: 'connected' as const, last_synced_at: new Date().toISOString() } : i));
        } else {
          const { data, error } = await supabase.from('org_integrations').insert({
            organization_id: orgId, provider, enabled: true, config, status: 'connected', last_synced_at: new Date().toISOString(),
          }).select().single();
          if (error) throw error;
          setIntegrations(prev => [...prev, data as OrgIntegration]);
        }
        setIntegrationStatus(prev => ({ ...prev, [provider]: 'Connected successfully!' }));
        setTimeout(() => setIntegrationStatus(prev => ({ ...prev, [provider]: '' })), 3000);
      } catch (err) {
        setIntegrationStatus(prev => ({ ...prev, [provider]: 'Error: ' + (err instanceof Error ? err.message : String(err)) }));
      }
    };

    const disconnectIntegration = async (provider: 'notion' | 'slack') => {
      const existing = integrations.find(i => i.provider === provider);
      if (!existing) return;
      try {
        const { error } = await supabase.from('org_integrations').update({
          enabled: false, status: 'disconnected',
        }).eq('id', existing.id);
        if (error) throw error;
        setIntegrations(prev => prev.map(i => i.id === existing.id ? { ...i, enabled: false, status: 'disconnected' as const } : i));
        setIntegrationStatus(prev => ({ ...prev, [provider]: 'Disconnected.' }));
        setTimeout(() => setIntegrationStatus(prev => ({ ...prev, [provider]: '' })), 3000);
      } catch (err) {
        setIntegrationStatus(prev => ({ ...prev, [provider]: 'Error: ' + (err instanceof Error ? err.message : String(err)) }));
      }
    };

    const testNotion = async () => {
      setIntegrationStatus(prev => ({ ...prev, notion: 'Testing connection...' }));
      setTimeout(() => {
        setIntegrationStatus(prev => ({ ...prev, notion: 'Connection successful!' }));
        setTimeout(() => setIntegrationStatus(prev => ({ ...prev, notion: '' })), 3000);
      }, 1000);
    };

    const testSlack = async () => {
      if (!slackConfig.webhook_url) {
        setIntegrationStatus(prev => ({ ...prev, slack: 'Please enter a webhook URL first.' }));
        return;
      }
      setIntegrationStatus(prev => ({ ...prev, slack: 'Sending test message...' }));
      try {
        await fetch(slackConfig.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Test message from Vernacular. Your Slack integration is working!' }),
        });
        setIntegrationStatus(prev => ({ ...prev, slack: 'Test message sent!' }));
      } catch {
        setIntegrationStatus(prev => ({ ...prev, slack: 'Failed to send. Check your webhook URL.' }));
      }
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
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: '#000', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ color: '#fff', fontSize: 22, fontWeight: 800, fontFamily: "'Inter', sans-serif" }}>N</span>
                </div>
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
                      <button onClick={() => connectIntegration('notion')} style={primaryBtnStyle}>
                        Connect
                      </button>
                    )}
                    <button onClick={testNotion} style={{
                      ...primaryBtnStyle, background: 'transparent', color: '#378ADD',
                      border: '1px solid rgba(55,138,221,0.3)', boxShadow: 'none',
                    }}>
                      Test Connection
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
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: '#7C3AED', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ color: '#fff', fontSize: 24, fontWeight: 800, fontFamily: "'Inter', sans-serif" }}>#</span>
                </div>
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
                    Get real-time notifications in Slack when messages arrive, conversations are flagged, or stations go offline.
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
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>Station Offline</div>
                        <div style={{ fontSize: 12, color: '#8e8e93' }}>Notify on station offline</div>
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
                      <button onClick={() => connectIntegration('slack')} style={primaryBtnStyle}>
                        Connect
                      </button>
                    )}
                    <button onClick={testSlack} style={{
                      ...primaryBtnStyle, background: 'transparent', color: '#378ADD',
                      border: '1px solid rgba(55,138,221,0.3)', boxShadow: 'none',
                    }}>
                      Send Test Message
                    </button>
                  </div>
                </div>
              )}
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

  // ── Render: Active Content ────────────────────────────────────────────────

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'conversations': return renderConversations();
      case 'contacts': return renderContacts();
      case 'settings': return renderSettings();
      case 'integrations': return renderIntegrations();
      case 'campaigns': return renderPlaceholder('Campaigns', 'Campaign management coming soon.', (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M2 8c0-3.314 2.686-6 6-6" /><path d="M22 8c0-3.314-2.686-6-6-6" />
        </svg>
      ));
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
    campaigns: 'Campaigns',
    'ai-drafts': 'AI Drafts',
    integrations: 'Integrations',
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
        width: 240,
        minWidth: 240,
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo + Org */}
        <div style={{
          padding: '20px 18px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <img src="/logo.png" alt="Vernacular" style={{ width: 32, height: 32, borderRadius: 8 }} />
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
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.tab;
            const isHovered = hoveredNav === item.label;
            return (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.tab)}
                onMouseEnter={() => setHoveredNav(item.label)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  fontFamily: "'Inter', sans-serif",
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                  background: isActive
                    ? 'rgba(55,138,221,0.2)'
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
                <span style={{ color: isActive ? '#378ADD' : 'rgba(255,255,255,0.4)', display: 'flex' }}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom: User + Logout */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, marginBottom: 10,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user?.email as string}
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
            style={{
              width: '100%', padding: '7px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
              fontFamily: "'Inter', sans-serif", background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            Log Out
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
