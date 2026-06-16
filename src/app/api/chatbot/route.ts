import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
export async function GET() { return NextResponse.json(getDb().prepare('SELECT * FROM chatbot_rules ORDER BY priority DESC').all()); }
export async function POST(req: NextRequest) {
  const db = getDb(); const body = await req.json(); const id = body.id || uuidv4();
  db.prepare(`INSERT OR REPLACE INTO chatbot_rules (id,name,trigger_type,trigger_keywords,trigger_match,response_type,response_text,is_active,priority,updated_at) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`).run(id, body.name, body.trigger_type||'keyword', JSON.stringify(body.trigger_keywords||[]), body.trigger_match||'contains', body.response_type||'text', body.response_text||'', body.is_active?1:0, body.priority||0);
  return NextResponse.json({ success: true, id });
}
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  getDb().prepare('DELETE FROM chatbot_rules WHERE id=?').run(id);
  return NextResponse.json({ success: true });
}
