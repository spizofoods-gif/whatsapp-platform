export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings } from '@/lib/db';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const settings = await getAllSettings();
  const color = url.searchParams.get('color') || '#25D366';
  const position = url.searchParams.get('position') || 'right';
  const welcome = url.searchParams.get('welcome') || '👋 Hi! How can we help you?';

  const js = `
(function() {
  if (document.getElementById('wa-widget')) return;
  var s = document.createElement('style');
  s.textContent = '.wa-btn{position:fixed;${position==='left'?'left':'right'}:20px;bottom:20px;width:60px;height:60px;border-radius:50%;background:${color};border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.15);z-index:9999;display:flex;align-items:center;justify-content:center;transition:transform .2s}.wa-btn:hover{transform:scale(1.1)}.wa-popup{position:fixed;${position==='left'?'left':'right'}:20px;bottom:90px;width:360px;max-height:500px;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.15);z-index:9999;overflow:hidden;display:none;font-family:system-ui,sans-serif}.wa-popup.o{display:block}.wa-hdr{background:${color};color:#fff;padding:16px;display:flex;align-items:center;gap:10px}.wa-body{padding:12px;max-height:280px;overflow-y:auto;background:#f8fafc}.wa-msg{background:#fff;padding:8px 12px;border-radius:10px;font-size:13px;width:fit-content;max-width:85%}.wa-inp{padding:12px;border-top:1px solid #e2e8f0;display:flex;gap:8px}.wa-inp input{flex:1;border:1px solid #e2e8f0;border-radius:20px;padding:8px 12px;font-size:13px;outline:none}.wa-inp button{width:36px;height:36px;border-radius:50%;border:none;background:${color};color:#fff;cursor:pointer}';
  document.head.appendChild(s);
  var b=document.createElement('button');b.className='wa-btn';b.id='wa-widget';b.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
  var p=document.createElement('div');p.className='wa-popup';
  p.innerHTML='<div class="wa-hdr"><div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px">💬</div><div><div style="font-weight:700;font-size:14px">Chat with us</div><div style="font-size:11px;opacity:.8">We reply instantly</div></div></div><div class="wa-body" id="wa-body"><div class="wa-msg">${welcome}</div></div><div class="wa-inp"><input id="wa-input" placeholder="Type message..."/><button id="wa-send">➤</button></div>';
  document.body.appendChild(b);document.body.appendChild(p);
  var o=false;b.onclick=function(){o=!o;p.classList.toggle('o',o);if(o)document.getElementById('wa-input').focus()};
  document.getElementById('wa-send').onclick=function(){var i=document.getElementById('wa-input');var m=i.value.trim();if(!m)return;var d=document.getElementById('wa-body');var u=document.createElement('div');u.className='wa-msg';u.style.cssText='background:#d1fae5;margin-left:auto';u.textContent=m;d.appendChild(u);d.scrollTop=d.scrollHeight;i.value='';i.focus()};
  document.getElementById('wa-input').onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();document.getElementById('wa-send').click()}};
})();
`.trim();

  return new NextResponse(js, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
