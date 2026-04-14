'use client';

import { useDashboard } from '@/contexts/DashboardContext';
import { parseTimestamp } from '@/lib/utils';

function fmtWhen(ts: string | null): string {
  if (!ts) return 'Unscheduled';
  const d = parseTimestamp(ts);
  if (isNaN(d.getTime())) return 'Unscheduled';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function bucket(ts: string | null): 'overdue' | 'today' | 'upcoming' | 'unscheduled' {
  if (!ts) return 'unscheduled';
  const d = parseTimestamp(ts);
  if (isNaN(d.getTime())) return 'unscheduled';
  const now = new Date();
  const diffDays = (d.getTime() - now.getTime()) / 86400000;
  if (diffDays < -0.1) return 'overdue';
  if (d.toDateString() === now.toDateString()) return 'today';
  return 'upcoming';
}

export default function SchedulePage() {
  const { calendarEvents } = useDashboard();

  const groups: Record<'overdue' | 'today' | 'upcoming' | 'unscheduled', typeof calendarEvents> = {
    overdue: [], today: [], upcoming: [], unscheduled: [],
  };
  for (const ev of calendarEvents) groups[bucket(ev.scheduled_at)].push(ev);
  const order: Array<keyof typeof groups> = ['overdue', 'today', 'upcoming', 'unscheduled'];
  const labels: Record<keyof typeof groups, string> = {
    overdue: 'Overdue', today: 'Today', upcoming: 'Upcoming', unscheduled: 'Unscheduled',
  };
  const colors: Record<keyof typeof groups, string> = {
    overdue: '#EF4444', today: '#2678FF', upcoming: '#22C55E', unscheduled: '#9ca3af',
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f8f9fb', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0c0f1a', letterSpacing: '-0.02em', margin: 0 }}>
            Schedule
          </h1>
          <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace" }}>
            {calendarEvents.length} event{calendarEvents.length === 1 ? '' : 's'}
          </span>
        </div>

        {calendarEvents.length === 0 ? (
          <div style={{ padding: 40, background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0c0f1a', marginBottom: 4 }}>
              No scheduled events
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>
              Craig can create events when a contact agrees to a meeting or call.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {order.filter(k => groups[k].length > 0).map(key => (
              <div key={key}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors[key], marginBottom: 8 }}>
                  {labels[key]} ({groups[key].length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {groups[key].map(ev => (
                    <div key={ev.id} style={{
                      padding: '12px 16px', borderRadius: 10, background: '#fff',
                      border: '1px solid rgba(0,0,0,0.06)',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <div style={{ width: 6, height: 40, borderRadius: 3, background: colors[key], flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0c0f1a', marginBottom: 2 }}>
                          {ev.title || 'Untitled event'}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {ev.contact_name}{ev.contact_phone ? ` · ${ev.contact_phone}` : ''}
                        </div>
                        {ev.description && (
                          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                            {ev.description}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0c0f1a', fontFamily: "'JetBrains Mono', monospace" }}>
                          {fmtWhen(ev.scheduled_at)}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>
                          {ev.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
