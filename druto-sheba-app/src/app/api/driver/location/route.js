import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { vehicle_id, driver_id, lat, lng } = await req.json();

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    // Security check: Drivers awaiting Admin verification cannot broadcast live coordinates
    if (driver_id) {
      const drvCheck = await query('SELECT verification_status FROM drivers WHERE driver_id = $1', [driver_id]);
      if (drvCheck.rows.length > 0 && drvCheck.rows[0].verification_status === 'Pending') {
        return NextResponse.json({ 
          error: 'GPS broadcasting disabled: Driver account is awaiting Admin verification.' 
        }, { status: 403 });
      }
    }

    let resolvedVehicleId = vehicle_id;

    // If no vehicle_id is provided, try to resolve it using the driver_id
    if (!resolvedVehicleId && driver_id) {
      // 1. Check for active trip
      const activeTrip = await query(`
        SELECT vehicle_id FROM trip_logs tl
        JOIN emergency_requests er ON tl.trip_id = er.request_id::text
        WHERE tl.driver_id = $1 AND er.status IN ('Active', 'En Route', 'Picked Up', 'Arrived')
        LIMIT 1
      `, [driver_id]);

      if (activeTrip.rows.length > 0) {
        resolvedVehicleId = activeTrip.rows[0].vehicle_id;
      } else {
        // 2. Check for last assigned trip
        const lastTrip = await query(`
          SELECT vehicle_id FROM trip_logs
          WHERE driver_id = $1
          ORDER BY time_dispatched DESC
          LIMIT 1
        `, [driver_id]);

        if (lastTrip.rows.length > 0) {
          resolvedVehicleId = lastTrip.rows[0].vehicle_id;
        } else {
          // 3. Fallback dynamically based on driver_id
          const driverNum = parseInt(driver_id);
          resolvedVehicleId = isNaN(driverNum) ? 1 : ((driverNum - 1) % 20) + 1;
        }
      }
    }

    if (!resolvedVehicleId) {
      return NextResponse.json({ error: 'Could not resolve vehicle association' }, { status: 400 });
    }

    await query(`
      UPDATE ambulances 
      SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)
      WHERE license_plate = $3 OR vehicle_id::text = $3
    `, [lng, lat, String(resolvedVehicleId)]);

    return NextResponse.json({ success: true, resolved_vehicle_id: resolvedVehicleId });
  } catch (error) {
    console.error('Update Location Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
