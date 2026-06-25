import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAllSettings, saveTemplate } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const BASE = 'https://graph.facebook.com/v19.0';

export async function GET() {
  try {
    const settings = await getAllSettings();
    const token = settings.whatsapp_access_token;
    const wabaId = settings.whatsapp_business_id;
    const phoneId = settings.whatsapp_phone_number_id;

    if (!token) {
      return NextResponse.json({ error: 'Access Token not configured. Paste it in Settings.' }, { status: 400 });
    }
    if (!wabaId && !phoneId) {
      return NextResponse.json({ error: 'Phone Number ID or Business ID not configured.' }, { status: 400 });
    }

    const accountId = wabaId || phoneId;
    
    console.log('Fetching templates for account:', accountId);
    
    // Fetch ALL templates (not just approved) from WhatsApp Business Account
    const response = await axios.get(`${BASE}/${accountId}/message_templates`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { 
        limit: 50,
        // No status filter - get all templates
      },
    });

    const templates = response.data?.data || [];
    
    if (templates.length === 0) {
      return NextResponse.json({ 
        synced: 0, 
        templates: [],
        message: 'No templates found in your WhatsApp account. Create templates in Meta Business Manager first.' 
      });
    }

    let syncedCount = 0;
    const syncedTemplates: any[] = [];

    for (const tpl of templates) {
      try {
        // Extract components
        const header = tpl.components?.find((c: any) => c.type === 'HEADER');
        const body = tpl.components?.find((c: any) => c.type === 'BODY');
        const footer = tpl.components?.find((c: any) => c.type === 'FOOTER');
        const buttonComponents = tpl.components?.filter((c: any) => c.type === 'BUTTONS') || [];
        
        // Extract buttons from BUTTONS component
        let allButtons: any[] = [];
        for (const bc of buttonComponents) {
          if (bc.buttons) {
            allButtons = allButtons.concat(bc.buttons.map((b: any) => ({
              type: b.type || 'quick_reply',
              text: b.text || '',
              ...(b.url ? { url: b.url } : {}),
              ...(b.phone_number ? { phone_number: b.phone_number } : {}),
            })));
          }
        }

        const id = uuidv4();
        await saveTemplate({
          id,
          name: tpl.name,
          category: tpl.category || 'marketing',
          language: tpl.language || 'en',
          header_type: header ? (header.format || 'text') : 'none',
          header_text: header?.text || '',
          body: body?.text || tpl.name,
          footer: footer?.text || '',
          buttons: allButtons,
          status: tpl.status || 'draft',
          whatsapp_template_id: tpl.name,
        });

        syncedCount++;
        syncedTemplates.push({
          name: tpl.name,
          category: tpl.category,
          language: tpl.language,
          status: tpl.status,
          buttons: allButtons.length,
        });
      } catch (e: any) {
        console.error('Failed to sync template:', tpl.name, e.message);
      }
    }

    return NextResponse.json({ 
      success: true, 
      synced: syncedCount, 
      templates: syncedTemplates,
      total: templates.length,
    });

  } catch (err: any) {
    const errorDetail = err.response?.data?.error;
    console.error('Template sync error:', JSON.stringify(errorDetail || err.message));
    
    // Handle specific errors
    if (errorDetail?.code === 190) {
      return NextResponse.json({ error: 'Access token expired or invalid. Generate a new one in Meta Developer App.' }, { status: 401 });
    }
    if (errorDetail?.code === 100) {
      return NextResponse.json({ error: 'Invalid WhatsApp Business Account ID. Check your Settings.' }, { status: 400 });
    }
    if (errorDetail?.error_subcode === 33) {
      return NextResponse.json({ error: 'Your WhatsApp Business Account does not support templates yet. Complete business verification in Meta.' }, { status: 400 });
    }

    return NextResponse.json({ 
      error: errorDetail?.message || err.message || 'Failed to sync templates',
      detail: 'Make sure you have approved templates in Meta Business Manager → WhatsApp → Message Templates'
    }, { status: 500 });
  }
}
