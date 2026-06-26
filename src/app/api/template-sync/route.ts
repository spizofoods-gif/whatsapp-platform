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

    const response = await axios.get(`${BASE}/${wabaId}/message_templates`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 50 },
    });

    const templates = (response.data?.data || []).map((t: any) => ({
      name: t.name,
      category: t.category,
      language: t.language,
      status: t.status,
      whatsapp_template_id: t.name,
      body: t.components?.find((c: any) => c.type === 'BODY')?.text || '',
      footer: t.components?.find((c: any) => c.type === 'FOOTER')?.text || '',
      header_type: t.components?.find((c: any) => c.type === 'HEADER')?.format || 'none',
      header_text: t.components?.find((c: any) => c.type === 'HEADER')?.text || '',
      buttons: t.components?.filter((c: any) => c.type === 'BUTTONS').flatMap((c: any) => c.buttons || []) || [],
    }));

    for (const tpl of templates) {
      await saveTemplate({ id: uuidv4(), ...tpl });
    }

    return NextResponse.json({ success: true, synced: templates.length, templates });
  } catch (err: any) {
    const d = err.response?.data?.error;
    return NextResponse.json({ error: d?.message || err.message }, { status: 500 });
  }
}
