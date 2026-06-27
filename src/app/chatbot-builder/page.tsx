'use client';
import { useState, useRef } from 'react';

interface Button { id:string; type:'quick_reply'|'url'|'call'|'COPY_CODE'; text:string; url?:string; phone?:string }
interface FlowNode { id:string; type:string; label:string; data:Record<string,any>; x:number; y:number; connections:string[]; buttons?:Button[] }

const ALL_NODES=[
  {type:'trigger',label:'🎯 Start',color:'#3b82f6',desc:'Keyword / Welcome / Ad click',category:'start'},
  {type:'message',label:'💬 Message',color:'#25D366',desc:'Text + media + buttons',category:'send'},
  {type:'ask',label:'❓ Question',color:'#06b6d4',desc:'Ask + validate reply',category:'send'},
  {type:'catalog',label:'🛒 Products',color:'#f97316',desc:'Show product catalog',category:'send'},
  {type:'condition',label:'🔀 Branch',color:'#f59e0b',desc:'If/else on keywords',category:'logic'},
  {type:'action',label:'⚡ Action',color:'#8b5cf6',desc:'Tag / API / Webhook',category:'logic'},
  {type:'delay',label:'⏱️ Wait',color:'#6b7280',desc:'Pause N seconds',category:'logic'},
  {type:'handover',label:'🧑 Human',color:'#ef4444',desc:'Route to live agent',category:'flow'},
  {type:'end',label:'🏁 Stop',color:'#9ca3af',desc:'End conversation',category:'flow'},
];

const gid=()=>'n_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);

const SAMPLE: FlowNode[]=[
  {id:"s1",type:"trigger",label:"🎯 Start",data:{keywords:"hello,hi,menu,help,order",match:"contains"},x:180,y:30,connections:["s2"]},
  {id:"s2",type:"message",label:"💬 Greet",data:{message:"👋 Welcome to SPIZO! Premium spices & dry fruits.\nHow can we help today?"},x:180,y:170,connections:["s3"],buttons:[{id:"b1",type:"quick_reply",text:"🛍️ Products"},{id:"b2",type:"quick_reply",text:"📋 Order"},{id:"b3",type:"quick_reply",text:"💰 Deals"}]},
  {id:"s3",type:"condition",label:"🔀 Intent",data:{condition:"order,buy,purchase"},x:180,y:320,connections:["s4","s5"]},
  {id:"s4",type:"ask",label:"❓ Choice",data:{question:"What interests you?\n1. Spices\n2. Dry Fruits\n3. Papad\n4. Combos"},x:-60,y:490,connections:["s6"]},
  {id:"s5",type:"message",label:"💬 Catalog",data:{message:"🍱 Our Range:\n• Premium Spices\n• Dry Fruits & Panchmeva\n• Handmade Papad\n• Peri Peri Seasonings\n\nAll FSSAI certified ✅"},x:400,y:490,connections:["s7"],buttons:[{id:"b4",type:"url",text:"🌐 spizofoods.com",url:"https://www.spizofoods.com"}]},
  {id:"s6",type:"action",label:"⚡ Tag",data:{action:"tag",tag:"interested"},x:-60,y:660,connections:["s8"]},
  {id:"s7",type:"delay",label:"⏱️ 3s",data:{delay:3},x:400,y:660,connections:["s8"]},
  {id:"s8",type:"message",label:"💬 Contact",data:{message:"📞 Contact us:\nWhatsApp: +91 90545 89997\nCall: +91 84900 89997\n✉️ wecare@spizofoods.com"},x:180,y:810,connections:["s9"],buttons:[{id:"b5",type:"quick_reply",text:"👋 Live Agent"}]},
  {id:"s9",type:"handover",label:"🧑 Agent",data:{reason:"Customer wants human"},x:180,y:960,connections:[]},
];

export default function FlowBuilder(){
  const [nodes,setNodes]=useState<FlowNode[]>(SAMPLE);
  const [selected,setSelected]=useState<string|null>(null);
  const [modal,setModal]=useState(false);
  const [data,setData]=useState<any>({});
  const [btns,setBtns]=useState<Button[]>([]);
  const [name,setName]=useState('SPIZO Welcome Bot');
  const [toast,setToast]=useState<{m:string;t:string}|null>(null);
  const [connect,setConnect]=useState<string|null>(null);
  const [zoom,setZoom]=useState(90);
  const canvas=useRef<HTMLDivElement>(null);
  const drag=useRef<any>(null);

  const notify=(m:string,t='success')=>{setToast({m,t});setTimeout(()=>setToast(null),2500)};
  const add=(type:string)=>{const nt=ALL_NODES.find(n=>n.type===type);setNodes([...nodes,{id:gid(),type,label:nt?.label||type,data:{message:'',keywords:'',match:'contains'},x:200+Math.random()*200,y:100+nodes.length*100,connections:[],buttons:type==='message'?[]:undefined}])};
  const mdown=(e:React.MouseEvent,nid:string)=>{e.stopPropagation();const n=nodes.find(x=>x.id===nid);if(!n)return;drag.current={id:nid,sx:e.clientX,sy:e.clientY,ox:n.x,oy:n.y}};
  const mmove=(e:React.MouseEvent)=>{if(!drag.current)return;setNodes(p=>p.map(n=>n.id===drag.current.id?{...n,x:drag.current.ox+(e.clientX-drag.current.sx)/zoom*100,y:drag.current.oy+(e.clientY-drag.current.sy)/zoom*100}:n))};
  const mup=()=>{drag.current=null};
  const link=(fid:string,tid:string)=>{if(fid===tid)return;setNodes(p=>p.map(n=>n.id===fid?{...n,connections:n.connections.includes(tid)?n.connections:[...n.connections,tid]}:n));setConnect(null);notify('Linked!')};
  const edit=(nid:string)=>{const n=nodes.find(x=>x.id===nid);if(!n)return;setSelected(nid);setData({...n.data});setBtns(n.buttons?[...n.buttons]:[]);setModal(true)};
  const save=()=>{if(!selected)return;setNodes(p=>p.map(n=>n.id===selected?{...n,data,buttons:btns.length>0?btns:(n.type==='message'?[]:undefined)}:n));setModal(false);notify('Saved')};
  const delNode=(nid:string)=>{setNodes(p=>p.filter(n=>n.id!==nid).map(n=>({...n,connections:n.connections.filter(c=>c!==nid)})))};
  const addBtn=()=>setBtns([...btns,{id:gid(),type:'quick_reply',text:''}]);
  const updBtn=(i:number,f:string,v:string)=>{const nb=[...btns];(nb[i]as any)[f]=v;setBtns(nb)};
  const rmBtn=(i:number)=>setBtns(btns.filter((_,j)=>j!==i));
  const clr=(t:string)=>ALL_NODES.find(n=>n.type===t)?.color||'#94a3b8';

  const saveAsRules=async()=>{const trig=nodes.find(n=>n.type==='trigger');const msgs=nodes.filter(n=>['message','ask','catalog'].includes(n.type));if(!trig||!msgs.length){notify('Need Start + at least 1 Message','error');return}for(const m of msgs){await fetch('/api/chatbot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:`${name}-${m.id.slice(-6)}`,trigger_type:'keyword',trigger_keywords:(trig.data.keywords||'hello').split(',').map((k:string)=>k.trim()).filter(Boolean),trigger_match:trig.data.match||'contains',response_type:'text',response_text:m.data.message||m.data.question||'Hi!',is_active:true,priority:nodes.indexOf(m)})})}notify(`✅ ${msgs.length} rules saved!`)};

  return (<div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 48px)',marginTop:-24,background:'#f0f2f5'}}>
    {/* Toolbar */}
    <div style={{background:'#fff',padding:'10px 16px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',justifyContent:'space-between'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <h2 style={{fontSize:17,fontWeight:700,margin:0}}>🤖 Flow Builder</h2>
        <input style={{border:'1px solid #e2e8f0',borderRadius:8,padding:'6px 12px',fontSize:12,width:180}} value={name} onChange={e=>setName(e.target.value)}/>
        <button className="btn btn-sm btn-primary" style={{background:'#25D366',border:'none'}} onClick={saveAsRules}>⚡ Deploy Rules</button>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <span style={{fontSize:11,color:'#64748b'}}>Zoom</span>
        <button style={{border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 10px',background:'#fff',cursor:'pointer',fontSize:13}} onClick={()=>setZoom(z=>Math.max(40,z-10))}>−</button>
        <span style={{fontSize:12,fontWeight:600,width:36,textAlign:'center'}}>{zoom}%</span>
        <button style={{border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 10px',background:'#fff',cursor:'pointer',fontSize:13}} onClick={()=>setZoom(z=>Math.min(150,z+10))}>+</button>
      </div>
    </div>

    <div style={{display:'flex',flex:1,overflow:'hidden'}}>
      {/* Left Sidebar */}
      <div style={{width:200,background:'#fff',borderRight:'1px solid #e2e8f0',overflowY:'auto',padding:12}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#94a3b8',marginBottom:10}}>Add Nodes</div>
        {ALL_NODES.map(nt=>(<div key={nt.type} onClick={()=>add(nt.type)} 
          style={{padding:'10px 12px',marginBottom:6,borderRadius:10,background:nt.color+'12',border:`1.5px solid ${nt.color}30`,cursor:'pointer',transition:'all .15s',display:'flex',alignItems:'center',gap:8}}
          onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.03)';e.currentTarget.style.boxShadow=`0 2px 8px ${nt.color}20`}}
          onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='none'}}>
          <span style={{fontSize:18}}>{nt.label.split(' ')[0]}</span>
          <div><div style={{fontWeight:600,fontSize:12,color:nt.color}}>{nt.label.split(' ').slice(1).join(' ')}</div><div style={{fontSize:10,color:'#94a3b8'}}>{nt.desc}</div></div>
        </div>))}
        <div style={{marginTop:12,padding:10,background:'#fef3c7',borderRadius:10,fontSize:10,color:'#92400e',lineHeight:1.5}}>
          <strong>💡 SPIZO bot loaded.</strong><br/>Click nodes to edit. Drag to move. Click <strong>+ Link</strong> to connect two nodes together.
        </div>
      </div>

      {/* Canvas */}
      <div ref={canvas} style={{flex:1,position:'relative',overflow:'auto',background:'#f8fafc'}} onMouseMove={mmove} onMouseUp={mup}>
        {/* Grid */}
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle, #d1d5db 1px, transparent 1px)',backgroundSize:`${20*(zoom/100)}px ${20*(zoom/100)}px`,opacity:0.3}}/>

        {/* SVG Connectors - THICK AND VISIBLE */}
        <svg style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:5,overflow:'visible'}}>
          {nodes.map(n=>n.connections.map(tid=>{const t=nodes.find(x=>x.id===tid);if(!t)return null;
            const x1=n.x+80,y1=n.y+55,x2=t.x+80,y2=t.y+15;
            const midY=(y1+y2)/2;
            const path=`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
            return <g key={n.id+tid}>
              <path d={path} fill="none" stroke={n.connections.length>1?'#f59e0b':'#3b82f6'} strokeWidth={3} opacity={0.7} strokeLinecap="round"/>
              <circle cx={x2} cy={y2} r={5} fill={n.connections.length>1?'#f59e0b':'#3b82f6'} opacity={0.8}/>
            </g>;
          }))}
        </svg>

        {/* Nodes */}
        {nodes.map(n=>{
          const isMsg=n.type==='message'||n.type==='ask';
          return (<div key={n.id} onMouseDown={e=>mdown(e,n.id)} onClick={()=>edit(n.id)}
            style={{position:'absolute',left:n.x,top:n.y,width:isMsg?170:150,padding:isMsg?'10px 12px':'8px 10px',borderRadius:14,background:'#fff',border:`2px solid ${selected===n.id?'#3b82f6':clr(n.type)}`,boxShadow:selected===n.id?'0 4px 24px rgba(59,130,246,.25)':'0 2px 8px rgba(0,0,0,.06)',cursor:'pointer',zIndex:10,transition:'box-shadow .2s',transform:`scale(${zoom/100})`,transformOrigin:'0 0'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <span style={{fontSize:12,fontWeight:600,color:clr(n.type)}}>{n.label}</span>
              <button onClick={e=>{e.stopPropagation();delNode(n.id)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:14,opacity:.4,color:'#ef4444'}}>×</button>
            </div>
            <div style={{fontSize:10,color:'#64748b',maxHeight:40,overflow:'hidden',lineHeight:1.4,marginBottom:4}}>
              {n.data.message?.substring(0,60)||n.data.keywords||n.data.question?.substring(0,40)||n.data.tag||n.data.reason||'(click to edit)'}
            </div>
            {/* Buttons on node */}
            {(n.buttons||[]).length>0&&<div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:4}}>
              {(n.buttons||[]).map(b=><span key={b.id} style={{fontSize:9,background:'#dbeafe',color:'#1e40af',padding:'2px 7px',borderRadius:10,fontWeight:500}}>{b.type==='url'?'🔗':b.type==='COPY_CODE'?'📋':'💬'} {b.text}</span>)}
            </div>}
            {/* Link button */}
            {connect===n.id?<button style={{width:'100%',padding:'3px 0',fontSize:9,border:'none',borderRadius:6,background:'#dbeafe',color:'#2563eb',cursor:'pointer',fontWeight:600}}>Click target node...</button>:
            <button onClick={e=>{e.stopPropagation();if(connect){link(connect,n.id)}else{setConnect(n.id)}}} style={{width:'100%',padding:'3px 0',fontSize:10,border:'1px solid #e2e8f0',borderRadius:6,background:connect?'#fef3c7':'#f9fafb',cursor:'pointer',color:connect?'#92400e':'#94a3b8',fontWeight:connect?600:400}}>{connect?'← Connect here':'+ Link'}</button>}
          </div>);
        })}

        {nodes.length===0&&<div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:56}}>🤖</div><div style={{fontSize:15,fontWeight:600,marginTop:8}}>Build Your Bot</div><div style={{fontSize:12,marginTop:4}}>Click nodes from the left panel to add them</div></div>}
      </div>
    </div>

    {/* Edit Modal */}
    {modal&&selected&&(()=>{const nt=nodes.find(n=>n.id===selected);if(!nt)return null;return <div className="modal-overlay" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:520,maxHeight:'85vh',overflow:'auto'}}><div className="modal-header"><h3 style={{fontSize:16,fontWeight:600}}>✏️ {nt.label}</h3><button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20}}>✕</button></div><div className="modal-body">
      {nt.type==='trigger'&&<><label className="label">Keywords (comma separated)</label><input className="input mb-4" placeholder="hello, hi, menu, help" value={data.keywords||''} onChange={e=>setData({...data,keywords:e.target.value})}/><label className="label">Match Type</label><select className="input mb-4" value={data.match||'contains'} onChange={e=>setData({...data,match:e.target.value})}><option value="contains">Contains keyword</option><option value="exact">Exact match</option><option value="starts">Starts with</option></select></>}
      {nt.type==='message'&&<><label className="label">Message Text *</label><textarea className="input mb-4" rows={4} value={data.message||''} onChange={e=>setData({...data,message:e.target.value})} style={{resize:'vertical',fontSize:13}} placeholder="Type your message here..."/><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><label className="label" style={{margin:0}}>🔘 Buttons</label><button type="button" className="btn btn-sm btn-secondary" onClick={addBtn}>+ Add Button</button></div>{btns.length===0&&<div style={{fontSize:11,color:'#94a3b8',padding:12,border:'1px dashed #e2e8f0',borderRadius:8,textAlign:'center',marginBottom:8}}>No buttons added yet</div>}{btns.map((b,i)=>(<div key={b.id} style={{background:'#f8fafc',padding:10,borderRadius:10,marginBottom:8,border:'1px solid #e2e8f0'}}><div style={{display:'flex',gap:6,marginBottom:6}}><select style={{flex:1,border:'1px solid #e2e8f0',borderRadius:6,padding:'5px 8px',fontSize:11}} value={b.type} onChange={e=>updBtn(i,'type',e.target.value)}><option value="quick_reply">💬 Quick Reply</option><option value="url">🔗 Website URL</option><option value="call">📞 Phone Call</option><option value="COPY_CODE">📋 Copy Code</option></select><button type="button" onClick={()=>rmBtn(i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:16}}>×</button></div><input style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 10px',fontSize:12,boxSizing:'border-box',marginBottom:4}} placeholder="Button text" value={b.text} onChange={e=>updBtn(i,'text',e.target.value)} maxLength={25}/>{b.type==='url'&&<input style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 10px',fontSize:12,boxSizing:'border-box'}} placeholder="https://..." value={b.url||''} onChange={e=>updBtn(i,'url',e.target.value)}/>}{b.type==='call'&&<input style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 10px',fontSize:12,boxSizing:'border-box'}} placeholder="+919054589997" value={b.phone||''} onChange={e=>updBtn(i,'phone',e.target.value)}/>}</div>))}</>}
      {nt.type==='ask'&&<><label className="label">Question</label><input className="input mb-4" placeholder="What is your name?" value={data.question||''} onChange={e=>setData({...data,question:e.target.value})}/><label className="label">Validation</label><select className="input mb-4" value={data.validate||'text'} onChange={e=>setData({...data,validate:e.target.value})}><option value="text">Any text</option><option value="number">Number</option><option value="email">Email</option><option value="phone">Phone</option></select><label className="label">Save to Attribute</label><input className="input mb-4" placeholder="customer_name" value={data.attribute||''} onChange={e=>setData({...data,attribute:e.target.value})}/></>}
      {nt.type==='condition'&&<><label className="label">If user reply contains</label><input className="input mb-4" placeholder="yes, ok, confirm, order" value={data.condition||''} onChange={e=>setData({...data,condition:e.target.value})}/><div style={{fontSize:12,color:'#64748b',padding:10,background:'#fef3c7',borderRadius:8}}>Connect <strong>first link</strong> (✅ yes) and <strong>second link</strong> (❌ no) to different nodes</div></>}
      {nt.type==='action'&&<><label className="label">Action</label><select className="input mb-4" value={data.action||'tag'} onChange={e=>setData({...data,action:e.target.value})}><option value="tag">🏷️ Add Tag</option><option value="api">🔗 API Request</option><option value="webhook">🪝 Webhook</option></select>{['tag'].includes(data.action)&&<input className="input mb-4" placeholder="Tag name" value={data.tag||''} onChange={e=>setData({...data,tag:e.target.value})}/>}</>}
      {nt.type==='delay'&&<><label className="label">Wait (seconds)</label><input className="input mb-4" type="number" value={data.delay||5} onChange={e=>setData({...data,delay:parseInt(e.target.value)||1})} min={1} max={3600}/></>}
      {nt.type==='handover'&&<><label className="label">Escalation Reason</label><input className="input mb-4" placeholder="Customer requested human help" value={data.reason||''} onChange={e=>setData({...data,reason:e.target.value})}/></>}
    </div><div className="modal-footer"><button className="btn btn-secondary btn-sm" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>💾 Save Node</button></div></div></div>})()}
    {toast&&<div className={`toast toast-${toast.t}`} style={{zIndex:300}}>{toast.m}</div>}
  </div>);
}
