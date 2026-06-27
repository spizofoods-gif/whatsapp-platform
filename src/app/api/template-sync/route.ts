export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import axios from 'axios';
import { getAllSettings } from '@/lib/db';

export async function GET() {
  try {
    const settings = await getAllSettings();
    const token = settings.whatsapp_access_token;
    const accountId = settings.whatsapp_business_id || settings.whatsapp_phone_number_id;
    if (!token || !accountId) {
      return NextResponse.json({ error: 'Missing credentials in Settings' }, { status: 400 });
    }

    const metaUrl = `https://graph.facebook.com/v19.0/${accountId}/message_templates?limit=100`;
    const response = await axios.get(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
    const templates = response.data?.data || [];

    if (templates.length === 0) {
      const altId = settings.whatsapp_phone_number_id;
      if (altId && altId !== accountId) {
        const r2 = await axios.get(
          `https://graph.facebook.com/v19.0/${altId}/message_templates?limit=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const t2 = r2.data?.data || [];
        return NextResponse.json({
          templates: t2.map((t: any) => formatTemplate(t)),
          synced: t2.length,
          account: altId,
        });
      }
      return NextResponse.json({ templates: [], synced: 0, account: accountId });
    }

    return NextResponse.json({
      templates: templates.map((t: any) => formatTemplate(t)),
      synced: templates.length,
      account: accountId,
    });
  } catch (err: any) {
    console.error('Sync error:', err.response?.data || err.message);
    return NextResponse.json({ error: err.response?.data?.error?.message || err.message }, { status: 500 });
  }
}

function formatTemplate(tpl: any) {
  const c = tpl.components || [];
  const h = c.find((x: any) => x.type === 'HEADER');
  const bd = c.find((x: any) => x.type === 'BODY');
  const ft = c.find((x: any) => x.type === 'FOOTER');
  const bc = c.find((x: any) => x.type === 'BUTTONS');

  let buttons: any[] = [];
  if (bc?.buttons) {
    buttons = bc.buttons.map((b: any) => ({
      type: b.type || 'QUICK_REPLY',
      text: b.text || '',
      url: b.url || null,
    }));
  }

  let hType = 'none', hText = '', hMedia = null;
  if (h) {
    hType = (h.format || 'none').toLowerCase();
    if (h.format === 'TEXT') hText = h.text || '';
    else if (h.format) hMedia = h.example?.header_handle?.[0] || null;
  }

  return {
    id: tpl.id || tpl.name,
    name: tpl.name,
    category: (tpl.category || 'marketing').toLowerCase(),
    language: tpl.language || 'en',
    status: tpl.status || 'PENDING',
    whatsapp_template_id: tpl.name,
    header_type: hType,
    header_text: hText,
    header_media_url: hMedia,
    body: bd?.text || '',
    footer: ft?.text || '',
    buttons: buttons,
  };
}
