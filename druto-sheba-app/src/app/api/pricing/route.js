import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query('SELECT base_fare, per_km_charge FROM pricing_config ORDER BY config_id DESC LIMIT 1');
    const pricing = result.rows[0] || { base_fare: 750, per_km_charge: 25 };
    
    return NextResponse.json(pricing);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
