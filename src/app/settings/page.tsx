'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const [activeTab, setActiveTab] = useState('whatsapp');
  const notify = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  useEffect(() => { fetch('/api/settings').then(r => r.json()).then(s => { setSettings(s); setLoading(false); }); }, []);
  const update = (k: string, v: string) => setSettings((prev: any) => ({ ...prev, [k]: v }));
  const save = async (data: Record<string,string>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (res.ok) { notify('Saved!'); setSettings((prev: any) => ({ ...prev, ...data })); } else notify('Failed', 'error');
    } catch { notify('Error', 'error'); }
    setSaving(false);
  };
  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <div className="tabs">
        {[{ key: 'whatsapp', label: 'WhatsApp API' }, { key: 'general', label: 'General' }, { key: 'auto_reply', label: 'Auto-Reply' }, { key: 'info', label: 'Deploy Guide' }].map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'whatsapp' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>WhatsApp Cloud API</h3>
          <p className="text-sm text-muted mb-6">Get these from <a href="https://developers.facebook.com/apps" target="_blank" style={{ color: '#128C7E', fontWeight: 600 }}>Meta Developer App</a> → WhatsApp → API Setup.</p>
          <div className="mb-4"><label className="label">Phone Number ID</label><input className="input" placeholder="123456789..." value={settings.whatsapp_phone_number_id || ''} onChange={e => update('whatsapp_phone_number_id', e.target.value)} /></div>
          <div className="mb-4"><label className="label">Access Token</label><input className="input" type="password" placeholder="EAA..." value={settings.whatsapp_access_token || ''} onChange={e => update('whatsapp_access_token', e.target.value)} /></div>
          <div className="mb-4"><label className="label">Webhook Verify Token</label><input className="input" value={settings.whatsapp_verify_token || ''} onChange={e => update('whatsapp_verify_token', e.target.value)} /></div>
          <div className="mb-4"><label className="label">Business Account ID (optional)</label><input className="input" value={settings.whatsapp_business_id || ''} onChange={e => update('whatsapp_business_id', e.target.value)} /></div>
          <button className="btn btn-primary" disabled={saving} onClick={() => save({ whatsapp_phone_number_id: settings.whatsapp_phone_number_id || '', whatsapp_access_token: settings.whatsapp_access_token || '', whatsapp_verify_token: settings.whatsapp_verify_token || '', whatsapp_business_id: settings.whatsapp_business_id || '' })}>{saving ? 'Saving...' : '💾 Save'}</button>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>General</h3>
          <div className="mb-4"><label className="label">Platform Name</label><input className="input" value={settings.platform_name || ''} onChange={e => update('platform_name', e.target.value)} /></div>
          <button className="btn btn-primary" disabled={saving} onClick={() => save({ platform_name: settings.platform_name || '' })}>{saving ? 'Saving...' : '💾 Save'}</button>
        </div>
      )}

      {activeTab === 'auto_reply' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Auto-Reply</h3>
          <div className="mb-4"><label className="label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={settings.auto_reply_enabled === 'true'} onChange={e => update('auto_reply_enabled', e.target.checked ? 'true' : 'false')} /> Enable auto-reply</label></div>
          <div className="mb-4"><label className="label">Fallback Message</label><textarea className="input" rows={3} value={settings.auto_reply_message || ''} onChange={e => update('auto_reply_message', e.target.value)} style={{ resize: 'vertical' }} /></div>
          <p className="text-xs text-muted">Chatbot rules take priority.</p>
          <button className="btn btn-primary mt-4" disabled={saving} onClick={() => save({ auto_reply_enabled: settings.auto_reply_enabled || 'false', auto_reply_message: settings.auto_reply_message || '' })}>{saving ? 'Saving...' : '💾 Save'}</button>
        </div>
      )}

      {activeTab === 'info' && (
        <div className="card" style={{ maxWidth: 680 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🚀 Free Deployment Guide</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#128C7E' }}>Step 1: Get WhatsApp API (FREE)</h4>
              <ol style={{ fontSize: 13, color: '#334155', lineHeight: 1.8, paddingLeft: 20 }}>
                <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" style={{ color: '#2563eb' }}>developers.facebook.com/apps</a></li>
                <li>Create Business app → add <strong>WhatsApp</strong> product</li>
                <li>Copy <strong>Phone Number ID</strong> + <strong>Temp Access Token</strong></li>
                <li>For production: verify business for permanent token</li>
              </ol>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#128C7E' }}>Step 2: Deploy (FREE)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}><strong style={{ fontSize: 14 }}>Vercel ⭐</strong><div className="text-xs text-muted"><code>npm i -g vercel && vercel</code></div></div>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}><strong style={{ fontSize: 14 }}>Railway</strong><div className="text-xs text-muted">Push to GitHub → connect Railway</div></div>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}><strong style={{ fontSize: 14 }}>Render</strong><div className="text-xs text-muted">Free web service → connect GitHub</div></div>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}><strong style={{ fontSize: 14 }}>Fly.io</strong><div className="text-xs text-muted"><code>flyctl launch</code> — 3 free VMs</div></div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#128C7E' }}>Step 3: Webhook</h4>
              <ol style={{ fontSize: 13, color: '#334155', lineHeight: 1.8, paddingLeft: 20 }}>
                <li>Deploy → copy URL: <code>https://your-app.vercel.app</code></li>
                <li>Meta Dev App → WhatsApp → Configuration → Webhook</li>
                <li>URL: <code>https://your-app.vercel.app/api/webhook</code></li>
                <li>Verify token: <strong>{settings.whatsapp_verify_token || 'whatsapp_verify_123'}</strong></li>
                <li>Subscribe to <strong>messages</strong></li>
              </ol>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#128C7E' }}>💰 Your Only Cost</h4>
              <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <table style={{ width: '100%', fontSize: 13 }}>
                  <thead><tr><th style={{ textAlign: 'left', padding: '4px 8px' }}>Type</th><th style={{ textAlign: 'right', padding: '4px 8px' }}>Meta Fee</th></tr></thead>
                  <tbody>
                    <tr><td style={{ padding: '4px 8px' }}>Marketing</td><td style={{ textAlign: 'right', padding: '4px 8px' }}>₹1.09</td></tr>
                    <tr><td style={{ padding: '4px 8px' }}>Utility</td><td style={{ textAlign: 'right', padding: '4px 8px' }}>₹0.145</td></tr>
                    <tr><td style={{ padding: '4px 8px' }}>Auth (OTP)</td><td style={{ textAlign: 'right', padding: '4px 8px' }}>₹0.145</td></tr>
                    <tr><td style={{ padding: '4px 8px' }}>Service</td><td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600, color: '#059669' }}>FREE</td></tr>
                    <tr style={{ borderTop: '2px solid #e2e8f0' }}><td style={{ padding: '6px 8px', fontWeight: 700 }}>Platform Fee</td><td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: '#059669' }}>₹0 — No middleman!</td></tr>
                  </tbody>
                </table>
                <div style={{ marginTop: 12, fontSize: 12, color: '#166534' }}>AiSensy: ₹1,500-3,200/mo. You save ₹18K-68K/year!</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
