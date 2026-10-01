import { query, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action;
    const driver_id = body.driver_id;
    const request_id = String(body.request_id).trim(); // Clean the ID

    console.log('driver action:', {driver_id, action, request_id});

    // Security check: Drivers awaiting Admin verification cannot accept or claim missions
    if (driver_id) {
      const drvCheck = await query('SELECT verification_status FROM drivers WHERE driver_id = $1', [driver_id]);
      if (drvCheck.rows.length > 0 && drvCheck.rows[0].verification_status === 'Pending') {
        return NextResponse.json({ 
          error: 'Your account is pending Admin verification. You cannot claim missions until approved.' 
        }, { status: 403 });
      }
    }

    let newStatus = 'Active';
    if (action === 'Accept') newStatus = 'En Route';
    if (action === 'Picked' || action === 'ArrivedPatient') newStatus = 'Picked Up';
    if (action === 'Arrived' || action === 'EnRouteHospital') newStatus = 'Arrived';
    if (action === 'Complete') newStatus = 'Resolved';

    await transaction(async (client) => {
      // lock row to prevent race condition
      const check = await client.query('SELECT status FROM emergency_requests WHERE CAST(request_id AS TEXT) = $1 FOR UPDATE', [request_id]);

      if (check.rows.length === 0) {
        throw new Error(`Request ${request_id} not found`);
      }

      const allowedStatuses = ['Broadcast', 'Pending', 'Active', 'En Route', 'Picked Up', 'Arrived'];
      if (!allowedStatuses.includes(check.rows[0].status)) {
        throw new Error('Invalid request state');
      }

      // If accepting from broadcast, we must initialize the trip
      if (action === 'Accept') {
        // If it is already Active, we don't need to re-initialize everything
        if (check.rows[0].status !== 'Active') {
          // Check if Trip_Log already exists
          const existingTrip = await client.query("SELECT vehicle_id, driver_id FROM trip_logs WHERE trip_id = $1", [request_id]);
          
          let vehicle_id;
          if (existingTrip.rowCount > 0) {
            vehicle_id = existingTrip.rows[0].vehicle_id;
            // Update the driver_id in case it was broadcasted or assigned to someone else
            await client.query("UPDATE trip_logs SET driver_id = $1 WHERE trip_id = $2", [driver_id, request_id]);
            // Make sure the vehicle is marked as dispatched
            await client.query("UPDATE ambulances SET current_status = $1 WHERE vehicle_id = $2", ['Dispatched', vehicle_id]);
          } else {
            // find ambulance
            const ambRes = await client.query("SELECT vehicle_id FROM ambulances WHERE current_status = 'Available' LIMIT 1");
            if (ambRes.rowCount === 0) throw new Error('No available ambulances found.');
            vehicle_id = ambRes.rows[0].vehicle_id;

            // get hospital from emergency request
            const reqRes = await client.query("SELECT hospital_id FROM emergency_requests WHERE request_id = $1", [request_id]);
            let hospital_id = reqRes.rows[0]?.hospital_id;

            if (!hospital_id) {
              const hospRes = await client.query("SELECT hospital_id FROM hospitals LIMIT 1");
              hospital_id = hospRes.rows[0]?.hospital_id;
            }

            // create trip log
            await client.query(`
              INSERT INTO Trip_Logs (Trip_ID, Vehicle_ID, Driver_ID, Hospital_ID, Dispatcher_ID)
              VALUES ($1, $2, $3, $4, 1)
            `, [request_id, vehicle_id, driver_id || 1, hospital_id]);

            // reserve ambulance
            await client.query("UPDATE ambulances SET current_status = $1 WHERE vehicle_id = $2", ['Dispatched', vehicle_id]);
          }
        }
      }

      // Update main request status
      await client.query(
        'UPDATE emergency_requests SET status = $1 WHERE request_id = $2',
        [newStatus, request_id]
      );

      if (action === 'Picked' || action === 'ArrivedPatient') {
        await client.query(
          'UPDATE trip_logs SET time_arrived_scene = COALESCE(time_arrived_scene, CURRENT_TIMESTAMP) WHERE trip_id = $1',
          [request_id]
        );
      }

      if (action === 'Arrived' || action === 'EnRouteHospital' || action === 'Complete') {
        await client.query(
          'UPDATE trip_logs SET time_reached_hospital = COALESCE(time_reached_hospital, CURRENT_TIMESTAMP) WHERE trip_id = $1',
          [request_id]
        );
      }

      if (driver_id) {
        await client.query(
          'UPDATE drivers SET shift_status = $1 WHERE driver_id = $2',
          [action === 'Complete' ? 'Available' : 'On_Trip', driver_id]
        );
      }

      // Handle completion cleanup
      if (action === 'Complete') {
        const tripRes = await client.query('SELECT vehicle_id, hospital_id FROM trip_logs WHERE trip_id = $1 LIMIT 1', [request_id]);
        if (tripRes.rowCount > 0) {
          await client.query(`
            UPDATE ambulances 
            SET current_status = $1 
            WHERE vehicle_id = $2
          `, ['Available', tripRes.rows[0].vehicle_id]);
        }

        // Ensure Billing invoice is created for platform service charge if not already generated
        const existingBill = await client.query('SELECT bill_id FROM billing WHERE trip_id = $1 LIMIT 1', [request_id]);
        if (existingBill.rowCount === 0) {
          const reqDetails = await client.query(`
            SELECT er.patient_id, er.pickup_coords, h.location_coords, a.equipment_level
            FROM emergency_requests er
            LEFT JOIN hospitals h ON er.hospital_id = h.hospital_id
            LEFT JOIN trip_logs tl ON er.request_id::text = tl.trip_id
            LEFT JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
            WHERE er.request_id::text = $1
            LIMIT 1
          `, [request_id]);

          if (reqDetails.rowCount > 0) {
            const r = reqDetails.rows[0];
            const baseFee = 50.00;
            const perKmFee = 5.00;
            let equipFee = (r.equipment_level === 'Advanced' || r.equipment_level === 'Advanced Life Support' || r.equipment_level === 'ICU Support') ? 100.00 : 0.00;
            
            // Calculate distance in KM
            let distKm = 2.5;
            if (r.pickup_coords && r.location_coords) {
              const distRes = await client.query(
                'SELECT ROUND((ST_DistanceSphere($1, $2) / 1000.0)::numeric, 2) as dist_km',
                [r.pickup_coords, r.location_coords]
              );
              distKm = Number(distRes.rows[0]?.dist_km || 2.5);
            }

            const amount = Number((baseFee + (distKm * perKmFee) + equipFee).toFixed(2));
            const tax = Number((amount * 0.15).toFixed(2));

            await client.query(`
              INSERT INTO billing (trip_id, patient_id, amount, tax, payment_status, date_issued)
              VALUES ($1, $2, $3, $4, 'Unpaid', CURRENT_DATE)
              ON CONFLICT DO NOTHING
            `, [request_id, r.patient_id, amount, tax]);
          }
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Action successful' });
  } catch (error) {
    console.error('Accept API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
