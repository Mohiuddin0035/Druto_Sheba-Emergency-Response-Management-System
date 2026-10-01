import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query(`
      SELECT tf.*, p.name as patient_name, a.license_plate, d.name as driver_name
      FROM Trip_Feedback tf
      JOIN Trip_Logs tl ON tf.trip_id = tl.trip_id
      JOIN Emergency_Requests er ON tl.trip_id = er.request_id::text::text
      JOIN Patients p ON er.patient_id = p.patient_id
      JOIN Ambulances a ON tl.vehicle_id = a.vehicle_id
      JOIN Drivers d ON tl.driver_id = d.driver_id
      ORDER BY tf.created_at DESC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('[Reviews] Unexpected error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
