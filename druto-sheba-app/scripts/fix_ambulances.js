import { query } from '../src/lib/db.js';

async function fix() {
  try {
    const res = await query(`
      UPDATE ambulances 
      SET current_status = 'Available' 
      WHERE current_status = 'Dispatched' 
      AND vehicle_id NOT IN (
        SELECT vehicle_id FROM trip_logs tl 
        JOIN emergency_requests er ON tl.trip_id = er.request_id::text 
        WHERE er.status IN ('Active', 'En Route', 'Picked Up', 'Arrived')
      )
    `);
    console.log('Fixed:', res.rowCount, 'ambulances');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fix();
