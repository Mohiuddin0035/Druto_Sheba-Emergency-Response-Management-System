import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const res = await query(`
      SELECT 
        b.Bill_ID as bill_id,
        b.Trip_ID as trip_id,
        h.Name as hospital_name,
        b.Amount as amount,
        b.Tax as tax,
        b.Total_Amount as total_amount,
        b.Payment_Status as payment_status,
        b.Date_Issued as date_issued,
        er.timestamp_created,
        tl.time_dispatched,
        tl.time_reached_hospital,
        ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0)::numeric, 1) as distance_km,
        COALESCE(
          815 + ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0 * 25)::numeric, 0),
          880
        ) as driver_cash_paid,
        COALESCE(d.name, 'Emergency Driver') as driver_name,
        COALESCE(d.phone, 'N/A') as driver_phone,
        COALESCE(a.license_plate, 'Ambulance Unit') as ambulance_plate
      FROM Billing b
      JOIN Trip_Logs tl ON b.Trip_ID = tl.Trip_ID
      JOIN Hospitals h ON tl.Hospital_ID = h.Hospital_ID
      JOIN Emergency_Requests er ON tl.Trip_ID = er.Request_ID::text
      LEFT JOIN Drivers d ON tl.Driver_ID = d.Driver_ID
      LEFT JOIN Ambulances a ON tl.Vehicle_ID = a.Vehicle_ID
      WHERE b.Patient_ID = $1
      ORDER BY b.Bill_ID DESC
    `, [patientId]);
    
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { billId } = await request.json();
    if (!billId) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    await query(`
      UPDATE Billing
      SET Payment_Status = 'Paid'
      WHERE Bill_ID = $1
    `, [billId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
