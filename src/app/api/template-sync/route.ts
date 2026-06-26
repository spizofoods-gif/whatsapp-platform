export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import axios from 'axios';
import { getAllSettings, saveTemplate } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const BASE = 'https://graph.facebook.com/v19.0';

export async function GET() {
  try {
    const settings = await getAllSettings();
    const token = settings.whatsapp_access_token;
    const wabaId = settings.whatsapp_business_id || settings.whatsapp_phone_number_id;
    if (!token) return NextResponse.json({ error: 'Token not configured' }, { status: 400 });
    if (!wabaId) return NextResponse.json({ error: 'Business ID not configured' }, { status: 400 });

    let allTemplates: any[] = [];
    let url = `${BASE}/${wabaId}/message_templates?limit=50`;
    
    // Fetch all pages
    while (url) {
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = response.data;
      allTemplates = allTemplates.concat(data.data || []);
      url = data.paging?.next || null;
    }

    const synced = [];
    for (const tpl of allTemplates) {
      try {
        // Extract components properly
        const header = tpl.components?.find((c: any) => c.type === 'HEADER');
        const body = tpl.components?.find((c: any) => c.type === 'BODY');
        const footer = tpl.components?.find((c: any) => c.type === 'FOOTER');
        const buttonsComp = tpl.components?.find((c: any) => c.type === 'BUTTONS');
        
        // Extract buttons CORRECTLY - flatten nested structure
        let buttons: any[] = [];
        if (buttonsComp?.buttons) {
          buttons = buttonsComp.buttons.map((b: any) => ({
            type: b.type || 'QUICK_REPLY',
            text: b.text || '',
            ...(b.url ? { url: b.url } : {}),
            ...(b.phone_number ? { phone_number: b.phone_number } : {}),
            ...(b.example ? { example: b.example } : {}),
          }));
        }

        // Extract header media URL for IMAGE/VIDEO/DOCUMENT headers
        let headerMediaUrl = null;
        if (header && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header.format)) {
          headerMediaUrl = header.example?.header_handle?.[0] || null;
        }

        const templateData = {
          name: tpl.name,
          category: tpl.category?.toLowerCase() || 'marketing',
          language: tpl.language || 'en',
          status: tpl.status || 'PENDING',
          whatsapp_template_id: tpl.name,
          header_type: header?.format?.toLowerCase() || 'none',
          header_text: header?.format === 'TEXT' ? (header.text || '') : '',
          header_media_url: headerMediaUrl,
          body: body?.text || '',
          footer: footer?.text || '',
          buttons: buttons,
        };

        await saveTemplate({ id: uuidv4(), ...templateData });
        synced.push({ name: tpl.name, cat: tpl.category, status: tpl.status, header: header?.format || 'none', buttons: buttons.length });
      } catch (e) { console.error('Sync error:', tpl.name, e); }
    }

    return NextResponse.json({ success: true, synced: synced.length, templates: synced });
  } catch (err: any) {
    const d = err.response?.data?.error;
    return NextResponse.json({ error: d?.message || err.message }, { status: 500 });
  }
}
