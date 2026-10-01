import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get('hospital_id');
    const specId = searchParams.get('spec_id');
    const availableOnly = searchParams.get('available_only') === 'true';

    let sql = `
      SELECT d.*, 
             h.name AS hospital_name, 
             s.spec_name,
             COALESCE(
               json_agg(
                 json_build_object(
                   'day_of_week', ds.day_of_week, 
                   'start_time', ds.start_time, 
                   'end_time', ds.end_time
                 )
               ) FILTER (WHERE ds.schedule_id IS NOT NULL), 
               '[]'
             ) AS doctor_schedules
      FROM doctors d
      LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
      LEFT JOIN specializations s ON d.spec_id = s.spec_id
      LEFT JOIN doctor_schedules ds ON d.doctor_id = ds.doctor_id
    `;

    const conditions = [];
    const params = [];

    if (hospitalId) {
      params.push(hospitalId);
      conditions.push(`d.hospital_id = $${params.length}::integer`);
    }

    if (specId) {
      params.push(specId);
      conditions.push(`d.spec_id = $${params.length}::integer`);
    }

    if (availableOnly) {
      conditions.push(`d.is_available = TRUE`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY d.doctor_id, h.name, s.spec_name ORDER BY d.name';

    const result = await query(sql, params);

    const formatted = result.rows.map(row => ({
      doctor_id: row.doctor_id,
      name: row.name,
      phone: row.phone,
      hospital_id: row.hospital_id,
      spec_id: row.spec_id,
      is_available: row.is_available,
      hospitals: { name: row.hospital_name },
      specializations: { spec_name: row.spec_name },
      doctor_schedules: row.doctor_schedules
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Fetch doctors error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { doctor_id, is_available } = await request.json();

    if (!doctor_id) {
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
    }

    const result = await query(
      `UPDATE doctors SET is_available = $1 WHERE doctor_id = $2::integer RETURNING *`,
      [is_available, doctor_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Update doctor error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, phone, hospital_id, spec_id, is_available } = await request.json();

    if (!name || !hospital_id || !spec_id) {
      return NextResponse.json({ error: 'Name, hospital, and specialization are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO doctors (name, phone, hospital_id, spec_id, is_available) 
       VALUES ($1, $2, $3::integer, $4::integer, $5) RETURNING *`,
      [name, phone || null, hospital_id, spec_id, is_available ?? true]
    );

    return NextResponse.json({ success: true, doctor: result.rows[0] });
  } catch (error) {
    console.error('Create doctor error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

