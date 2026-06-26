import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

let initDone = false;
async function init() {
  if (initDone) return;
  try {
    await sql`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT DEFAULT '', updated_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, phone_number TEXT NOT NULL UNIQUE, name TEXT DEFAULT '', email TEXT DEFAULT '', tags JSONB DEFAULT '[]'::jsonb, attributes JSONB DEFAULT '{}'::jsonb, opted_in BOOLEAN DEFAULT true, source TEXT DEFAULT 'manual', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cp ON contacts(phone_number)`;
    await sql`CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT DEFAULT 'marketing', language TEXT DEFAULT 'en', header_type TEXT DEFAULT 'none', header_text TEXT, header_media_url TEXT, body TEXT NOT NULL DEFAULT '', footer TEXT, buttons JSONB DEFAULT '[]'::jsonb, status TEXT DEFAULT 'draft', whatsapp_template_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, template_id TEXT, message_body TEXT DEFAULT '', category TEXT DEFAULT 'marketing', media_url TEXT, footer TEXT, scheduled_at TIMESTAMPTZ, status TEXT DEFAULT 'draft', recipient_count INTEGER DEFAULT 0, sent_count INTEGER DEFAULT 0, delivered_count INTEGER DEFAULT 0, read_count INTEGER DEFAULT 0, failed_count INTEGER DEFAULT 0, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS campaign_recipients (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, contact_id TEXT NOT NULL, status TEXT DEFAULT 'pending', message_id TEXT, sent_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, read_at TIMESTAMPTZ, error TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, contact_id TEXT, campaign_id TEXT, direction TEXT NOT NULL, message_type TEXT DEFAULT 'text', content TEXT DEFAULT '', media_url TEXT, status TEXT DEFAULT 'received', whatsapp_message_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS chatbot_rules (id TEXT PRIMARY KEY, name TEXT NOT NULL, trigger_type TEXT DEFAULT 'keyword', trigger_keywords JSONB DEFAULT '[]'::jsonb, trigger_match TEXT DEFAULT 'contains', response_type TEXT DEFAULT 'text', response_text TEXT DEFAULT '', buttons JSONB DEFAULT '[]'::jsonb, is_active BOOLEAN DEFAULT false, priority INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
    for (const [k,v] of [['platform_name','WhatsApp Platform'],['whatsapp_verify_token','whatsapp_verify_123'],['auto_reply_enabled','false'],['auto_reply_message','Thanks for your message! We will get back to you soon.']]) {
      await sql`INSERT INTO settings (key,value) VALUES (${k},${v}) ON CONFLICT (key) DO NOTHING`;
    }
    initDone = true;
  } catch(e) { console.error('Init error:', e); }
}

export async function getAllSettings() { await init(); try { const {rows}=await sql`SELECT key,value FROM settings`; const o:any={}; for(const r of rows) o[r.key]=r.value; return o; } catch { return {}; } }
export async function saveSettings(d:Record<string,string>) { await init(); for(const [k,v] of Object.entries(d)) await sql`INSERT INTO settings (key,value,updated_at) VALUES (${k},${v},NOW()) ON CONFLICT (key) DO UPDATE SET value=${v},updated_at=NOW()`; }

export async function getContacts(s?:string, tag?:string, page=1, limit=50) {
  await init(); try {
    let w='WHERE 1=1'; const p:any[]=[]; let pi=1;
    if(s){w+=` AND (name ILIKE $${pi} OR phone_number ILIKE $${pi} OR email ILIKE $${pi})`; p.push(`%${s}%`); pi++;}
    if(tag){w+=` AND tags ? $${pi}`; p.push(tag); pi++;}
    const cr=await sql.query(`SELECT COUNT(*) as t FROM contacts ${w}`,p); const total=parseInt(cr.rows[0]?.t||'0');
    const off=(page-1)*limit; p.push(limit); p.push(off);
    const {rows}=await sql.query(`SELECT * FROM contacts ${w} ORDER BY created_at DESC LIMIT $${pi} OFFSET $${pi+1}`,p);
    return {contacts:rows,total,page,limit};
  } catch { return {contacts:[],total:0,page,limit}; }
}
export async function saveContact(c:any) { await init(); const id=c.id||uuidv4(); await sql`INSERT INTO contacts (id,phone_number,name,email,tags,attributes,opted_in,source,created_at,updated_at) VALUES (${id},${c.phone_number},${c.name||''},${c.email||''},${JSON.stringify(c.tags||[])}::jsonb,${JSON.stringify(c.attributes||{})}::jsonb,${c.opted_in!==false},${c.source||'manual'},NOW(),NOW()) ON CONFLICT (phone_number) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,tags=EXCLUDED.tags,opted_in=EXCLUDED.opted_in,updated_at=NOW()`; return id; }
export async function bulkSaveContacts(cs:any[]) { await init(); let n=0; for(const c of cs){if(!c.phone_number)continue; try{await saveContact({...c,id:c.id||uuidv4(),source:c.source||'import'});n++}catch{}} return n; }
export async function deleteContact(id:string) { await init(); await sql`DELETE FROM contacts WHERE id=${id}`; }
export async function findOrCreateContact(phone:string, name?:string) { await init(); const {rows}=await sql`SELECT * FROM contacts WHERE phone_number=${phone} LIMIT 1`; if(rows[0]){if(name&&!rows[0].name)await sql`UPDATE contacts SET name=${name} WHERE id=${rows[0].id}`;return rows[0];}const id=uuidv4();await sql`INSERT INTO contacts (id,phone_number,name,source,created_at,updated_at) VALUES (${id},${phone},${name||''},'whatsapp',NOW(),NOW())`;return{id,phone_number:phone,name:name||'',email:'',tags:[],opted_in:true,source:'whatsapp'};}

export async function getTemplates() { await init(); const {rows}=await sql`SELECT * FROM templates ORDER BY created_at DESC`; return rows; }
export async function saveTemplate(t:any) { await init(); const id=t.id||uuidv4(); await sql`INSERT INTO templates (id,name,category,language,header_type,header_text,header_media_url,body,footer,buttons,status,whatsapp_template_id,created_at,updated_at) VALUES (${id},${t.name},${t.category||'marketing'},${t.language||'en'},${t.header_type||'none'},${t.header_text||null},${t.header_media_url||null},${t.body||''},${t.footer||null},${JSON.stringify(t.buttons||[])}::jsonb,${t.status||'draft'},${t.whatsapp_template_id||null},NOW(),NOW()) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,language=EXCLUDED.language,header_type=EXCLUDED.header_type,header_text=EXCLUDED.header_text,header_media_url=EXCLUDED.header_media_url,body=EXCLUDED.body,footer=EXCLUDED.footer,buttons=EXCLUDED.buttons,status=EXCLUDED.status,whatsapp_template_id=EXCLUDED.whatsapp_template_id,updated_at=NOW()`; return id; }
export async function deleteTemplate(id:string) { await init(); await sql`DELETE FROM templates WHERE id=${id}`; }

export async function getCampaigns(status?:string) { await init(); if(status){const{rows}=await sql`SELECT * FROM campaigns WHERE status=${status} ORDER BY created_at DESC LIMIT 100`;return rows;}const{rows}=await sql`SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 100`;return rows; }
export async function getCampaign(id:string) { await init(); const{rows}=await sql`SELECT * FROM campaigns WHERE id=${id} LIMIT 1`; return rows[0]||null; }
export async function saveCampaign(c:any) { await init(); const id=c.id||uuidv4(); await sql`INSERT INTO campaigns (id,name,template_id,message_body,category,media_url,footer,scheduled_at,status,recipient_count,created_at) VALUES (${id},${c.name},${c.template_id||null},${c.message_body||''},${c.category||'marketing'},${c.media_url||null},${c.footer||null},${c.scheduled_at||null},${c.status||'draft'},${c.recipient_count||0},NOW())`; return id; }
export async function updateCampaign(id:string,d:any) { await init(); const ks=Object.keys(d).filter(k=>k!=='id'); if(!ks.length)return; const sets=ks.map((k,i)=>`${k}=$${i+1}`).join(','); const vs=ks.map(k=>d[k]); vs.push(id); await sql.query(`UPDATE campaigns SET ${sets} WHERE id=$${vs.length}`,vs); }
export async function saveCampaignRecipient(r:any) { await init(); await sql`INSERT INTO campaign_recipients (id,campaign_id,contact_id,status) VALUES (${r.id},${r.campaign_id},${r.contact_id},${r.status||'pending'})`; }
export async function getCampaignRecipients(cid:string,st?:string) { await init(); if(st){const{rows}=await sql`SELECT * FROM campaign_recipients WHERE campaign_id=${cid} AND status=${st}`;return rows;}const{rows}=await sql`SELECT * FROM campaign_recipients WHERE campaign_id=${cid}`;return rows; }
export async function updateCampaignRecipient(id:string,d:any) { await init(); const ks=Object.keys(d).filter(k=>k!=='id'); if(!ks.length)return; const sets=ks.map((k,i)=>`${k}=$${i+1}`).join(','); const vs=ks.map(k=>d[k]); vs.push(id); await sql.query(`UPDATE campaign_recipients SET ${sets} WHERE id=$${vs.length}`,vs); }
export async function getCampaignRecipientByMessageId(mid:string) { await init(); const{rows}=await sql`SELECT * FROM campaign_recipients WHERE message_id=${mid} LIMIT 1`; return rows[0]||null; }

export async function getMessages(page=1,limit=50) { await init(); try { const {rows:cr}=await sql`SELECT COUNT(*) as t FROM messages`; const total=parseInt(cr[0]?.t||'0'); const off=(page-1)*limit; const {rows}=await sql`SELECT m.*, c.name as contact_name, c.phone_number FROM messages m LEFT JOIN contacts c ON m.contact_id=c.id ORDER BY m.created_at DESC LIMIT ${limit} OFFSET ${off}`; return {messages:rows,total,page,limit}; } catch { return {messages:[],total:0,page,limit}; } }
export async function saveMessage(m:any) { await init(); const id=m.id||m.whatsapp_message_id||uuidv4(); await sql`INSERT INTO messages (id,contact_id,campaign_id,direction,message_type,content,media_url,status,whatsapp_message_id,created_at) VALUES (${id},${m.contact_id||null},${m.campaign_id||null},${m.direction},${m.message_type||'text'},${m.content||''},${m.media_url||null},${m.status||'sent'},${m.whatsapp_message_id||null},${m.created_at?new Date(m.created_at).toISOString():'NOW()'}::timestamptz) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,content=EXCLUDED.content`; }

export async function getChatbotRules() { await init(); const{rows}=await sql`SELECT * FROM chatbot_rules ORDER BY priority DESC`; return rows; }
export async function saveChatbotRule(r:any) { await init(); const id=r.id||uuidv4(); await sql`INSERT INTO chatbot_rules (id,name,trigger_type,trigger_keywords,trigger_match,response_type,response_text,buttons,is_active,priority,created_at,updated_at) VALUES (${id},${r.name},${r.trigger_type||'keyword'},${JSON.stringify(r.trigger_keywords||[])}::jsonb,${r.trigger_match||'contains'},${r.response_type||'text'},${r.response_text||''},${JSON.stringify(r.buttons||[])}::jsonb,${r.is_active?true:false},${r.priority||0},NOW(),NOW()) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,trigger_type=EXCLUDED.trigger_type,trigger_keywords=EXCLUDED.trigger_keywords,trigger_match=EXCLUDED.trigger_match,response_text=EXCLUDED.response_text,buttons=EXCLUDED.buttons,is_active=EXCLUDED.is_active,priority=EXCLUDED.priority,updated_at=NOW()`; return id; }
export async function deleteChatbotRule(id:string) { await init(); await sql`DELETE FROM chatbot_rules WHERE id=${id}`; }

export async function getDashboardStats() {
  await init();
  const tc=parseInt(((await sql`SELECT COUNT(*) as c FROM contacts`).rows[0] as any)?.c||'0');
  const oi=parseInt(((await sql`SELECT COUNT(*) as c FROM contacts WHERE opted_in=true`).rows[0] as any)?.c||'0');
  const tca=parseInt(((await sql`SELECT COUNT(*) as c FROM campaigns`).rows[0] as any)?.c||'0');
  const ac=parseInt(((await sql`SELECT COUNT(*) as c FROM campaigns WHERE status='running'`).rows[0] as any)?.c||'0');
  const ms=parseInt(((await sql`SELECT COUNT(*) as c FROM messages WHERE direction='outgoing'`).rows[0] as any)?.c||'0');
  const mr=parseInt(((await sql`SELECT COUNT(*) as c FROM messages WHERE direction='incoming'`).rows[0] as any)?.c||'0');
  const del=parseInt(((await sql`SELECT COALESCE(SUM(delivered_count),0) as c FROM campaigns`).rows[0] as any)?.c||'0');
  const rd=parseInt(((await sql`SELECT COALESCE(SUM(read_count),0) as c FROM campaigns`).rows[0] as any)?.c||'0');
  const{rows:daily}=await sql`SELECT DATE(created_at) as date,SUM(CASE WHEN direction='outgoing' THEN 1 ELSE 0 END)::int as sent,SUM(CASE WHEN direction='incoming' THEN 1 ELSE 0 END)::int as received FROM messages WHERE created_at>=NOW()-INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date`;
  const{rows:recent}=await sql`SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 5`;
  return {stats:{totalContacts:tc,optedInContacts:oi,totalCampaigns:tca,activeCampaigns:ac,messagesSent:ms,messagesReceived:mr,delivered:del,read:rd,deliveryRate:ms>0?Math.round((del/ms)*100):0,readRate:del>0?Math.round((rd/del)*100):0},dailyStats:daily,recentCampaigns:recent};
}
