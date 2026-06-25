import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAllSettings } from '@/lib/db';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = await getAllSettings();
    const token = settings.whatsapp_access_token;
    const wabaId = settings.whatsapp_business_id || settings.whatsapp_phone_number_id;
    if (!token) return NextResponse.json({ error: 'Access token not configured' }, { status: 400 });
    if (!wabaId) return NextResponse.json({ error: 'Business Account / Phone Number ID missing' }, { status: 400 });

    // Validate body length
    if (!body.body) return NextResponse.json({ error: 'Message body is required.' }, { status: 400 });
    if (body.category === 'MARKETING' && body.body.length > 550)
      return NextResponse.json({ error: `Marketing template max 550 chars. Yours: ${body.body.length}`, tip: 'Use UTILITY category for up to 1024 chars' }, { status: 400 });
    if (body.body.length > 1024)
      return NextResponse.json({ error: `Body max 1024 chars. Yours: ${body.body.length}` }, { status: 400 });

    const name = (body.name || 'tpl_' + Date.now()).toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 60);
    const components: any[] = [];

    if (body.header_type && body.header_type !== 'NONE') {
      const h: any = { type: 'HEADER', format: body.header_type };
      if (body.header_type === 'TEXT') h.text = (body.header_text || '').substring(0, 60);
      else if (body.header_media_url) h.example = { header_handle: [body.header_media_url] };
      components.push(h);
    }

    components.push({ type: 'BODY', text: body.body });
    if (body.footer) components.push({ type: 'FOOTER', text: body.footer.substring(0, 60) });
    if (body.buttons?.length) {
      components.push({ type: 'BUTTONS', buttons: body.buttons.slice(0, 10).map((b: any) => ({
        type: b.type === 'URL' ? 'URL' : 'QUICK_REPLY', text: b.text?.substring(0, 25) || 'Click',
        ...(b.type === 'URL' && b.url ? { url: b.url } : {}),
      }))});
    }

    const res = await axios.post(`https://graph.facebook.com/v19.0/${wabaId}/message_templates`, {
      name, category: body.category || 'MARKETING', language: body.language || 'en', components
    }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });

    return NextResponse.json({ success: true, name, id: res.data.id, status: res.data.status || 'PENDING',
      message: 'Template submitted to Meta. Approval: 1 min - 24 hrs.' });
  } catch (err: any) {
    const d = err.response?.data?.error;
    return NextResponse.json({ error: d?.message || err.message }, { status: d?.code === 100 ? 400 : 500 });
  }
}
