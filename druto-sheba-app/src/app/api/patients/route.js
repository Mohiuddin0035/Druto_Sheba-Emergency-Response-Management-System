import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    let sql = `
      SELECT p.*, array_agg(pc.condition_name) FILTER (WHERE pc.condition_name IS NOT NULL) as conditions
      FROM patients p
      LEFT JOIN patient_conditions pc ON p.patient_id = pc.patient_id
    `;
    const params = [];

    if (patientId) {
      sql += ` WHERE p.patient_id = $1::integer`;
      params.push(patientId);
    }
    
    sql += ` GROUP BY p.patient_id ORDER BY p.patient_id`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, phone, blood_type } = await request.json();
    const result = await query(
      `INSERT INTO patients (name, phone, blood_type) VALUES ($1, $2, $3) RETURNING *`,
      [name, phone, blood_type]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const data = await request.json();
    const { patient_id, name, phone, blood_type, address, primary_specialization, allergies, conditions } = data;
    const targetId = patient_id || data.id;

    if (!targetId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Update Patients table
    const updateResult = await query(
      `UPDATE patients 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           blood_type = COALESCE($3, blood_type),
           address = COALESCE($4, address),
           primary_specialization = COALESCE($5, primary_specialization),
           allergies = COALESCE($7, allergies)
       WHERE patient_id = $6::integer`,
      [name, phone, blood_type, address, primary_specialization, targetId, allergies]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Update conditions
    if (Array.isArray(conditions)) {
      await query(`DELETE FROM patient_conditions WHERE patient_id = $1::integer`, [targetId]);
      
      if (conditions.length > 0) {
        for (const condition of conditions) {
          await query(
            `INSERT INTO patient_conditions (patient_id, condition_name) VALUES ($1::integer, $2)`,
            [targetId, condition]
          );
        }
      }
    }

    return NextResponse.json({ success: true, updated_id: targetId });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
