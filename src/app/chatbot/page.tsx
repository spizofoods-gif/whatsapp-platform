'use client';
import { useState, useEffect, useCallback } from 'react';

export default function ChatbotPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const [form, setForm] = useState({ name: '', trigger_type: 'keyword', trigger_keywords: '', trigger_match: 'contains', response_text: '', is_active: true, priority: 0 });
  const notify = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const fetchData = useCallback(async () => { const res = await fetch('/api/chatbot'); setRules((await res.json()) || []); setLoading(false); }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kws = form.trigger_keywords.split(',').map(k => k.trim()).filter(Boolean);
    const res = await fetch('/api/chatbot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId || undefined, name: form.name, trigger_type: form.trigger_type, trigger_keywords: kws, trigger_match: form.trigger_match, response_type: 'text', response_text: form.response_text, is_active: form.is_active, priority: form.priority }) });
    if (res.ok) { notify('Rule saved!'); setShowModal(false); setEditId(null); setForm({ name: '', trigger_type: 'keyword', trigger_keywords: '', trigger_match: 'contains', response_text: '', is_active: true, priority: 0 }); fetchData(); }
  };
  const handleToggle = async (rule: any) => { await fetch('/api/chatbot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...rule, is_active: !rule.is_active }) }); fetchData(); };
  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; await fetch('/api/chatbot?id=' + id, { method: 'DELETE' }); notify('Deleted'); fetchData(); };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div><h1 className="page-title" style={{ marginBottom: 4 }}>Chatbot Rules</h1><p className="text-sm text-muted">Auto-respond based on keywords</p></div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setShowModal(true); }}>+ Add Rule</button>
      </div>
      {rules.length === 0 ? (
        <div className="card empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/></svg>
          <h3 style={{ fontSize: 16, margin: '12px 0 8px' }}>No chatbot rules yet</h3>
          <p style={{ fontSize: 13, marginBottom: 16 }}>Create rules to auto-reply</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create First Rule</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rules.map((rule: any) => {
            let kws: string[] = [];
            try { kws = JSON.parse(rule.trigger_keywords); } catch { kws = []; }
            return (
              <div key={rule.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{rule.name}</h4>
                      <span className={`badge ${rule.is_active ? 'badge-success' : 'badge-warning'}`}>{rule.is_active ? 'Active' : 'Inactive'}</span>
                      <span className="badge badge-info">Priority: {rule.priority}</span>
                    </div>
                    <div className="text-sm text-muted mb-2"><strong>Trigger:</strong> match "{rule.trigger_match}" on {kws.map((k: string) => <code key={k} style={{ margin: '0 2px' }}>{k}</code>)}</div>
                    <div className="text-sm text-muted"><strong>Response:</strong> <span style={{ background: '#f0fdf4', color: '#166534', padding: '4px 10px', borderRadius: 6, fontWeight: 500 }}>{rule.response_text || '(template)'}</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleToggle(rule)}>{rule.is_active ? '⏸ Pause' : '▶ Activate'}</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(rule.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header"><h3 style={{ fontSize: 18, fontWeight: 600 }}>{editId ? 'Edit' : 'New'} Rule</h3><button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-4"><label className="label">Rule Name *</label><input className="input" placeholder="Welcome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="grid-2 mb-4">
                  <div><label className="label">Trigger</label><select className="input" value={form.trigger_type} onChange={e => setForm({ ...form, trigger_type: e.target.value })}><option value="keyword">Keyword</option><option value="always">Always</option></select></div>
                  <div><label className="label">Match</label><select className="input" value={form.trigger_match} onChange={e => setForm({ ...form, trigger_match: e.target.value })}><option value="contains">Contains</option><option value="exact">Exact</option></select></div>
                </div>
                {form.trigger_type === 'keyword' && <div className="mb-4"><label className="label">Keywords (comma)</label><input className="input" placeholder="hello, hi, help" value={form.trigger_keywords} onChange={e => setForm({ ...form, trigger_keywords: e.target.value })} /></div>}
                <div className="mb-4"><label className="label">Response *</label><textarea className="input" rows={3} placeholder="Hi! How can we help?" value={form.response_text} onChange={e => setForm({ ...form, response_text: e.target.value })} required style={{ resize: 'vertical' }} /></div>
                <div className="grid-2 mb-4">
                  <div><label className="label">Priority</label><input className="input" type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} /></div>
                  <div><label className="label">&nbsp;</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, cursor: 'pointer', fontSize: 13 }}><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label></div>
                </div>
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
