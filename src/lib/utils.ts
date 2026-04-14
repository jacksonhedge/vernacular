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
