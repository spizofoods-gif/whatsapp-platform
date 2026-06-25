export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, saveSettings } from '@/lib/db';

export async function GET() {
  const settings = await getAllSettings();
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await saveSettings(body);
  return NextResponse.json({ success: true });
}
