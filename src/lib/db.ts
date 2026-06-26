import { sql, createClient } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

// Initialize DB tables (called once on first query)
let initialized = false;
async function init() {
  if (initialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        phone_number TEXT NOT NULL UNIQUE,
        name TEXT DEFAULT '',
        email TEXT DEFAULT '',
        tags JSONB DEFAULT '[]'::jsonb,
        attributes JSONB DEFAULT '{}'::jsonb,
        opted_in BOOLEAN DEFAULT true,
        source TEXT DEFAULT 'manual',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number)`;
    await sql`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'marketing',
        language TEXT DEFAULT 'en',
        header_type TEXT DEFAULT 'none',
        header_text TEXT,
        body TEXT NOT NULL,
        footer TEXT,
        buttons JSONB DEFAULT '[]'::jsonb,
        status TEXT DEFAULT 'draft',
        whatsapp_template_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        template_id TEXT,
        message_body TEXT DEFAULT '',
        status TEXT DEFAULT 'draft',
        recipient_count INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        delivered_count INTEGER DEFAULT 0,
        read_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        contact_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        message_id TEXT,
        sent_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        read_at TIMESTAMPTZ,
        error TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        contact_id TEXT,
        campaign_id TEXT,
        direction TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        content TEXT DEFAULT '',
        media_url TEXT,
        status TEXT DEFAULT 'received',
        whatsapp_message_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS chatbot_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trigger_type TEXT NOT NULL DEFAULT 'keyword',
        trigger_keywords JSONB DEFAULT '[]'::jsonb,
        trigger_match TEXT DEFAULT 'contains',
        response_type TEXT DEFAULT 'text',
        response_text TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT false,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Insert default settings
    const defaults: [string, string][] = [
      ['platform_name', 'WhatsApp Platform'],
      ['whatsapp_verify_token', 'whatsapp_verify_123'],
      ['auto_reply_enabled', 'false'],
      ['auto_reply_message', 'Thanks for your message! We will get back to you soon.'],
    ];
    for (const [k, v] of defaults) {
      await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT (key) DO NOTHING`;
    }
    initialized = true;
  } catch (e) {
    console.error('DB init error:', e);
  }
}

// ---- Settings ----
export async function getAllSettings(): Promise<Record<string, string>> {
  await init();
  try {
    const { rows } = await sql`SELECT key, value FROM settings`;
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  } catch { return {}; }
}

export async function saveSettings(data: Record<string, string>): Promise<void> {
  await init();
  for (const [k, v] of Object.entries(data)) {
    await sql`INSERT INTO settings (key, value, updated_at) VALUES (${k}, ${v}, NOW()) ON CONFLICT (key) DO UPDATE SET value = ${v}, updated_at = NOW()`;
  }
}

// ---- Contacts ----
export async function getContacts(search?: string, tag?: string, page = 1, limit = 50) {
  await init();
  try {
    let where = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;
    if (search) {
      where += ` AND (name ILIKE $${paramIdx} OR phone_number ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (tag) {
      where += ` AND tags ? $${paramIdx}`;
      params.push(tag);
      paramIdx++;
    }

    const countResult = await sql.query(`SELECT COUNT(*) as total FROM contacts ${where}`, params);
    const total = parseInt(countResult.rows[0]?.total || '0');

    const offset = (page - 1) * limit;
    params.push(limit);
    params.push(offset);
    const { rows } = await sql.query(
      `SELECT * FROM contacts ${where} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    return { contacts: rows, total, page, limit };
  } catch (e) {
    console.error('getContacts error:', e);
    return { contacts: [], total: 0, page, limit };
  }
}

export async function saveContact(contact: any): Promise<string> {
  await init();
  const id = contact.id || uuidv4();
  await sql`
    INSERT INTO contacts (id, phone_number, name, email, tags, attributes, opted_in, source, created_at, updated_at)
    VALUES (${id}, ${contact.phone_number}, ${contact.name || ''}, ${contact.email || ''},
            ${JSON.stringify(contact.tags || [])}::jsonb, ${JSON.stringify(contact.attributes || {})}::jsonb,
            ${contact.opted_in !== false}, ${contact.source || 'manual'}, NOW(), NOW())
    ON CONFLICT (phone_number) DO UPDATE SET
      name = EXCLUDED.name, email = EXCLUDED.email, tags = EXCLUDED.tags,
      opted_in = EXCLUDED.opted_in, source = EXCLUDED.source, updated_at = NOW()
  `;
  return id;
}

export async function bulkSaveContacts(contacts: any[]): Promise<number> {
  await init();
  let count = 0;
  for (const c of contacts) {
    if (!c.phone_number) continue;
    try {
      const id = c.id || uuidv4();
      await sql`
        INSERT INTO contacts (id, phone_number, name, email, tags, attributes, opted_in, source, created_at, updated_at)
        VALUES (${id}, ${c.phone_number}, ${c.name || ''}, ${c.email || ''},
                ${JSON.stringify(c.tags || [])}::jsonb, ${JSON.stringify(c.attributes || {})}::jsonb,
                ${c.opted_in !== false}, ${c.source || 'import'}, NOW(), NOW())
        ON CONFLICT (phone_number) DO UPDATE SET
          name = EXCLUDED.name, email = EXCLUDED.email, tags = EXCLUDED.tags,
          opted_in = EXCLUDED.opted_in, source = EXCLUDED.source, updated_at = NOW()
      `;
      count++;
    } catch (e) { console.error('bulk save error:', e); }
  }
  return count;
}

export async function deleteContact(id: string): Promise<void> {
  await init();
  await sql`DELETE FROM contacts WHERE id = ${id}`;
}

export async function getContactByPhone(phone: string) {
  await init();
  const { rows } = await sql`SELECT * FROM contacts WHERE phone_number = ${phone} LIMIT 1`;
  return rows[0] || null;
}

export async function findOrCreateContact(phone: string, name?: string) {
  await init();
  let contact = await getContactByPhone(phone);
  if (!contact) {
    const id = uuidv4();
    await sql`
      INSERT INTO contacts (id, phone_number, name, source, created_at, updated_at)
      VALUES (${id}, ${phone}, ${name || ''}, 'whatsapp', NOW(), NOW())
    `;
    contact = { id, phone_number: phone, name: name || '', email: '', tags: [], opted_in: true, source: 'whatsapp' };
  } else if (name && !contact.name) {
    await sql`UPDATE contacts SET name = ${name}, updated_at = NOW() WHERE id = ${contact.id}`;
    contact.name = name;
  }
  return contact;
}

// ---- Templates ----
export async function getTemplates() {
  await init();
  const { rows } = await sql`SELECT * FROM templates ORDER BY created_at DESC`;
  return rows;
}

export async function saveTemplate(template: any): Promise<string> {
  await init();
  const id = template.id || uuidv4();
  await sql`
    INSERT INTO templates (id, name, category, language, header_type, header_text, body, footer, buttons, status, whatsapp_template_id, created_at, updated_at)
    VALUES (${id}, ${template.name}, ${template.category || 'marketing'}, ${template.language || 'en'},
            ${template.header_type || 'none'}, ${template.header_text || null}, ${template.body},
            ${template.footer || null}, ${JSON.stringify(template.buttons || [])}::jsonb,
            ${template.status || 'draft'}, ${template.whatsapp_template_id || null}, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, category = EXCLUDED.category, language = EXCLUDED.language,
      header_type = EXCLUDED.header_type, header_text = EXCLUDED.header_text, body = EXCLUDED.body,
      footer = EXCLUDED.footer, buttons = EXCLUDED.buttons, status = EXCLUDED.status,
      whatsapp_template_id = EXCLUDED.whatsapp_template_id, updated_at = NOW()
  `;
  return id;
}

export async function deleteTemplate(id: string): Promise<void> {
  await init();
  await sql`DELETE FROM templates WHERE id = ${id}`;
}

// ---- Campaigns ----
export async function getCampaigns(status?: string) {
  await init();
  if (status) {
    const { rows } = await sql`SELECT * FROM campaigns WHERE status = ${status} ORDER BY created_at DESC LIMIT 100`;
    return rows;
  }
  const { rows } = await sql`SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 100`;
  return rows;
}

export async function getCampaign(id: string) {
  await init();
  const { rows } = await sql`SELECT * FROM campaigns WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

export async function saveCampaign(campaign: any): Promise<string> {
  await init();
  const id = campaign.id || uuidv4();
  await sql`
    INSERT INTO campaigns (id, name, template_id, message_body, status, recipient_count, created_at)
    VALUES (${id}, ${campaign.name}, ${campaign.template_id || null}, ${campaign.message_body || ''},
            ${campaign.status || 'draft'}, ${campaign.recipient_count || 0}, NOW())
  `;
  return id;
}

export async function updateCampaign(id: string, data: any): Promise<void> {
  await init();
  const sets: string[] = [];
  const vals: any[] = [];
  let idx = 1;
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id') continue;
    sets.push(`${k} = $${idx}`);
    vals.push(v);
    idx++;
  }
  if (sets.length === 0) return;
  vals.push(id);
  await sql.query(`UPDATE campaigns SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
}

// ---- Campaign Recipients ----
export async function getCampaignRecipients(campaignId: string, status?: string) {
  await init();
  if (status) {
    const { rows } = await sql`SELECT * FROM campaign_recipients WHERE campaign_id = ${campaignId} AND status = ${status}`;
    return rows;
  }
  const { rows } = await sql`SELECT * FROM campaign_recipients WHERE campaign_id = ${campaignId}`;
  return rows;
}

export async function saveCampaignRecipient(recipient: any): Promise<void> {
  await init();
  await sql`
    INSERT INTO campaign_recipients (id, campaign_id, contact_id, status)
    VALUES (${recipient.id}, ${recipient.campaign_id}, ${recipient.contact_id}, ${recipient.status || 'pending'})
  `;
}

export async function updateCampaignRecipient(id: string, data: any): Promise<void> {
  await init();
  const sets: string[] = [];
  const vals: any[] = [];
  let idx = 1;
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id') continue;
    sets.push(`${k} = $${idx}`);
    vals.push(v);
    idx++;
  }
  if (sets.length === 0) return;
  vals.push(id);
  await sql.query(`UPDATE campaign_recipients SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
}

export async function getCampaignRecipientByMessageId(messageId: string) {
  await init();
  const { rows } = await sql`SELECT * FROM campaign_recipients WHERE message_id = ${messageId} LIMIT 1`;
  return rows[0] || null;
}

// ---- Messages ----
export async function getMessages(page = 1, limit = 50) {
  await init();
  try {
    const { rows: countRows } = await sql`SELECT COUNT(*) as total FROM messages`;
    const total = parseInt(countRows[0]?.total || '0');
    const offset = (page - 1) * limit;
    const { rows } = await sql`
      SELECT m.*, c.name as contact_name, c.phone_number
      FROM messages m LEFT JOIN contacts c ON m.contact_id = c.id
      ORDER BY m.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    return { messages: rows, total, page, limit };
  } catch (e) {
    console.error('getMessages error:', e);
    return { messages: [], total: 0, page, limit };
  }
}

export async function saveMessage(msg: any): Promise<void> {
  await init();
  const id = msg.id || msg.whatsapp_message_id || uuidv4();
  await sql`
    INSERT INTO messages (id, contact_id, campaign_id, direction, message_type, content, media_url, status, whatsapp_message_id, created_at)
    VALUES (${id}, ${msg.contact_id || null}, ${msg.campaign_id || null}, ${msg.direction},
            ${msg.message_type || 'text'}, ${msg.content || ''}, ${msg.media_url || null},
            ${msg.status || 'sent'}, ${msg.whatsapp_message_id || null}, ${msg.created_at ? new Date(msg.created_at).toISOString() : 'NOW()'}::timestamptz)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status, content = EXCLUDED.content
  `;
}

// ---- Chatbot ----
export async function getChatbotRules() {
  await init();
  const { rows } = await sql`SELECT * FROM chatbot_rules ORDER BY priority DESC`;
  return rows;
}

export async function saveChatbotRule(rule: any): Promise<string> {
  await init();
  const id = rule.id || uuidv4();
  await sql`
    INSERT INTO chatbot_rules (id, name, trigger_type, trigger_keywords, trigger_match, response_type, response_text, is_active, priority, created_at, updated_at)
    VALUES (${id}, ${rule.name}, ${rule.trigger_type || 'keyword'}, ${JSON.stringify(rule.trigger_keywords || [])}::jsonb,
            ${rule.trigger_match || 'contains'}, ${rule.response_type || 'text'}, ${rule.response_text || ''},
            ${rule.is_active ? true : false}, ${rule.priority || 0}, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, trigger_type = EXCLUDED.trigger_type, trigger_keywords = EXCLUDED.trigger_keywords,
      trigger_match = EXCLUDED.trigger_match, response_text = EXCLUDED.response_text,
      is_active = EXCLUDED.is_active, priority = EXCLUDED.priority, updated_at = NOW()
  `;
  return id;
}

export async function deleteChatbotRule(id: string): Promise<void> {
  await init();
  await sql`DELETE FROM chatbot_rules WHERE id = ${id}`;
}

// ---- Dashboard ----
export async function getDashboardStats() {
  await init();
  const [{ rows: c1 }] = await Promise.all([sql`SELECT COUNT(*) as c FROM contacts`]);
  const totalContacts = parseInt(c1[0]?.c || '0');

  const { rows: c2 } = await sql`SELECT COUNT(*) as c FROM contacts WHERE opted_in = true`;
  const optedIn = parseInt(c2[0]?.c || '0');

  const { rows: c3 } = await sql`SELECT COUNT(*) as c FROM campaigns`;
  const totalCampaigns = parseInt(c3[0]?.c || '0');

  const { rows: c4 } = await sql`SELECT COUNT(*) as c FROM campaigns WHERE status = 'running'`;
  const active = parseInt(c4[0]?.c || '0');

  const { rows: c5 } = await sql`SELECT COUNT(*) as c FROM messages WHERE direction = 'outgoing'`;
  const sent = parseInt(c5[0]?.c || '0');

  const { rows: c6 } = await sql`SELECT COUNT(*) as c FROM messages WHERE direction = 'incoming'`;
  const received = parseInt(c6[0]?.c || '0');

  const { rows: c7 } = await sql`SELECT COALESCE(SUM(delivered_count), 0) as c FROM campaigns`;
  const del = parseInt(c7[0]?.c || '0');

  const { rows: c8 } = await sql`SELECT COALESCE(SUM(read_count), 0) as c FROM campaigns`;
  const read = parseInt(c8[0]?.c || '0');

  // Daily stats
  const { rows: daily } = await sql`
    SELECT DATE(created_at) as date,
           SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END)::int as sent,
           SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END)::int as received
    FROM messages WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at) ORDER BY date
  `;

  const { rows: recent } = await sql`SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 5`;

  return {
    stats: {
      totalContacts, optedInContacts: optedIn, totalCampaigns, activeCampaigns: active,
      messagesSent: sent, messagesReceived: received, delivered: del, read,
      deliveryRate: sent > 0 ? Math.round((del / sent) * 100) : 0,
      readRate: del > 0 ? Math.round((read / del) * 100) : 0,
    },
    dailyStats: daily,
    recentCampaigns: recent,
  };
}

// ---- Webhook log ----
export async function logWebhook(eventType: string, payload: any, error?: string) {
  // Not storing webhook logs in Postgres to keep it lightweight
  console.log('Webhook:', eventType, error || 'success');
}
