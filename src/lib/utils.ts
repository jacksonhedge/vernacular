// ── Vernacular shared utilities ────────────────────────────────────────────

import type { Station } from '@/types/dashboard';

/** Parse Supabase timestamps (handles microseconds + missing colon in tz offset) */
export const parseTimestamp = (ts: string): Date => {
  const normalized = ts
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+/, '$1')
    .replace(/\+(\d{2})$/, '+$1:00');
  return new Date(normalized);
};

/** Format message timestamp to "3:45 PM" style */
export const fmtMsgTime = (ts: string): string => {
  if (!ts) return '';
  const d = parseTimestamp(ts);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

/** Stack-list timestamp:
 *   same calendar day → "3:45 PM"
 *   earlier day but <24h ago → "Nh ago"
 *   within last 7 days → "Mon"
 *   older → "Apr 8"
 */
export const fmtStackTime = (ts: string): string => {
  if (!ts) return '';
  const d = parseTimestamp(ts);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const diffHrs = Math.floor(diffMs / 3600000);
  if (diffHrs < 24) return `${Math.max(1, diffHrs)}h ago`;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Relative time: "Just now", "5m ago", "2h ago", "Apr 8" */
export const formatTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = parseTimestamp(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Format heartbeat: "30s ago", "5m ago", etc. */
export const formatHeartbeat = (dateStr: string): string => {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Never';
  const diffSecs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
};

/** Derive station status from heartbeat */
export const getStationStatus = (station: Station, override?: 'auto' | 'dnd' | 'offline'): 'online' | 'idle' | 'dnd' | 'offline' => {
  if (override === 'offline') return 'offline';
  if (override === 'dnd') return 'dnd';
  if (!station.last_heartbeat) return 'offline';
  if (station.phone_number === 'TBD') return 'offline';
  const d = new Date(station.last_heartbeat);
  if (isNaN(d.getTime())) return 'offline';
  const diffMins = (Date.now() - d.getTime()) / 60000;
  if (diffMins < 3) return 'online';
  if (diffMins < 10) return 'idle';
  return 'offline';
};

/** Status dot color */
export const getStationDotColor = (status: 'online' | 'idle' | 'dnd' | 'offline'): string => {
  return status === 'online' ? '#22C55E' : status === 'dnd' ? '#7C3AED' : status === 'idle' ? '#F59E0B' : '#EF4444';
};

/** Status label */
export const getStationLabel = (status: 'online' | 'idle' | 'dnd' | 'offline'): string => {
  return status === 'online' ? 'Online' : status === 'dnd' ? 'Do Not Disturb' : status === 'idle' ? 'Idle' : 'Offline';
};

/** Format phone number to (XXX) XXX-XXXX */
export const formatPhoneNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  const d = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return raw;
};

/** Normalize phone to 10 digits for comparison */
export const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '').slice(-10);
};

/** Check if string looks like a phone number */
export const isPhoneNumber = (s: string): boolean => {
  return s.replace(/\D/g, '').length >= 10;
};

/** Get initials from a name */
export const getInitials = (name: string): string => {
  if (!name || name === 'Unknown') return '??';
  if (name.startsWith('+') || name.startsWith('(') || name.match(/^\d/)) {
    return name.replace(/\D/g, '').slice(-4);
  }
  return name.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
};

/**
 * Detect a date/time reference in a message.
 * Returns a human-readable label like "Tomorrow at 3:00 PM" or null if nothing found.
 * Regex-only — no external library.
 */
export const detectDateTime = (text: string): string | null => {
  if (!text) return null;
  const t = text.toLowerCase();

  // ── helpers ────────────────────────────────────────────────────────────────
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];
  const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  // Format an hour + optional minute + optional meridiem into "3:00 PM"
  const fmtTime = (h: string, m: string | undefined, mer: string | undefined): string => {
    let hour = parseInt(h, 10);
    const min = m ? parseInt(m, 10) : 0;
    if (!mer) {
      // guess AM/PM: 1-6 → PM (afternoon), 7-11 → AM, 12 → PM
      mer = (hour >= 1 && hour <= 6) ? 'PM' : (hour === 12 ? 'PM' : 'AM');
    } else {
      mer = mer.toLowerCase().replace('.', '') === 'pm' ? 'PM' : 'AM';
    }
    if (mer === 'PM' && hour !== 12) hour += 12;
    if (mer === 'AM' && hour === 12) hour = 0;
    const d = new Date(2000, 0, 1, hour, min);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Patterns for a time: "3pm", "3:30pm", "3 pm", "noon", "midnight"
  const TIME_PAT = '(\\d{1,2})(?::(\\d{2}))?\\s*([ap]\\.?m\\.?)?';
  const NOON_PAT = 'noon|midnight';

  const resolveTime = (h: string | undefined, m: string | undefined, mer: string | undefined,
    word: string | undefined): string => {
    if (word === 'noon') return '12:00 PM';
    if (word === 'midnight') return '12:00 AM';
    if (h) return fmtTime(h, m, mer);
    return '';
  };

  // ── pattern 1: "tomorrow at <time>" ───────────────────────────────────────
  const p1 = new RegExp(`\\btomorrow\\s+(?:at\\s+)?(?:(${NOON_PAT})|(${TIME_PAT}))`, 'i');
  const m1 = t.match(p1);
  if (m1) {
    const timeStr = resolveTime(m1[3], m1[4], m1[5], m1[2]);
    return timeStr ? `Tomorrow at ${timeStr}` : 'Tomorrow';
  }

  // ── pattern 2: "today at <time>" ──────────────────────────────────────────
  const p2 = new RegExp(`\\btoday\\s+(?:at\\s+)?(?:(${NOON_PAT})|(${TIME_PAT}))`, 'i');
  const m2 = t.match(p2);
  if (m2) {
    const timeStr = resolveTime(m2[3], m2[4], m2[5], m2[2]);
    return timeStr ? `Today at ${timeStr}` : 'Today';
  }

  // ── pattern 3: "(next) <day> at <time>" ───────────────────────────────────
  const dayAlt = DAYS.join('|');
  const p3 = new RegExp(`\\b(next\\s+)?(${dayAlt})\\s+(?:at\\s+)?(?:(${NOON_PAT})|(${TIME_PAT}))`, 'i');
  const m3 = t.match(p3);
  if (m3) {
    const day = m3[2].charAt(0).toUpperCase() + m3[2].slice(1);
    const prefix = m3[1] ? 'Next ' : '';
    const timeStr = resolveTime(m3[5], m3[6], m3[7], m3[4]);
    return timeStr ? `${prefix}${day} at ${timeStr}` : `${prefix}${day}`;
  }

  // ── pattern 4: "<time> on (next) <day>" ───────────────────────────────────
  const p4 = new RegExp(`\\b(?:(${NOON_PAT})|(${TIME_PAT}))\\s+on\\s+(next\\s+)?(${dayAlt})`, 'i');
  const m4 = t.match(p4);
  if (m4) {
    const day = m4[6].charAt(0).toUpperCase() + m4[6].slice(1);
    const prefix = m4[5] ? 'Next ' : '';
    const timeStr = resolveTime(m4[3], m4[4], m4[4 + 1], m4[2]);
    return timeStr ? `${prefix}${day} at ${timeStr}` : `${prefix}${day}`;
  }

  // ── pattern 5: "<month> <day>(st/nd/rd/th) at <time>" ─────────────────────
  const monthAlt = [...MONTHS, ...MONTHS_SHORT].join('|');
  const p5 = new RegExp(`\\b(${monthAlt})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:at\\s+)?(?:(${NOON_PAT})|(${TIME_PAT}))`, 'i');
  const m5 = t.match(p5);
  if (m5) {
    const rawMonth = m5[1];
    const day = m5[2];
    let idx = MONTHS.findIndex(mo => mo.startsWith(rawMonth.toLowerCase().slice(0, 3)));
    if (idx === -1) idx = MONTHS_SHORT.indexOf(rawMonth.toLowerCase());
    const monthLabel = idx >= 0 ? MONTHS[idx].charAt(0).toUpperCase() + MONTHS[idx].slice(1) : rawMonth;
    const timeStr = resolveTime(m5[6], m5[7], m5[8], m5[5]);
    return timeStr ? `${monthLabel} ${day} at ${timeStr}` : `${monthLabel} ${day}`;
  }

  // ── pattern 6: day-of-week alone ──────────────────────────────────────────
  const p6 = new RegExp(`\\b(next\\s+)?(${dayAlt})\\b`, 'i');
  const m6 = t.match(p6);
  if (m6) {
    const day = m6[2].charAt(0).toUpperCase() + m6[2].slice(1);
    const prefix = m6[1] ? 'Next ' : '';
    return `${prefix}${day}`;
  }

  // ── pattern 7: "tomorrow" alone ───────────────────────────────────────────
  if (/\btomorrow\b/i.test(t)) return 'Tomorrow';

  return null;
};

/** Map Greek org name to Greek letters */
export const greekLetters = (org: string): string => {
  const lower = org.toLowerCase();
  if (lower.includes('sigma chi')) return 'ΣΧ';
  if (lower.includes('chi phi')) return 'ΧΦ';
  if (lower.includes('delta zeta')) return 'ΔΖ';
  if (lower.includes('zeta tau')) return 'ΖΤΑ';
  if (lower.includes('alpha sig')) return 'ΑΣΦ';
  if (lower.includes('beta theta')) return 'ΒΘΠ';
  if (lower.includes('phi sigma')) return 'ΦΣΚ';
  if (lower.includes('theta chi')) return 'ΘΧ';
  return org.slice(0, 3).toUpperCase();
};
