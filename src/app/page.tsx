'use client';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!data) return <div className="empty-state">Failed to load</div>;

  const { stats, dailyStats, recentCampaigns } = data;
  const cards = [
    { label: 'Total Contacts', value: stats.totalContacts.toLocaleString(), sub: `${stats.optedInContacts.toLocaleString()} opted in`, color: '#128C7E', icon: '👥' },
    { label: 'Campaigns', value: stats.totalCampaigns.toLocaleString(), sub: `${stats.activeCampaigns} active`, color: '#2563eb', icon: '📨' },
    { label: 'Messages Sent', value: stats.messagesSent.toLocaleString(), sub: `${stats.deliveryRate}% delivered`, color: '#059669', icon: '✉️' },
    { label: 'Read Rate', value: `${stats.readRate}%`, sub: `${stats.read} of ${stats.delivered} delivered`, color: '#7c3aed', icon: '👁️' },
  ];
  const maxCount = Math.max(...(dailyStats || []).map((d: any) => Math.max(d.sent, d.received)), 1);

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="grid-4">
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${c.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div>
              <div className="text-sm text-muted">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Last 7 Days</h3>
          {(!dailyStats || dailyStats.length === 0) ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>No message data yet</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, padding: '0 8px' }}>
              {dailyStats.map((d: any) => (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 3, height: 140, alignItems: 'flex-end' }}>
                    <div title={`Sent: ${d.sent}`} style={{ width: 16, height: `${(d.sent / maxCount) * 130}px`, minHeight: 2, background: 'linear-gradient(180deg, #25D366, #128C7E)', borderRadius: '4px 4px 0 0' }} />
                    <div title={`Received: ${d.received}`} style={{ width: 16, height: `${(d.received / maxCount) * 130}px`, minHeight: 2, background: 'linear-gradient(180deg, #60a5fa, #2563eb)', borderRadius: '4px 4px 0 0' }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#25D366' }} /> Sent</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#2563eb' }} /> Received</div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Recent Campaigns</h3>
          {(!recentCampaigns || recentCampaigns.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
              No campaigns yet<br />
              <a href="/campaigns" style={{ marginTop: 8, display: 'inline-block' }} className="btn btn-primary btn-sm">Create Campaign</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentCampaigns.map((c: any) => (
                <div key={c.id} style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                    <span className={`badge ${c.status === 'completed' ? 'badge-success' : c.status === 'running' ? 'badge-info' : 'badge-warning'}`}>{c.status}</span>
                  </div>
                  <div className="text-xs text-muted">{c.sent_count} sent · {c.delivered_count} delivered · {c.read_count} read</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
