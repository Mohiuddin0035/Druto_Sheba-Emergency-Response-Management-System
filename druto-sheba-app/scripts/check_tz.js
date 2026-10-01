const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres.zkvyfshcxeqlbszyageb:SupaBase2026DrutoSheba@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const col = await pool.query("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'timestamp_created'");
  console.log('emergency_requests.timestamp_created:', col.rows);

  const t = await pool.query("SELECT NOW() as now_val, (NOW() AT TIME ZONE 'UTC') as utc_val, (NOW() AT TIME ZONE 'Asia/Dhaka') as dhaka_val");
  console.log('Times from Postgres:', t.rows[0]);

  await pool.query("UPDATE emergency_requests SET timestamp_created = timestamp_created + interval '6 hours' WHERE request_id = 'NX-C5FC0BBE'");
  const trip = await pool.query("SELECT request_id, timestamp_created FROM emergency_requests WHERE request_id = 'NX-C5FC0BBE'");
  console.log('Fixed NX-C5FC0BBE timestamp:', trip.rows[0]);
  
  await pool.end();
}

main();
