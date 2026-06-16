'use client';
import { useState, useEffect, useCallback } from 'react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [form, setForm] = useState({ phone_number: '', name: '', email: '', tags: '' });
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);

  const notify = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const fetchData = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: '50' });
    if (search) p.set('search', search);
    const res = await fetch('/api/contacts?' + p);
    const d = await res.json();
    setContacts(d.contacts || []); setTotal(d.total || 0); setLoading(false);
  }, [page, search]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: form.phone_number, name: form.name, email: form.email, tags: form.tags ? form.tags.split(',').map((t:string) => t.trim()) : [] }),
    });
    if (res.ok) { notify('Contact added!'); setShowAdd(false); setForm({ phone_number: '', name: '', email: '', tags: '' }); fetchData(); }
  };

  const handleImport = async () => {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) { notify('Paste CSV with header row', 'error'); return; }
    const headers = lines[0].split(',').map((h:string) => h.trim().toLowerCase().replace(/ /g, '_'));
    const contacts = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',');
      const c: any = {};
      headers.forEach((h:string, idx:number) => { c[h] = (vals[idx] || '').trim().replace(/"/g, ''); });
      if (c.phone_number) contacts.push(c);
    }
    if (!contacts.length) { notify('No valid contacts found', 'error'); return; }
    const res = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bulk: true, contacts }) });
    const d = await res.json();
    if (d.success) { notify(`Imported ${d.imported} contacts!`); setShowImport(false); setCsvData(''); fetchData(); }
  };

  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; await fetch('/api/contacts?id=' + id, { method: 'DELETE' }); notify('Deleted'); fetchData(); };
  const parseTags = (t: string) => { try { return JSON.parse(t); } catch { return []; } };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Contacts</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>📥 Import CSV</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Contact</button>
        </div>
      </div>
      <div className="search-bar mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input placeholder="Search contacts..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Tags</th><th>Status</th><th>Source</th><th>Added</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr> :
                contacts.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No contacts. Add one or import CSV.</td></tr> :
                contacts.map((c: any) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name || '—'}</td>
                    <td><code>+{c.phone_number}</code></td>
                    <td>{c.email || '—'}</td>
                    <td><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{parseTags(c.tags).map((t: string) => <span key={t} className="badge badge-info">{t}</span>)}</div></td>
                    <td><span className={`badge ${c.opted_in ? 'badge-success' : 'badge-danger'}`}>{c.opted_in ? 'Opted In' : 'Opted Out'}</span></td>
                    <td className="text-sm text-muted">{c.source}</td>
                    <td className="text-sm text-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>🗑️</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {total > 50 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="text-sm text-muted" style={{ padding: '6px 12px' }}>Page {page} of {Math.ceil(total / 50)}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 style={{ fontSize: 18, fontWeight: 600 }}>Add Contact</h3><button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button></div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="mb-4"><label className="label">Phone Number *</label><input className="input" placeholder="919876543210" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} required /></div>
                <div className="mb-4"><label className="label">Name</label><input className="input" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="mb-4"><label className="label">Email</label><input className="input" placeholder="john@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="mb-4"><label className="label">Tags (comma separated)</label><input className="input" placeholder="customer, vip" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button><button type="submit" className="btn btn-primary">Add Contact</button></div>
            </form>
          </div>
        </div>
      )}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 style={{ fontSize: 18, fontWeight: 600 }}>Import Contacts (CSV)</h3><button onClick={() => setShowImport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button></div>
            <div className="modal-body">
              <p className="text-sm text-muted mb-4">Paste CSV. First row = headers. phone_number required.</p>
              <textarea className="input" rows={10} style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder={`phone_number,name,email\n919876543210,John,john@example.com`} value={csvData} onChange={e => setCsvData(e.target.value)} />
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowImport(false)}>Cancel</button><button className="btn btn-primary" onClick={handleImport}>Import</button></div>
          </div>
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
