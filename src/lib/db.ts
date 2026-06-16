import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'whatsapp.db');
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, phone_number TEXT NOT NULL UNIQUE, name TEXT, email TEXT, tags TEXT DEFAULT '[]', attributes TEXT DEFAULT '{}', opted_in INTEGER DEFAULT 1, source TEXT DEFAULT 'manual', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, color TEXT DEFAULT '#128C7E', created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT DEFAULT 'marketing', language TEXT DEFAULT 'en', header_type TEXT DEFAULT 'none', header_text TEXT, body TEXT NOT NULL, footer TEXT, buttons TEXT DEFAULT '[]', status TEXT DEFAULT 'draft', whatsapp_template_id TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, template_id TEXT, message_body TEXT, status TEXT DEFAULT 'draft', recipient_count INTEGER DEFAULT 0, sent_count INTEGER DEFAULT 0, delivered_count INTEGER DEFAULT 0, read_count INTEGER DEFAULT 0, failed_count INTEGER DEFAULT 0, started_at TEXT, completed_at TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS campaign_recipients (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, contact_id TEXT NOT NULL, status TEXT DEFAULT 'pending', message_id TEXT, sent_at TEXT, error TEXT);
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, contact_id TEXT, campaign_id TEXT, direction TEXT NOT NULL, message_type TEXT DEFAULT 'text', content TEXT, media_url TEXT, status TEXT DEFAULT 'received', whatsapp_message_id TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS chatbot_rules (id TEXT PRIMARY KEY, name TEXT NOT NULL, trigger_type TEXT NOT NULL, trigger_keywords TEXT DEFAULT '[]', trigger_match TEXT DEFAULT 'contains', response_type TEXT DEFAULT 'text', response_text TEXT, response_template_id TEXT, is_active INTEGER DEFAULT 0, priority INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS webhook_logs (id TEXT PRIMARY KEY, event_type TEXT, payload TEXT, processed INTEGER DEFAULT 0, error TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number);
    CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id);
  `);
  const ins = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of [['platform_name','WhatsApp Platform'],['whatsapp_phone_number_id',''],['whatsapp_access_token',''],['whatsapp_verify_token','whatsapp_verify_123'],['whatsapp_business_id',''],['auto_reply_enabled','false'],['auto_reply_message','Thanks for your message! We will get back to you soon.']]) ins.run(k, v);
}
export default getDb;
