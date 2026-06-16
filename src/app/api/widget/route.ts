import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings } from '@/lib/db';

// Generate embeddable widget JavaScript
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const settings = await getAllSettings();
  
  const phoneId = settings.whatsapp_phone_number_id || '';
  const color = url.searchParams.get('color') || '#25D366';
  const position = url.searchParams.get('position') || 'right';
  const welcome = url.searchParams.get('welcome') || '👋 Hi! How can we help you?';
  
  const js = `
(function() {
  if (document.getElementById('wa-widget')) return;
  
  var style = document.createElement('style');
  style.textContent = \`
    .wa-widget-btn {
      position: fixed;
      ${position === 'left' ? 'left' : 'right'}: 20px;
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${color};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      animation: wa-pulse 2s infinite;
    }
    .wa-widget-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }
    @keyframes wa-pulse {
      0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
      50% { box-shadow: 0 4px 24px ${color}60; }
    }
    .wa-widget-popup {
      position: fixed;
      ${position === 'left' ? 'left' : 'right'}: 20px;
      bottom: 90px;
      width: 360px;
      max-height: 500px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      z-index: 9999;
      overflow: hidden;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .wa-widget-popup.open { display: block; animation: wa-slideUp 0.3s ease; }
    @keyframes wa-slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .wa-widget-header {
      background: ${color};
      color: #fff;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .wa-widget-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }
    .wa-widget-title { font-weight: 700; font-size: 16px; }
    .wa-widget-subtitle { font-size: 12px; opacity: 0.8; }
    .wa-widget-body { padding: 16px; max-height: 300px; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; gap: 12px; }
    .wa-widget-msg {
      background: #fff; padding: 10px 14px; border-radius: 12px; font-size: 13px;
      width: fit-content; max-width: 85%; line-height: 1.5;
      border-bottom-left-radius: 2px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .wa-widget-input-area {
      padding: 12px 16px; border-top: 1px solid #e2e8f0;
      display: flex; gap: 8px; background: #fff;
    }
    .wa-widget-input {
      flex: 1; border: 1px solid #e2e8f0; border-radius: 20px;
      padding: 10px 14px; font-size: 13px; outline: none;
    }
    .wa-widget-send {
      width: 36px; height: 36px; border-radius: 50%; border: none;
      background: ${color}; color: #fff; cursor: pointer; flex-shrink: 0;
      font-size: 16px;
    }
  \`;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.className = 'wa-widget-btn';
  btn.id = 'wa-widget';
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
  
  var popup = document.createElement('div');
  popup.className = 'wa-widget-popup';
  popup.innerHTML = \`
    <div class="wa-widget-header">
      <div class="wa-widget-avatar">💬</div>
      <div>
        <div class="wa-widget-title">Chat with us</div>
        <div class="wa-widget-subtitle">We reply instantly</div>
      </div>
    </div>
    <div class="wa-widget-body" id="wa-chat-body">
      <div class="wa-widget-msg">${welcome}</div>
    </div>
    <div class="wa-widget-input-area">
      <input class="wa-widget-input" id="wa-chat-input" placeholder="Type your message..." />
      <button class="wa-widget-send" id="wa-chat-send">➤</button>
    </div>
  \`;

  document.body.appendChild(btn);
  document.body.appendChild(popup);

  var isOpen = false;
  btn.onclick = function() {
    isOpen = !isOpen;
    popup.classList.toggle('open', isOpen);
    if (isOpen) {
      document.getElementById('wa-chat-input').focus();
    }
  };

  // Send message to WhatsApp
  function sendMessage() {
    var input = document.getElementById('wa-chat-input');
    var body = document.getElementById('wa-chat-body');
    var msg = input.value.trim();
    if (!msg) return;
    
    // Add to chat
    var userMsg = document.createElement('div');
    userMsg.className = 'wa-widget-msg';
    userMsg.style.cssText = 'background:#d1fae5;margin-left:auto;border-bottom-right-radius:2px;border-bottom-left-radius:12px;';
    userMsg.textContent = msg;
    body.appendChild(userMsg);
    body.scrollTop = body.scrollHeight;
    
    // Send to server which forwards to WhatsApp
    fetch('${url.origin}/api/widget/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, sender: 'widget-user-' + Date.now() })
    }).catch(function() {});

    input.value = '';
    input.focus();
  }

  document.getElementById('wa-chat-send').onclick = sendMessage;
  document.getElementById('wa-chat-input').onkeydown = function(e) {
    if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
  };
})();
  `.trim();

  return new NextResponse(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
