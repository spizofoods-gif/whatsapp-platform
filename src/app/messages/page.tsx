'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const EMOJIS = ['😀','😂','❤️','👍','🔥','🎉','🙏','😍','🤔','💬','📱','🎁','🛒','✅','⭐','📊','🏷️','🔔','📝','👋'];

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [chatContact, setChatContact] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatReply, setChatReply] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/messages?page=${page}&limit=50`);
    const d = await res.json();
    setMessages(d.messages || []); setTotal(d.total || 0); setLoading(false);
  }, [page]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === 'all' ? messages : messages.filter((m: any) => m.direction === filter);

  // ── Chat Functions ──
  const openChat = async (m: any) => {
    const phone = m.phone_number || '';
    const name = m.contact_name || 'Customer';
    const contactId = m.contact_id;
    
    setChatContact({ phone_number: phone, name, id: contactId });
    setChatReply('');
    
    try {
      const r = await fetch(`/api/messages?contact_id=${contactId}&page=1&limit=200`);
      const d = await r.json();
      setChatMessages(d.messages || []);
    } catch { setChatMessages([]); }
    
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
  };

  const sendChat = async () => {
    if (!chatReply.trim() || !chatContact) return;
    setChatSending(true);
    try {
      const r = await fetch('/api/send-message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: chatContact.phone_number, message: chatReply, contact_id: chatContact.id }),
      });
      if (r.ok) {
        setChatReply('');
        const r2 = await fetch(`/api/messages?contact_id=${chatContact.id}&page=1&limit=200`);
        const d2 = await r2.json();
        setChatMessages(d2.messages || []);
        fetchData();
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch {}
    setChatSending(false);
  };

  const fmtTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts); const n = new Date();
    return d.toDateString() === n.toDateString()
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

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
            <thead><tr><th>Direction</th><th>Contact</th><th>Message</th><th>Type</th><th>Status</th><th>Time</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr> :
                filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No messages yet</td></tr> :
                filtered.map((m: any) => (
                  <tr key={m.id}>
                    <td><span className={`badge ${m.direction === 'incoming' ? 'badge-info' : 'badge-success'}`}>{m.direction === 'incoming' ? '← In' : '→ Out'}</span></td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{m.contact_name || 'Unknown'}</div>
                      <div className="text-xs text-muted">{m.phone_number ? `+${m.phone_number}` : ''}</div>
                    </td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {m.content || '[Media]'}
                    </td>
                    <td className="text-sm text-muted">{m.message_type || 'text'}</td>
                    <td>
                      <span className={`badge ${m.status === 'received' ? 'badge-info' : m.status === 'sent' ? 'badge-success' : 'badge-warning'}`}>{m.status}</span>
                    </td>
                    <td className="text-sm text-muted">{fmtTime(m.created_at)}</td>
                    <td>
                      <button className="btn btn-sm" style={{ background: '#25D366', color: '#fff' }}
                        onClick={() => openChat(m)}>💬 Reply</button>
                    </td>
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

      {/* Chat Panel */}
      {chatContact && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setChatContact(null)} />
          <div style={{ position: 'relative', width: 'min(440px, 100vw)', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', zIndex: 1 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #25D366, #128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>
                {(chatContact.name || '+')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{chatContact.name || 'Customer'}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{chatContact.phone_number ? '+' + chatContact.phone_number : ''}</div>
              </div>
              <button onClick={() => setChatContact(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', background: '#efeae2', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {chatMessages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#94a3b8' }}>
                  <div><div style={{ fontSize: 36, marginBottom: 8 }}>💬</div><div style={{ fontSize: 13 }}>Start typing below</div></div>
                </div>
              ) : (
                [...chatMessages].reverse().map((msg: any) => (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: 8, background: msg.direction === 'outgoing' ? '#d9fdd3' : '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: 13, lineHeight: 1.4, wordBreak: 'break-word' }}>{msg.content || '[Media]'}</div>
                      <div style={{ fontSize: 9, color: '#667781', textAlign: 'right', marginTop: 2 }}>
                        {fmtTime(msg.created_at)}
                        {msg.direction === 'outgoing' && <span style={{ marginLeft: 3 }}>{msg.status === 'read' ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: '10px 14px', background: '#f0f2f5', display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
              <button onClick={() => setShowEmoji(!showEmoji)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>😊</button>
              <input ref={chatInputRef} style={{ flex: 1, padding: '9px 14px', border: '1px solid #fff', borderRadius: 22, fontSize: 13, outline: 'none', background: '#fff' }}
                placeholder="Type reply..." value={chatReply} onChange={e => setChatReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }} />
              {chatReply.trim() && (
                <button onClick={sendChat} disabled={chatSending} style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: chatSending ? '#a7f3d0' : '#25D366', color: '#fff', cursor: chatSending ? 'not-allowed' : 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {chatSending ? '⏳' : '➤'}
                </button>
              )}
              {showEmoji && (
                <div style={{ position: 'absolute', bottom: 60, left: 14, background: '#fff', borderRadius: 12, padding: 10, boxShadow: '0 8px 32px rgba(0,0,0,.15)', zIndex: 200, display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 4, width: 340 }}>
                  {EMOJIS.map(e => <button key={e} onClick={() => { setChatReply(chatReply + e); setShowEmoji(false); chatInputRef.current?.focus(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4, borderRadius: 6 }}>{e}</button>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
