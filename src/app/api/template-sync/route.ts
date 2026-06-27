export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import axios from 'axios';
import { getAllSettings } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const settings = await getAllSettings();
    const token = settings.whatsapp_access_token;
    let accountId = settings.whatsapp_business_id || settings.whatsapp_phone_number_id;

    if (!token || !accountId) {
      return NextResponse.json({ error: 'Missing WhatsApp credentials in Settings' }, { status: 400 });
    }

    // Fetch templates from Meta
    let url = `https://graph.facebook.com/v19.0/${accountId}/message_templates?limit=100`;
    let response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    let templates = response.data?.data || [];

    // If no templates on WABA ID, try phone number ID
    if (templates.length === 0 && accountId === settings.whatsapp_business_id && settings.whatsapp_phone_number_id) {
      accountId = settings.whatsapp_phone_number_id;
      url = `https://graph.facebook.com/v19.0/${accountId}/message_templates?limit=100`;
      response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      templates = response.data?.data || [];
    }

    if (templates.length === 0) {
      return NextResponse.json({ error: 'No templates found on your Meta account', account: accountId });
    }

    // Save directly to Postgres (bypass broken saveTemplate)
    const synced: any[] = [];
    for (const tpl of templates) {
      try {
        const components = tpl.components || [];
        const header = components.find((c: any) => c.type === 'HEADER');
        const body = components.find((c: any) => c.type === 'BODY');
        const footer = components.find((c: any) => c.type === 'FOOTER');
        const buttonsComp = components.find((c: any) => c.type === 'BUTTONS');

        let buttons: any[] = [];
        if (buttonsComp?.buttons) {
          buttons = buttonsComp.buttons.map((b: any) => ({
            type: b.type || 'QUICK_REPLY',
            text: b.text || '',
            url: b.url || null,
            phone_number: b.phone_number || null,
          }));
        }

        let headerType = 'none';
        let headerText = '';
        let headerMediaUrl = null;
        if (header) {
          headerType = (header.format || 'none').toLowerCase();
          if (header.format === 'TEXT') headerText = header.text || '';
          else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header.format || ''))
            headerMediaUrl = header.example?.header_handle?.[0] || null;
        }

        const id = uuidv4();
        await sql`
          INSERT INTO templates (id, name, category, language, header_type, header_text, header_media_url, body, footer, buttons, status, whatsapp_template_id, created_at, updated_at)
          VALUES (${id}, ${tpl.name}, ${(tpl.category || 'marketing').toLowerCase()}, ${tpl.language || 'en'},
            ${headerType}, ${headerText || null}, ${headerMediaUrl}, ${body?.text || ''},
            ${footer?.text || null}, ${JSON.stringify(buttons)}::jsonb, ${tpl.status || 'PENDING'},
            ${tpl.name}, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            name=EXCLUDED.name, category=EXCLUDED.category, language=EXCLUDED.language,
            header_type=EXCLUDED.header_type, header_text=EXCLUDED.header_text,
            header_media_url=EXCLUDED.header_media_url, body=EXCLUDED.body,
            footer=EXCLUDED.footer, buttons=EXCLUDED.buttons, status=EXCLUDED.status,
            whatsapp_template_id=EXCLUDED.whatsapp_template_id, updated_at=NOW()
        `;
        synced.push({ name: tpl.name, status: tpl.status, header: headerType, buttons: buttons.length });
      } catch (e: any) {
        console.error('Save error for', tpl.name, ':', e.message);
        // Fallback: simpler insert with static body
        try {
          const id2 = uuidv4();
          const bodyFallback = (tpl.components || []).find((c: any) => c.type === 'BODY');
          const bodyText2 = bodyFallback?.text || '';
          await sql`DELETE FROM templates WHERE whatsapp_template_id = ${tpl.name}`;
          await sql`INSERT INTO templates (id, name, category, language, header_type, body, status, whatsapp_template_id, created_at, updated_at) VALUES (${id2}, ${tpl.name}, ${(tpl.category || 'marketing').toLowerCase()}, ${tpl.language || 'en'}, 'none', ${bodyText2}, ${tpl.status || 'PENDING'}, ${tpl.name}, NOW(), NOW())`;
          synced.push({ name: tpl.name, status: tpl.status, header: 'none', buttons: 0 });
        } catch (e2: any) {
          console.error('Fallback failed:', e2.message);
        }
      }
    }

    return NextResponse.json({ success: true, synced: synced.length, templates: synced, account: accountId });
  } catch (err: any) {
    return NextResponse.json({ error: err.response?.data?.error?.message || err.message }, { status: 500 });
  }
}
