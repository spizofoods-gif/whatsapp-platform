import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
export async function GET(req: NextRequest) {
  const db = getDb(); const u = new URL(req.url);
  const s = u.searchParams.get('search')||'', tag = u.searchParams.get('tag')||'';
  const page = parseInt(u.searchParams.get('page')||'1'), limit = parseInt(u.searchParams.get('limit')||'50');
  const off = (page-1)*limit;
  let q = 'SELECT * FROM contacts WHERE 1=1'; const p: any[] = [];
  if(s){ q+=' AND (name LIKE ? OR phone_number LIKE ? OR email LIKE ?)'; p.push(`%${s}%`,`%${s}%`,`%${s}%`); }
  if(tag){ q+=' AND tags LIKE ?'; p.push(`%"${tag}"%`); }
  const cq = q.replace('SELECT *','SELECT COUNT(*) as total');
  q+=' ORDER BY created_at DESC LIMIT ? OFFSET ?'; p.push(limit,off);
  const contacts = db.prepare(q).all(...p);
  const {total} = db.prepare(cq).all(...p.slice(0,-2))[0] as any;
  return NextResponse.json({contacts,total,page,limit});
}
export async function POST(req: NextRequest) {
  const db = getDb(); const body = await req.json();
  if(body.bulk){
    const ins = db.prepare(`INSERT OR REPLACE INTO contacts (id,phone_number,name,email,tags,attributes,opted_in,source,updated_at) VALUES (?,?,?,?,?,?,?,?,datetime('now'))`);
    db.transaction(() => { for(const c of body.contacts) ins.run(c.id||uuidv4(),c.phone_number,c.name||'',c.email||'',JSON.stringify(c.tags||[]),JSON.stringify(c.attributes||{}),c.opted_in!==false?1:0,c.source||'import'); })();
    return NextResponse.json({success:true,imported:body.contacts.length});
  }
  const id=uuidv4();
  db.prepare(`INSERT INTO contacts (id,phone_number,name,email,tags,attributes,opted_in,source) VALUES (?,?,?,?,?,?,?,?)`).run(id,body.phone_number,body.name||'',body.email||'',JSON.stringify(body.tags||[]),JSON.stringify(body.attributes||{}),body.opted_in!==false?1:0,body.source||'manual');
  return NextResponse.json({success:true,id});
}
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if(!id) return NextResponse.json({error:'ID required'},{status:400});
  getDb().prepare('DELETE FROM contacts WHERE id=?').run(id);
  return NextResponse.json({success:true});
}
