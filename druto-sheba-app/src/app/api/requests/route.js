import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query(`
      SELECT er.*, p.name as patient_name, p.phone, p.blood_type,
             ST_Y(er.pickup_coords::geometry) as lat, ST_X(er.pickup_coords::geometry) as lon
      FROM emergency_requests er
      JOIN patients p ON er.patient_id = p.patient_id
      ORDER BY er.timestamp_created DESC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { patient_id, lat, lon, severity_level } = body;

    const result = await query(
      `INSERT INTO emergency_requests (patient_id, pickup_coords, severity_level, status)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, 'Broadcast')
       RETURNING *`,
      [patient_id, lon, lat, severity_level]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { request_id, status } = body;
    const result = await query(
      `UPDATE emergency_requests SET status = $1 WHERE request_id = $2 RETURNING *`,
      [status, request_id]
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
