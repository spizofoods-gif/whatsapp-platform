import { NextRequest, NextResponse } from 'next/server';
import { sendTextMessage } from '@/lib/whatsapp';
import { saveMessage, findOrCreateContact } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { message, sender } = await req.json();
    const phone = '919876543210';
    const contact = await findOrCreateContact(phone, sender || 'Website Visitor');
    const result = await sendTextMessage(phone, `📱 Website: ${message}\nFrom: ${sender || 'Anonymous'}`);
    if (result?.messages?.[0]?.id) {
      await saveMessage({
        contact_id: contact.id, direction: 'outgoing', content: message,
        whatsapp_message_id: result.messages[0].id, status: 'sent', message_type: 'text',
      });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
