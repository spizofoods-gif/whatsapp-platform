import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Get all conversations (grouped by contact)
export async function GET() {
  try {
    const { rows } = await sql`
      SELECT DISTINCT ON (c.id)
        c.id as contact_id,
        c.name,
        c.phone_number,
        m.content as last_message,
        m.direction as last_direction,
        m.created_at as last_message_time
      FROM contacts c
      INNER JOIN messages m ON m.contact_id = c.id
      WHERE m.id IN (
        SELECT MAX(id) FROM messages WHERE contact_id = c.id GROUP BY contact_id
      )
      ORDER BY c.id, m.created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (e: any) {
    // If no messages yet, return empty
    return NextResponse.json([]);
  }
}
