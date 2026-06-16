'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export default function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const notify = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
    } catch { }
  }, []);

  const fetchMessages = useCallback(async (contactId: string) => {
    const res = await fetch(`/api/messages?contact_id=${contactId}&page=1&limit=100`);
    const data = await res.json();
    setMessages(data.messages || []);
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { fetchConversations(); setLoading(false); }, [fetchConversations]);
  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.contact_id);
      const interval = setInterval(() => fetchMessages(selectedContact.contact_id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedContact, fetchMessages]);

  // Also poll conversations
  useEffect(() => {
    const interval = setInterval(fetchConversations, 8000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const handleSend = async () => {
    if (!reply.trim() || !selectedContact) return;
    setSending(true);
    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: selectedContact.phone_number,
          message: reply,
          contact_id: selectedContact.contact_id,
        }),
      });
      if (res.ok) {
        setReply('');
        fetchMessages(selectedContact.contact_id);
        notify('Sent!');
      } else {
        const err = await res.json();
        notify(err.error || 'Failed to send', 'error');
      }
    } catch { notify('Network error', 'error'); }
    setSending(false);
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 48px)', gap: 0, marginTop: -24 }}>
      {/* Conversations List */}
      <div style={{ width: 340, borderRight: '1px solid #e2e8f0', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>💬 Conversations</h2>
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>{conversations.length} active chats</p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 13 }}>
              No conversations yet.<br />Messages will appear here when customers text you.
            </div>
          ) : (
            conversations.map((c: any) => (
              <div
                key={c.contact_id}
                onClick={() => setSelectedContact(c)}
                style={{
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  background: selectedContact?.contact_id === c.contact_id ? '#f0fdf4' : '#fff',
                  borderLeft: selectedContact?.contact_id === c.contact_id ? '3px solid #25D366' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name || `+${c.phone_number}`}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{formatTime(c.last_message_time)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 10,
                    color: c.last_direction === 'incoming' ? '#fff' : '#64748b',
                    background: c.last_direction === 'incoming' ? '#25D366' : '#f1f5f9',
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}>
                    {c.last_direction === 'incoming' ? '←' : '→'}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {c.last_message || '[Media]'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        {!selectedContact ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Select a conversation</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Choose a contact from the left to start chatting</div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{ padding: '14px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #25D366, #128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>
                {(selectedContact.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedContact.name || 'Customer'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>+{selectedContact.phone_number}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No messages yet</div>
              ) : (
                messages.slice().reverse().map((m: any) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      justifyContent: m.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      padding: '10px 16px',
                      borderRadius: 16,
                      background: m.direction === 'outgoing'
                        ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
                        : '#fff',
                      border: m.direction === 'incoming' ? '1px solid #e2e8f0' : 'none',
                      borderBottomRightRadius: m.direction === 'outgoing' ? 4 : 16,
                      borderBottomLeftRadius: m.direction === 'incoming' ? 4 : 16,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}>
                      <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {m.content || '[Media]'}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}>
                        {formatTime(m.created_at)}
                        {m.direction === 'outgoing' && <span style={{ marginLeft: 4 }}>{m.status === 'sent' ? '✓' : m.status === 'delivered' ? '✓✓' : m.status === 'read' ? '✓✓' : ''}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Reply Input */}
            <div style={{ padding: '12px 20px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
              <input
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 24,
                  fontSize: 14,
                  outline: 'none',
                }}
                placeholder="Type your reply..."
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              />
              <button
                onClick={handleSend}
                disabled={sending || !reply.trim()}
                style={{
                  width: 44, height: 44, borderRadius: '50%', border: 'none',
                  background: sending ? '#a7f3d0' : '#25D366',
                  color: '#fff', cursor: sending ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}
              >
                {sending ? '⏳' : '➤'}
              </button>
            </div>
          </>
        )}
      </div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
