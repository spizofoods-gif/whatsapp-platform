'use client';
import { useState, useEffect, useCallback } from 'react';

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/messages?page=${page}&limit=50`);
    const d = await res.json();
    setMessages(d.messages || []); setTotal(d.total || 0); setLoading(false);
  }, [page]);
  useEffect(() => { fetchData(); }, [fetchData]);
  const filtered = filter === 'all' ? messages : messages.filter((m: any) => m.direction === filter);
  return (
    <div>
      <h1 className="page-title">Messages</h1>
      <div className="tabs">
        {[{ key: 'all', label: 'All' }, { key: 'incoming', label: 'Incoming' }, { key: 'outgoing', label: 'Outgoing' }].map(t => (
          <button key={t.key} className={`tab ${filter === t.key ? 'active' : ''}`} onClick={() => setFilter(t.key)}>{t.label}</button>
        ))}
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead><tr><th>Direction</th><th>Contact</th><th>Message</th><th>Type</th><th>Status</th><th>Time</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr> :
                filtered.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No messages yet</td></tr> :
                filtered.map((m: any) => (
                  <tr key={m.id}>
                    <td><span className={`badge ${m.direction === 'incoming' ? 'badge-info' : 'badge-success'}`}>{m.direction === 'incoming' ? '← In' : '→ Out'}</span></td>
                    <td><div style={{ fontWeight: 500, fontSize: 13 }}>{m.contact_name || 'Unknown'}</div><div className="text-xs text-muted">{m.phone_number ? '+' + m.phone_number : ''}</div></td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word' }}>{m.content || '[Media]'}</td>
                    <td className="text-sm text-muted">{m.message_type || 'text'}</td>
                    <td><span className={`badge ${m.status === 'received' ? 'badge-info' : m.status === 'sent' ? 'badge-success' : 'badge-warning'}`}>{m.status}</span></td>
                    <td className="text-sm text-muted">{new Date(m.created_at).toLocaleString()}</td>
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
    </div>
  );
}
