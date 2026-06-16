import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendTextMessage, sendTemplateMessage, logMessage } from '@/lib/whatsapp';
import { v4 as uuidv4 } from 'uuid';
export async function GET(req: NextRequest) {
  const st = new URL(req.url).searchParams.get('status')||'';
  let q='SELECT * FROM campaigns'; const p:any[]=[];
  if(st){ q+=' WHERE status=?'; p.push(st); }
  q+=' ORDER BY created_at DESC LIMIT 100';
  return NextResponse.json(getDb().prepare(q).all(...p));
}
export async function POST(req: NextRequest) {
  const db=getDb(); const body=await req.json(); const id=uuidv4();
  let ids:string[]=[];
  if(body.recipient_all) ids=(db.prepare('SELECT id FROM contacts WHERE opted_in=1').all() as any[]).map((r:any)=>r.id);
  else if(body.recipient_tags?.length) ids=(db.prepare(`SELECT id FROM contacts WHERE opted_in=1 AND (${body.recipient_tags.map(()=>'tags LIKE ?').join(' OR ')})`).all(...body.recipient_tags.map((t:string)=>`%"${t}"%`)) as any[]).map((r:any)=>r.id);
  else if(body.recipient_ids) ids=body.recipient_ids;
  db.prepare(`INSERT INTO campaigns (id,name,template_id,message_body,status,recipient_count) VALUES (?,?,?,?,?,?)`).run(id,body.name,body.template_id||null,body.message_body||'','draft',ids.length);
  const ins=db.prepare(`INSERT INTO campaign_recipients (id,campaign_id,contact_id,status) VALUES (?,?,?,'pending')`);
  db.transaction(()=>{ for(const cid of ids) ins.run(uuidv4(),id,cid); })();
  return NextResponse.json({success:true,id,recipient_count:ids.length});
}
export async function PUT(req: NextRequest) {
  const db=getDb(); const body=await req.json(); const {id,action}=body;
  if(action==='start'){
    const camp=db.prepare('SELECT * FROM campaigns WHERE id=?').get(id) as any;
    if(!camp) return NextResponse.json({error:'Not found'},{status:404});
    db.prepare("UPDATE campaigns SET status=?,started_at=datetime('now') WHERE id=?").run('running',id);
    const recips=db.prepare('SELECT cr.id,cr.contact_id,c.phone_number,c.name FROM campaign_recipients cr JOIN contacts c ON cr.contact_id=c.id WHERE cr.campaign_id=? AND cr.status=?').all(id,'pending') as any[];
    const sends=recips.map(async(r:any)=>{
      try{
        let result;
        if(camp.template_id){
          const tmpl=db.prepare('SELECT * FROM templates WHERE id=?').get(camp.template_id) as any;
          if(tmpl?.whatsapp_template_id) result=await sendTemplateMessage(r.phone_number,tmpl.whatsapp_template_id,tmpl.language);
        }else result=await sendTextMessage(r.phone_number,camp.message_body,true);
        if(result?.messages?.[0]?.id){
          db.prepare("UPDATE campaign_recipients SET status=?,message_id=?,sent_at=datetime('now') WHERE id=?").run('sent',result.messages[0].id,r.id);
          db.prepare('UPDATE campaigns SET sent_count=sent_count+1 WHERE id=?').run(id);
          logMessage({contact_id:r.contact_id,campaign_id:id,direction:'outgoing',content:camp.message_body||'template',whatsapp_message_id:result.messages[0].id,status:'sent'});
        }
      }catch(err:any){
        db.prepare('UPDATE campaign_recipients SET status=?,error=? WHERE id=?').run('failed',err.message,r.id);
        db.prepare('UPDATE campaigns SET failed_count=failed_count+1 WHERE id=?').run(id);
      }
    });
    await Promise.all(sends);
    db.prepare("UPDATE campaigns SET status=?,completed_at=datetime('now') WHERE id=?").run('completed',id);
    return NextResponse.json({success:true,sent:recips.length});
  }
  if(action==='cancel'){ db.prepare('UPDATE campaigns SET status=? WHERE id=?').run('cancelled',id); return NextResponse.json({success:true}); }
  return NextResponse.json({error:'Invalid action'},{status:400});
}
