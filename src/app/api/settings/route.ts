import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
export async function GET() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as any[];
  const out: any = {};
  for (const r of rows) out[r.key] = r.value;
  return NextResponse.json(out);
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))");
  db.transaction(() => { for (const [k, v] of Object.entries(body)) upsert.run(k, String(v)); })();
  return NextResponse.json({ success: true });
}
