export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import axios from 'axios';
import { getAllSettings, saveTemplate } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const settings = await getAllSettings();
    const token = settings.whatsapp_access_token;

    // Critical fix: Use WABA ID first (templates live under the business account, not phone number)
    // If WABA ID is not set, try phone number ID as fallback
    let accountId = settings.whatsapp_business_id;
    if (!accountId) {
      accountId = settings.whatsapp_phone_number_id;
    }

    if (!token || !accountId) {
      return NextResponse.json({
        error: 'Missing configuration. Go to Settings → WhatsApp API and paste your credentials.'
      }, { status: 400 });
    }

    console.log('Syncing templates for account:', accountId);

    // Fetch templates from Meta
    const url = `https://graph.facebook.com/v19.0/${accountId}/message_templates?limit=100`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const rawTemplates = response.data?.data || [];
    console.log(`Meta returned ${rawTemplates.length} templates`);

    if (rawTemplates.length === 0) {
      // Try the other account ID as fallback
      const fallbackId = accountId === settings.whatsapp_business_id
        ? settings.whatsapp_phone_number_id
        : settings.whatsapp_business_id;

      if (fallbackId && fallbackId !== accountId) {
        console.log('Trying fallback account:', fallbackId);
        const fallbackUrl = `https://graph.facebook.com/v19.0/${fallbackId}/message_templates?limit=100`;
        const fbResponse = await axios.get(fallbackUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fbTemplates = fbResponse.data?.data || [];
        console.log(`Fallback returned ${fbTemplates.length} templates`);
        
        if (fbTemplates.length > 0) {
          // Process fallback templates
          const synced: any[] = [];
          for (const tpl of fbTemplates) {
            try {
              await saveTemplate(parseTemplate(tpl));
              synced.push({ name: tpl.name, status: tpl.status });
            } catch (e) { console.error('Save error:', e); }
          }
          return NextResponse.json({ success: true, synced: synced.length, templates: synced, account: fallbackId });
        }
      }
      return NextResponse.json({ error: 'No templates found on this account. Create templates in Meta Business Manager first.', account: accountId });
    }

    const synced: any[] = [];
    for (const tpl of rawTemplates) {
      try {
        await saveTemplate(parseTemplate(tpl));
        synced.push({ name: tpl.name, status: tpl.status });
      } catch (e) {
        console.error('Save error for', tpl.name, ':', e);
      }
    }

    return NextResponse.json({
      success: true,
      synced: synced.length,
      templates: synced,
      account: accountId,
    });
  } catch (err: any) {
    const detail = err.response?.data?.error;
    console.error('Template sync error:', JSON.stringify(detail || err.message));
    
    if (detail?.code === 190) {
      return NextResponse.json({ error: 'Access token expired. Generate a new one in Meta Developer App.' }, { status: 401 });
    }
    if (detail?.message?.includes('permission')) {
      return NextResponse.json({ error: detail.message }, { status: 403 });
    }

    return NextResponse.json({
      error: detail?.message || err.message || 'Sync failed',
    }, { status: 500 });
  }
}

function parseTemplate(tpl: any) {
  const components = tpl.components || [];
  const header = components.find((c: any) => c.type === 'HEADER');
  const body = components.find((c: any) => c.type === 'BODY');
  const footer = components.find((c: any) => c.type === 'FOOTER');
  const buttonsComp = components.find((c: any) => c.type === 'BUTTONS');

  // Parse buttons into flat array
  let buttons: any[] = [];
  if (buttonsComp?.buttons) {
    buttons = buttonsComp.buttons.map((b: any) => ({
      type: b.type || 'QUICK_REPLY',
      text: b.text || '',
      url: b.url || null,
      phone_number: b.phone_number || null,
    }));
  }

  // Parse header
  let headerType = 'none';
  let headerText = '';
  let headerMediaUrl = null;

  if (header) {
    headerType = (header.format || 'none').toLowerCase();
    if (header.format === 'TEXT') {
      headerText = header.text || '';
    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header.format || '')) {
      headerMediaUrl = header.example?.header_handle?.[0] || null;
    }
  }

  return {
    id: uuidv4(),
    name: tpl.name,
    category: (tpl.category || 'marketing').toLowerCase(),
    language: tpl.language || 'en',
    status: tpl.status || 'PENDING',
    whatsapp_template_id: tpl.name,
    header_type: headerType,
    header_text: headerText,
    header_media_url: headerMediaUrl,
    body: body?.text || '',
    footer: footer?.text || '',
    buttons: buttons,
  };
}
