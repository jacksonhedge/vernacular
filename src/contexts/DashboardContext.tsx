'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { parseTimestamp, normalizePhone } from '@/lib/utils';
import type {
  Message, Contact, ConversationColumn, DashboardMetrics, RecentMessage,
  Station, TeamMember, OrgSettings, ContactRecord, Notification,
  Initiative, GhostConfig, CalendarEvent,
} from '@/types/dashboard';

// ── Ghost squad defaults ──────────────────────────────────────────────────
const DEFAULT_GHOSTS: GhostConfig[] = [
  { name: 'Blinky', color: '#FF0000', role: 'Lead Generator', purpose: 'Finds and qualifies new prospects from inbound leads' },
  { name: 'Pinky', color: '#FFB8FF', role: 'Tone Specialist', purpose: 'Matches your brand voice perfectly across all messages' },
  { name: 'Inky', color: '#00FFFF', role: 'Follow-Up Engine', purpose: 'Never lets a conversation go cold — auto-follows up' },
  { name: 'Clyde', color: '#FFB852', role: 'Support Agent', purpose: 'Handles FAQs, troubleshooting, and common questions' },
  { name: 'Sue', color: '#A78BFA', role: 'Scheduler', purpose: 'Detects time references and manages calendar events' },
  { name: 'Funky', color: '#34D399', role: 'Enrichment', purpose: 'Auto-detects names, Venmo, emails from messages' },
  { name: 'Spooky', color: '#F472B6', role: 'Analyst', purpose: 'Tracks response rates and conversation patterns' },
  { name: 'Shadow', color: '#6B7280', role: 'Sentinel', purpose: 'Monitors for stale conversations and alerts' },
];

// ── Context shape ─────────────────────────────────────────────────────────

interface DashboardContextValue {
  // Auth
  user: Record<string, unknown> | null;
  loading: boolean;
  org: Record<string, unknown> | undefined;
  orgId: string;

  // Core data
  columns: ConversationColumn[];
  setColumns: React.Dispatch<React.SetStateAction<ConversationColumn[]>>;
  allConversations: ConversationColumn[];
  setAllConversations: React.Dispatch<React.SetStateAction<ConversationColumn[]>>;
  contacts: ContactRecord[];
  setContacts: React.Dispatch<React.SetStateAction<ContactRecord[]>>;
  stations: Station[];
  teamMembers: TeamMember[];
  metrics: DashboardMetrics;
  recentMessages: RecentMessage[];
  orgSettings: OrgSettings | null;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;

  // Initiatives
  dbInitiatives: Initiative[];
  initiativeContactCounts: Record<string, number>;
  activeInitiativeFilter: string | null;
  setActiveInitiativeFilter: (id: string | null) => void;
  initiativePhones: Set<string>;

  // Craig AI
  showAICopilot: boolean;
  setShowAICopilot: (show: boolean) => void;
  aiCopilotMessages: Array<{ role: 'user' | 'assistant'; text: string; ts?: number; errorCode?: string }>;
  setAiCopilotMessages: React.Dispatch<React.SetStateAction<Array<{ role: 'user' | 'assistant'; text: string; ts?: number; errorCode?: string }>>>;
  aiChatSessionId: string | null;
  setAiChatSessionId: (id: string | null) => void;
  aiCopilotModel: 'haiku-3' | 'haiku-4.5' | 'sonnet-4.5' | 'sonnet-4.6' | 'opus-4.5' | 'opus-4.6';
  setAiCopilotModel: React.Dispatch<React.SetStateAction<'haiku-3' | 'haiku-4.5' | 'sonnet-4.5' | 'sonnet-4.6' | 'opus-4.5' | 'opus-4.6'>>;
  craigKnowledge: string;
  orgKnowledge: string;

  // UI state
  ghostConfig: GhostConfig[];
  setGhostConfig: React.Dispatch<React.SetStateAction<GhostConfig[]>>;
  creditUsage: { used: number; minimum: number; actions: number } | null;
  lastReloadTime: Date | null;
  stationOverride: 'auto' | 'dnd' | 'offline';
  setStationOverride: (v: 'auto' | 'dnd' | 'offline') => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  unreadCount: number;

  // Conversations
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  readConversations: Record<string, string>;
  setReadConversations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  pinnedConversations: Set<string>;
  setPinnedConversations: React.Dispatch<React.SetStateAction<Set<string>>>;
  dismissedColumns: Set<string>;
  setDismissedColumns: React.Dispatch<React.SetStateAction<Set<string>>>;
  inputValues: Record<string, string>;
  setInputValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  recentlySentCols: Set<string>;
  setRecentlySentCols: React.Dispatch<React.SetStateAction<Set<string>>>;

  // Calendar
  calendarEvents: CalendarEvent[];

  // Actions
  sendMessage: (colId: string, textOverride?: string, contactPhoneOverride?: string) => Promise<void>;
  savePendingDraft: (id: string, phone: string, contactName: string, text: string) => Promise<void>;
  deletePendingDraft: (draftDbId: string | undefined) => Promise<void>;
  addColumn: () => void;
  removeColumn: (colId: string) => void;
  playSound: (type: 'send' | 'receive' | 'click') => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────

export function DashboardProvider({ children }: { children: ReactNode }) {
  // Auth
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  // Core data
  const [columns, setColumns] = useState<ConversationColumn[]>([]);
  const [allConversations, setAllConversations] = useState<ConversationColumn[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    messagesToday: 0, messagesAllTime: 0, responseRate: 0, activeConversations: 0, aiDrafts: 0,
  });
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Initiatives
  const [dbInitiatives, setDbInitiatives] = useState<Initiative[]>([]);
  const [initiativeContactCounts, setInitiativeContactCounts] = useState<Record<string, number>>({});
  const [activeInitiativeFilter, setActiveInitiativeFilterRaw] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('vernacular-initiative-filter') || null;
    return null;
  });
  const [initiativePhones, setInitiativePhones] = useState<Set<string>>(new Set());

  // Craig AI
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [aiCopilotMessages, setAiCopilotMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; ts?: number; errorCode?: string }>>([]);
  const [aiChatSessionId, setAiChatSessionId] = useState<string | null>(null);
  const [aiCopilotModel, setAiCopilotModel] = useState<'haiku-3' | 'haiku-4.5' | 'sonnet-4.5' | 'sonnet-4.6' | 'opus-4.5' | 'opus-4.6'>('sonnet-4.6');
  const [craigKnowledge, setCraigKnowledge] = useState('');
  const [orgKnowledge, setOrgKnowledge] = useState('');

  // UI state
  const [ghostConfig, setGhostConfig] = useState<GhostConfig[]>(DEFAULT_GHOSTS);
  const [creditUsage, setCreditUsage] = useState<{ used: number; minimum: number; actions: number } | null>(null);
  const [lastReloadTime, setLastReloadTime] = useState<Date | null>(null);
  const [stationOverride, setStationOverride] = useState<'auto' | 'dnd' | 'offline'>('auto');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Conversations
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [readConversations, setReadConversationsRaw] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('vernacular-read-conversations') || '{}';
        const parsed = JSON.parse(raw);
        // Back-compat: old format was an array of colIds — convert to Record with epoch timestamp
        if (Array.isArray(parsed)) {
          const now = new Date().toISOString();
          return Object.fromEntries(parsed.map((id: string) => [id, now]));
        }
        return parsed as Record<string, string>;
      } catch { return {}; }
    }
    return {};
  });
  const setReadConversations: React.Dispatch<React.SetStateAction<Record<string, string>>> = (updater) => {
    setReadConversationsRaw(prev => {
      const next = typeof updater === 'function' ? (updater as (p: Record<string, string>) => Record<string, string>)(prev) : updater;
      try { localStorage.setItem('vernacular-read-conversations', JSON.stringify(next)); } catch {}
      return next;
    });
  };
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
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [recentlySentCols, setRecentlySentCols] = useState<Set<string>>(new Set());

  // Calendar
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // ── Derived ─────────────────────────────────────────────────────────────
  const org = user?.organizations as Record<string, unknown> | undefined;
  const orgId = (org?.id as string) || '';

  // ── Sound effects ───────────────────────────────────────────────────────
  const playSound = useCallback((type: 'send' | 'receive' | 'click') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'send') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'receive') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046, ctx.currentTime);
        osc.frequency.setValueAtTime(1318, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(1568, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch { /* Web Audio not supported */ }
  }, [soundEnabled]);

  // ── Per-org Craig model persistence ────────────────────────────────────
  // (orgId is declared above via `const orgId = (org?.id as string) || ''`)
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const { data } = await supabase.from('organizations').select('settings').eq('id', orgId).single();
      const saved = (data?.settings as Record<string, unknown> | null)?.craig_model as string | undefined;
      const fallback = typeof window !== 'undefined' ? localStorage.getItem(`vernacular-craig-model-${orgId}`) : null;
      const pick = (saved || fallback) as typeof aiCopilotModel | undefined;
      if (pick && ['haiku-3','haiku-4.5','sonnet-4.5','sonnet-4.6','opus-4.5','opus-4.6'].includes(pick)) {
        setAiCopilotModel(pick);
      }
    })();
  }, [orgId]);
  useEffect(() => {
    if (!orgId) return;
    try { localStorage.setItem(`vernacular-craig-model-${orgId}`, aiCopilotModel); } catch {}
    (async () => {
      const { data } = await supabase.from('organizations').select('settings').eq('id', orgId).single();
      const settings = (data?.settings as Record<string, unknown>) || {};
      if (settings.craig_model === aiCopilotModel) return;
      await supabase.from('organizations')
        .update({ settings: { ...settings, craig_model: aiCopilotModel } })
        .eq('id', orgId);
    })();
  }, [aiCopilotModel, orgId]);

  // ── Initiative filter with localStorage persistence ─────────────────────
  const setActiveInitiativeFilter = useCallback((id: string | null) => {
    setActiveInitiativeFilterRaw(id);
    if (id) localStorage.setItem('vernacular-initiative-filter', id);
    else localStorage.removeItem('vernacular-initiative-filter');
  }, []);

  // Load initiative phones when filter changes
  useEffect(() => {
    if (!activeInitiativeFilter) { setInitiativePhones(new Set()); return; }
    fetch(`/api/contacts/by-initiative?initiativeId=${activeInitiativeFilter}`)
      .then(r => r.json())
      .then(data => {
        if (data.contacts) {
          const phones = new Set<string>(data.contacts.map((c: { phone: string }) => normalizePhone(c.phone || '')).filter(Boolean));
          setInitiativePhones(phones);
        }
      })
      .catch(() => {});
  }, [activeInitiativeFilter]);

  // ── Auth check ──────────────────────────────────────────────────────────
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

  // ── Main data fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !orgId) return;

    const fetchAll = async () => {
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
      ] = await Promise.all([
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('direction', 'Outbound').gte('created_at', todayStart.toISOString()),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('direction', 'Outbound'),
        supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('source_system', 'vernacular-ai'),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('direction', 'Inbound'),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('direction', 'Outbound'),
        supabase.from('messages').select('id, direction, message, source_system, sent_at, status, contact_phone, station, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('stations').select('*').eq('organization_id', orgId).order('status', { ascending: false }),
        supabase.from('users').select('id, full_name, email, role').eq('organization_id', orgId).order('role'),
        supabase.from('org_settings').select('*').eq('organization_id', orgId).single(),
        supabase.from('contacts').select('*').order('full_name').limit(200),
      ]);

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

      const formatted: RecentMessage[] = ((recentMsgData as Record<string, unknown>[]) || []).map((m) => ({
        id: m.id as string,
        contactName: (m.contact_phone as string) || 'Unknown',
        contactPhone: (m.contact_phone as string) || '',
        preview: ((m.message as string) || '').slice(0, 80),
        direction: m.direction as string,
        aiGenerated: (m.source_system as string) === 'ai',
        sentAt: m.sent_at as string,
      }));
      setRecentMessages(formatted);
      setStations((stationData as Station[]) || []);
      setTeamMembers((memberData as TeamMember[]) || []);
      if (settingsData) setOrgSettings(settingsData as unknown as OrgSettings);
      setContacts((contactData as ContactRecord[]) || []);

      // Notifications
      fetch('/api/notify').then(r => r.json()).then(data => {
        if (data.notifications) setNotifications(data.notifications);
      }).catch(() => {});

      // Conversations
      fetch(`/api/conversations/list?orgId=${orgId}`).then(r => r.json()).then(data => {
        if (data.conversations?.length > 0) {
          const realColumns: ConversationColumn[] = data.conversations.map((conv: Record<string, unknown>) => {
            const contact = conv.contact as Record<string, unknown>;
            const unreadCt = conv.unreadCount as number;
            const messages = conv.messages as Record<string, unknown>[];
            return {
              id: `real-${conv.conversationId}`,
              contact: {
                id: (contact.id as string) || '',
                name: (contact.name as string) || 'Unknown',
                initials: (contact.initials as string) || '??',
                tag: unreadCt > 0 ? 'UNREAD' : 'ACTIVE',
                tagColor: unreadCt > 0 ? '#EF4444' : '#22C55E',
                tagBg: unreadCt > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                phone: (contact.phone as string) || '',
              },
              conversationId: conv.conversationId as string,
              aiMode: (conv.aiMode as string) || 'draft',
              goal: (conv.goal as string) || '',
              messages: (messages || []).map((m: Record<string, unknown>) => ({
                id: m.id as string,
                text: m.text as string,
                direction: m.direction as 'outgoing' | 'incoming',
                timestamp: m.timestamp as string,
                isAIDraft: m.isAIDraft as boolean | undefined,
                attachmentUrl: m.attachmentUrl as string | undefined,
                attachmentType: m.attachmentType as string | undefined,
                status: m.status as string | undefined,
              })),
            };
          });
          setAllConversations(realColumns);
          let dismissed: Set<string>;
          try { dismissed = new Set(JSON.parse(localStorage.getItem('vernacular-dismissed') || '[]')); } catch { dismissed = new Set(); }
          let stackHidden: Set<string>;
          try { stackHidden = new Set(JSON.parse(localStorage.getItem('vernacular-stack-hidden') || '[]')); } catch { stackHidden = new Set(); }
          const baseColumns = realColumns.filter(c => !dismissed.has(c.id) && !stackHidden.has(c.id));
          setColumns(baseColumns);
          setLastReloadTime(new Date());

          // Restore pending drafts — reconstruct draft-col-* columns that survived a refresh
          supabase.from('pending_drafts').select('*').eq('organization_id', orgId).order('created_at', { ascending: true })
            .then(({ data: drafts }) => {
              if (!drafts || drafts.length === 0) return;
              const byPhone = new Map<string, typeof drafts>();
              (drafts as Record<string, unknown>[]).forEach(d => {
                const phone10 = (d.phone as string).replace(/\D/g, '').slice(-10);
                if (!byPhone.has(phone10)) byPhone.set(phone10, []);
                byPhone.get(phone10)!.push(d);
              });
              byPhone.forEach((phoneDrafts, phone10) => {
                const colId = `draft-col-${phone10}`;
                const phoneLabel = `(${phone10.slice(0,3)}) ${phone10.slice(3,6)}-${phone10.slice(6)}`;
                const contactName = (phoneDrafts[0].contact_name as string) || phoneLabel;
                const syntheticContact: Contact = {
                  id: `phone-${phone10}`,
                  name: contactName,
                  initials: contactName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || phone10.slice(-4),
                  phone: `+1${phone10}`,
                  tag: 'NEW',
                  tagColor: '#2678FF',
                  tagBg: 'rgba(38,120,255,0.1)',
                };
                const draftMessages: Message[] = phoneDrafts.map(d => ({
                  id: `ai-draft-${d.id as string}`,
                  text: d.text as string,
                  direction: 'outgoing' as const,
                  timestamp: d.created_at as string,
                  isAIDraft: true,
                  status: 'Draft',
                  draftDbId: d.id as string,
                }));
                const draftCol: ConversationColumn = { id: colId, contact: syntheticContact, messages: draftMessages };
                setColumns(prev => prev.some(c => c.id === colId) ? prev : [draftCol, ...prev]);
                setAllConversations(prev => prev.some(c => c.id === colId) ? prev : [draftCol, ...prev]);
              });
            });
        }
      }).catch(() => {});

      // Initiatives
      supabase.from('org_knowledge').select('id, title, content, parent_id')
        .eq('organization_id', orgId).eq('category', 'initiative')
        .then(({ data }) => {
          if (data) {
            setDbInitiatives(data);
            data.forEach(init => {
              supabase.from('initiative_contacts').select('id', { count: 'exact', head: true })
                .eq('initiative_id', init.id)
                .then(({ count }) => {
                  if (count !== null) setInitiativeContactCounts(prev => ({ ...prev, [init.id]: count }));
                });
            });
          }
        });

      // Credit usage
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      supabase.from('credit_usage').select('credits_used')
        .eq('organization_id', orgId).gte('created_at', monthStart)
        .then(({ data }) => {
          const totalCents = (data || []).reduce((s, r) => s + (r.credits_used || 0), 0);
          const actions = (data || []).length;
          supabase.from('subscriptions').select('monthly_minimum_cents, quantity')
            .eq('organization_id', orgId).eq('status', 'active')
            .then(({ data: subs }) => {
              const minimum = (subs || []).reduce((s, sub) => s + ((sub.monthly_minimum_cents || 0) * (sub.quantity || 1)), 0);
              setCreditUsage({ used: totalCents, minimum, actions });
            });
        });

      // Craig knowledge
      fetch('/api/ai/craig-knowledge').then(r => r.json()).then(d => {
        if (d.knowledge) setCraigKnowledge(d.knowledge);
      }).catch(() => {});

      // Org knowledge
      supabase.from('org_knowledge').select('title, content, category')
        .eq('organization_id', orgId).eq('enabled', true)
        .then(({ data }) => {
          if (data?.length) setOrgKnowledge(data.map(k => `[${k.category}] ${k.title}:\n${k.content}`).join('\n\n'));
        });

      // Calendar events
      supabase.from('scheduled_events')
        .select('id, title, contact_name, contact_phone, scheduled_at, status, source, description, detected_from_message, created_at')
        .eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100)
        .then(({ data }) => { if (data) setCalendarEvents(data as CalendarEvent[]); });

      // Restore last Craig session — only if updated within last 2 hours AND owned by this user
      const currentUserId = (user as Record<string, unknown>)?.id as string | undefined;
      supabase.from('ai_chat_sessions')
        .select('id, preview, created_at, message_count, updated_at')
        .eq('organization_id', orgId)
        .eq('user_id', currentUserId || '')
        .order('updated_at', { ascending: false }).limit(1)
        .then(({ data }) => {
          if (data?.[0]) {
            const updatedAt = new Date(data[0].updated_at as string).getTime();
            const idleMs = Date.now() - updatedAt;
            if (idleMs > 2 * 60 * 60 * 1000) return; // stale — start fresh
            // Respect "New Chat" — if the user clicked New Chat after this session was updated, skip restore
            try {
              const freshAt = Number(localStorage.getItem('vernacular-craig-fresh-at') || '0');
              if (freshAt && updatedAt < freshAt) return;
            } catch {}
            supabase.from('ai_chat_sessions').select('messages').eq('id', data[0].id).single()
              .then(({ data: session }) => {
                if (session?.messages && Array.isArray(session.messages) && session.messages.length > 0) {
                  setAiCopilotMessages(session.messages as typeof aiCopilotMessages);
                  setAiChatSessionId(data![0].id);
                }
              });
          }
        });
    };

    fetchAll();
  }, [user, orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 30-second polling ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !orgId) return;
    const interval = setInterval(async () => {
      try {
        // Stations
        const { data: stationData } = await supabase.from('stations').select('*').eq('organization_id', orgId);
        if (stationData) setStations(stationData as Station[]);

        // Poll inbound
        let newInbound = 0;
        try {
          const res = await fetch('/api/engine/poll-inbound');
          if (res.ok) {
            const d = await res.json();
            if (d.synced > 0) newInbound = d.synced;
          }
        } catch { /* silent */ }

        // Unread
        const { data: convData } = await supabase.from('conversations').select('unread_count').gt('unread_count', 0);
        if (convData) setUnreadCount((convData as Array<{ unread_count?: number }>).reduce((s, c) => s + (c.unread_count || 0), 0));

        // Refresh conversations (REPLACE pattern)
        const convRes = await fetch(`/api/conversations/list?orgId=${orgId}`);
        if (convRes.ok) {
          const convListData = await convRes.json();
          if (convListData.conversations?.length > 0) {
            const freshColumns: ConversationColumn[] = convListData.conversations.map((conv: Record<string, unknown>) => {
              const contact = conv.contact as Record<string, unknown>;
              const unreadCt = conv.unreadCount as number;
              const messages = conv.messages as Record<string, unknown>[];
              return {
                id: `real-${conv.conversationId}`,
                conversationId: conv.conversationId as string,
                aiMode: (conv.aiMode as string) || 'draft',
                goal: (conv.goal as string) || '',
                contact: {
                  id: (contact.id as string) || '',
                  name: (contact.name as string) || 'Unknown',
                  initials: (contact.initials as string) || '??',
                  tag: unreadCt > 0 ? 'UNREAD' : 'ACTIVE',
                  tagColor: unreadCt > 0 ? '#EF4444' : '#22C55E',
                  tagBg: unreadCt > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
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
              const freshMap = new Map(freshColumns.map(c => [c.id, c]));
              const merged = prev.map(existing => {
                const fresh = freshMap.get(existing.id);
                if (fresh) {
                  freshMap.delete(existing.id);
                  const freshTexts = new Set(fresh.messages.map(m => `${m.direction}::${m.text}`));
                  const localOnly = existing.messages.filter(m =>
                    m.id.startsWith('ai-draft-') ||
                    (m.id.startsWith('m-') && !freshTexts.has(`${m.direction}::${m.text}`))
                  );
                  return { ...existing, contact: fresh.contact, messages: [...fresh.messages, ...localOnly] };
                }
                return existing;
              });
              let currentDismissed: Set<string>;
              try { currentDismissed = new Set(JSON.parse(localStorage.getItem('vernacular-dismissed') || '[]')); } catch { currentDismissed = new Set(); }
              let currentStackHidden: Set<string>;
              try { currentStackHidden = new Set(JSON.parse(localStorage.getItem('vernacular-stack-hidden') || '[]')); } catch { currentStackHidden = new Set(); }
              const brandNew = Array.from(freshMap.values()).filter(c => !currentDismissed.has(c.id) && !currentStackHidden.has(c.id));
              const brandNewPhones = new Set(brandNew.map(c => normalizePhone(c.contact?.phone || '')).filter(Boolean));
              // Migrate ai-draft messages from draft-col-* to their real column before removing
              const brandNewWithDrafts = brandNew.map(newCol => {
                const newPhone = normalizePhone(newCol.contact?.phone || '');
                if (!newPhone) return newCol;
                const draftCol = merged.find(c =>
                  c.id.startsWith('draft-col-') &&
                  normalizePhone(c.contact?.phone || '') === newPhone
                );
                if (!draftCol) return newCol;
                const pendingDrafts = draftCol.messages.filter(m => m.id.startsWith('ai-draft-'));
                if (pendingDrafts.length === 0) return newCol;
                return { ...newCol, messages: [...newCol.messages, ...pendingDrafts] };
              });
              const cleaned = merged.filter(c => {
                if (!c.id.startsWith('draft-col-')) return true;
                return !brandNewPhones.has(normalizePhone(c.contact?.phone || ''));
              });
              return [...brandNewWithDrafts, ...cleaned];
            });
            setAllConversations(freshColumns);
          }
        }

        if (newInbound > 0) playSound('receive');
        setLastReloadTime(new Date());
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [user, orgId, playSound]);

  // ── Supabase Realtime ───────────────────────────────────────────────────
  const allConversationsRef = useRef(allConversations);
  allConversationsRef.current = allConversations;

  useEffect(() => {
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: { new: Record<string, unknown> }) => {
          const m = payload.new;
          const phone = String(m.contact_phone || '');
          const dir = String(m.direction || '').toLowerCase();
          const newMsg: Message = {
            id: String(m.id || `rt-${Date.now()}`),
            text: String(m.message || ''),
            direction: (dir === 'outbound' ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming',
            timestamp: String(m.sent_at || m.created_at || ''),
            isAIDraft: String(m.source_system || '') === 'vernacular-ai' && String(m.status || '') === 'Draft',
            attachmentUrl: m.attachment_url ? String(m.attachment_url) : undefined,
            attachmentType: m.attachment_type ? String(m.attachment_type) : undefined,
            status: String(m.status || 'Sent'),
          };
          const phoneDigits = normalizePhone(phone);

          setColumns(prev => prev.map(col => {
            if (!col.contact?.phone) return col;
            if (normalizePhone(col.contact.phone) !== phoneDigits) return col;
            if (col.messages.some(msg => msg.id === newMsg.id)) return col;
            if (col.messages.some(msg => msg.text === newMsg.text && msg.direction === newMsg.direction && msg.id.startsWith('m-'))) return col;
            return { ...col, messages: [...col.messages, newMsg] };
          }));

          setAllConversations(prev => prev.map(col => {
            if (!col.contact?.phone) return col;
            if (normalizePhone(col.contact.phone) !== phoneDigits) return col;
            if (col.messages.some(msg => msg.id === newMsg.id)) return col;
            if (col.messages.some(msg => msg.text === newMsg.text && msg.direction === newMsg.direction && msg.id.startsWith('m-'))) return col;
            return { ...col, messages: [...col.messages, newMsg] };
          }));

          setMetrics(prev => ({
            ...prev,
            messagesAllTime: prev.messagesAllTime + 1,
            messagesToday: dir === 'outbound' ? prev.messagesToday + 1 : prev.messagesToday,
          }));

          if (dir === 'inbound') {
            const contactMatch = allConversationsRef.current.find(col =>
              col.contact?.phone && normalizePhone(col.contact.phone) === phoneDigits
            );
            setRecentMessages(prev => [{
              id: String(m.id),
              contactName: contactMatch?.contact?.name || phone,
              contactPhone: phone,
              preview: String(m.message || '').slice(0, 80),
              direction: 'inbound',
              aiGenerated: false,
              sentAt: String(m.sent_at || m.created_at || new Date().toISOString()),
            }, ...prev].slice(0, 10));
            setUnreadCount(prev => prev + 1);
            playSound('receive');
          }
          setLastReloadTime(new Date());
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [playSound]);

  // ── Auto-save Craig sessions ────────────────────────────────────────────
  useEffect(() => {
    if (!user || aiCopilotMessages.length === 0 || !orgId) return;
    const userId = (user as Record<string, unknown>)?.id as string;
    const preview = aiCopilotMessages[aiCopilotMessages.length - 1]?.text?.substring(0, 100) || '';
    const timer = setTimeout(async () => {
      if (aiChatSessionId) {
        await supabase.from('ai_chat_sessions').update({
          messages: aiCopilotMessages, message_count: aiCopilotMessages.length, preview, updated_at: new Date().toISOString(),
        }).eq('id', aiChatSessionId);
      } else {
        const { data } = await supabase.from('ai_chat_sessions').insert({
          organization_id: orgId, user_id: userId || null, messages: aiCopilotMessages,
          model_used: aiCopilotModel, message_count: aiCopilotMessages.length, preview,
        }).select('id').single();
        if (data) setAiChatSessionId(data.id);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [aiCopilotMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────

  const addColumn = useCallback(() => {
    const newCol: ConversationColumn = { id: `col-${Date.now()}`, contact: null, messages: [] };
    setColumns(prev => [newCol, ...prev]);
  }, []);

  const removeColumn = useCallback((colId: string) => {
    setColumns(prev => prev.filter(c => c.id !== colId));
    setDismissedColumns(prev => {
      const next = new Set(prev);
      next.add(colId);
      localStorage.setItem('vernacular-dismissed', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const savePendingDraft = useCallback(async (id: string, phone: string, contactName: string, text: string) => {
    if (!orgId) return;
    await supabase.from('pending_drafts').insert({ id, organization_id: orgId, phone, contact_name: contactName, text, source: 'craig' });
  }, [orgId]);

  const deletePendingDraft = useCallback(async (draftDbId: string | undefined) => {
    if (!draftDbId) return;
    await supabase.from('pending_drafts').delete().eq('id', draftDbId);
  }, []);

  const sendMessage = useCallback(async (colId: string, textOverride?: string, contactPhoneOverride?: string) => {
    const text = (textOverride ?? inputValues[colId])?.trim();
    if (!text) return;
    const msg: Message = {
      id: `m-${Date.now()}`, text, direction: 'outgoing',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      status: 'Queued',
    };
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, messages: [...c.messages, msg] } : c));
    // Mirror to allConversations so the sidebar stack shows the new message preview instantly
    setAllConversations(prev => {
      const existsIdx = prev.findIndex(c => c.id === colId);
      if (existsIdx >= 0) {
        return prev.map(c => c.id === colId ? { ...c, messages: [...c.messages, msg] } : c);
      }
      // If this is a synthetic col (new chat from picker/phone), add it to the stack too
      const fromCols = (() => {
        const found = columns.find(c => c.id === colId);
        return found ? { ...found, messages: [...found.messages, msg] } : null;
      })();
      return fromCols ? [fromCols, ...prev] : prev;
    });
    setInputValues(prev => ({ ...prev, [colId]: '' }));

    setRecentlySentCols(prev => new Set(prev).add(colId));
    setTimeout(() => { setRecentlySentCols(prev => { const next = new Set(prev); next.delete(colId); return next; }); }, 30000);

    const col = columns.find(c => c.id === colId);
    const contactPhone = contactPhoneOverride ?? col?.contact?.phone;
    const contactName = col?.contact?.name;

    playSound('send');

    if (!contactPhone || contactPhone === 'TBD') return;

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: contactPhone, message: text, contactName: contactName || '', organizationId: orgId }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.conversationId) supabase.from('conversations').update({ unread_count: 0 }).eq('id', data.conversationId);
        const realId = data.conversationId ? `real-${data.conversationId}` : colId;
        if (realId !== colId) {
          setPinnedConversations(prev => {
            if (!prev.has(colId)) return prev;
            const next = new Set(prev); next.delete(colId); next.add(realId);
            localStorage.setItem('vernacular-pinned', JSON.stringify([...next]));
            return next;
          });
        }
        setColumns(prev => prev.map(c => c.id === colId ? {
          ...c, id: realId, conversationId: data.conversationId || c.conversationId,
          messages: c.messages.map(m => m.id === msg.id ? { ...m, id: data.messageId || `sent-${Date.now()}` } : m),
        } : c));
      } else {
        setColumns(prev => prev.map(c => c.id === colId ? {
          ...c, messages: c.messages.map(m => m.id === msg.id ? { ...m, id: `failed-${Date.now()}`, status: 'failed' } : m),
        } : c));
      }
    } catch {
      setColumns(prev => prev.map(c => c.id === colId ? {
        ...c, messages: c.messages.map(m => m.id === msg.id ? { ...m, id: `failed-${Date.now()}`, status: 'failed' } : m),
      } : c));
    }
  }, [inputValues, columns, orgId, playSound]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Value ───────────────────────────────────────────────────────────────

  const value: DashboardContextValue = {
    user, loading, org, orgId,
    columns, setColumns, allConversations, setAllConversations,
    contacts, setContacts, stations, teamMembers, metrics, recentMessages,
    orgSettings, notifications, setNotifications,
    dbInitiatives, initiativeContactCounts, activeInitiativeFilter, setActiveInitiativeFilter, initiativePhones,
    showAICopilot, setShowAICopilot, aiCopilotMessages, setAiCopilotMessages,
    aiChatSessionId, setAiChatSessionId, aiCopilotModel, setAiCopilotModel,
    craigKnowledge, orgKnowledge,
    ghostConfig, setGhostConfig, creditUsage, lastReloadTime,
    stationOverride, setStationOverride, soundEnabled, setSoundEnabled,
    sidebarCollapsed, setSidebarCollapsed, unreadCount,
    selectedConversationId, setSelectedConversationId,
    readConversations, setReadConversations,
    pinnedConversations, setPinnedConversations,
    dismissedColumns, setDismissedColumns,
    inputValues, setInputValues,
    recentlySentCols, setRecentlySentCols,
    calendarEvents,
    sendMessage, savePendingDraft, deletePendingDraft, addColumn, removeColumn, playSound,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
