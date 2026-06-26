'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const EMOJIS = ['😀','😂','❤️','👍','🔥','🎉','🙏','😍','🤔','😢','😡','🥳','💪','✨','✅','❌','⭐','💰','📱','🔗','📸','🎵','📄','📍','🏠','🚀','💡','🎯','⚡','🌟','👋','💬','🤖','📊','📈','🎁','🛒','💳','📦','🏷️','🔔','📝','🗓️','⏰','🔒','🌍','👥','💼','🏆'];

export default function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{m:string;t:string}|null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [filter, setFilter] = useState('all');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const notify = (m:string,t='success')=>{setToast({m,t});setTimeout(()=>setToast(null),2500)};

  const fetchConversations = useCallback(async()=>{
    try{const r=await fetch('/api/conversations');const d=await r.json();if(Array.isArray(d))setConversations(d)}catch{}
  },[]);
  const fetchMessages = useCallback(async(cid:string)=>{
    const r=await fetch(`/api/messages?contact_id=${cid}&page=1&limit=200`);
    const d=await r.json();setMessages(d.messages||[]);
    chatEndRef.current?.scrollIntoView({behavior:'smooth'});
  },[]);

  useEffect(()=>{fetchConversations();setLoading(false)},[fetchConversations]);
  useEffect(()=>{if(selectedContact){fetchMessages(selectedContact.contact_id);const i=setInterval(()=>fetchMessages(selectedContact.contact_id),4000);return ()=>clearInterval(i)}},[selectedContact,fetchMessages]);
  useEffect(()=>{const i=setInterval(fetchConversations,6000);return ()=>clearInterval(i)},[fetchConversations]);

  const handleSend = async()=>{
    if(!reply.trim()||!selectedContact)return;setSending(true);
    try{
      const r=await fetch('/api/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone_number:selectedContact.phone_number,message:reply,contact_id:selectedContact.contact_id})});
      if(r.ok){setReply('');fetchMessages(selectedContact.contact_id);}else{const e=await r.json();notify(e.error||'Failed','error')}
    }catch{notify('Error','error')}setSending(false);
  };

  const fmt=(ts:string)=>{if(!ts)return'';const d=new Date(ts);const n=new Date();const td=d.toDateString()===n.toDateString();return td?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'})+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});};

  const filtered = filter==='all'?conversations:conversations.filter((c:any)=>filter==='unread'?c.last_direction==='incoming':filter==='tagged'?true:c.last_direction==='outgoing');

  return (<div style={{display:'flex',height:'calc(100vh - 48px)',gap:0,marginTop:-24,background:'#fff'}}>
    {/* Left: Conversation list */}
    <div style={{width:330,borderRight:'1px solid #e2e8f0',background:'#fff',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'12px 14px',borderBottom:'1px solid #e2e8f0'}}>
        <h2 style={{fontSize:16,fontWeight:700,margin:0}}>💬 Conversations</h2>
        <div style={{display:'flex',gap:4,marginTop:8}}>
          {[{k:'all',l:'All'},{k:'unread',l:'Unread'},{k:'outgoing',l:'Sent'}].map(f=><button key={f.k} onClick={()=>setFilter(f.k)} style={{padding:'4px 10px',borderRadius:14,fontSize:11,border:`1px solid ${filter===f.k?'#128C7E':'#e2e8f0'}`,background:filter===f.k?'#f0fdf4':'#fff',color:filter===f.k?'#166534':'#64748b',cursor:'pointer',fontWeight:filter===f.k?600:400}}>{f.l}</button>)}
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {filtered.length===0?<div style={{textAlign:'center',padding:40,color:'#94a3b8',fontSize:12}}>No conversations</div>:
          filtered.map((c:any)=><div key={c.contact_id} onClick={()=>setSelectedContact(c)} style={{padding:'12px 14px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',background:selectedContact?.contact_id===c.contact_id?'#f0fdf4':'#fff',borderLeft:selectedContact?.contact_id===c.contact_id?'3px solid #25D366':'3px solid transparent',transition:'all .12s'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}><span style={{fontWeight:600,fontSize:13}}>{c.name||'+'+c.phone_number}</span><span style={{fontSize:9,color:'#94a3b8'}}>{fmt(c.last_message_time)}</span></div>
            <div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:9,background:c.last_direction==='incoming'?'#dcfce7':'#f1f5f9',color:c.last_direction==='incoming'?'#166534':'#64748b',padding:'1px 5px',borderRadius:4}}>{c.last_direction==='incoming'?'← In':'→ Out'}</span><span style={{fontSize:11,color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{c.last_message||'[Media]'}</span></div>
          </div>)
        }
      </div>
    </div>

    {/* Right: Chat window */}
    <div style={{flex:1,display:'flex',flexDirection:'column',background:'#f8fafc'}}>
      {!selectedContact?<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',textAlign:'center'}}><div><div style={{fontSize:48}}>💬</div><div style={{fontSize:15,fontWeight:500,marginTop:8}}>Select a conversation</div><div style={{fontSize:12,marginTop:4}}>Pick from the left to start chatting</div></div></div>:<>
        {/* Header */}
        <div style={{padding:'12px 16px',background:'#fff',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#25D366,#128C7E)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:15}}>{(selectedContact.name||'?')[0].toUpperCase()}</div>
          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{selectedContact.name||'Customer'}</div><div style={{fontSize:11,color:'#64748b'}}>+{selectedContact.phone_number}</div></div>
          <button className="btn btn-sm btn-secondary" onClick={()=>notify('🏷️ Tag saved')}>🏷️ Tag</button>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:'auto',padding:'14px 18px',display:'flex',flexDirection:'column',gap:6,background:'#efeae2'}}>
          {messages.length===0?<div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>No messages yet</div>:
            [...messages].reverse().map((m:any)=><div key={m.id} style={{display:'flex',justifyContent:m.direction==='outgoing'?'flex-end':'flex-start',marginBottom:4}}>
              <div style={{maxWidth:'75%',padding:'8px 12px',borderRadius:8,background:m.direction==='outgoing'?'#d9fdd3':'#fff',boxShadow:'0 1px 2px rgba(0,0,0,.08)',position:'relative'}}>
                <div style={{fontSize:13,lineHeight:1.45,wordBreak:'break-word',whiteSpace:'pre-wrap'}}>{m.content||'[Media]'}</div>
                <div style={{fontSize:10,color:'#667781',textAlign:'right',marginTop:2}}>{fmt(m.created_at)}{m.direction==='outgoing'?<span style={{marginLeft:3}}>{m.status==='read'?'✓✓':m.status==='delivered'?'✓✓':'✓'}</span>:''}</div>
              </div>
            </div>)
          }
          <div ref={chatEndRef}/>
        </div>

        {/* Input */}
        <div style={{padding:'10px 14px',background:'#f0f2f5',display:'flex',gap:8,alignItems:'center',position:'relative'}}>
          <button onClick={()=>setShowEmoji(!showEmoji)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,padding:4}} title="Emoji">😊</button>
          <input ref={inputRef} style={{flex:1,padding:'10px 14px',border:'1px solid #fff',borderRadius:22,fontSize:13,outline:'none',background:'#fff'}} placeholder="Type message..." value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()}}}/>
          {reply.trim()&&<button onClick={handleSend} disabled={sending} style={{width:40,height:40,borderRadius:'50%',border:'none',background:sending?'#a7f3d0':'#25D366',color:'#fff',cursor:sending?'not-allowed':'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{sending?'⏳':'➤'}</button>}

          {/* Emoji picker */}
          {showEmoji&&<div style={{position:'absolute',bottom:60,left:14,background:'#fff',borderRadius:12,padding:10,boxShadow:'0 8px 32px rgba(0,0,0,.15)',zIndex:200,display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:4,width:360}}>
            {EMOJIS.map(e=><button key={e} onClick={()=>{setReply(reply+e);setShowEmoji(false);inputRef.current?.focus()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,padding:4,borderRadius:6,transition:'background .1s'}} onMouseEnter={e=>e.currentTarget.style.background='#f1f5f9'} onMouseLeave={e=>e.currentTarget.style.background='none'}>{e}</button>)}
          </div>}
        </div>
      </>}
    </div>
    {toast&&<div className={`toast toast-${toast.t}`}>{toast.m}</div>}
  </div>);
}
