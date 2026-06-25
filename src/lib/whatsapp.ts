import axios from 'axios';
import { getAllSettings } from './db';

const BASE = 'https://graph.facebook.com/v19.0';

let cachedConfig: any = null;
let cacheTime = 0;

async function getConfig() {
  const now = Date.now();
  if (cachedConfig && (now - cacheTime < 30000)) return cachedConfig;
  const settings = await getAllSettings();
  if (!settings.whatsapp_phone_number_id || !settings.whatsapp_access_token) return null;
  cachedConfig = {
    phoneNumberId: settings.whatsapp_phone_number_id,
    accessToken: settings.whatsapp_access_token,
    verifyToken: settings.whatsapp_verify_token || 'whatsapp_verify_123',
  };
  cacheTime = now;
  return cachedConfig;
}

function np(p: string): string {
  let c = p.replace(/[\s\-\(\)\+]/g, '');
  if (!c.startsWith('91') && c.length === 10) c = '91' + c;
  return c;
}

async function send(to: string, data: any) {
  const cfg = await getConfig();
  if (!cfg) throw new Error('WhatsApp not configured. Set up in Settings.');
  const url = `${BASE}/${cfg.phoneNumberId}/messages`;
  try {
    const res = await axios.post(url, {
      messaging_product: 'whatsapp', recipient_type: 'individual', to: np(to),
      ...data,
    }, {
      headers: { Authorization: `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' },
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.error?.message || err.message);
  }
}

export async function sendTextMessage(to: string, text: string, previewUrl = false) {
  return send(to, { type: 'text', text: { body: text, preview_url: previewUrl } });
}

export async function sendTemplateMessage(to: string, templateName: string, language = 'en') {
  return send(to, { type: 'template', template: { name: templateName, language: { code: language } } });
}

export async function markAsRead(messageId: string) {
  const cfg = await getConfig();
  if (!cfg) return;
  try {
    await axios.post(`${BASE}/${cfg.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp', status: 'read', message_id: messageId,
    }, { headers: { Authorization: `Bearer ${cfg.accessToken}` } });
  } catch { /* ignore */ }
}
