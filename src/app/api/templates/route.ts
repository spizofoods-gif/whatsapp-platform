export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, saveTemplate, deleteTemplate } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const templates = await getTemplates();
  return NextResponse.json(templates);
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = await saveTemplate({ ...body, id: body.id || uuidv4() });
  return NextResponse.json({ success: true, id });
}
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  await deleteTemplate(id);
  return NextResponse.json({ success: true });
}
