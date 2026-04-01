/**
 * Phone number normalization utilities for Vernacular.
 * Used across all API routes for consistent phone matching.
 */

/** Strip all non-digit characters */
export function stripPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Get 10-digit US number (strips leading 1 if 11 digits) */
export function normalize10(raw: string): string {
  const d = stripPhone(raw);
  return d.startsWith('1') && d.length === 11 ? d.slice(1) : d;
}

/** Format to (XXX) XXX-XXXX */
export function formatPhone(raw: string): string {
  const d = normalize10(raw);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return raw;
}

/** Generate all format variants for Supabase .or() phone lookup */
export function phoneSearchVariants(raw: string): string[] {
  const digits = stripPhone(raw);
  const d10 = normalize10(raw);
  const formatted = d10.length === 10 ? `(${d10.slice(0,3)}) ${d10.slice(3,6)}-${d10.slice(6)}` : '';

  const variants = new Set([
    raw,
    digits,
    d10,
    `+1${d10}`,
    `+1 ${formatted}`,
    formatted,
    `1${d10}`,
    `+${digits}`,
    // Hyphenated: XXX-XXX-XXXX
    d10.length === 10 ? `${d10.slice(0,3)}-${d10.slice(3,6)}-${d10.slice(6)}` : '',
  ].filter(Boolean));

  return Array.from(variants);
}

/** Build Supabase .or() filter string for phone matching */
export function phoneOrFilter(raw: string): string {
  // Note: Supabase PostgREST treats + as space in query strings.
  // The JS client handles encoding, but we include both +1 and 1 variants to be safe.
  return phoneSearchVariants(raw).map(v => `phone.eq.${v}`).join(',');
}

/** Build a simpler phone filter using ilike on last 10 digits — most reliable */
export function phoneIlikeFilter(raw: string): string {
  const d10 = normalize10(raw);
  if (d10.length >= 7) return `phone.ilike.%${d10.slice(-7)}%`;
  return `phone.ilike.%${d10}%`;
}
