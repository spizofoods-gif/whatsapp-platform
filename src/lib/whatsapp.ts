import axios from 'axios';
import { getDb } from './db';

const BASE = 'https://graph.facebook.com/v19.0';

function getConfig() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings WHERE key LIKE ?').all('whatsapp_%') as any[];
  const cfg: any = {};
  for (const r of rows) cfg[r.key.replace('whatsapp_', '')] = r.value;
  if (!cfg.phone_number_id || !cfg.access_token) return null;
  return cfg;
}

function np(p: string): string {
  let c = p.replace(/[\s\-\(\)\+]/g, '');
  if (!c.startsWith('91') && c.length === 10) c = '91' + c;
  return c;
}

async function send(to: string, data: any) {
  const cfg = getConfig();
  if (!cfg) throw new Error('WhatsApp not configured.');
  const url = `${BASE}/${cfg.phone_number_id}/messages`;
  try {
    const res = await axios.post(url, { messaging_product: 'whatsapp', recipient_type: 'individual', to: np(to), ...data }, {
      headers: { Authorization: `Bearer ${cfg.access_token}`, 'Content-Type': 'application/json' },
    });
    return res.data;
  } catch (err: any) { throw new Error(err.response?.data?.error?.message || err.message); }
}

export async function sendTextMessage(to: string, text: string, previewUrl = false) {
  return send(to, { type: 'text', text: { body: text, preview_url: previewUrl } });
}

export async function sendTemplateMessage(to: string, templateName: string, language = 'en') {
  return send(to, { type: 'template', template: { name: templateName, language: { code: language } } });
}

export async function markAsRead(messageId: string) {
  const cfg = getConfig();
  if (!cfg) return;
  try { await axios.post(`${BASE}/${cfg.phone_number_id}/messages`, { messaging_product: 'whatsapp', status: 'read', message_id: messageId }, { headers: { Authorization: `Bearer ${cfg.access_token}` } }); } catch {}
}

export function logMessage(data: { contact_id?: string; campaign_id?: string; direction: string; content?: string; whatsapp_message_id?: string; status?: string; message_type?: string; media_url?: string; }) {
  try {
    const db = getDb();
    const id = data.whatsapp_message_id || require('uuid').v4();
    db.prepare(`INSERT OR IGNORE INTO messages (id, contact_id, campaign_id, direction, message_type, content, media_url, status, whatsapp_message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.contact_id || null, data.campaign_id || null, data.direction, data.message_type || 'text', data.content || '', data.media_url || null, data.status || 'sent', data.whatsapp_message_id || null
    );
  } catch {}
}
