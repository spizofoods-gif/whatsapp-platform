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

    if (!token) return NextResponse.json({ error: 'Access token not configured. Go to Settings.' }, { status: 400 });
    if (!wabaId) return NextResponse.json({ error: 'Business Account ID not configured.' }, { status: 400 });

    // Fetch ALL templates from Meta
    const url = `${BASE}/${wabaId}/message_templates?limit=100`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const rawTemplates = response.data?.data || [];
    const synced: any[] = [];

    for (const tpl of rawTemplates) {
      try {
        const components = tpl.components || [];
        const header = components.find((c: any) => c.type === 'HEADER');
        const body = components.find((c: any) => c.type === 'BODY');
        const footer = components.find((c: any) => c.type === 'FOOTER');
        const buttonsComp = components.find((c: any) => c.type === 'BUTTONS');

        // Extract buttons as flat array
        let buttons: any[] = [];
        if (buttonsComp?.buttons) {
          buttons = buttonsComp.buttons.map((b: any) => ({
            type: b.type || 'QUICK_REPLY',
            text: b.text || '',
            url: b.url || null,
            phone_number: b.phone_number || null,
          }));
        }

        // Extract header media URL for IMAGE/VIDEO/DOCUMENT headers
        let headerText = '';
        let headerMediaUrl = null;
        if (header) {
          if (header.format === 'TEXT') {
            headerText = header.text || '';
          } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header.format || '')) {
            headerMediaUrl = header.example?.header_handle?.[0] || null;
          }
        }

        await saveTemplate({
          id: uuidv4(),
          name: tpl.name,
          category: (tpl.category || 'marketing').toLowerCase(),
          language: tpl.language || 'en',
          status: tpl.status || 'PENDING',
          whatsapp_template_id: tpl.name,
          header_type: (header?.format || 'none').toLowerCase(),
          header_text: headerText,
          header_media_url: headerMediaUrl,
          body: body?.text || '',
          footer: footer?.text || '',
          buttons: buttons,
        });

        synced.push({
          name: tpl.name,
          category: tpl.category,
          status: tpl.status,
          header: header?.format || 'none',
          buttons: buttons.length,
        });
      } catch (e) {
        console.error('Sync error for template:', tpl.name, e);
      }
    }

    return NextResponse.json({
      success: true,
      synced: synced.length,
      templates: synced,
    });
  } catch (err: any) {
    const detail = err.response?.data?.error;
    console.error('Template sync failed:', detail || err.message);
    return NextResponse.json({
      error: detail?.message || err.message || 'Sync failed',
      detail: 'Check your access token in Settings'
    }, { status: 500 });
  }
}
