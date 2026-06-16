import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, saveSettings } from '@/lib/db';
export async function GET() { return NextResponse.json(getAllSettings()); }
export async function POST(req: NextRequest) {
  const body = await req.json();
  saveSettings(body);
  return NextResponse.json({ success: true });
}
