import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query(`
      SELECT h.*, 
             ST_Y(location_coords::geometry) as lat, ST_X(location_coords::geometry) as lon,
             COALESCE(
               (SELECT json_agg(s.spec_name) 
                FROM hospital_specializations hs 
                JOIN specializations s ON hs.spec_id = s.spec_id 
                WHERE hs.hospital_id = h.hospital_id),
               '[]'::json
             ) as specializations
      FROM hospitals h
      ORDER BY h.hospital_id
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, lat, lon, general_beds, icu_beds, type, spec_ids } = await request.json();
    const hospRes = await query(
      `INSERT INTO hospitals (name, location_coords, general_beds, icu_beds, type)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6) RETURNING *`,
      [name, lon, lat, general_beds || 0, icu_beds || 0, type || 'Private']
    );
    const newHospitalId = hospRes.rows[0].hospital_id;

    if (spec_ids && Array.isArray(spec_ids) && spec_ids.length > 0) {
      for (const spec_id of spec_ids) {
        await query(
          `INSERT INTO hospital_specializations (hospital_id, spec_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newHospitalId, spec_id]
        );
      }
    }
    return NextResponse.json(hospRes.rows[0], { status: 201 });
  } catch (error) {
    console.error('Hospital creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { hospital_id, general_beds, icu_beds } = await request.json();
    const result = await query(
      `UPDATE hospitals SET general_beds = $1, icu_beds = $2 WHERE hospital_id = $3 RETURNING *`,
      [general_beds, icu_beds, hospital_id]
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
