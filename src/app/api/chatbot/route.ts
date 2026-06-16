export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getChatbotRules, saveChatbotRule, deleteChatbotRule } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const rules = await getChatbotRules();
  return NextResponse.json(rules);
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = await saveChatbotRule({ ...body, id: body.id || uuidv4() });
  return NextResponse.json({ success: true, id });
}
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  await deleteChatbotRule(id);
  return NextResponse.json({ success: true });
}
