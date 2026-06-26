export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/db';
export async function GET() { const s = await getDashboardStats(); return NextResponse.json(s); }
