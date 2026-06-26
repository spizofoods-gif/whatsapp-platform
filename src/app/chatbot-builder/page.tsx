'use client';
import { useState, useRef, useEffect } from 'react';

// ── Complete Node Types ──
const ALL_NODES = [
  { type:'trigger',label:'🎯 Trigger',color:'#3b82f6',desc:'Start flow on keyword/regex/template/click',category:'start' },
  { type:'message',label:'💬 Message',color:'#25D366',desc:'Send text, media, list, buttons, catalog',category:'send' },
  { type:'ask',label:'❓ Ask Question',color:'#06b6d4',desc:'Ask + validate text/number/email/date/media/location',category:'send' },
  { type:'condition',label:'🔀 Condition',color:'#f59e0b',desc:'Branch by keyword/attribute/time/reply',category:'logic' },
  { type:'action',label:'⚡ Action',color:'#8b5cf6',desc:'API call, tag, attribute, webhook, CRM sync, sheet',category:'logic' },
  { type:'delay',label:'⏱️ Delay',color:'#64748b',desc:'Wait N seconds/minutes/hours',category:'logic' },
  { type:'handover',label:'🧑 Handover',color:'#ef4444',desc:'Transfer to live human agent',category:'flow' },
  { type:'split',label:'🔀 A/B Split',color:'#ec4899',desc:'Random split 50/50 or custom % for testing',category:'logic' },
  { type:'jump',label:'↗️ Jump',color:'#14b8a6',desc:'Jump to another flow or restart',category:'flow' },
  { type:'catalog',label:'🛒 Catalog',color:'#f97316',desc:'Show products, collect order, payment link',category:'send' },
  { type:'end',label:'🏁 End',color:'#6b7280',desc:'End conversation gracefully',category:'flow' },
] as const;

interface Button { id:string; type:'quick_reply'|'url'|'call'; text:string; url?:string; phone?:string }
interface FlowNode {
  id:string; type:string; label:string; data:Record<string,any>;
  x:number; y:number; connections:string[]; buttons?:Button[];
}
const genId=()=>'n_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);

export default function FlowBuilder(){
  const [nodes,setNodes]=useState<FlowNode[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [modal,setModal]=useState(false);
  const [data,setData]=useState<any>({});
  const [btns,setBtns]=useState<Button[]>([]);
  const [name,setName]=useState('My Flow');
  const [toast,setToast]=useState<{m:string;t:string}|null>(null);
  const [connect,setConnect]=useState<string|null>(null);
  const canvas=useRef<HTMLDivElement>(null);
  const drag=useRef<any>(null);
  const [zoom,setZoom]=useState(100);

  const notify=(m:string,t='success')=>{setToast({m,t});setTimeout(()=>setToast(null),2500)};

  const add=(type:string)=>{
    const nt=ALL_NODES.find(n=>n.type===type);
    const nn:FlowNode={
      id:genId(),type,label:nt?.label||type,
      data:{message:'',keywords:'',match:'contains',validate:'text',attribute:'',api:'GET',url:'',tag:'',delay:5,percentage:50,flowName:''},
      x:120+Math.random()*250,y:100+nodes.length*110,connections:[],
      buttons:type==='message'?[]:undefined
    };
    setNodes([...nodes,nn]);
  };

  const mdown=(e:React.MouseEvent,nid:string)=>{
    e.stopPropagation();const n=nodes.find(x=>x.id===nid);
    if(!n)return;drag.current={id:nid,sx:e.clientX,sy:e.clientY,ox:n.x,oy:n.y};
  };
  const mmove=(e:React.MouseEvent)=>{
    if(!drag.current)return;
    setNodes(p=>p.map(n=>n.id===drag.current.id?{...n,x:drag.current.ox+e.clientX-drag.current.sx,y:drag.current.oy+e.clientY-drag.current.sy}:n));
  };
  const mup=()=>{drag.current=null};

  const link=(fid:string,tid:string)=>{
    if(fid===tid)return;
    setNodes(p=>p.map(n=>n.id===fid?{...n,connections:n.connections.includes(tid) ? n.connections : [...n.connections, tid]}:n));
    setConnect(null);notify('Linked ✓');
  };

  const edit=(nid:string)=>{
    const n=nodes.find(x=>x.id===nid);if(!n)return;
    setSelected(nid);setData({...n.data});setBtns(n.buttons?[...n.buttons]:[]);setModal(true);
  };

  const save=()=>{
    if(!selected)return;
    setNodes(p=>p.map(n=>n.id===selected?{...n,data,buttons:btns.length?btns:(n.type==='message'?[]:undefined)}:n));
    setModal(false);notify('Node saved ✓');
  };

  const delNode=(nid:string)=>{
    setNodes(p=>p.filter(n=>n.id!==nid).map(n=>({...n,connections:n.connections.filter(c=>c!==nid)})));
  };

  const addBtn=()=>setBtns([...btns,{id:genId(),type:'quick_reply',text:''}]);
  const updBtn=(i:number,f:string,v:string)=>{const nb=[...btns];(nb[i]as any)[f]=v;setBtns(nb)};
  const rmBtn=(i:number)=>setBtns(btns.filter((_,j)=>j!==i));

  const clr=(t:string)=>ALL_NODES.find(n=>n.type===t)?.color||'#94a3b8';

  const saveAsRules=async()=>{
    const trig=nodes.find(n=>n.type==='trigger');const msgs=nodes.filter(n=>['message','ask','catalog'].includes(n.type));
    if(!trig||!msgs.length){notify('Need Trigger + at least 1 Message/Ask/Catalog','error');return;}
    for(const m of msgs){
      await fetch('/api/chatbot',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:`${name}-${m.id.slice(-6)}`,trigger_type:'keyword',trigger_keywords:(trig.data.keywords||'hello').split(',').map((k:string)=>k.trim()).filter(Boolean),trigger_match:trig.data.match||'contains',response_type:'text',response_text:m.data.message||m.data.question||'Hi!',is_active:true,priority:nodes.indexOf(m),buttons:btns.length?btns:undefined})});
    }
    notify(`✅ ${msgs.length} rules saved!`);
  };

  return (<div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 48px)',marginTop:-24}}>
    {/* Top bar */}
    <div style={{background:'#fff',borderBottom:'1px solid #e2e8f0',padding:'8px 16px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',justifyContent:'space-between'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <h2 style={{fontSize:16,fontWeight:700,margin:0}}>🤖 Flow Builder</h2>
        <input style={{border:'1px solid #e2e8f0',borderRadius:6,padding:'5px 10px',fontSize:12,width:140}} value={name} onChange={e=>setName(e.target.value)}/>
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <button style={{border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 8px',background:'#fff',cursor:'pointer',fontSize:12}} onClick={()=>setZoom(z=>Math.max(40,z-10))}>−</button>
          <span style={{fontSize:11,color:'#64748b',width:40,textAlign:'center'}}>{zoom}%</span>
          <button style={{border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 8px',background:'#fff',cursor:'pointer',fontSize:12}} onClick={()=>setZoom(z=>Math.min(200,z+10))}>+</button>
        </div>
      </div>
      <div style={{display:'flex',gap:6}}>
        <button className="btn btn-sm btn-secondary" onClick={saveAsRules}>⚡ Deploy Rules</button>
        <label className="btn btn-sm btn-secondary" style={{cursor:'pointer',margin:0}}>📂 Import <input type="file" accept=".json" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target?.result as string);setNodes(d.nodes||[]);setName(d.name||'Flow');notify('Imported!')}catch{notify('Invalid JSON','error')}};r.readAsText(f)}} style={{display:'none'}}/></label>
        <button className="btn btn-sm btn-secondary" onClick={()=>{const j=JSON.stringify({name,nodes,version:'3.0'},null,2);const b=new Blob([j],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name.replace(/\s+/g,'_')+'.json';a.click();notify('Exported!')}}>💾 Export</button>
      </div>
    </div>

    <div style={{display:'flex',flex:1,overflow:'hidden'}}>
      {/* Left panel - Node types */}
      <div style={{width:200,background:'#fff',borderRight:'1px solid #e2e8f0',overflowY:'auto',padding:10}}>
        {['start','send','logic','flow'].map(cat=>(
          <div key={cat} style={{marginBottom:8}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'#94a3b8',marginBottom:5,letterSpacing:0.5}}>
              {cat==='start'?'🚀 Start':cat==='send'?'📤 Send':cat==='logic'?'🧠 Logic':'🔀 Flow'}
            </div>
            {ALL_NODES.filter(n=>n.category===cat).map(nt=>(
              <div key={nt.type} onClick={()=>add(nt.type)} style={{
                padding:'6px 10px',marginBottom:4,borderRadius:7,background:nt.color+'12',border:`1px solid ${nt.color}28`,
                cursor:'pointer',transition:'all .12s',fontSize:11
              }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                <div style={{fontWeight:600,fontSize:11}}>{nt.label}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{nt.desc}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div ref={canvas} style={{flex:1,position:'relative',overflow:'auto',background:'#f8fafc'}} onMouseMove={mmove} onMouseUp={mup}>
        <div style={{position:'absolute',inset:0,backgroundImage:`radial-gradient(circle,#e2e8f0 1px,transparent 1px)`,backgroundSize:`${20*(zoom/100)}px ${20*(zoom/100)}px`,opacity:0.4,transform:`scale(${zoom/100})`,transformOrigin:'0 0'}}/>
        <svg style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:1}}>
          {nodes.map(n=>n.connections.map(tid=>{const t=nodes.find(x=>x.id===tid);if(!t)return null;
            return <line key={n.id+tid} x1={n.x+70} y1={n.y+38} x2={t.x+70} y2={t.y+38} stroke="#94a3b8" strokeWidth={2} markerEnd="url(#a)"/>;
          }))}
          <defs><marker id="a" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="#94a3b8"/></marker></defs>
        </svg>

        {nodes.map(n=>(
          <div key={n.id} onMouseDown={e=>mdown(e,n.id)} onClick={()=>edit(n.id)} style={{
            position:'absolute',left:n.x,top:n.y,width:150,padding:'7px 10px',borderRadius:12,
            background:'#fff',border:`2px solid ${selected===n.id?'#3b82f6':clr(n.type)}`,
            boxShadow:selected===n.id?'0 4px 20px rgba(59,130,246,.3)':'0 2px 8px rgba(0,0,0,.08)',
            cursor:'pointer',zIndex:2,transition:'box-shadow .2s',
            transform:`scale(${zoom/100})`,transformOrigin:'0 0'
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,fontWeight:600,color:clr(n.type)}}>{n.label}</span>
              <button onClick={e=>{e.stopPropagation();delNode(n.id);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,opacity:.5}}>✕</button>
            </div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:3,maxHeight:28,overflow:'hidden',lineHeight:1.3}}>
              {n.data.message||n.data.keywords||n.data.tag||n.data.api||(n.data.question?'❓ '+n.data.question:'')||'(click)'}
            </div>
            {(n.buttons||[]).length>0&&<div style={{display:'flex',gap:2,marginTop:3,flexWrap:'wrap'}}>
              {(n.buttons||[]).map(b=><span key={b.id} style={{fontSize:8,background:'#dbeafe',color:'#1e40af',padding:'1px 5px',borderRadius:8}}>{b.type==='url'?'🔗':b.type==='call'?'📞':'💬'} {b.text}</span>)}
            </div>}
            <button onClick={e=>{e.stopPropagation();if(connect)link(connect,n.id);else setConnect(n.id)}} style={{marginTop:4,fontSize:9,background:connect?'#dbeafe':'#f1f5f9',border:'none',borderRadius:4,padding:'2px 4px',cursor:'pointer',width:'100%',color:connect?'#2563eb':'#94a3b8'}}>
              {connect===n.id?'Click target...':connect?'← Connect':'+ Link'}
            </button>
          </div>
        ))}

        {nodes.length===0&&<div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',color:'#94a3b8'}}>
          <div style={{fontSize:52,marginBottom:10}}>🤖</div>
          <div style={{fontSize:15,fontWeight:600}}>Build Your Bot</div>
          <div style={{fontSize:12,marginTop:4}}>Click nodes on the left to add them. Drag to move. Link to connect.</div>
        </div>}
      </div>
    </div>

    {/* Edit modal */}
    {modal&&selected&&(()=>{
      const nt=nodes.find(n=>n.id===selected);if(!nt)return null;
      return <div className="modal-overlay" onClick={()=>setModal(false)}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:540,maxHeight:'85vh',overflow:'auto'}}>
          <div className="modal-header"><h3 style={{fontSize:16,fontWeight:600}}>✏️ {nt.label}</h3><button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20}}>✕</button></div>
          <div className="modal-body">
            {nt.type==='trigger'&&<>
              <label className="label">Keywords (comma)</label><input className="input mb-4" placeholder="hello, hi, menu, help" value={data.keywords||''} onChange={e=>setData({...data,keywords:e.target.value})}/>
              <label className="label">Match</label>
              <select className="input mb-4" value={data.match||'contains'} onChange={e=>setData({...data,match:e.target.value})}>
                <option value="contains">Contains</option><option value="exact">Exact</option><option value="starts">Starts with</option><option value="regex">Regex</option>
              </select>
              <label className="label">Trigger on</label>
              <select className="input mb-4" value={data.triggerOn||'keyword'} onChange={e=>setData({...data,triggerOn:e.target.value})}>
                <option value="keyword">Message Keyword</option><option value="welcome">Welcome (first msg)</option><option value="template">Template Reply</option><option value="clickad">Click-to-WhatsApp Ad</option>
              </select>
            </>}
            {nt.type==='message'&&<>
              <label className="label">Message Type</label>
              <select className="input mb-4" value={data.msgType||'text'} onChange={e=>setData({...data,msgType:e.target.value})}>
                <option value="text">📝 Text</option><option value="image">🖼️ Image</option><option value="video">🎬 Video</option><option value="document">📄 Document</option><option value="audio">🎵 Audio</option><option value="location">📍 Location</option><option value="contact">👤 Contact Card</option><option value="list">📋 Interactive List</option><option value="catalog">🛍️ Product Card</option>
              </select>
              {(data.msgType==='text'||!data.msgType)&&<><label className="label">Text *</label><textarea className="input mb-4" rows={3} value={data.message||''} onChange={e=>setData({...data,message:e.target.value})} style={{resize:'vertical'}} placeholder="Type message... use {{name}} for variables"/></>}
              {(data.msgType==='image'||data.msgType==='video'||data.msgType==='document'||data.msgType==='audio')&&<>
                <label className="label">Media URL</label><input className="input mb-4" placeholder="https://..." value={data.mediaUrl||''} onChange={e=>setData({...data,mediaUrl:e.target.value})}/>
                <label className="label">Caption (optional)</label><input className="input mb-4" value={data.caption||''} onChange={e=>setData({...data,caption:e.target.value})}/>
              </>}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><label className="label" style={{margin:0}}>🔘 Buttons</label><button className="btn btn-sm btn-secondary" onClick={addBtn}>+ Add</button></div>
              {btns.map((b,i)=><div key={b.id} style={{background:'#f8fafc',padding:8,borderRadius:8,marginBottom:6,border:'1px solid #e2e8f0'}}>
                <div style={{display:'flex',gap:4,marginBottom:4}}>
                  <select style={{flex:1,border:'1px solid #e2e8f0',borderRadius:4,padding:'3px 6px',fontSize:11}} value={b.type} onChange={e=>updBtn(i,'type',e.target.value)}>
                    <option value="quick_reply">💬 Quick Reply</option><option value="url">🔗 URL</option><option value="call">📞 Call</option>
                  </select>
                  <button onClick={()=>rmBtn(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444'}}>✕</button>
                </div>
                <input style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:4,padding:'4px 8px',fontSize:11,boxSizing:'border-box'}} placeholder="Text" value={b.text} onChange={e=>updBtn(i,'text',e.target.value)}/>
                {b.type==='url'&&<input style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:4,padding:'4px 8px',fontSize:11,marginTop:4,boxSizing:'border-box'}} placeholder="https://..." value={b.url||''} onChange={e=>updBtn(i,'url',e.target.value)}/>}
                {b.type==='call'&&<input style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:4,padding:'4px 8px',fontSize:11,marginTop:4,boxSizing:'border-box'}} placeholder="+919876543210" value={b.phone||''} onChange={e=>updBtn(i,'phone',e.target.value)}/>}
              </div>)}
            </>}
            {nt.type==='ask'&&<>
              <label className="label">Question</label><input className="input mb-4" placeholder="What is your name?" value={data.question||''} onChange={e=>setData({...data,question:e.target.value})}/>
              <label className="label">Validation</label>
              <select className="input mb-4" value={data.validate||'text'} onChange={e=>setData({...data,validate:e.target.value})}>
                <option value="text">Text (any)</option><option value="number">Number</option><option value="email">Email</option><option value="date">Date</option><option value="phone">Phone</option><option value="media">Media (image/video/doc)</option><option value="location">Location</option><option value="regex">Custom Regex</option>
              </select>
              {data.validate==='regex'&&<><label className="label">Regex Pattern</label><input className="input mb-4" placeholder="^\d{10}$" value={data.regex||''} onChange={e=>setData({...data,regex:e.target.value})}/></>}
              <label className="label">Save to Attribute</label><input className="input mb-4" placeholder="customer_name" value={data.attribute||''} onChange={e=>setData({...data,attribute:e.target.value})}/>
              <label className="label">Error Message</label><input className="input mb-4" placeholder="Invalid. Try again." value={data.errorMsg||''} onChange={e=>setData({...data,errorMsg:e.target.value})}/>
            </>}
            {nt.type==='condition'&&<>
              <label className="label">Check</label>
              <select className="input mb-4" value={data.checkType||'keyword'} onChange={e=>setData({...data,checkType:e.target.value})}>
                <option value="keyword">Keyword in reply</option><option value="attribute">Attribute value</option><option value="time">Time of day</option><option value="tag">Has tag</option>
              </select>
              {data.checkType==='keyword'&&<input className="input mb-4" placeholder="yes, ok, confirm" value={data.condition||''} onChange={e=>setData({...data,condition:e.target.value})}/>}
              {data.checkType==='attribute'&&<><input className="input mb-4" placeholder="Attribute name" value={data.attribute||''} onChange={e=>setData({...data,attribute:e.target.value})}/><input className="input mb-4" placeholder="Value" value={data.condition||''} onChange={e=>setData({...data,condition:e.target.value})}/></>}
              {data.checkType==='time'&&<><label className="label">Between</label><input className="input mb-4" type="time" value={data.timeStart||'09:00'} onChange={e=>setData({...data,timeStart:e.target.value})}/><label className="label">And</label><input className="input mb-4" type="time" value={data.timeEnd||'18:00'} onChange={e=>setData({...data,timeEnd:e.target.value})}/></>}
              {data.checkType==='tag'&&<input className="input mb-4" placeholder="vip, customer" value={data.tag||''} onChange={e=>setData({...data,tag:e.target.value})}/>}
              <div style={{fontSize:12,color:'#64748b',marginTop:8}}>Connect the ✅ (true) and ❌ (false) outputs to different nodes.</div>
            </>}
            {nt.type==='action'&&<>
              <label className="label">Action Type</label>
              <select className="input mb-4" value={data.action||'tag'} onChange={e=>setData({...data,action:e.target.value})}>
                <option value="tag">🏷️ Add Tag</option><option value="rmtag">🗑️ Remove Tag</option>
                <option value="attr">📝 Set Attribute</option><option value="api">🔗 API Request</option>
                <option value="webhook">🪝 Call Webhook</option><option value="sheet">📊 Add to Google Sheets</option>
                <option value="crm">📇 Sync to CRM</option><option value="notify">🔔 Notify Team</option>
              </select>
              {['tag','rmtag'].includes(data.action)&&<input className="input mb-4" placeholder="Tag name" value={data.tag||''} onChange={e=>setData({...data,tag:e.target.value})}/>}
              {data.action==='attr'&&<><input className="input mb-4" placeholder="Attribute name" value={data.attribute||''} onChange={e=>setData({...data,attribute:e.target.value})}/><input className="input mb-4" placeholder="Value" value={data.tag||''} onChange={e=>setData({...data,tag:e.target.value})}/></>}
              {['api','webhook','sheet','crm'].includes(data.action)&&<>
                <label className="label">Method</label><select className="input mb-4" value={data.api||'GET'} onChange={e=>setData({...data,api:e.target.value})}><option>GET</option><option>POST</option><option>PUT</option></select>
                <label className="label">URL</label><input className="input mb-4" placeholder="https://..." value={data.url||''} onChange={e=>setData({...data,url:e.target.value})}/>
                {data.api!=='GET'&&<><label className="label">Body (JSON)</label><textarea className="input mb-4" rows={3} value={data.body||''} onChange={e=>setData({...data,body:e.target.value})} style={{fontFamily:'monospace',fontSize:11}}/></>}
              </>}
            </>}
            {nt.type==='delay'&&<>
              <label className="label">Wait Duration</label>
              <div style={{display:'flex',gap:8}}>
                <input className="input" type="number" value={data.delay||5} onChange={e=>setData({...data,delay:parseInt(e.target.value)||0})} min={1} style={{flex:1}}/>
                <select className="input" value={data.delayUnit||'seconds'} onChange={e=>setData({...data,delayUnit:e.target.value})} style={{width:120}}>
                  <option value="seconds">Seconds</option><option value="minutes">Minutes</option><option value="hours">Hours</option>
                </select>
              </div>
            </>}
            {nt.type==='handover'&&<>
              <label className="label">Escalation Reason</label><input className="input mb-4" placeholder="Customer requested human" value={data.reason||''} onChange={e=>setData({...data,reason:e.target.value})}/>
              <div style={{fontSize:12,color:'#64748b'}}>Agent gets notified in Live Chat with conversation history.</div>
            </>}
            {nt.type==='split'&&<>
              <label className="label">Split Percentage (%)</label><input className="input mb-4" type="number" value={data.percentage||50} onChange={e=>setData({...data,percentage:parseInt(e.target.value)||50})} min={1} max={99}/>
              <div style={{fontSize:12,color:'#64748b'}}>{data.percentage||50}% go to Path A (first connection), {100-(data.percentage||50)}% to Path B (second connection).</div>
            </>}
            {nt.type==='jump'&&<>
              <label className="label">Target Flow Name</label><input className="input mb-4" placeholder="Welcome Flow" value={data.flowName||''} onChange={e=>setData({...data,flowName:e.target.value})}/>
              <label className="label">Or Restart</label><div style={{fontSize:12,color:'#64748b'}}>Connect to a node in another flow. Leave blank to end.</div>
            </>}
            {nt.type==='catalog'&&<>
              <label className="label">Message above products</label><input className="input mb-4" placeholder="Check our products 👇" value={data.message||''} onChange={e=>setData({...data,message:e.target.value})}/>
              <label className="label">Products (comma separated IDs)</label><input className="input mb-4" placeholder="prod1,prod2,prod3" value={data.products||''} onChange={e=>setData({...data,products:e.target.value})}/>
              <label className="label">Footer</label><input className="input mb-4" placeholder="Tap to view" value={data.footer||''} onChange={e=>setData({...data,footer:e.target.value})}/>
            </>}
          </div>
          <div className="modal-footer"><button className="btn btn-secondary btn-sm" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>💾 Save</button></div>
        </div>
      </div>;
    })()}

    {toast&&<div className={`toast toast-${toast.t}`} style={{zIndex:300}}>{toast.m}</div>}
  </div>);
}
