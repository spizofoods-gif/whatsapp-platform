// JSON-file database — works on Vercel serverless, Railway, Render, anywhere
// Uses /tmp for Vercel compatibility. Falls back to ./data for local dev.

import fs from 'fs';
import path from 'path';

const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? '/tmp' : path.join(process.cwd(), 'data');

const DB_FILE = path.join(DATA_DIR, 'data.json');

interface DB {
  settings: Record<string, string>;
  contacts: any[];
  templates: any[];
  campaigns: any[];
  campaign_recipients: any[];
  messages: any[];
  chatbot_rules: any[];
  webhook_logs: any[];
}

const emptyDB: DB = {
  settings: {},
  contacts: [],
  templates: [],
  campaigns: [],
  campaign_recipients: [],
  messages: [],
  chatbot_rules: [],
  webhook_logs: [],
};

// In-memory cache for speed
let cache: DB | null = null;
let lastLoad = 0;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load(): DB {
  const now = Date.now();
  // Reload every 500ms in dev (serverless), use cache otherwise
  if (cache && (now - lastLoad < 5000)) return cache;
  
  try {
    ensureDir();
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      cache = JSON.parse(raw);
      lastLoad = now;
      return cache!;
    }
  } catch (e) {
    console.error('DB load error:', e);
  }
  
  cache = JSON.parse(JSON.stringify(emptyDB));
  // Set defaults
  cache!.settings['platform_name'] = cache!.settings['platform_name'] || 'WhatsApp Platform';
  cache!.settings['whatsapp_verify_token'] = cache!.settings['whatsapp_verify_token'] || 'whatsapp_verify_123';
  cache!.settings['auto_reply_enabled'] = cache!.settings['auto_reply_enabled'] || 'false';
  cache!.settings['auto_reply_message'] = cache!.settings['auto_reply_message'] || 'Thanks for your message!';
  lastLoad = now;
  return cache!;
}

function save(): void {
  ensureDir();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (e) {
    console.error('DB save error:', e);
  }
}

// --- Settings ---
export function getSetting(key: string): string {
  return load().settings[key] || '';
}

export function getAllSettings(): Record<string, string> {
  return { ...load().settings };
}

export function saveSettings(data: Record<string, string>): void {
  const db = load();
  for (const [k, v] of Object.entries(data)) {
    db.settings[k] = v;
  }
  save();
}

// --- Contacts ---
export function getContacts(search?: string, tag?: string, page = 1, limit = 50) {
  let rows = load().contacts;
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(c => 
      (c.name || '').toLowerCase().includes(s) ||
      (c.phone_number || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s)
    );
  }
  if (tag) {
    rows = rows.filter(c => (c.tags || []).includes(tag));
  }
  rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const total = rows.length;
  const offset = (page - 1) * limit;
  return { contacts: rows.slice(offset, offset + limit), total };
}

export function saveContact(contact: any): string {
  const db = load();
  const id = contact.id || generateId();
  const existing = db.contacts.findIndex(c => c.phone_number === contact.phone_number);
  const entry = {
    id,
    phone_number: contact.phone_number,
    name: contact.name || '',
    email: contact.email || '',
    tags: contact.tags || [],
    attributes: contact.attributes || {},
    opted_in: contact.opted_in !== false,
    source: contact.source || 'manual',
    created_at: contact.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (existing >= 0) {
    entry.created_at = db.contacts[existing].created_at;
    db.contacts[existing] = entry;
  } else {
    db.contacts.push(entry);
  }
  save();
  return id;
}

export function bulkSaveContacts(contacts: any[]): number {
  const db = load();
  let count = 0;
  for (const c of contacts) {
    if (!c.phone_number) continue;
    const id = c.id || generateId();
    const existing = db.contacts.findIndex(x => x.phone_number === c.phone_number);
    const entry = {
      id,
      phone_number: c.phone_number,
      name: c.name || '',
      email: c.email || '',
      tags: c.tags || [],
      attributes: c.attributes || {},
      opted_in: c.opted_in !== false,
      source: c.source || 'import',
      created_at: c.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (existing >= 0) {
      entry.created_at = db.contacts[existing].created_at;
      db.contacts[existing] = entry;
    } else {
      db.contacts.push(entry);
      count++;
    }
  }
  save();
  return count;
}

export function deleteContact(id: string): void {
  const db = load();
  db.contacts = db.contacts.filter(c => c.id !== id);
  save();
}

// --- Templates ---
export function getTemplates() {
  return [...load().templates].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export function saveTemplate(template: any): string {
  const db = load();
  const id = template.id || generateId();
  const existing = db.templates.findIndex(t => t.id === id);
  const entry = { ...template, id, updated_at: new Date().toISOString() };
  if (existing >= 0) {
    entry.created_at = db.templates[existing].created_at;
    db.templates[existing] = entry;
  } else {
    entry.created_at = new Date().toISOString();
    db.templates.push(entry);
  }
  save();
  return id;
}

export function deleteTemplate(id: string): void {
  const db = load();
  db.templates = db.templates.filter(t => t.id !== id);
  save();
}

// --- Campaigns ---
export function getCampaigns(status?: string) {
  let rows = [...load().campaigns];
  if (status) rows = rows.filter(c => c.status === status);
  return rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export function saveCampaign(campaign: any): string {
  const db = load();
  const id = campaign.id || generateId();
  db.campaigns.push({ ...campaign, id, created_at: new Date().toISOString() });
  save();
  return id;
}

export function updateCampaign(id: string, data: any): void {
  const db = load();
  const idx = db.campaigns.findIndex(c => c.id === id);
  if (idx >= 0) Object.assign(db.campaigns[idx], data);
  save();
}

export function getCampaign(id: string) {
  return load().campaigns.find(c => c.id === id);
}

// --- Campaign Recipients ---
export function getCampaignRecipients(campaignId: string, status?: string) {
  let rows = load().campaign_recipients.filter(r => r.campaign_id === campaignId);
  if (status) rows = rows.filter(r => r.status === status);
  return rows;
}

export function saveCampaignRecipient(recipient: any): void {
  load().campaign_recipients.push(recipient);
  save();
}

export function updateCampaignRecipient(id: string, data: any): void {
  const db = load();
  const idx = db.campaign_recipients.findIndex(r => r.id === id);
  if (idx >= 0) Object.assign(db.campaign_recipients[idx], data);
  save();
}

export function getCampaignRecipientByMessageId(messageId: string) {
  return load().campaign_recipients.find(r => r.message_id === messageId);
}

// --- Messages ---
export function getMessages(page = 1, limit = 50) {
  const rows = [...load().messages].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const total = rows.length;
  const offset = (page - 1) * limit;
  return { messages: rows.slice(offset, offset + limit), total };
}

export function saveMessage(msg: any): void {
  const db = load();
  const id = msg.id || msg.whatsapp_message_id || generateId();
  const existing = db.messages.findIndex(m => m.id === id);
  if (existing >= 0) {
    Object.assign(db.messages[existing], msg);
  } else {
    db.messages.push({ ...msg, id, created_at: msg.created_at || new Date().toISOString() });
  }
  save();
}

// --- Chatbot ---
export function getChatbotRules() {
  return [...load().chatbot_rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

export function saveChatbotRule(rule: any): string {
  const db = load();
  const id = rule.id || generateId();
  const existing = db.chatbot_rules.findIndex(r => r.id === id);
  const entry = { ...rule, id, updated_at: new Date().toISOString() };
  if (existing >= 0) {
    entry.created_at = db.chatbot_rules[existing].created_at;
    db.chatbot_rules[existing] = entry;
  } else {
    entry.created_at = new Date().toISOString();
    db.chatbot_rules.push(entry);
  }
  save();
  return id;
}

export function deleteChatbotRule(id: string): void {
  const db = load();
  db.chatbot_rules = db.chatbot_rules.filter(r => r.id !== id);
  save();
}

// --- Dashboard Stats ---
export function getDashboardStats() {
  const db = load();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const totalContacts = db.contacts.length;
  const optedIn = db.contacts.filter(c => c.opted_in).length;
  const totalCampaigns = db.campaigns.length;
  const active = db.campaigns.filter(c => c.status === 'running').length;
  const sent = db.messages.filter(m => m.direction === 'outgoing').length;
  const received = db.messages.filter(m => m.direction === 'incoming').length;
  const del = db.campaigns.reduce((sum, c) => sum + (c.delivered_count || 0), 0);
  const read = db.campaigns.reduce((sum, c) => sum + (c.read_count || 0), 0);

  // Daily stats
  const recentMessages = db.messages.filter(m => m.created_at >= sevenDaysAgo);
  const dailyMap: Record<string, { sent: number; received: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { sent: 0, received: 0 };
  }
  for (const m of recentMessages) {
    const key = (m.created_at || '').split('T')[0];
    if (dailyMap[key]) {
      if (m.direction === 'outgoing') dailyMap[key].sent++;
      else dailyMap[key].received++;
    }
  }

  const dailyStats = Object.entries(dailyMap).map(([date, d]) => ({ date, ...d }));
  const recentCampaigns = [...db.campaigns].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 5);

  return {
    stats: {
      totalContacts, optedInContacts: optedIn, totalCampaigns, activeCampaigns: active,
      messagesSent: sent, messagesReceived: received, delivered: del, read,
      deliveryRate: sent > 0 ? Math.round((del / sent) * 100) : 0,
      readRate: del > 0 ? Math.round((read / del) * 100) : 0,
    },
    dailyStats,
    recentCampaigns,
  };
}

// --- Helpers ---
function generateId(): string {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

export function getContactByPhone(phone: string) {
  return load().contacts.find(c => c.phone_number === phone);
}

export function findOrCreateContact(phone: string, name?: string) {
  const db = load();
  let contact = db.contacts.find(c => c.phone_number === phone);
  if (!contact) {
    contact = {
      id: generateId(),
      phone_number: phone,
      name: name || '',
      email: '',
      tags: [],
      attributes: {},
      opted_in: true,
      source: 'whatsapp',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.contacts.push(contact);
    save();
  } else {
    contact.updated_at = new Date().toISOString();
    if (name && !contact.name) contact.name = name;
    save();
  }
  return contact;
}

// Log webhook
export function logWebhook(eventType: string, payload: any, error?: string) {
  const db = load();
  db.webhook_logs.push({
    id: generateId(),
    event_type: eventType,
    payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
    error: error || null,
    created_at: new Date().toISOString(),
  });
  // Keep only last 1000 logs
  if (db.webhook_logs.length > 1000) {
    db.webhook_logs = db.webhook_logs.slice(-1000);
  }
  save();
}
