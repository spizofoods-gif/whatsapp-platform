'use client';
import { useState, useEffect, useCallback } from 'react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const [form, setForm] = useState({ name: '', message_body: '', recipient_type: 'all' as 'all'|'tags', recipient_tags: '' });
  const notify = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const fetchCampaigns = useCallback(async () => {
    const res = await fetch('/api/campaigns');
    setCampaigns((await res.json()) || []); setLoading(false);
  }, []);
  useEffect(() => {
    fetchCampaigns();
    fetch('/api/contacts?limit=1').then(r => r.json()).then(d => setTotalContacts(d.total || 0));
  }, [fetchCampaigns]);
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = { name: form.name, message_body: form.message_body };
    if (form.recipient_type === 'all') body.recipient_all = true;
    else body.recipient_tags = form.recipient_tags.split(',').map(t => t.trim()).filter(Boolean);
    const res = await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json();
    if (d.success) { notify(`Created — ${d.recipient_count} recipients!`); setShowModal(false); setForm({ name: '', message_body: '', recipient_type: 'all', recipient_tags: '' }); fetchCampaigns(); }
  };
  const handleAction = async (id: string, action: string) => {
    const res = await fetch('/api/campaigns', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
    const d = await res.json();
    if (d.success) { notify(`Campaign ${action === 'start' ? 'started' : action}!`); fetchCampaigns(); } else notify(d.error || 'Failed', 'error');
  };
  const sb = (s: string) => {
    const m: any = { draft: 'badge-warning', running: 'badge-info', completed: 'badge-success', failed: 'badge-danger', cancelled: 'badge-warning' };
    return <span className={`badge ${m[s] || 'badge-warning'}`}>{s}</span>;
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Campaigns</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Campaign</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Status</th><th>Recipients</th><th>Sent</th><th>Delivered</th><th>Read</th><th>Failed</th><th>Rate</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr> :
                campaigns.length === 0 ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No campaigns yet. Create your first broadcast.</td></tr> :
                campaigns.map((c: any) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</td>
                    <td>{sb(c.status)}</td>
                    <td>{c.recipient_count}</td>
                    <td>{c.sent_count}</td>
                    <td>{c.delivered_count}</td>
                    <td>{c.read_count}</td>
                    <td>{c.failed_count}</td>
                    <td>{c.sent_count > 0 ? <span style={{ color: '#059669', fontWeight: 600, fontSize: 13 }}>{Math.round((c.delivered_count / c.sent_count) * 100)}%</span> : '—'}</td>
                    <td className="text-sm text-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      {c.status === 'draft' && <button className="btn btn-sm btn-primary" onClick={() => handleAction(c.id, 'start')}>▶ Start</button>}
                      {c.status === 'running' && <button className="btn btn-sm btn-danger" onClick={() => handleAction(c.id, 'cancel')}>■ Stop</button>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header"><h3 style={{ fontSize: 18, fontWeight: 600 }}>New Campaign</h3><button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="mb-4"><label className="label">Campaign Name *</label><input className="input" placeholder="Welcome Offer" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="mb-4"><label className="label">Message Body *</label><textarea className="input" rows={4} placeholder="Hi there! 🎉" value={form.message_body} onChange={e => setForm({ ...form, message_body: e.target.value })} required style={{ resize: 'vertical' }} /></div>
                <div className="mb-4">
                  <label className="label">Recipients</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}><input type="radio" checked={form.recipient_type === 'all'} onChange={() => setForm({ ...form, recipient_type: 'all' })} /> All opted-in ({totalContacts})</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}><input type="radio" checked={form.recipient_type === 'tags'} onChange={() => setForm({ ...form, recipient_type: 'tags' })} /> By tags: <input className="input" style={{ width: 200, marginLeft: 8 }} placeholder="customer, vip" value={form.recipient_tags} onChange={e => setForm({ ...form, recipient_type: 'tags', recipient_tags: e.target.value })} disabled={form.recipient_type !== 'tags'} /></label>
                  </div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create Campaign</button></div>
            </form>
          </div>
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
