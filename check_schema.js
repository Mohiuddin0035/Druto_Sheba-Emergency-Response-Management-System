const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.zkvyfshcxeqlbszyageb:SupaBase2026DrutoSheba@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkCols() {
  const dCols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'dispatchers'");
  console.log('--- dispatchers columns ---');
  console.log(dCols.rows);

  const drvCols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'driver_credentials'");
  console.log('--- driver_credentials columns ---');
  console.log(drvCols.rows);

  const patCols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'patient_credentials'");
  console.log('--- patient_credentials columns ---');
  console.log(patCols.rows);

  const staffCols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'staff_users'");
  console.log('--- staff_users columns ---');
  console.log(staffCols.rows);

  await pool.end();
}
checkCols();
