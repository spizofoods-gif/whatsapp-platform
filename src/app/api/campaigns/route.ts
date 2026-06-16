import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, saveCampaign, updateCampaign, getCampaign, getContacts, saveCampaignRecipient, getCampaignRecipients, updateCampaignRecipient, saveMessage } from '@/lib/db';
import { sendTextMessage, sendTemplateMessage } from '@/lib/whatsapp';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const st = new URL(req.url).searchParams.get('status') || '';
  return NextResponse.json(getCampaigns(st || undefined));
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = uuidv4();
  let ids: string[] = [];
  if (body.recipient_all) {
    const { contacts } = getContacts('', '', 1, 99999);
    ids = contacts.filter((c: any) => c.opted_in).map((c: any) => c.id);
  } else if (body.recipient_tags?.length) {
    const { contacts } = getContacts('', '', 1, 99999);
    ids = contacts.filter((c: any) => c.opted_in && body.recipient_tags.some((t: string) => (c.tags || []).includes(t))).map((c: any) => c.id);
  } else if (body.recipient_ids) {
    ids = body.recipient_ids;
  }
  saveCampaign({ id, name: body.name, template_id: body.template_id || null, message_body: body.message_body || '', status: 'draft', recipient_count: ids.length, sent_count: 0, delivered_count: 0, read_count: 0, failed_count: 0 });
  for (const cid of ids) saveCampaignRecipient({ id: uuidv4(), campaign_id: id, contact_id: cid, status: 'pending' });
  return NextResponse.json({ success: true, id, recipient_count: ids.length });
}
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, action } = body;
  if (action === 'start') {
    const camp = getCampaign(id) as any;
    if (!camp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    updateCampaign(id, { status: 'running', started_at: new Date().toISOString() });
    const recips = getCampaignRecipients(id, 'pending');
    const { contacts } = getContacts('', '', 1, 99999);
    const sends = recips.map(async (r: any) => {
      try {
        const contact = contacts.find((c: any) => c.id === r.contact_id);
        if (!contact) return;
        let result;
        if (camp.template_id) {
          const { getTemplates } = require('@/lib/db');
          const tmpl = getTemplates().find((t: any) => t.id === camp.template_id);
          if (tmpl?.whatsapp_template_id) result = await sendTemplateMessage(contact.phone_number, tmpl.whatsapp_template_id, tmpl.language);
        } else result = await sendTextMessage(contact.phone_number, camp.message_body || '', true);
        if (result?.messages?.[0]?.id) {
          updateCampaignRecipient(r.id, { status: 'sent', message_id: result.messages[0].id, sent_at: new Date().toISOString() });
          updateCampaign(id, { sent_count: (camp.sent_count || 0) + 1 });
          saveMessage({ contact_id: r.contact_id, campaign_id: id, direction: 'outgoing', content: camp.message_body || 'template', whatsapp_message_id: result.messages[0].id, status: 'sent', message_type: 'text' });
        }
      } catch (err: any) {
        updateCampaignRecipient(r.id, { status: 'failed', error: err.message });
      }
    });
    await Promise.all(sends);
    updateCampaign(id, { status: 'completed', completed_at: new Date().toISOString() });
    return NextResponse.json({ success: true, sent: recips.length });
  }
  if (action === 'cancel') { updateCampaign(id, { status: 'cancelled' }); return NextResponse.json({ success: true }); }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
