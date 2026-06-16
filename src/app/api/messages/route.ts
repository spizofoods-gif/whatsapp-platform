import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
export async function GET(req: NextRequest) {
  const db = getDb(); const u = new URL(req.url);
  const page = parseInt(u.searchParams.get('page')||'1'), limit = parseInt(u.searchParams.get('limit')||'50');
  const off = (page-1)*limit;
  let q = 'SELECT m.*, c.name as contact_name, c.phone_number FROM messages m LEFT JOIN contacts c ON m.contact_id=c.id WHERE 1=1';
  const cq = q.replace('SELECT m.*, c.name as contact_name, c.phone_number','SELECT COUNT(*) as total');
  q += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
  const messages = db.prepare(q).all(limit, off);
  const {total} = db.prepare(cq).get() as any;
  return NextResponse.json({ messages, total, page, limit });
}
