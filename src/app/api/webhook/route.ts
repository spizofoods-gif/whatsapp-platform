import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendTextMessage, markAsRead, logMessage } from '@/lib/whatsapp';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const db = getDb();
  const vt = (db.prepare("SELECT value FROM settings WHERE key='whatsapp_verify_token'").get() as any)?.value || 'whatsapp_verify_123';
  if (sp.get('hub.mode') === 'subscribe' && sp.get('hub.verify_token') === vt)
    return new NextResponse(sp.get('hub.challenge'), { status: 200 });
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  let body: any = {};
  try {
    body = await req.json();
    db.prepare('INSERT INTO webhook_logs (id,event_type,payload) VALUES (?,?,?)').run(uuidv4(), 'message', JSON.stringify(body));

    const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contact = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];

    if (msg) {
      const phone = contact?.wa_id || '';
      let contactId = uuidv4();
      const ex = db.prepare('SELECT id FROM contacts WHERE phone_number=?').get(phone) as any;
      if (ex) { contactId = ex.id; db.prepare("UPDATE contacts SET updated_at=datetime('now') WHERE id=?").run(contactId); }
      else db.prepare("INSERT INTO contacts (id,phone_number,name,source) VALUES (?,?,?,'whatsapp')").run(contactId, phone, contact?.profile?.name || '');

      const content = msg.text?.body || msg.image?.caption || msg.interactive?.button_reply?.title || '[Media]';
      logMessage({ contact_id: contactId, direction: 'incoming', message_type: msg.type, content, media_url: msg.image?.id ? `media:${msg.image.id}` : undefined, status: 'received', whatsapp_message_id: msg.id });
      await markAsRead(msg.id).catch(() => {});

      const auto = db.prepare("SELECT value FROM settings WHERE key='auto_reply_enabled'").get() as any;
      if (auto?.value === 'true') {
        const rules = db.prepare('SELECT * FROM chatbot_rules WHERE is_active=1 ORDER BY priority DESC').all() as any[];
        let matched = false;
        for (const rule of rules) {
          if (rule.trigger_type === 'keyword' && rule.trigger_keywords) {
            const kws = JSON.parse(rule.trigger_keywords);
            const m = rule.trigger_match === 'exact'
              ? kws.some((k: string) => content.toLowerCase() === k.toLowerCase())
              : kws.some((k: string) => content.toLowerCase().includes(k.toLowerCase()));
            if (m && rule.response_text) {
              await sendTextMessage(phone, rule.response_text).catch(() => {});
              matched = true; break;
            }
          }
        }
        if (!matched) {
          const fb = db.prepare("SELECT value FROM settings WHERE key='auto_reply_message'").get() as any;
          if (fb?.value) await sendTextMessage(phone, fb.value).catch(() => {});
        }
      }
    }

    const status = body.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];
    if (status) {
      const ns = status.status;
      db.prepare(`UPDATE campaign_recipients SET status=?, delivered_at=CASE WHEN ?='delivered' THEN datetime('now') ELSE delivered_at END, read_at=CASE WHEN ?='read' THEN datetime('now') ELSE read_at END WHERE message_id=?`).run(ns, ns, ns, status.id);
      const cr = db.prepare('SELECT campaign_id FROM campaign_recipients WHERE message_id=?').get(status.id) as any;
      if (cr) {
        if (ns === 'delivered') db.prepare('UPDATE campaigns SET delivered_count=delivered_count+1 WHERE id=?').run(cr.campaign_id);
        if (ns === 'read') db.prepare('UPDATE campaigns SET read_count=read_count+1 WHERE id=?').run(cr.campaign_id);
      }
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    db.prepare('INSERT INTO webhook_logs (id,event_type,payload,error) VALUES (?,?,?,?)').run(uuidv4(), 'error', JSON.stringify(body), err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
