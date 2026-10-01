import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get('patient_id');
    
    let queryText = `
      SELECT tl.trip_id, er.request_id, er.timestamp_created, er.severity_level, 
             h.name as hospital_name, er.status, b.total_amount,
              COALESCE(
                815 + ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0 * 25)::numeric, 0),
                880
              ) as calculated_fare,
             COALESCE(d.name, 'Dispatched Driver') as driver_name,
             COALESCE(d.phone, '+8801711223344') as driver_phone,
             COALESCE(a.license_plate, 'Ambulance Unit') as ambulance_plate,
             (SELECT COUNT(*) FROM trip_feedback WHERE trip_id = tl.trip_id) as has_rating
      FROM trip_logs tl
      JOIN emergency_requests er ON tl.trip_id = er.request_id::text
      JOIN hospitals h ON tl.hospital_id = h.hospital_id
      LEFT JOIN drivers d ON tl.driver_id = d.driver_id
      LEFT JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
      LEFT JOIN billing b ON tl.trip_id = b.trip_id
    `;
    let queryParams = [];

    if (patient_id) {
      queryText += ' WHERE er.patient_id = $1 ';
      queryParams.push(patient_id);
    }
    
    queryText += ' ORDER BY er.timestamp_created DESC LIMIT 10';

    const res = await query(queryText, queryParams);

    const trips = res.rows.map(t => {
      let displayFare = 'Pending';
      if (t.total_amount) {
        displayFare = '৳' + parseFloat(t.total_amount).toLocaleString();
      } else if (t.status === 'Resolved') {
        displayFare = '৳' + Number(t.calculated_fare || 800).toLocaleString();
      }

      return {
        id: t.trip_id || t.request_id,
        date: new Date(t.timestamp_created).toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' }),
        hospital: t.hospital_name,
        from: 'Emergency Location', 
        severity: t.severity_level,
        status: t.status,
        fare: displayFare,
        driver_name: t.driver_name,
        driver_phone: t.driver_phone,
        ambulance_plate: t.ambulance_plate,
        hasRating: parseInt(t.has_rating) > 0
      };
    });

    return NextResponse.json(trips);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
