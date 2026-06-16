import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAllSettings, saveTemplate } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const BASE = 'https://graph.facebook.com/v19.0';

export async function GET() {
  try {
    const settings = await getAllSettings();
    const businessId = settings.whatsapp_business_id;
    const token = settings.whatsapp_access_token;
    const phoneId = settings.whatsapp_phone_number_id;

    if (!token || !phoneId) {
      return NextResponse.json({ error: 'WhatsApp API not configured' }, { status: 400 });
    }

    // Fetch templates from WhatsApp Business API
    const wabaId = businessId || phoneId;
    const url = `${BASE}/${wabaId}/message_templates`;
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 100, status: 'approved' },
    });

    const templates = response.data?.data || [];
    
    // Sync to local DB
    const synced: any[] = [];
    for (const tpl of templates) {
      const id = uuidv4();
      await saveTemplate({
        id,
        name: tpl.name,
        category: tpl.category || 'marketing',
        language: tpl.language || 'en',
        header_type: tpl.components?.find((c: any) => c.type === 'HEADER')?.format || 'none',
        header_text: tpl.components?.find((c: any) => c.type === 'HEADER')?.text || '',
        body: tpl.components?.find((c: any) => c.type === 'BODY')?.text || '',
        footer: tpl.components?.find((c: any) => c.type === 'FOOTER')?.text || '',
        buttons: tpl.components?.filter((c: any) => c.type === 'BUTTONS') || [],
        status: tpl.status || 'approved',
        whatsapp_template_id: tpl.name,
      });
      synced.push({ name: tpl.name, status: tpl.status });
    }

    return NextResponse.json({ success: true, synced: synced.length, templates: synced });
  } catch (err: any) {
    console.error('Template sync error:', err.response?.data || err.message);
    return NextResponse.json({ 
      error: err.response?.data?.error?.message || err.message,
      detail: 'Make sure your WhatsApp Business Account has approved templates'
    }, { status: 500 });
  }
}
