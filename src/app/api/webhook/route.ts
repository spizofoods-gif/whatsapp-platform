export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, findOrCreateContact, saveMessage, getChatbotRules, getCampaignRecipientByMessageId, updateCampaignRecipient, updateCampaign, getCampaign } from '@/lib/db';
import { sendTextMessage, markAsRead } from '@/lib/whatsapp';
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams; const settings = await getAllSettings();
  const vt = settings['whatsapp_verify_token'] || 'whatsapp_verify_123';
  if (sp.get('hub.mode') === 'subscribe' && sp.get('hub.verify_token') === vt) return new NextResponse(sp.get('hub.challenge'), { status: 200 });
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
    const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contact = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
    if (msg) {
      const phone = contact?.wa_id || '';
      const contactObj = await findOrCreateContact(phone, contact?.profile?.name);
      const content = msg.text?.body || msg.image?.caption || msg.interactive?.button_reply?.title || '[Media]';
      await saveMessage({ contact_id: contactObj.id, direction: 'incoming', message_type: msg.type, content, media_url: msg.image?.id ? `media:${msg.image.id}` : undefined, status: 'received', whatsapp_message_id: msg.id });
      await markAsRead(msg.id).catch(() => {});
      const settings = await getAllSettings();
      if (settings['auto_reply_enabled'] === 'true') {
        const rules = await getChatbotRules(); const activeRules = rules.filter((r: any) => r.is_active); let matched = false;
        for (const rule of activeRules) { if (rule.trigger_type === 'keyword' && rule.trigger_keywords) { const kws = typeof rule.trigger_keywords === 'string' ? JSON.parse(rule.trigger_keywords) : rule.trigger_keywords; const m = rule.trigger_match === 'exact' ? kws.some((k: string) => content.toLowerCase() === k.toLowerCase()) : kws.some((k: string) => content.toLowerCase().includes(k.toLowerCase())); if (m && rule.response_text) { await sendTextMessage(phone, rule.response_text).catch(() => {}); matched = true; break; } } }
        if (!matched && settings['auto_reply_message']) await sendTextMessage(phone, settings['auto_reply_message']).catch(() => {});
      }
    }
    const status = body.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];
    if (status) { const ns = status.status; const cr = await getCampaignRecipientByMessageId(status.id); if (cr) { await updateCampaignRecipient(cr.id, { status: ns, delivered_at: ns === 'delivered' ? new Date().toISOString() : cr.delivered_at, read_at: ns === 'read' ? new Date().toISOString() : cr.read_at }); const camp = await getCampaign(cr.campaign_id) as any; if (camp) { if (ns === 'delivered') await updateCampaign(cr.campaign_id, { delivered_count: (camp.delivered_count || 0) + 1 }); if (ns === 'read') await updateCampaign(cr.campaign_id, { read_count: (camp.read_count || 0) + 1 }); } } }
    return NextResponse.json({ success: true });
  } catch (err: any) { console.error('Webhook error:', err); return NextResponse.json({ error: err.message }, { status: 500 }); }
}
