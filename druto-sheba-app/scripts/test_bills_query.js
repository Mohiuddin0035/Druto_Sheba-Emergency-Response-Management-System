const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres.zkvyfshcxeqlbszyageb:SupaBase2026DrutoSheba@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const patientId = 103;
    const res = await pool.query(`
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
          750 + ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0 * 20)::numeric, 0),
          750
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
    console.log('Query result count for patient 103:', res.rows.length);
    console.log('Query result rows:', res.rows);
  } catch (err) {
    console.error('Error running bills query:', err);
  } finally {
    await pool.end();
  }
}

main();
