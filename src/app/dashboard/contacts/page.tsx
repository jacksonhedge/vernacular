'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { supabase } from '@/lib/supabase';
import { formatTime, getInitials } from '@/lib/utils';
import type { ContactRecord } from '@/types/dashboard';

// ── Helpers ───────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
  vip: '#7C3AED', testing: '#F59E0B', support: '#3B82F6', notion: '#1c1c1e',
  outreach: '#22C55E', 'derby-days': '#EC4899', default: '#6B7280',
};
const getTagColor = (tag: string) => TAG_COLORS[tag.toLowerCase()] || TAG_COLORS.default;

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  prospect: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  contacted: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  active: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  converted: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  churned: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
};

// ── VCF Generation ────────────────────────────────────────────────────────

function contactToVCF(c: ContactRecord): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  if (c.full_name) lines.push(`FN:${c.full_name}`);
  if (c.first_name || c.last_name) lines.push(`N:${c.last_name || ''};${c.first_name || ''};;;`);
  if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone}`);
  if (c.email) lines.push(`EMAIL:${c.email}`);
  if (c.company) lines.push(`ORG:${c.company}`);
  if (c.job_title) lines.push(`TITLE:${c.job_title}`);
  if (c.linkedin_url) lines.push(`URL:${c.linkedin_url}`);
  if (c.address || c.city || c.state || c.zip) {
    lines.push(`ADR:;;${c.address || ''};${c.city || ''};${c.state || ''};${c.zip || ''};`);
  }
  if (c.notes) lines.push(`NOTE:${c.notes}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ────────────────────────────────────────────────────────

export default function ContactsPage() {
  const { contacts, setContacts, orgId } = useDashboard();
  const searchParams = useSearchParams();

  // UI state
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [selectedContact, setSelectedContact] = useState<ContactRecord | null>(null);

  // Auto-open contact from ?open= query param (e.g. from Streams "Go to Contact")
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || !contacts.length) return;
    const match = (contacts as ContactRecord[]).find(c => c.id === openId);
    if (match) setSelectedContact(match);
  }, [searchParams, contacts]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState<'vcf' | 'csv' | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLDivElement>(null);

  // Add form
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', phone: '', email: '', company: '', job_title: '', linkedin_url: '', notes: '', tags: '' });
  const [saving, setSaving] = useState(false);

  // Import state
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [importResults, setImportResults] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  // ── Filtering ─────────────────────────────────────────────────────────
  const filtered = contacts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.full_name || '').toLowerCase().includes(q)
      || (c.phone || '').includes(q)
      || (c.email || '').toLowerCase().includes(q)
      || (c.company || '').toLowerCase().includes(q)
      || (c.school || '').toLowerCase().includes(q);
  });

  // ── Add Contact ───────────────────────────────────────────────────────
  const handleAddContact = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          contacts: [{
            first_name: addForm.first_name, last_name: addForm.last_name,
            full_name: [addForm.first_name, addForm.last_name].filter(Boolean).join(' ') || null,
            phone: addForm.phone, email: addForm.email, company: addForm.company,
            job_title: addForm.job_title, linkedin_url: addForm.linkedin_url, notes: addForm.notes,
            tags: addForm.tags.split(',').map(t => t.trim()).filter(Boolean),
          }],
          source: 'manual',
        }),
      });
      if (res.ok) {
        setShowAddForm(false);
        setAddForm({ first_name: '', last_name: '', phone: '', email: '', company: '', job_title: '', linkedin_url: '', notes: '', tags: '' });
        const { data } = await supabase.from('contacts').select('*').order('full_name').limit(200);
        if (data) setContacts(data as unknown as ContactRecord[]);
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  // ── Delete Contact ────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return;
    await supabase.from('contacts').delete().eq('id', id);
    setContacts(prev => prev.filter(c => c.id !== id));
    if (selectedContact?.id === id) setSelectedContact(null);
  };

  // ── VCF Import ────────────────────────────────────────────────────────
  const handleVcfFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          else if (line.startsWith('ORG:')) contact.company = line.split(':').slice(1).join(':').replace(/;/g, ', ').trim();
          else if (line.startsWith('TITLE:')) contact.jobTitle = line.split(':').slice(1).join(':').trim();
          else if (line.startsWith('NOTE:')) contact.notes = line.split(':').slice(1).join(':').trim();
        }
        if (contact.fullName || contact.phone || contact.email) parsed.push(contact);
      }
      setImportPreview(parsed);
    };
    reader.readAsText(file);
  };

  // ── CSV Import ────────────────────────────────────────────────────────
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const map: Record<string, string> = {};
      const fieldMap: Record<string, string> = {
        phone: 'phone', tel: 'phone', mobile: 'phone',
        first_name: 'first_name', firstname: 'first_name', 'first name': 'first_name',
        last_name: 'last_name', lastname: 'last_name', 'last name': 'last_name',
        name: 'full_name', full_name: 'full_name', 'full name': 'full_name',
        email: 'email', company: 'company', organization: 'company',
        title: 'job_title', job_title: 'job_title', school: 'school',
        notes: 'notes', tags: 'tags',
      };
      headers.forEach(h => { const k = h.toLowerCase().trim(); if (fieldMap[k]) map[h] = fieldMap[k]; });
      setCsvMapping(map);
    };
    reader.readAsText(file);
  };

  // ── Submit Import ─────────────────────────────────────────────────────
  const submitImport = async (source: 'vcf' | 'csv') => {
    setImporting(true);
    let toImport: Record<string, string>[] = [];
    if (source === 'vcf') {
      toImport = importPreview;
    } else {
      toImport = csvRows.map(row => {
        const obj: Record<string, string> = {};
        csvHeaders.forEach((h, i) => { const f = csvMapping[h]; if (f && row[i]) obj[f] = row[i]; });
        return obj;
      }).filter(c => c.full_name || c.first_name || c.phone || c.email);
    }
    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, contacts: toImport, source }),
      });
      const data = await res.json();
      setImportResults({ imported: data.imported || 0, skipped: data.skipped || 0, errors: data.errors || [] });
      const { data: refreshed } = await supabase.from('contacts').select('*').order('full_name').limit(200);
      if (refreshed) setContacts(refreshed as unknown as ContactRecord[]);
    } catch {
      setImportResults({ imported: 0, skipped: 0, errors: ['Network error'] });
    }
    setImporting(false);
  };

  // ── Export ────────────────────────────────────────────────────────────
  const exportVCF = () => {
    const targets = selectedContact ? [selectedContact] : filtered;
    const vcf = targets.map(contactToVCF).join('\r\n');
    downloadFile(vcf, `vernacular-contacts-${targets.length}.vcf`, 'text/vcard');
    setShowExportMenu(false);
  };

  const exportCSV = () => {
    const targets = selectedContact ? [selectedContact] : filtered;
    const headers = ['Full Name', 'First Name', 'Last Name', 'Phone', 'Email', 'Company', 'Job Title', 'School', 'Greek Org', 'State', 'Tags', 'Notes', 'Source'];
    const rows = targets.map(c => [
      c.full_name, c.first_name, c.last_name, c.phone, c.email,
      c.company || '', c.job_title || '', c.school || '', c.greek_org || '', c.state || '',
      (c.tags || []).join(';'), c.notes || '', c.source || '',
    ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));
    downloadFile([headers.join(','), ...rows].join('\n'), `vernacular-contacts-${targets.length}.csv`, 'text/csv');
    setShowExportMenu(false);
  };

  const CSV_FIELDS = ['', 'phone', 'first_name', 'last_name', 'full_name', 'email', 'company', 'job_title', 'school', 'notes', 'tags'];

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{
        height: 56, minHeight: 56, background: '#fff',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0c0f1a', margin: 0 }}>Contacts</h2>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', background: 'rgba(0,0,0,0.04)', padding: '3px 10px', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            {filtered.length}{search ? ` / ${contacts.length}` : ''} total
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {(['list', 'cards'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '6px 10px', border: 'none', cursor: 'pointer',
                background: viewMode === mode ? '#2678FF' : '#fff',
                color: viewMode === mode ? '#fff' : '#9ca3af',
                display: 'flex', alignItems: 'center',
                borderLeft: mode === 'cards' ? '1px solid rgba(0,0,0,0.08)' : 'none',
              }}>
                {mode === 'list' ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Add */}
          <button onClick={() => setShowAddForm(!showAddForm)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
            background: '#22C55E', color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, boxShadow: '0 1px 3px rgba(34,197,94,0.3)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>

          {/* Import dropdown */}
          <div ref={importRef} style={{ position: 'relative' }}>
            <button onClick={() => { setShowImportMenu(!showImportMenu); setShowExportMenu(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
              background: '#2678FF', color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, boxShadow: '0 1px 3px rgba(38,120,255,0.3)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import
            </button>
            {showImportMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: '#fff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: 180, zIndex: 50, overflow: 'hidden',
              }}>
                {[
                  { label: 'Import VCF (.vcf)', key: 'vcf' as const },
                  { label: 'Import CSV (.csv)', key: 'csv' as const },
                ].map(opt => (
                  <button key={opt.key} onClick={() => { setShowImportModal(opt.key); setShowImportMenu(false); }} style={{
                    display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'none',
                    textAlign: 'left', fontSize: 13, fontWeight: 500, color: '#0c0f1a', cursor: 'pointer',
                    borderBottom: '1px solid rgba(0,0,0,0.04)', fontFamily: "'Inter', sans-serif",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export dropdown */}
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button onClick={() => { setShowExportMenu(!showExportMenu); setShowImportMenu(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
              background: '#fff', color: '#0c0f1a', border: '1px solid rgba(0,0,0,0.1)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: '#fff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: 200, zIndex: 50, overflow: 'hidden',
              }}>
                <button onClick={exportVCF} style={{
                  display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'none',
                  textAlign: 'left', fontSize: 13, fontWeight: 500, color: '#0c0f1a', cursor: 'pointer',
                  borderBottom: '1px solid rgba(0,0,0,0.04)', fontFamily: "'Inter', sans-serif",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  Export as VCF ({selectedContact ? '1 contact' : `${filtered.length} contacts`})
                </button>
                <button onClick={exportCSV} style={{
                  display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'none',
                  textAlign: 'left', fontSize: 13, fontWeight: 500, color: '#0c0f1a', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  Export as CSV ({selectedContact ? '1 contact' : `${filtered.length} contacts`})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, company..."
            style={{
              width: '100%', padding: '9px 14px 9px 38px', borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.06)', fontSize: 13, outline: 'none',
              background: '#f8f9fb', color: '#0c0f1a', boxSizing: 'border-box',
              fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <div style={{ padding: '16px 24px', background: '#fafbfc', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0c0f1a' }}>New Contact</span>
            <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}>x</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 720 }}>
            {[
              { key: 'first_name', ph: 'First Name' }, { key: 'last_name', ph: 'Last Name' },
              { key: 'phone', ph: 'Phone' }, { key: 'email', ph: 'Email' },
              { key: 'company', ph: 'Company' }, { key: 'job_title', ph: 'Job Title' },
            ].map(f => (
              <input key={f.key} value={(addForm as Record<string, string>)[f.key]} onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.ph} style={{
                  padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
                  fontSize: 13, outline: 'none', background: '#fff', color: '#0c0f1a',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            ))}
            <input value={addForm.tags} onChange={e => setAddForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="Tags (comma separated)" style={{
                gridColumn: '1 / -1', padding: '9px 12px', borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.08)', fontSize: 13, outline: 'none',
                background: '#fff', color: '#0c0f1a', fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>
          <button onClick={handleAddContact} disabled={saving} style={{
            marginTop: 12, padding: '8px 20px', borderRadius: 8, border: 'none',
            background: '#22C55E', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Contact List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: viewMode === 'cards' ? '16px 24px' : 0 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              {contacts.length === 0 ? 'No contacts yet. Add or import to get started.' : 'No contacts match your search.'}
            </div>
          ) : viewMode === 'list' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.06)', background: '#fafbfc' }}>
                  {['', 'Name', 'Phone', 'Email', 'Company', 'Tags', 'Status', ''].map((h, i) => (
                    <th key={`${h}-${i}`} style={{
                      textAlign: 'left', padding: '10px 10px', fontSize: 10, fontWeight: 700,
                      color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em',
                      ...(i === 0 ? { width: 44 } : {}),
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const initials = getInitials(c.full_name || '');
                  const st = STATUS_COLORS[c.campaign_status] || STATUS_COLORS.prospect;
                  const isSelected = selectedContact?.id === c.id;
                  return (
                    <tr key={c.id} onClick={() => setSelectedContact(c)} style={{
                      borderBottom: '1px solid rgba(0,0,0,0.03)', cursor: 'pointer',
                      background: isSelected ? 'rgba(38,120,255,0.04)' : 'transparent',
                    }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.01)'; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '8px 10px', width: 44 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: 'linear-gradient(135deg, #2678FF, #5B9FE8)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 11, fontWeight: 700,
                        }}>{initials}</div>
                      </td>
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: '#0c0f1a' }}>{c.full_name || 'Unknown'}</td>
                      <td style={{ padding: '10px 10px', color: '#2678FF', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{c.phone || '\u2014'}</td>
                      <td style={{ padding: '10px 10px', color: '#6b7280', fontSize: 12 }}>{c.email || '\u2014'}</td>
                      <td style={{ padding: '10px 10px', color: '#6b7280', fontSize: 12 }}>{c.company || c.school || '\u2014'}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(c.tags || []).slice(0, 3).map(tag => (
                            <span key={tag} style={{
                              fontSize: 9, fontWeight: 600, color: getTagColor(tag),
                              background: `${getTagColor(tag)}15`, padding: '2px 7px', borderRadius: 4,
                            }}>{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        {c.campaign_status && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                            color: st.color, background: st.bg, textTransform: 'uppercase',
                          }}>{c.campaign_status}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <button onClick={e => { e.stopPropagation(); setSelectedContact(c); }} style={{
                          background: 'none', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6,
                          padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#2678FF', cursor: 'pointer',
                        }}>View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {filtered.map(c => {
                const initials = getInitials(c.full_name || '');
                const isSelected = selectedContact?.id === c.id;
                return (
                  <div key={c.id} onClick={() => setSelectedContact(c)} style={{
                    background: '#fff', borderRadius: 14,
                    border: isSelected ? '2px solid #2678FF' : '1px solid rgba(0,0,0,0.06)',
                    padding: 20, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 4px 16px rgba(38,120,255,0.1)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: 'linear-gradient(135deg, #2678FF, #5B9FE8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0,
                      }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#0c0f1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.full_name || 'Unknown'}
                        </div>
                        {(c.job_title || c.company) && (
                          <div style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[c.job_title, c.company].filter(Boolean).join(' at ')}
                          </div>
                        )}
                      </div>
                    </div>
                    {c.phone && <div style={{ fontSize: 12, color: '#2678FF', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>{c.phone}</div>}
                    {c.email && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>}
                    {(c.tags || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(c.tags || []).slice(0, 4).map(tag => (
                          <span key={tag} style={{ fontSize: 9, fontWeight: 600, color: getTagColor(tag), background: `${getTagColor(tag)}15`, padding: '2px 7px', borderRadius: 4 }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contact Detail Sidebar */}
        {selectedContact && (
          <div style={{
            width: 360, minWidth: 360, borderLeft: '1px solid rgba(0,0,0,0.06)',
            background: '#fff', overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: 'linear-gradient(135deg, #2678FF, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 18, fontWeight: 800,
                  }}>{getInitials(selectedContact.full_name || '')}</div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#0c0f1a' }}>{selectedContact.full_name || 'Unknown'}</div>
                    {selectedContact.job_title && <div style={{ fontSize: 12, color: '#9ca3af' }}>{selectedContact.job_title}</div>}
                  </div>
                </div>
                <button onClick={() => setSelectedContact(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18,
                }}>x</button>
              </div>

              {/* Quick actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => exportVCF()} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
                  background: '#fff', color: '#0c0f1a', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Export VCF</button>
                <button onClick={() => handleDelete(selectedContact.id)} style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.04)', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Delete</button>
              </div>
            </div>

            {/* Fields */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Phone', value: selectedContact.phone, mono: true },
                { label: 'Email', value: selectedContact.email },
                { label: 'Company', value: selectedContact.company },
                { label: 'School', value: selectedContact.school },
                { label: 'Greek Org', value: selectedContact.greek_org },
                { label: 'State', value: selectedContact.state },
                { label: 'Source', value: selectedContact.source || selectedContact.import_source },
                { label: 'LinkedIn', value: selectedContact.linkedin_url, link: true },
                { label: 'Instagram', value: selectedContact.instagram_handle },
                { label: 'Venmo', value: selectedContact.venmo_handle },
                { label: 'Created', value: selectedContact.created_at ? formatTime(selectedContact.created_at) : '' },
              ].filter(f => f.value).map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{f.label}</div>
                  {f.link ? (
                    <a href={f.value!} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#2678FF', textDecoration: 'none' }}>{f.value}</a>
                  ) : (
                    <div style={{ fontSize: 13, color: '#0c0f1a', fontFamily: f.mono ? "'JetBrains Mono', monospace" : 'inherit' }}>{f.value}</div>
                  )}
                </div>
              ))}
              {(selectedContact.tags || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tags</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(selectedContact.tags || []).map(tag => (
                      <span key={tag} style={{ fontSize: 11, fontWeight: 600, color: getTagColor(tag), background: `${getTagColor(tag)}12`, padding: '4px 10px', borderRadius: 6 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {selectedContact.notes && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Notes</div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, padding: '10px 14px', borderRadius: 10, background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.04)' }}>
                    {selectedContact.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Import Modal ─────────────────────────────────────────────────── */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
          onClick={() => { setShowImportModal(null); setImportPreview([]); setImportResults(null); setCsvHeaders([]); setCsvRows([]); }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 20, width: 560, maxHeight: '80vh', overflow: 'auto',
            boxShadow: '0 24px 80px rgba(0,0,0,0.3)', padding: 28,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0c0f1a', margin: 0 }}>
                Import {showImportModal === 'vcf' ? 'VCF' : 'CSV'} Contacts
              </h3>
              <button onClick={() => { setShowImportModal(null); setImportPreview([]); setImportResults(null); }} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18,
              }}>x</button>
            </div>

            {!importResults ? (
              <>
                {/* File picker */}
                <div style={{
                  padding: 32, borderRadius: 14, border: '2px dashed rgba(0,0,0,0.1)',
                  background: '#fafbfc', textAlign: 'center', marginBottom: 16,
                }}>
                  <input type="file" accept={showImportModal === 'vcf' ? '.vcf' : '.csv'}
                    onChange={showImportModal === 'vcf' ? handleVcfFile : handleCsvFile}
                    style={{ display: 'none' }} id="import-file" />
                  <label htmlFor="import-file" style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#2678FF' }}>Click to choose file</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>.{showImportModal} files supported</div>
                  </label>
                </div>

                {/* VCF Preview */}
                {showImportModal === 'vcf' && importPreview.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0c0f1a', marginBottom: 8 }}>
                      {importPreview.length} contacts found
                    </div>
                    <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
                      {importPreview.slice(0, 10).map((c, i) => (
                        <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 12, color: '#6b7280' }}>
                          {c.fullName || `${c.firstName || ''} ${c.lastName || ''}`} — {c.phone || c.email || 'no contact info'}
                        </div>
                      ))}
                      {importPreview.length > 10 && <div style={{ padding: '8px 0', fontSize: 12, color: '#9ca3af' }}>...and {importPreview.length - 10} more</div>}
                    </div>
                    <button onClick={() => submitImport('vcf')} disabled={importing} style={{
                      width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                      background: '#2678FF', color: '#fff', fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', opacity: importing ? 0.6 : 1,
                    }}>
                      {importing ? 'Importing...' : `Import ${importPreview.length} Contacts`}
                    </button>
                  </div>
                )}

                {/* CSV Preview + Mapping */}
                {showImportModal === 'csv' && csvHeaders.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0c0f1a', marginBottom: 8 }}>
                      Map columns ({csvRows.length} rows)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                      {csvHeaders.map(h => (
                        <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#6b7280', minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</span>
                          <select value={csvMapping[h] || ''} onChange={e => setCsvMapping(p => ({ ...p, [h]: e.target.value }))} style={{
                            flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.08)',
                            fontSize: 12, outline: 'none', background: '#fff',
                          }}>
                            {CSV_FIELDS.map(f => <option key={f} value={f}>{f || '— skip —'}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => submitImport('csv')} disabled={importing} style={{
                      width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                      background: '#2678FF', color: '#fff', fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', opacity: importing ? 0.6 : 1,
                    }}>
                      {importing ? 'Importing...' : `Import ${csvRows.length} Contacts`}
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Import Results */
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>{importResults.errors.length === 0 ? '✅' : '⚠️'}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0c0f1a', marginBottom: 8 }}>
                  {importResults.imported} imported, {importResults.skipped} skipped
                </div>
                {importResults.errors.length > 0 && (
                  <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 16 }}>
                    {importResults.errors.slice(0, 3).join(', ')}
                  </div>
                )}
                <button onClick={() => { setShowImportModal(null); setImportPreview([]); setImportResults(null); setCsvHeaders([]); setCsvRows([]); }} style={{
                  padding: '10px 28px', borderRadius: 10, border: 'none',
                  background: '#2678FF', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
