export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, saveTemplate, deleteTemplate } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const t = await getTemplates();
    return NextResponse.json(t || []);
  } catch (e: any) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const id = await saveTemplate({ ...b, id: b.id || uuidv4() });
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    console.error('Template save error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await deleteTemplate(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
