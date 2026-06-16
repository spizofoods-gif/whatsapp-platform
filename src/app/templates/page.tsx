'use client';
import { useState, useEffect, useCallback } from 'react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const [form, setForm] = useState({ name: '', category: 'marketing', language: 'en', header_type: 'none', header_text: '', body: '', footer: '', buttons: '', whatsapp_template_id: '' });
  const notify = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const fetchData = useCallback(async () => {
    const res = await fetch('/api/templates');
    setTemplates((await res.json()) || []); setLoading(false);
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let btns = [];
    try { btns = form.buttons ? JSON.parse(form.buttons) : []; } catch { btns = []; }
    const body = { id: editId || undefined, name: form.name, category: form.category, language: form.language, header_type: form.header_type, header_text: form.header_text || null, body: form.body, footer: form.footer || null, buttons: btns, status: 'approved', whatsapp_template_id: form.whatsapp_template_id || null };
    const res = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { notify('Template saved!'); setShowModal(false); setEditId(null); setForm({ name: '', category: 'marketing', language: 'en', header_type: 'none', header_text: '', body: '', footer: '', buttons: '', whatsapp_template_id: '' }); fetchData(); }
  };
  const handleEdit = (t: any) => { setEditId(t.id); setForm({ name: t.name, category: t.category, language: t.language||'en', header_type: t.header_type||'none', header_text: t.header_text||'', body: t.body, footer: t.footer||'', buttons: t.buttons||'', whatsapp_template_id: t.whatsapp_template_id||'' }); setShowModal(true); };
  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; await fetch('/api/templates?id=' + id, { method: 'DELETE' }); notify('Deleted'); fetchData(); };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Message Templates</h1>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setShowModal(true); }}>+ New Template</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Category</th><th>Lang</th><th>Body Preview</th><th>WhatsApp ID</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr> :
                templates.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No templates yet</td></tr> :
                templates.map((t: any) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.name}</td>
                    <td><span className="badge badge-info">{t.category}</span></td>
                    <td>{t.language?.toUpperCase()}</td>
                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.body?.substring(0, 60)}{t.body?.length > 60 ? '...' : ''}</td>
                    <td><code style={{ fontSize: 11 }}>{t.whatsapp_template_id || '—'}</code></td>
                    <td><span className={`badge ${t.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>{t.status}</span></td>
                    <td><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-sm btn-secondary" onClick={() => handleEdit(t)}>✏️</button><button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>🗑️</button></div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header"><h3 style={{ fontSize: 18, fontWeight: 600 }}>{editId ? 'Edit' : 'New'} Template</h3><button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2 mb-4">
                  <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                  <div><label className="label">WhatsApp ID</label><input className="input" placeholder="From Meta" value={form.whatsapp_template_id} onChange={e => setForm({ ...form, whatsapp_template_id: e.target.value })} /></div>
                </div>
                <div className="grid-2 mb-4">
                  <div><label className="label">Category</label><select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="marketing">Marketing</option><option value="utility">Utility</option><option value="authentication">Authentication</option></select></div>
                  <div><label className="label">Language</label><select className="input" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}><option value="en">English</option><option value="hi">Hindi</option></select></div>
                </div>
                <div className="mb-4"><label className="label">Header Type</label><select className="input" value={form.header_type} onChange={e => setForm({ ...form, header_type: e.target.value })}><option value="none">None</option><option value="text">Text</option></select></div>
                {form.header_type !== 'none' && <div className="mb-4"><label className="label">Header Text</label><input className="input" value={form.header_text} onChange={e => setForm({ ...form, header_text: e.target.value })} /></div>}
                <div className="mb-4"><label className="label">Body *</label><textarea className="input" rows={4} placeholder="Hi {{1}}!" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required style={{ resize: 'vertical' }} /></div>
                <div className="mb-4"><label className="label">Footer</label><input className="input" placeholder="Reply STOP" value={form.footer} onChange={e => setForm({ ...form, footer: e.target.value })} /></div>
                <div className="mb-4"><label className="label">Buttons (JSON)</label><input className="input" style={{ fontFamily: 'monospace', fontSize: 11 }} placeholder='[{"type":"quick_reply","text":"Yes"}]' value={form.buttons} onChange={e => setForm({ ...form, buttons: e.target.value })} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
