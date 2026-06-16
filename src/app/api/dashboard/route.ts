import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
export async function GET() {
  const db = getDb();
  const tc = (db.prepare('SELECT COUNT(*) as c FROM contacts').get() as any).c;
  const oi = (db.prepare('SELECT COUNT(*) as c FROM contacts WHERE opted_in=1').get() as any).c;
  const tca = (db.prepare('SELECT COUNT(*) as c FROM campaigns').get() as any).c;
  const ac = (db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE status='running'").get() as any).c;
  const ms = (db.prepare("SELECT COUNT(*) as c FROM messages WHERE direction='outgoing'").get() as any).c;
  const mr = (db.prepare("SELECT COUNT(*) as c FROM messages WHERE direction='incoming'").get() as any).c;
  const del = (db.prepare('SELECT COALESCE(SUM(delivered_count),0) as c FROM campaigns').get() as any).c;
  const rd = (db.prepare('SELECT COALESCE(SUM(read_count),0) as c FROM campaigns').get() as any).c;
  const daily = db.prepare(`SELECT DATE(created_at) as date, SUM(CASE WHEN direction='outgoing' THEN 1 ELSE 0 END) as sent, SUM(CASE WHEN direction='incoming' THEN 1 ELSE 0 END) as received FROM messages WHERE created_at >= datetime('now','-7 days') GROUP BY DATE(created_at) ORDER BY date`).all();
  const recent = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 5').all();
  return NextResponse.json({
    stats: { totalContacts: tc, optedInContacts: oi, totalCampaigns: tca, activeCampaigns: ac, messagesSent: ms, messagesReceived: mr, delivered: del, read: rd, deliveryRate: ms>0?Math.round((del/ms)*100):0, readRate: del>0?Math.round((rd/del)*100):0 },
    dailyStats: daily, recentCampaigns: recent,
  });
}
