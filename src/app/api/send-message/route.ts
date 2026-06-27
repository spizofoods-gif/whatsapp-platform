export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { sendTextMessage } from '@/lib/whatsapp';
import { saveMessage } from '@/lib/db';
export async function POST(req: NextRequest) {
  try {
    const { phone_number, message, contact_id } = await req.json();
    if (!phone_number || !message) return NextResponse.json({ error: 'Phone and message required' }, { status: 400 });
    const result = await sendTextMessage(phone_number, message);
    if (result?.messages?.[0]?.id) await saveMessage({ contact_id: contact_id || null, direction: 'outgoing', content: message, whatsapp_message_id: result.messages[0].id, status: 'sent', message_type: 'text' });
    return NextResponse.json({ success: true, message_id: result?.messages?.[0]?.id });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
