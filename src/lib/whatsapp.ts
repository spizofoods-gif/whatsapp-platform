import axios from 'axios';
import { getAllSettings } from './db';

const BASE = 'https://graph.facebook.com/v19.0';
let cfgCache:any=null; let cfgTime=0;

async function getConfig() {
  const now=Date.now(); if(cfgCache&&(now-cfgTime<30000))return cfgCache;
  const s=await getAllSettings();
  if(!s.whatsapp_phone_number_id||!s.whatsapp_access_token)return null;
  cfgCache={phoneNumberId:s.whatsapp_phone_number_id,accessToken:s.whatsapp_access_token,verifyToken:s.whatsapp_verify_token||'whatsapp_verify_123'};
  cfgTime=now; return cfgCache;
}
function np(p:string):string{let c=p.replace(/[\s\-\(\)\+]/g,'');if(!c.startsWith('91')&&c.length===10)c='91'+c;return c;}

async function send(to:string,data:any){
  const cfg=await getConfig();if(!cfg)throw new Error('WhatsApp not configured');
  try{const r=await axios.post(`${BASE}/${cfg.phoneNumberId}/messages`,{messaging_product:'whatsapp',recipient_type:'individual',to:np(to),...data},{headers:{Authorization:`Bearer ${cfg.accessToken}`,'Content-Type':'application/json'}});return r.data}
  catch(e:any){throw new Error(e.response?.data?.error?.message||e.message)}
}

export async function sendTextMessage(to:string,text:string,previewUrl=false){return send(to,{type:'text',text:{body:text,preview_url:previewUrl}})}
export async function sendTemplateMessage(to:string,templateName:string,language='en'){return send(to,{type:'template',template:{name:templateName,language:{code:language}}})}
export async function markAsRead(messageId:string){const cfg=await getConfig();if(!cfg)return;try{await axios.post(`${BASE}/${cfg.phoneNumberId}/messages`,{messaging_product:'whatsapp',status:'read',message_id:messageId},{headers:{Authorization:`Bearer ${cfg.accessToken}`}})}catch{}}
