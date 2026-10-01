import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { is_active } = body;
    await query(`UPDATE system_advisories SET is_active = $1 WHERE id = 1`, [is_active]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
