import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await query(`
      SELECT s.schedule_id, s.driver_id, s.shift_date as date, s.start_time, s.end_time, z.name as zone_assigned, d.name as driver_name, d.phone
      FROM shift_schedules s
      JOIN drivers d ON s.driver_id = d.driver_id
      LEFT JOIN dispatch_zones z ON s.zone_assigned = z.zone_id
      ORDER BY s.shift_date ASC, s.start_time ASC
    `);
    
    const driversRes = await query(`
      SELECT driver_id, name, phone, verification_status 
      FROM drivers 
      WHERE verification_status = 'Approved'
      ORDER BY name ASC
    `);

    const zonesRes = await query(`
      SELECT name 
      FROM dispatch_zones 
      ORDER BY name ASC
    `);

    return NextResponse.json({ shifts: res.rows, drivers: driversRes.rows, zones: zonesRes.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { driver_id, shift_date, start_time, end_time, zone_assigned } = await request.json();
    if (!driver_id || !shift_date || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const res = await query(`
      INSERT INTO shift_schedules (driver_id, shift_date, start_time, end_time, zone_assigned)
      VALUES ($1, $2, $3, $4, (SELECT zone_id FROM dispatch_zones WHERE name = $5 LIMIT 1))
      ON CONFLICT (driver_id, shift_date, start_time) DO UPDATE 
      SET end_time = EXCLUDED.end_time, zone_assigned = EXCLUDED.zone_assigned
      RETURNING *
    `, [driver_id, shift_date, start_time, end_time, zone_assigned || 'Central Hub']);

    return NextResponse.json({ success: true, shift: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('schedule_id');
    if (!id) return NextResponse.json({ error: 'Missing schedule_id' }, { status: 400 });
    
    await query('DELETE FROM shift_schedules WHERE schedule_id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
