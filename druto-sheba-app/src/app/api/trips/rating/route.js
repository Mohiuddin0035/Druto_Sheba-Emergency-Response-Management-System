import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req) {
  try {
    const { trip_id, rating, comments } = await req.json();

    if (!trip_id || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sql = `
      INSERT INTO trip_feedback (trip_id, rating, comments)
      VALUES ($1, $2, $3)
      ON CONFLICT (trip_id) DO UPDATE SET rating = EXCLUDED.rating, comments = EXCLUDED.comments
      RETURNING *
    `;
    const values = [trip_id, rating, comments || null];
    
    const result = await query(sql, values);
    return NextResponse.json({ success: true, review: result.rows[0] });
  } catch (err) {
    console.error('Error adding rating:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
