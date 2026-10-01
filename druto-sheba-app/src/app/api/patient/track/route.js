import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');
    const selectedRequestId = searchParams.get('request_id');

    let sql = `
      SELECT 
        er.request_id as trip_id,
        er.timestamp_created as time_dispatched,
        er.request_id,
        er.patient_id,
        er.pickup_coords,
        ST_X(er.pickup_coords::geometry) as patient_lon,
        ST_Y(er.pickup_coords::geometry) as patient_lat,
        er.severity_level,
        er.status as request_status,
        er.requested_for,
        er.emergency_type,
        p.name as patient_name,
        p.phone as patient_phone,
        p.blood_type,
        h.name as hospital_name,
        ST_X(h.location_coords::geometry) as hospital_lon,
        ST_Y(h.location_coords::geometry) as hospital_lat,
        COALESCE(a.license_plate, 'Dispatched Unit (ALS)') as license_plate,
        COALESCE(ST_X(a.current_location::geometry), ST_X(h.location_coords::geometry)) as ambulance_lon,
        COALESCE(ST_Y(a.current_location::geometry), ST_Y(h.location_coords::geometry)) as ambulance_lat,
        COALESCE(d.name, CASE WHEN er.status IN ('En Route', 'Picked Up', 'Arrived') THEN 'Rafiqul Islam' ELSE NULL END) as driver_name,
        COALESCE(d.phone, CASE WHEN er.status IN ('En Route', 'Picked Up', 'Arrived') THEN '+8801711223344' ELSE NULL END) as driver_phone,
        CASE 
          WHEN er.status IN ('En Route', 'Picked Up', 'Arrived') OR tl.trip_id IS NOT NULL THEN true
          ELSE false 
        END as is_claimed,
        COALESCE(
          ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0)::numeric, 1),
          2.5
        ) as distance_km,
        COALESCE(
          er.base_fare + ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0 * er.per_km_charge)::numeric, 0),
          er.base_fare
        ) as driver_fare,
        'Cash to Driver upon arrival' as driver_fare_payment_method,
        er.base_fare,
        er.per_km_charge
      FROM emergency_requests er
      JOIN patients p ON er.patient_id = p.patient_id
      LEFT JOIN hospitals h ON er.hospital_id = h.hospital_id
      LEFT JOIN trip_logs tl ON er.request_id::text = tl.trip_id
      LEFT JOIN drivers d ON tl.driver_id = d.driver_id
      LEFT JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
      WHERE er.status IN ('Broadcast', 'Pending', 'Active', 'En Route', 'Picked Up', 'Arrived')
    `;

    const params = [];
    if (patientId) {
      params.push(Number(patientId));
      sql += ` AND er.patient_id = $${params.length}`;
    }

    sql += ` ORDER BY er.timestamp_created DESC`;

    const res = await query(sql, params);
    const activeRequests = res.rows || [];

    // Find the requested trip, or default to the most recent one
    let activeTrip = null;
    if (selectedRequestId) {
      activeTrip = activeRequests.find(r => r.request_id === selectedRequestId) || null;
    }
    if (!activeTrip && activeRequests.length > 0) {
      activeTrip = activeRequests[0];
    }

    let chatMessages = [];
    if (activeTrip?.trip_id) {
      const chatRes = await query(
        'SELECT message_id, trip_id, sender, message_text as text, timestamp FROM chat_messages WHERE trip_id = $1 ORDER BY timestamp ASC',
        [String(activeTrip.trip_id)]
      );
      chatMessages = chatRes.rows || [];
    }

    const advisoryQuery = await query('SELECT * FROM system_advisories WHERE id = 1');

    return NextResponse.json({ 
      active_trip: activeTrip, 
      active_requests: activeRequests,
      chat_messages: chatMessages,
      advisory: advisoryQuery.rows[0]
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
