import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/db';

export async function GET() { return NextResponse.json(getDashboardStats()); }
