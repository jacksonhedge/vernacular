'use client';

import { useState, useEffect } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { supabase } from '@/lib/supabase';
import { fmtMsgTime, formatTime, normalizePhone } from '@/lib/utils';

export default function MessagesPage() {
  const { allConversations, activeInitiativeFilter, initiativePhones } = useDashboard();
  const [timeFilter, setTimeFilter] = useState<'24h' | '48h' | '72h' | '1w' | '2w'>('24h');
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const filterHours: Record<string, number> = { '24h': 24, '48h': 48, '72h': 72, '1w': 168, '2w': 336 };
    const hours = filterHours[timeFilter] || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    setLoading(true);
    supabase
      .from('messages')
      .select('id, message, contact_phone, direction, station, status, source_system, sent_at, created_at')
      .or(`sent_at.gte.${since},and(sent_at.is.null,created_at.gte.${since})`)
      .order('sent_at', { ascending: false, nullsFirst: false })
      .limit(1000)
      .then(({ data }) => { if (data) setMessages(data); setLoading(false); });
  }, [timeFilter]);

  // Filter by initiative
  const filtered = activeInitiativeFilter
    ? messages.filter(m => {
      const phone = normalizePhone(String(m.contact_phone || ''));
      return initiativePhones.has(phone);
    })
    : messages;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        height: 56, minHeight: 56, background: '#fff',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0c0f1a', margin: 0 }}>Messages</h2>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', background: 'rgba(0,0,0,0.04)', padding: '3px 10px', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            {filtered.length} messages
          </span>
        </div>
        <select value={timeFilter} onChange={e => setTimeFilter(e.target.value as typeof timeFilter)} style={{
          padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
          background: '#fff', color: '#0c0f1a', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', outline: 'none',
        }}>
          <option value="24h">Last 24 hours</option>
          <option value="48h">Last 48 hours</option>
          <option value="72h">Last 72 hours</option>
          <option value="1w">Last 1 week</option>
          <option value="2w">Last 2 weeks</option>
        </select>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading messages...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No messages in this time range.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map(msg => {
              const dir = String(msg.direction || '').toLowerCase();
              const isInbound = dir === 'inbound';
              const phone = String(msg.contact_phone || '');
              const contact = allConversations.find(c =>
                c.contact?.phone && normalizePhone(c.contact.phone) === normalizePhone(phone)
              );
              return (
                <div key={String(msg.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '10px 14px', borderRadius: 10,
                  background: '#fff', border: '1px solid rgba(0,0,0,0.04)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isInbound ? 'rgba(34,197,94,0.08)' : 'rgba(38,120,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 12, color: isInbound ? '#22C55E' : '#2678FF' }}>
                      {isInbound ? '↓' : '↑'}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0c0f1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact?.contact?.name || phone}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {String(msg.message || '').slice(0, 100)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: '#c4c4c6', fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatTime(String(msg.sent_at || msg.created_at || ''))}
                    </span>
                    {String(msg.source_system || '') === 'vernacular-ai' && (
                      <span style={{ fontSize: 9, color: '#8B5CF6', fontWeight: 600 }}>AI</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
