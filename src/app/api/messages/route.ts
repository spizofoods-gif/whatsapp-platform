import { NextRequest, NextResponse } from 'next/server';
import { getMessages } from '@/lib/db';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const page = parseInt(u.searchParams.get('page') || '1');
  const limit = parseInt(u.searchParams.get('limit') || '50');
  return NextResponse.json(getMessages(page, limit));
}
