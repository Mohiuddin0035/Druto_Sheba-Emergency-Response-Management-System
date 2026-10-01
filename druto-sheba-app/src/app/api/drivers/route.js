import { query, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query(`
      SELECT d.*, a.license_plate AS vehicle
      FROM drivers d
      LEFT JOIN ambulances a ON d.assigned_ambulance_id = a.vehicle_id
      ORDER BY d.driver_id
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, license_no, shift_date, start_time, end_time } = await request.json();
    
    const result = await transaction(async (client) => {
      // 1. Insert Driver
      const drvRes = await client.query(
        `INSERT INTO drivers (name, license_no, shift_status)
         VALUES ($1, $2, 'Off_Duty') RETURNING *`,
        [name, license_no]
      );
      
      const newDriver = drvRes.rows[0];

      // 2. Insert Schedule if provided
      if (shift_date && start_time && end_time) {
        await client.query(
          `INSERT INTO shift_schedules (driver_id, shift_date, start_time, end_time)
           VALUES ($1, $2, $3, $4)`,
          [newDriver.driver_id, shift_date, start_time, end_time]
        );
      }

      return newDriver;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Driver creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { driver_id, shift_status, name, license_no, assigned_ambulance_id } = await request.json();
    
    let result;
    if (shift_status !== undefined) {
      result = await query(
        `UPDATE drivers SET shift_status = $1 WHERE driver_id = $2 RETURNING *`,
        [shift_status, driver_id]
      );
    } else if (assigned_ambulance_id !== undefined) {
      // Allow assigning or unassigning (null)
      result = await query(
        `UPDATE drivers SET assigned_ambulance_id = $1 WHERE driver_id = $2 RETURNING *`,
        [assigned_ambulance_id, driver_id]
      );
    } else {
      result = await query(
        `UPDATE drivers SET name = COALESCE($1, name), license_no = COALESCE($2, license_no) WHERE driver_id = $3 RETURNING *`,
        [name, license_no, driver_id]
      );
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { driver_id } = await request.json();
    const result = await query(
      `DELETE FROM drivers WHERE driver_id = $1 RETURNING *`,
      [driver_id]
    );
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
