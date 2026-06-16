import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
export async function GET() { return NextResponse.json(getDb().prepare('SELECT * FROM templates ORDER BY created_at DESC').all()); }
export async function POST(req: NextRequest) {
  const db = getDb(); const body = await req.json(); const id = body.id || uuidv4();
  db.prepare(`INSERT OR REPLACE INTO templates (id,name,category,language,header_type,header_text,body,footer,buttons,status,whatsapp_template_id,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`).run(id, body.name, body.category||'marketing', body.language||'en', body.header_type||'none', body.header_text||null, body.body, body.footer||null, JSON.stringify(body.buttons||[]), body.status||'draft', body.whatsapp_template_id||null);
  return NextResponse.json({ success: true, id });
}
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  getDb().prepare('DELETE FROM templates WHERE id=?').run(id);
  return NextResponse.json({ success: true });
}
