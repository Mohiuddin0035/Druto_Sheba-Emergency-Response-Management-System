import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query('SELECT * FROM specializations ORDER BY spec_name');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch specializations error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
