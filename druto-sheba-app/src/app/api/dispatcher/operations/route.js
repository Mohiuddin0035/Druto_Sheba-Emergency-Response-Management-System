import { query, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';

const severityRank = { Critical: 1, High: 2, Medium: 3, Low: 4 };

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [queue, ambulances, drivers, hospitals, audit] = await Promise.all([
      query(`
        SELECT * FROM active_dashboard_view
        ORDER BY
          CASE severity_level WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
          request_id ASC
      `),
      query('SELECT *, ST_X(current_location::geometry) as lon, ST_Y(current_location::geometry) as lat FROM ambulances ORDER BY vehicle_id'),
      query('SELECT * FROM drivers ORDER BY driver_id'),
      query('SELECT * FROM hospitals ORDER BY hospital_id'),
      query('SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 10'),
    ]);

    const triageQueue = queue.rows
      .map((row) => ({
        ...row,
        wait_minutes: row.timestamp_created
          ? Math.max(0, Math.round((Date.now() - new Date(row.timestamp_created).getTime()) / 60000))
          : 0,
      }))
      .sort((a, b) => (severityRank[a.severity_level] || 9) - (severityRank[b.severity_level] || 9) || b.wait_minutes - a.wait_minutes);

    return NextResponse.json({
      triage_queue: triageQueue,
      ambulances: ambulances.rows,
      drivers: drivers.rows,
      hospitals: hospitals.rows,
      audit: audit.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      blood_type,
      lat,
      lon,
      severity = 'High',
      emergency_type = 'General',
      requested_for = 'Call-in patient',
    } = body;

    const result = await transaction(async (client) => {
      let patientId;
      const existing = await client.query('SELECT patient_id FROM patients WHERE phone = $1 LIMIT 1', [phone]);
      if (existing.rowCount > 0) {
        patientId = existing.rows[0].patient_id;
      } else {
        const patient = await client.query(
          'INSERT INTO patients (name, phone, blood_type) VALUES ($1, $2, $3) RETURNING patient_id',
          [name, phone, blood_type || null]
        );
        patientId = patient.rows[0].patient_id;
      }

      const pricingRes = await client.query('SELECT base_fare, per_km_charge FROM pricing_config ORDER BY config_id DESC LIMIT 1');
      const pricing = pricingRes.rows[0] || { base_fare: 750, per_km_charge: 25 };

      const emergency = await client.query(`
        INSERT INTO emergency_requests (patient_id, pickup_coords, severity_level, emergency_type, requested_for, status, base_fare, per_km_charge)
        VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, 'Broadcast', $7, $8)
        RETURNING *
      `, [patientId, lon, lat, severity, emergency_type, requested_for, pricing.base_fare, pricing.per_km_charge]);

      return emergency.rows[0];
    });

    return NextResponse.json({ success: true, request: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { request_id, vehicle_id, driver_id, hospital_id, dispatcher_id = 1 } = await request.json();

    if (!request_id || !vehicle_id || !driver_id) {
      return NextResponse.json({ error: 'request_id, vehicle_id, and driver_id are required' }, { status: 400 });
    }

    await transaction(async (client) => {
      // 0. Check if driver is already on an active mission
      const activeCheck = await client.query(`
        SELECT tl.trip_id 
        FROM trip_logs tl
        JOIN emergency_requests er ON tl.trip_id = er.request_id::text
        WHERE tl.driver_id = $1 AND er.status IN ('Active', 'En Route', 'Picked Up', 'Arrived')
        LIMIT 1
      `, [driver_id]);
      
      if (activeCheck.rows.length > 0) {
        throw new Error('Already in a mission');
      }

      // 1. Look up the hospital_id from emergency_requests if not passed, or to preserve patient selection
      let finalHospitalId = hospital_id;
      
      const reqResult = await client.query('SELECT hospital_id FROM emergency_requests WHERE request_id = $1', [request_id]);
      if (reqResult.rows.length > 0 && reqResult.rows[0].hospital_id) {
        finalHospitalId = reqResult.rows[0].hospital_id;
      }
      
      // 2. Fallback to first available hospital if none is selected/requested
      if (!finalHospitalId) {
        const fallback = await client.query('SELECT hospital_id FROM hospitals LIMIT 1');
        finalHospitalId = fallback.rows[0]?.hospital_id || 1;
      }

      await client.query(`
        INSERT INTO trip_logs (trip_id, vehicle_id, driver_id, hospital_id, dispatcher_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (trip_id) DO UPDATE
        SET vehicle_id = EXCLUDED.vehicle_id,
            driver_id = EXCLUDED.driver_id,
            hospital_id = EXCLUDED.hospital_id,
            dispatcher_id = EXCLUDED.dispatcher_id,
            time_dispatched = CURRENT_TIMESTAMP
      `, [request_id, vehicle_id, driver_id, finalHospitalId, dispatcher_id]);

      await client.query('UPDATE emergency_requests SET status = $1 WHERE request_id = $2', ['Active', request_id]);
      await client.query('UPDATE ambulances SET current_status = $1 WHERE vehicle_id = $2', ['Dispatched', vehicle_id]);
      await client.query('UPDATE drivers SET shift_status = $1 WHERE driver_id = $2', ['Dispatched', driver_id]);
    });

    return NextResponse.json({ success: true, message: `Request ${request_id} manually assigned.` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
