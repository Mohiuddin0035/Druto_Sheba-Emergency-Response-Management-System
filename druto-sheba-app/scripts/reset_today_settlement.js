const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.zkvyfshcxeqlbszyageb:SupaBase2026DrutoSheba@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function resetToday() {
  try {
    const res = await pool.query("DELETE FROM driver_daily_settlements WHERE driver_id = 1 AND settlement_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date RETURNING *");
    console.log('Deleted today record from settlements:', res.rowCount);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

resetToday();
