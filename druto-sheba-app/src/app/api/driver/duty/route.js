import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const driver_id = searchParams.get('driver_id');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  try {
    const [activeTripRes, broadcastRes] = await Promise.all([
      query(`
        SELECT 
          tl.trip_id, tl.vehicle_id, tl.time_dispatched, tl.time_arrived_scene, tl.time_reached_hospital,
          er.request_id, er.patient_id,
          ST_X(er.pickup_coords::geometry) as patient_lon,
          ST_Y(er.pickup_coords::geometry) as patient_lat,
          er.severity_level, er.emergency_type, er.requested_for, er.status as request_status,
          p.name as patient_name, p.phone as patient_phone, p.blood_type, p.allergies,
          COALESCE(json_agg(pc_cond.condition_name) FILTER (WHERE pc_cond.condition_name IS NOT NULL), '[]') as conditions,
          h.name as hospital_name,
          ST_X(h.location_coords::geometry) as hospital_lon,
          ST_Y(h.location_coords::geometry) as hospital_lat,
          a.license_plate,
          COALESCE(
            ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0)::numeric, 1),
            2.5
          ) as distance_km,
          COALESCE(
            er.base_fare + ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0 * er.per_km_charge)::numeric, 0),
            er.base_fare
          ) as driver_fare,
          er.base_fare,
          er.per_km_charge
        FROM trip_logs tl
        JOIN emergency_requests er ON tl.trip_id = er.request_id::text
        JOIN patients p ON er.patient_id = p.patient_id
        LEFT JOIN patient_conditions pc_cond ON p.patient_id = pc_cond.patient_id
        JOIN hospitals h ON tl.hospital_id = h.hospital_id
        JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
        WHERE tl.driver_id = $1 AND er.status IN ('Active', 'En Route', 'Picked Up', 'Arrived')
        GROUP BY tl.trip_id, tl.vehicle_id, tl.time_dispatched, tl.time_arrived_scene, tl.time_reached_hospital,
                 er.request_id, er.patient_id, er.pickup_coords, er.severity_level, er.emergency_type,
                 er.requested_for, er.status, p.name, p.phone, p.blood_type, p.allergies,
                 h.name, h.location_coords, a.license_plate, er.base_fare, er.per_km_charge
        LIMIT 1
      `, [driver_id]),
      query(`
        WITH driver_vehicle AS (
          -- Find vehicle assigned to this driver via active trip, past trip, or driver index
          SELECT COALESCE(
            (SELECT vehicle_id FROM trip_logs WHERE driver_id = $1 ORDER BY time_dispatched DESC LIMIT 1),
            ((CAST($1 AS INTEGER) - 1) % 10) + 1
          ) AS vehicle_id
        ),
        driver_pos AS (
          SELECT 
            CASE 
              WHEN $2::text IS NOT NULL AND $3::text IS NOT NULL 
              THEN ST_SetSRID(ST_MakePoint(CAST($3 AS double precision), CAST($2 AS double precision)), 4326)
              ELSE a.current_location
            END AS current_location,
            a.vehicle_id
          FROM ambulances a
          JOIN driver_vehicle dv ON a.vehicle_id = dv.vehicle_id
        ),
        broadcast_with_dist AS (
          SELECT 
            er.request_id,
            ST_X(er.pickup_coords::geometry) as patient_lon,
            ST_Y(er.pickup_coords::geometry) as patient_lat,
            er.severity_level,
            er.status as request_status,
            er.timestamp_created,
            p.name as patient_name,
            -- Elapsed time in seconds since SOS request
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - er.timestamp_created)) as elapsed_sec,
            -- Distance in meters from this driver's ambulance to the patient
            ROUND(ST_DistanceSphere(er.pickup_coords, dp.current_location)::numeric, 0) as distance_m,
            -- Minimum distance in meters among ALL available ambulances to this patient
            (
              SELECT MIN(ROUND(ST_DistanceSphere(er.pickup_coords, all_amb.current_location)::numeric, 0))
              FROM ambulances all_amb
              WHERE all_amb.current_location IS NOT NULL
            ) as min_fleet_distance_m
          FROM emergency_requests er
          JOIN patients p ON er.patient_id = p.patient_id
          CROSS JOIN driver_pos dp
          WHERE er.status = 'Broadcast'
        )
        SELECT 
          request_id,
          patient_lon,
          patient_lat,
          severity_level,
          request_status,
          patient_name,
          timestamp_created,
          elapsed_sec,
          distance_m,
          -- Dynamic allowed radius logic:
          -- 1) If 10 minutes (600 seconds) pass and mission still unclaimed, open to ALL drivers nationwide (unlimited)
          -- 2) If no ambulance is within 500m, rapidly expand every 10s: 10s -> 700m, 20s -> 1000m, etc.
          -- 3) Otherwise standard progression: 0-60s 500m, 60-120s 700m, 120-180s 1000m, 180-240s 1500m, etc.
          CASE
            WHEN elapsed_sec >= 600 THEN 1000000 -- After 10 min, all drivers can claim regardless of distance
            WHEN min_fleet_distance_m > 500 THEN
              -- Rapid expansion (every 10 seconds) when no ambulance is within 500m
              CASE 
                WHEN elapsed_sec < 10 THEN 500
                WHEN elapsed_sec < 20 THEN 700
                WHEN elapsed_sec < 30 THEN 1000
                WHEN elapsed_sec < 40 THEN 1500
                WHEN elapsed_sec < 50 THEN 2000
                WHEN elapsed_sec < 60 THEN 3000
                ELSE 3000 + FLOOR((elapsed_sec - 60) / 10) * 1000
              END
            ELSE
              -- Standard expansion when an ambulance is nearby within 500m
              (
                500 + 
                CASE 
                  WHEN elapsed_sec < 60 THEN 0
                  WHEN elapsed_sec < 120 THEN 200
                  WHEN elapsed_sec < 180 THEN 500
                  WHEN elapsed_sec < 240 THEN 1000
                  ELSE 1000 + FLOOR((elapsed_sec - 240) / 60) * 500
                END
              )
          END as current_radius_m
        FROM broadcast_with_dist
        WHERE 
          elapsed_sec >= 600 OR
          distance_m <= (
            CASE
              WHEN min_fleet_distance_m > 500 THEN
                CASE 
                  WHEN elapsed_sec < 10 THEN 500
                  WHEN elapsed_sec < 20 THEN 700
                  WHEN elapsed_sec < 30 THEN 1000
                  WHEN elapsed_sec < 40 THEN 1500
                  WHEN elapsed_sec < 50 THEN 2000
                  WHEN elapsed_sec < 60 THEN 3000
                  ELSE 3000 + FLOOR((elapsed_sec - 60) / 10) * 1000
                END
              ELSE
                (
                  500 + 
                  CASE 
                    WHEN elapsed_sec < 60 THEN 0
                    WHEN elapsed_sec < 120 THEN 200
                    WHEN elapsed_sec < 180 THEN 500
                    WHEN elapsed_sec < 240 THEN 1000
                    ELSE 1000 + FLOOR((elapsed_sec - 240) / 60) * 500
                  END
                )
            END
          )
        ORDER BY distance_m ASC, timestamp_created DESC
      `, [driver_id || 1, lat || null, lng || null])
    ]);

    const trip = activeTripRes.rows[0] || null;
    let chatMessages = [];
    if (trip) {
      const chatRes = await query('SELECT * FROM chat_messages WHERE trip_id = $1 ORDER BY timestamp ASC', [trip.trip_id]);
      chatMessages = chatRes.rows;
    }

    const advisoryQuery = await query('SELECT * FROM system_advisories WHERE id = 1');

    return NextResponse.json({ 
      active_trip: trip,
      broadcast_requests: broadcastRes.rows,
      chat_messages: chatMessages,
      advisory: advisoryQuery.rows[0]
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
