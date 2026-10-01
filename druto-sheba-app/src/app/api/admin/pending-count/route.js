import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const totalResult = await query(`
      SELECT COUNT(*) as count 
      FROM emergency_requests 
      WHERE status IN ('Pending', 'Broadcast')
    `);
    
    const count = parseInt(totalResult.rows[0]?.count || '0', 10);
    
    return NextResponse.json({ 
      count, 
      hasOverdue: count > 0 
    });
  } catch (error) {
    console.error('Pending count API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
