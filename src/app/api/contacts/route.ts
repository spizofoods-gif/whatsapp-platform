export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getContacts, saveContact, bulkSaveContacts, deleteContact } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
export async function GET(req: NextRequest) { const u = new URL(req.url); const s = u.searchParams.get('search') || ''; const tag = u.searchParams.get('tag') || ''; const page = parseInt(u.searchParams.get('page') || '1'); const limit = parseInt(u.searchParams.get('limit') || '50'); const result = await getContacts(s, tag, page, limit); return NextResponse.json(result); }
export async function POST(req: NextRequest) { const body = await req.json(); if (body.bulk) { const contacts = body.contacts.map((c: any) => ({ ...c, id: c.id || uuidv4() })); const imported = await bulkSaveContacts(contacts); return NextResponse.json({ success: true, imported }); } const id = await saveContact({ ...body, id: uuidv4() }); return NextResponse.json({ success: true, id }); }
export async function DELETE(req: NextRequest) { const id = new URL(req.url).searchParams.get('id'); if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 }); await deleteContact(id); return NextResponse.json({ success: true }); }
