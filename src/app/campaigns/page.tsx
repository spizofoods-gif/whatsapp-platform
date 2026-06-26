'use client';
import { useState, useEffect, useCallback } from 'react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{m:string;t:string}|null>(null);
  const [tab, setTab] = useState<'compose'|'template'|'schedule'>('compose');
  const [form, setForm] = useState({
    name:'',message_body:'',recipient_type:'all' as 'all'|'tags'|'segment',recipient_tags:'',
    use_template:false,template_id:'',schedule:false,scheduled_at:'',media_url:'',footer:'',
    buttons:'',category:'marketing' as 'marketing'|'utility'|'authentication'
  });
  const [syncing, setSyncing] = useState(false);

  const notify=(m:string,t='success')=>{setToast({m,t});setTimeout(()=>setToast(null),2500)};

  const fetchCampaigns=useCallback(async()=>{const r=await fetch('/api/campaigns');setCampaigns((await r.json())||[]);setLoading(false)},[]);
  useEffect(()=>{fetchCampaigns();fetch('/api/templates').then(r=>r.json()).then(d=>setTemplates(d||[]));fetch('/api/contacts?limit=1').then(r=>r.json()).then(d=>setTotalContacts(d.total||0))},[fetchCampaigns]);

  const syncTemplates=async()=>{
    setSyncing(true);
    try{
      const r=await fetch('/api/template-sync');const d=await r.json();
      if(d.success){notify(`✅ ${d.synced} templates synced!`);fetch('/api/templates').then(r=>r.json()).then(x=>setTemplates(x||[]))}
      else notify(d.error||'Sync failed - check WhatsApp config','error')
    }catch{notify('Sync error','error')}setSyncing(false);
  };

  const handleCreate=async(e:React.FormEvent)=>{
    e.preventDefault();
    let btns=[];try{btns=form.buttons?JSON.parse(form.buttons):[]}catch{}
    const body:any={name:form.name,message_body:form.message_body,category:form.category,media_url:form.media_url||null,footer:form.footer||null,buttons:btns};
    if(form.use_template&&form.template_id){body.template_id=form.template_id;const t=templates.find(x=>x.id===form.template_id);if(t)body.message_body=t.body||form.message_body}
    if(form.recipient_type==='all')body.recipient_all=true;else body.recipient_tags=form.recipient_tags.split(',').map((t:string)=>t.trim()).filter(Boolean);
    if(form.schedule)body.scheduled_at=form.scheduled_at;
    const r=await fetch('/api/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json();
    if(d.success){notify(`✅ Campaign created - ${d.recipient_count} recipients!`);setShowModal(false);setForm({name:'',message_body:'',recipient_type:'all',recipient_tags:'',use_template:false,template_id:'',schedule:false,scheduled_at:'',media_url:'',footer:'',buttons:'',category:'marketing'});fetchCampaigns()}else notify(d.error||'Failed','error')
  };

  const handleAction=async(id:string,action:string)=>{
    const r=await fetch('/api/campaigns',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action})});
    const d=await r.json();
    if(d.success){notify(`Campaign ${action==='start'?'started':action}!`);fetchCampaigns()}else notify(d.error||'Failed','error')
  };

  const sb=(s:string)=>{const m:any={draft:'badge-warning',running:'badge-info',completed:'badge-success',failed:'badge-danger',cancelled:'badge-warning',scheduled:'badge-info'};return <span className={`badge ${m[s]||'badge-warning'}`}>{s}</span>};

  return (<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h1 className="page-title" style={{marginBottom:0}}>📨 Campaigns</h1>
      <div style={{display:'flex',gap:8}}>
        <button className="btn btn-secondary" onClick={syncTemplates} disabled={syncing}>{syncing?'⏳ Syncing...':'🔄 Sync Meta Templates'}</button>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ New Campaign</button>
      </div>
    </div>

    <div className="card" style={{padding:0}}>
      <div className="table-container">
        <table>
          <thead><tr><th>Name</th><th>Category</th><th>Status</th><th>Recipients</th><th>Sent</th><th>Delivered</th><th>Read</th><th>Failed</th><th>Rate</th><th>Scheduled</th><th></th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={11} style={{textAlign:'center',padding:40}}><div className="spinner" style={{margin:'0 auto'}}/></td></tr>:
              campaigns.length===0?<tr><td colSpan={11} style={{textAlign:'center',padding:40,color:'#64748b'}}>No campaigns. <a href="#" onClick={e=>{e.preventDefault();setShowModal(true)}} style={{color:'#128C7E'}}>Create first campaign</a></td></tr>:
              campaigns.map((c:any)=><tr key={c.id}>
                <td style={{fontWeight:500,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis'}}>{c.name}</td>
                <td><span className="badge badge-info">{c.category||'marketing'}</span></td>
                <td>{sb(c.status)}</td>
                <td>{c.recipient_count}</td><td>{c.sent_count}</td><td>{c.delivered_count}</td>
                <td>{c.read_count}</td><td>{c.failed_count}</td>
                <td>{c.sent_count>0?<span style={{color:'#059669',fontWeight:600,fontSize:12}}>{Math.round((c.delivered_count/c.sent_count)*100)}%</span>:'—'}</td>
                <td className="text-sm text-muted">{c.scheduled_at?new Date(c.scheduled_at).toLocaleDateString():'—'}</td>
                <td>
                  {c.status==='draft'&&<button className="btn btn-sm btn-primary" onClick={()=>handleAction(c.id,'start')}>▶ Start</button>}
                  {c.status==='running'&&<button className="btn btn-sm btn-danger" onClick={()=>handleAction(c.id,'cancel')}>■ Stop</button>}
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>

    {/* Create Modal */}
    {showModal&&<div className="modal-overlay" onClick={()=>setShowModal(false)}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:680,maxHeight:'90vh',overflow:'auto'}}>
        <div className="modal-header"><h3 style={{fontSize:17,fontWeight:600}}>New Campaign</h3><button onClick={()=>setShowModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20}}>✕</button></div>
        <form onSubmit={handleCreate}>
          <div className="modal-body">
            {/* Tabs */}
            <div className="tabs mb-4">
              {[{k:'compose',l:'✏️ Compose'},{k:'template',l:'📋 Templates'},{k:'schedule',l:'🕐 Schedule'}].map(t=><button key={t.k} type="button" className={`tab ${tab===t.k?'active':''}`} onClick={()=>setTab(t.k as any)}>{t.l}</button>)}
            </div>

            {tab==='compose'&&<>
              <div className="mb-4"><label className="label">Campaign Name *</label><input className="input" placeholder="Summer Sale Announcement" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
              <div className="grid-2 mb-4">
                <div><label className="label">Category</label><select className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value as any})}><option value="marketing">📢 Marketing</option><option value="utility">🛠️ Utility</option><option value="authentication">🔐 Auth (OTP)</option></select></div>
                <div><label className="label">Recipients</label><select className="input" value={form.recipient_type} onChange={e=>setForm({...form,recipient_type:e.target.value as any})}><option value="all">All ({totalContacts})</option><option value="tags">By Tags</option></select></div>
              </div>
              {form.recipient_type==='tags'&&<div className="mb-4"><label className="label">Tags (comma)</label><input className="input" placeholder="customer, vip" value={form.recipient_tags} onChange={e=>setForm({...form,recipient_tags:e.target.value})}/></div>}
              <div className="mb-4"><label className="label">Message Body *</label><textarea className="input" rows={4} value={form.message_body} onChange={e=>setForm({...form,message_body:e.target.value})} required style={{resize:'vertical'}} placeholder="Hi {{1}}! Check our offers 🎉"/></div>
              <div className="grid-2 mb-4">
                <div><label className="label">Media URL (optional)</label><input className="input" placeholder="https://example.com/image.jpg" value={form.media_url} onChange={e=>setForm({...form,media_url:e.target.value})}/></div>
                <div><label className="label">Footer</label><input className="input" placeholder="Reply STOP to opt out" value={form.footer} onChange={e=>setForm({...form,footer:e.target.value})}/></div>
              </div>
              <div className="mb-4"><label className="label">Buttons (JSON)</label><input className="input" placeholder='[{"type":"url","text":"Shop Now","url":"https://..."}]' value={form.buttons} onChange={e=>setForm({...form,buttons:e.target.value})} style={{fontFamily:'monospace',fontSize:11}}/><div style={{fontSize:10,color:'#64748b',marginTop:4}}>Types: quick_reply, url, call</div></div>
            </>}

            {tab==='template'&&<>
              <div className="mb-4"><label className="label">Campaign Name *</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
              <div className="grid-2 mb-4"><div><label className="label">Category</label><select className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value as any})}><option value="marketing">📢 Marketing</option><option value="utility">🛠️ Utility</option><option value="authentication">🔐 Auth</option></select></div><div><label className="label">Recipients</label><select className="input" value={form.recipient_type} onChange={e=>setForm({...form,recipient_type:e.target.value as any})}><option value="all">All</option><option value="tags">By Tags</option></select></div></div>
              {form.recipient_type==='tags'&&<div className="mb-4"><label className="label">Tags</label><input className="input" value={form.recipient_tags} onChange={e=>setForm({...form,recipient_tags:e.target.value})}/></div>}
              <div className="mb-4">
                <label className="label">Select WhatsApp Template</label>
                {templates.length===0?<div style={{padding:20,textAlign:'center',color:'#64748b',border:'1px dashed #e2e8f0',borderRadius:8}}>
                  No templates. <a href="#" onClick={e=>{e.preventDefault();syncTemplates()}} style={{color:'#128C7E',fontWeight:600}}>Sync from Meta</a> or <a href="/templates" style={{color:'#2563eb'}}>create one</a>.
                </div>:<select className="input" value={form.template_id} onChange={e=>setForm({...form,template_id:e.target.value,use_template:true})} required>
                  <option value="">-- Choose --</option>
                  {templates.filter((t:any)=>t.status==='approved'||t.status==='draft').map((t:any)=><option key={t.id} value={t.id}>[{t.category}] {t.name} ({t.language})</option>)}
                </select>}
                <div style={{fontSize:10,color:'#64748b',marginTop:4}}>Template must be approved by Meta before sending.</div>
              </div>
            </>}

            {tab==='schedule'&&<>
              <div className="mb-4"><label className="label">Schedule Date & Time</label><input className="input" type="datetime-local" value={form.scheduled_at} onChange={e=>setForm({...form,scheduled_at:e.target.value,schedule:true})}/></div>
              <div style={{fontSize:12,color:'#64748b',padding:10,background:'#f0fdf4',borderRadius:8}}>✅ Campaign will be created as draft. Click <b>Start</b> to send immediately, or it will auto-send at the scheduled time.</div>
            </>}
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{form.schedule?'📅 Schedule':'📨 Create'} Campaign</button></div>
        </form>
      </div>
    </div>}
    {toast&&<div className={`toast toast-${toast.t}`}>{toast.m}</div>}
  </div>);
}
