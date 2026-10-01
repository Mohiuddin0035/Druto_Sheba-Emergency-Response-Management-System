import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query(`
      SELECT tl.trip_id, tl.vehicle_id, tl.driver_id, tl.hospital_id, tl.dispatcher_id,
             (tl.time_dispatched AT TIME ZONE 'UTC') as time_dispatched, 
             (tl.time_arrived_scene AT TIME ZONE 'UTC') as time_arrived_scene, 
             (tl.time_reached_hospital AT TIME ZONE 'UTC') as time_reached_hospital,
             p.name as patient_name, p.blood_type, 
             a.license_plate, d.name as driver_name, h.name as hospital_name,
             er.severity_level, er.status as request_status,
             tf.rating, tf.comments
      FROM trip_logs tl
      JOIN emergency_requests er ON tl.trip_id = er.request_id::text::text
      JOIN patients p ON er.patient_id = p.patient_id
      JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
      JOIN drivers d ON tl.driver_id = d.driver_id
      JOIN hospitals h ON tl.hospital_id = h.hospital_id
      LEFT JOIN trip_feedback tf ON tl.trip_id = tf.trip_id
      ORDER BY tl.time_dispatched DESC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
