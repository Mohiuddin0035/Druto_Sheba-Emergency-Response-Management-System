const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres.zkvyfshcxeqlbszyageb:SupaBase2026DrutoSheba@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const r1 = await pool.query("SELECT * FROM emergency_requests WHERE request_id = 'NX-C5FC0BBE'");
    console.log('Emergency Request:', r1.rows);

    const r2 = await pool.query("SELECT * FROM trip_logs WHERE trip_id = 'NX-C5FC0BBE'");
    console.log('Trip Logs:', r2.rows);

    const r3 = await pool.query("SELECT * FROM billing WHERE trip_id = 'NX-C5FC0BBE'");
    console.log('Billing:', r3.rows);

    const r4 = await pool.query("SELECT * FROM trip_logs ORDER BY time_dispatched DESC LIMIT 5");
    console.log('Recent 5 trip logs:', r4.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
