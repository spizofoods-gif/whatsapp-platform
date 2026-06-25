'use client';
import { useState, useEffect, useCallback } from 'react';

// ── Meta Rules (real-time validation) ──
const RULES = {
  headerText: { max: 60, label: 'Header Text' },
  bodyMarketing: { max: 550, label: 'Marketing Body' },
  bodyUtility: { max: 1024, label: 'Utility Body' },
  footer: { max: 60, label: 'Footer' },
  buttonText: { max: 25, label: 'Button Text' },
  name: { max: 60, label: 'Template Name' },
  buttons: { max: 10, label: 'Buttons' },
};

interface Button { id:string; type:'QUICK_REPLY'|'URL'; text:string; url?:string }
interface Validation { field:string; status:'ok'|'warn'|'error'; message:string }

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [toast, setToast] = useState<{m:string;t:string}|null>(null);
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name:'', category:'MARKETING', language:'en', header_type:'NONE' as 'NONE'|'TEXT'|'IMAGE'|'VIDEO'|'DOCUMENT',
    header_text:'', header_media_url:'', body:'', footer:'', buttons:'[]', whatsapp_template_id:''
  });
  const [btns, setBtns] = useState<Button[]>([]);
  const [validation, setValidation] = useState<Validation[]>([]);

  const notify=(m:string,t='success')=>{setToast({m,t});setTimeout(()=>setToast(null),2500)};

  const fetchData=useCallback(async()=>{const r=await fetch('/api/templates');setTemplates((await r.json())||[]);setLoading(false)},[]);
  useEffect(()=>{fetchData()},[fetchData]);

  // Real-time validation
  const runValidation = useCallback(() => {
    const v: Validation[] = [];
    const cat = form.category;
    const bodyMax = cat === 'MARKETING' ? 550 : 1024;

    if (form.body.trim().length === 0) v.push({ field:'body', status:'error', message:'Body text is required' });
    else if (form.body.length > bodyMax) v.push({ field:'body', status:'error', message:`${form.body.length}/${bodyMax} chars — Over limit by ${form.body.length-bodyMax}` });
    else if (cat === 'MARKETING' && form.body.length > 440) v.push({ field:'body', status:'warn', message:`${form.body.length}/${bodyMax} — Getting close to limit` });
    else v.push({ field:'body', status:'ok', message:`✓ ${form.body.length}/${bodyMax} chars` });

    if (form.body.match(/\{\{[^}0-9][^}]*\}\}/)) v.push({ field:'body', status:'error', message:'Use {{1}}, {{2}} only. Named variables like {{name}} will be rejected.' });
    if (/[A-Z]{4,}/.test(form.body)) v.push({ field:'body', status:'warn', message:'ALL CAPS detected — may cause rejection. Use sentence case.' });
    if (/!{2,}|\?{2,}/.test(form.body)) v.push({ field:'body', status:'error', message:'Excessive punctuation (!! or ??) — Meta will reject this.' });
    if (/https?:\/\//.test(form.body) && !form.body.includes('{{')) v.push({ field:'body', status:'warn', message:'URL detected in body — use a URL button instead for better approval chance.' });
    if (form.body.includes('{{') && !form.body.match(/\{\{\d+\}\}/)) v.push({ field:'body', status:'error', message:'Only numbered variables allowed: {{1}}, {{2}}, etc. NOT {{customer_name}}.' });
    if (form.body.trim().length > 0) v.push({ field:'body', status:'ok', message:'✓ Format valid — no obvious issues found' });

    if (form.header_type!=='NONE') {
      if (form.header_type==='TEXT') {
        if (!form.header_text) v.push({ field:'header', status:'error', message:'Header text is required for TEXT header type' });
        else if (form.header_text.length>60) v.push({ field:'header', status:'error', message:`Header: ${form.header_text.length}/60 chars — Over limit` });
        else v.push({ field:'header', status:'ok', message:`✓ Header: ${form.header_text.length}/60` });
      } else {
        if (!form.header_media_url||!form.header_media_url.startsWith('http')) v.push({ field:'header', status:'error', message:'Valid HTTPS URL required for media header' });
        else v.push({ field:'header', status:'ok', message:'✓ Media URL valid' });
      }
    }

    if (form.footer && form.footer.length>60) v.push({ field:'footer', status:'error', message:`Footer: ${form.footer.length}/60 — Over limit` });
    else if (form.footer) v.push({ field:'footer', status:'ok', message:`✓ Footer: ${form.footer.length}/60` });

    if (btns.length>0) {
      if (btns.length>10) v.push({ field:'buttons', status:'error', message:'Max 10 buttons allowed' });
      btns.forEach((b,i)=>{
        if (!b.text) v.push({ field:'buttons', status:'error', message:`Button ${i+1}: Text required` });
        else if (b.text.length>25) v.push({ field:'buttons', status:'error', message:`Button ${i+1}: "${b.text.substring(0,15)}..." is ${b.text.length}/25 chars` });
        if (b.type==='URL'&&(!b.url||!b.url.startsWith('http'))) v.push({ field:'buttons', status:'error', message:`Button ${i+1}: Valid HTTPS URL required` });
      });
      if (btns.every(b=>b.text&&b.text.length<=25)) v.push({ field:'buttons', status:'ok', message:`✓ ${btns.length} button(s) valid` });
    }

    setValidation(v);
  }, [form, btns]);

  useEffect(()=>{runValidation()},[runValidation]);

  const syncFromMeta=async()=>{
    setSyncing(true);
    try{const r=await fetch('/api/template-sync');const d=await r.json();
      if(d.success){notify(`✅ Synced ${d.synced} templates!`);fetchData()}else notify(d.error||'Failed','error')}
    catch{notify('Error','error')}setSyncing(false);
  };

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();
    const errors=validation.filter(v=>v.status==='error');
    if(errors.length>0){notify(`Fix ${errors.length} error(s) first`,'error');return}
    setSubmitting(true);
    try{
      const r=await fetch('/api/create-template',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:form.name||'Template_'+Date.now(),category:form.category,language:form.language,
          header_type:form.header_type,header_text:form.header_text,header_media_url:form.header_media_url,
          body:form.body,footer:form.footer||null,buttons:btns.map(b=>({type:b.type,text:b.text,url:b.url||null}))})});
      const d=await r.json();
      if(d.success){notify('✅ Submitted to Meta! Approval in 1min-24hrs');setShowModal(false);resetForm();fetchData()}
      else notify(d.error||'Failed','error')
    }catch{notify('Network error','error')}setSubmitting(false);
  };

  const resetForm=()=>{setForm({name:'',category:'MARKETING',language:'en',header_type:'NONE',header_text:'',header_media_url:'',body:'',footer:'',buttons:'[]',whatsapp_template_id:''});setBtns([]);setEditId(null)};
  const addBtn=()=>setBtns([...btns,{id:'b_'+Date.now(),type:'QUICK_REPLY',text:''}]);
  const updBtn=(i:number,f:string,v:string)=>{const nb=[...btns];(nb[i]as any)[f]=v;setBtns(nb)};
  const rmBtn=(i:number)=>setBtns(btns.filter((_,j)=>j!==i));

  const hasErrors=validation.some(v=>v.status==='error');
  const hasWarnings=validation.some(v=>v.status==='warn');
  const allOk=!hasErrors&&!hasWarnings&&validation.some(v=>v.field==='body'&&v.status==='ok');

  // Also save locally
  const saveLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!form.body.trim()){notify('Body required','error');return}
    const r=await fetch('/api/templates',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:editId||undefined,name:form.name||'Untitled',category:form.category.toLowerCase(),language:form.language,
        header_type:form.header_type.toLowerCase(),header_text:form.header_text||null,header_media_url:form.header_media_url||null,
        body:form.body,footer:form.footer||null,buttons:btns,status:'draft',whatsapp_template_id:form.whatsapp_template_id||null})});
    if(r.ok){notify('Template saved!');setShowModal(false);resetForm();fetchData()}
  };

  return (<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h1 className="page-title" style={{marginBottom:0}}>📋 Message Templates</h1>
      <div style={{display:'flex',gap:8}}>
        <button className="btn btn-secondary" onClick={syncFromMeta} disabled={syncing}>{syncing?'⏳ Syncing...':'🔄 Sync from Meta'}</button>
        <button className="btn btn-primary" onClick={()=>{resetForm();setShowModal(true)}}>+ New Template</button>
      </div>
    </div>

    <div className="card" style={{padding:0}}>
      <div className="table-container">
        <table>
          <thead><tr><th>Name</th><th>Category</th><th>Header</th><th>Body Preview</th><th>Buttons</th><th>Status</th><th>WhatsApp ID</th><th></th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={8} style={{textAlign:'center',padding:40}}><div className="spinner" style={{margin:'0 auto'}}/></td></tr>:
              templates.length===0?<tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'#64748b'}}>No templates. <a href="#" onClick={e=>{e.preventDefault();syncFromMeta()}} style={{color:'#128C7E',fontWeight:600}}>Sync from Meta</a></td></tr>:
              templates.map((t:any)=><tr key={t.id}>
                <td style={{fontWeight:500,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis'}}>{t.name}</td>
                <td><span className={`badge ${t.category==='marketing'?'badge-info':t.category==='utility'?'badge-success':'badge-warning'}`}>{t.category}</span></td>
                <td className="text-sm text-muted">{t.header_type||'none'}</td>
                <td style={{maxWidth:250,overflow:'hidden',textOverflow:'ellipsis'}}>{t.body?.substring(0,55)}{t.body?.length>55?'...':''}</td>
                <td className="text-sm text-muted">{(typeof t.buttons==='string'?JSON.parse(t.buttons||'[]'):t.buttons||[]).length||0}</td>
                <td><span className={`badge ${t.status==='approved'?'badge-success':t.status==='PENDING'?'badge-warning':t.status==='rejected'?'badge-danger':'badge-info'}`}>{t.status||'draft'}</span></td>
                <td><code style={{fontSize:10}}>{t.whatsapp_template_id||'—'}</code></td>
                <td><button className="btn btn-sm btn-danger" onClick={()=>{if(confirm('Delete?'))fetch(`/api/templates?id=${t.id}`,{method:'DELETE'}).then(()=>{notify('Deleted');fetchData()})}}>🗑️</button></td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>

    {/* Template Editor Modal */}
    {showModal&&<div className="modal-overlay" onClick={()=>setShowModal(false)}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:720,maxHeight:'92vh',overflow:'auto'}}>
        <div className="modal-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <h3 style={{fontSize:17,fontWeight:600,margin:0}}>{editId?'Edit':'Create'} Template</h3>
            <p style={{fontSize:11,color:'#64748b',margin:'2px 0 0'}}>Submit directly to Meta for approval. Follow guidelines for fastest approval.</p>
          </div>
          <button onClick={()=>setShowModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20}}>✕</button>
        </div>
        <form>
        <div className="modal-body">
          {/* Template Name + Category */}
          <div className="grid-2 mb-4">
            <div><label className="label">Template Name *</label><input className="input" placeholder="welcome_message" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
              <div style={{fontSize:10,color:'#64748b',marginTop:2}}>Lowercase, underscores only. Max 60 chars.</div>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                <option value="MARKETING">📢 Marketing (550 char body max)</option>
                <option value="UTILITY">🛠️ Utility (1024 char body max)</option>
                <option value="AUTHENTICATION">🔐 Authentication (OTP)</option>
              </select>
            </div>
          </div>

          <div className="grid-2 mb-4">
            <div><label className="label">Language</label><select className="input" value={form.language} onChange={e=>setForm({...form,language:e.target.value})}><option value="en">English</option><option value="hi">Hindi</option><option value="en_US">English (US)</option><option value="en_GB">English (UK)</option></select></div>
          </div>

          {/* Header */}
          <div className="mb-4" style={{background:'#f8fafc',padding:14,borderRadius:10,border:'1px solid #e2e8f0'}}>
            <label className="label">🏷️ Header (Optional)</label>
            <select className="input mb-2" value={form.header_type} onChange={e=>setForm({...form,header_type:e.target.value as any})}>
              <option value="NONE">None</option><option value="TEXT">📝 Text Header (60 chars)</option>
              <option value="IMAGE">🖼️ Image Header (HTTPS URL)</option>
              <option value="VIDEO">🎬 Video Header (HTTPS URL)</option>
              <option value="DOCUMENT">📄 Document Header (HTTPS URL)</option>
            </select>
            {form.header_type==='TEXT'&&<input className="input" placeholder="Welcome to Spizo Foods!" value={form.header_text} onChange={e=>setForm({...form,header_text:e.target.value.substring(0,60)})} maxLength={60}/>}
            {['IMAGE','VIDEO','DOCUMENT'].includes(form.header_type)&&<input className="input" placeholder="https://your-server.com/header-image.jpg" value={form.header_media_url} onChange={e=>setForm({...form,header_media_url:e.target.value})}/>}
            {form.header_type!=='NONE'&&<div style={{fontSize:10,color:'#64748b',marginTop:4}}>Headers with images/video improve engagement by 40%+. Use {form.header_type==='TEXT'?'text only':'a direct HTTPS URL'}.</div>}
          </div>

          {/* Body */}
          <div className="mb-4">
            <label className="label">📝 Body Text *</label>
            <textarea className="input" rows={4} value={form.body} onChange={e=>setForm({...form,body:e.target.value})} 
              placeholder={`Hi {{1}}! Welcome to Spizo Foods. Your order #{{2}} is confirmed.\n\nTrack: {{3}}\nThank you for choosing us!`}
              style={{resize:'vertical',fontSize:13}}/>
            <div style={{fontSize:10,color:'#64748b',marginTop:4}}>Use <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code> for variables. <b>No named variables</b> like {'{{name}}'}. Max {form.category==='MARKETING'?550:1024} chars for {form.category.toLowerCase()} templates.</div>
          </div>

          {/* Footer */}
          <div className="mb-4"><label className="label">📌 Footer (Optional - 60 chars)</label><input className="input" placeholder="Reply STOP to opt out" value={form.footer} onChange={e=>setForm({...form,footer:e.target.value.substring(0,60)})} maxLength={60}/></div>

          {/* Buttons */}
          <div className="mb-4" style={{background:'#f8fafc',padding:14,borderRadius:10,border:'1px solid #e2e8f0'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <label className="label" style={{margin:0}}>🔘 Buttons (Optional - Max 10)</label>
              <button type="button" className="btn btn-sm btn-secondary" onClick={addBtn}>+ Add Button</button>
            </div>
            {btns.map((b,i)=><div key={b.id} style={{background:'#fff',padding:8,borderRadius:8,marginBottom:6,border:'1px solid #e2e8f0'}}>
              <div style={{display:'flex',gap:6,marginBottom:4}}>
                <select style={{border:'1px solid #e2e8f0',borderRadius:4,padding:'4px 8px',fontSize:11}} value={b.type} onChange={e=>updBtn(i,'type',e.target.value)}>
                  <option value="QUICK_REPLY">💬 Quick Reply</option><option value="URL">🔗 Website URL</option>
                </select>
                <button type="button" onClick={()=>rmBtn(i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}>✕</button>
              </div>
              <div className="grid-2" style={{gap:6}}>
                <input style={{border:'1px solid #e2e8f0',borderRadius:4,padding:'4px 8px',fontSize:11}} placeholder="Button Text (25 max)" value={b.text} onChange={e=>updBtn(i,'text',e.target.value)} maxLength={25}/>
                {b.type==='URL'&&<input style={{border:'1px solid #e2e8f0',borderRadius:4,padding:'4px 8px',fontSize:11}} placeholder="https://example.com" value={b.url||''} onChange={e=>updBtn(i,'url',e.target.value)}/>}
              </div>
            </div>)}
          </div>

          {/* Validation Panel */}
          <div style={{background:hasErrors?'#fef2f2':hasWarnings?'#fffbeb':allOk?'#f0fdf4':'#f8fafc',border:`1px solid ${hasErrors?'#fecaca':hasWarnings?'#fde68a':allOk?'#bbf7d0':'#e2e8f0'}`,borderRadius:10,padding:12}}>
            <div style={{fontWeight:600,fontSize:12,marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
              {hasErrors?'❌':hasWarnings?'⚠️':allOk?'✅':'ℹ️'}
              {hasErrors?'Issues Found — Fix Before Submitting':hasWarnings?'Review Warnings':allOk?'Ready to Submit!':'Fill in the template above'}
            </div>
            {validation.map((v,i)=><div key={i} style={{fontSize:11,padding:'3px 0',color:v.status==='error'?'#991b1b':v.status==='warn'?'#92400e':v.status==='ok'?'#166534':'#64748b',display:'flex',alignItems:'center',gap:4}}>
              <span>{v.status==='error'?'❌':v.status==='warn'?'⚠️':'✅'}</span> {v.message}
            </div>)}
            {validation.length===0&&<div style={{fontSize:11,color:'#64748b'}}>Start typing to see validation results...</div>}

            {/* Meta Rules Quick Reference */}
            <details style={{marginTop:10,fontSize:10,color:'#64748b'}}>
              <summary style={{cursor:'pointer',fontWeight:600}}>📖 Meta Template Rules</summary>
              <div style={{marginTop:6,lineHeight:1.6}}>
                <div><b>Body:</b> Marketing = 550 chars max | Utility/Auth = 1024 chars max</div>
                <div><b>Header:</b> Text = 60 chars | Image/Video/Doc = HTTPS URL only</div>
                <div><b>Footer:</b> 60 chars max</div>
                <div><b>Buttons:</b> 10 max, text = 25 chars each, URL buttons need https://</div>
                <div><b>Variables:</b> {'{{1}}'}, {'{{2}}'} only — NO named variables like {'{{name}}'}</div>
                <div><b>❌ Not allowed:</b> ALL CAPS, excessive punctuation (!!, ??), URLs in body, misleading content, spam</div>
                <div><b>✅ Recommended:</b> Clear CTAs, emojis, proper formatting, image headers for marketing</div>
                <div style={{marginTop:4,background:'#fef3c7',padding:4,borderRadius:4}}>⏱️ Approval: Utility/Auth = often instant | Marketing = 1-24 hours</div>
              </div>
            </details>
          </div>
        </div>

        <div className="modal-footer" style={{display:'flex',gap:8}}>
          <button type="button" className="btn btn-secondary" onClick={saveLocal}>💾 Save Local Only</button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting||hasErrors}>
            {submitting?'⏳ Submitting to Meta...':hasErrors?'❌ Fix Errors First':'🚀 Submit to Meta for Approval'}
          </button>
        </div>
        </form>
      </div>
    </div>}

    {toast&&<div className={`toast toast-${toast.t}`}>{toast.m}</div>}
  </div>);
}
