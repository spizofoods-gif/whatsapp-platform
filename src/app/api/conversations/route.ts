export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getContacts } from '@/lib/db';

export async function GET() {
  try {
    const { contacts } = await getContacts('', '', 1, 9999);
    const msgRes = await fetch('http://localhost:3000/api/messages?limit=9999').catch(() => null);
    const msgData = msgRes ? await msgRes.json().catch(() => ({ messages: [] })) : { messages: [] };
    const messages = msgData.messages || [];
    const convMap: Record<string,any> = {};
    for (const m of messages) {
      if (!m.contact_id) continue;
      if (!convMap[m.contact_id] || (m.created_at > (convMap[m.contact_id].last_message_time || ''))) {
        const contact = contacts.find((c:any) => c.id === m.contact_id);
        convMap[m.contact_id] = { contact_id: m.contact_id, name: m.contact_name || contact?.name || 'Unknown', phone_number: m.phone_number || contact?.phone_number || '', last_message: m.content, last_direction: m.direction, last_message_time: m.created_at };
      }
    }
    return NextResponse.json(Object.values(convMap).sort((a:any,b:any) => (b.last_message_time||'').localeCompare(a.last_message_time||'')));
  } catch { return NextResponse.json([]); }
}
