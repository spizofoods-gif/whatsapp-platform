import { NextRequest, NextResponse } from 'next/server';
import { sendTextMessage } from '@/lib/whatsapp';
export async function POST(req: NextRequest) {
  try {
    const { message, sender } = await req.json();
    await sendTextMessage('919999999999', '📱 Website: ' + message + '\nFrom: ' + (sender || 'Anonymous'));
    return NextResponse.json({ success: true });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
