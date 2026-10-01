const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.zkvyfshcxeqlbszyageb:SupaBase2026DrutoSheba@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const sqlPath = path.resolve(__dirname, '../../database/10_driver_commission_settlement.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Executing:', sqlPath);
    await pool.query(sql);
    console.log('Successfully executed 10_driver_commission_settlement.sql');

    // Verify row count
    const res = await pool.query('SELECT COUNT(*) FROM driver_daily_settlements');
    console.log('Total settlements count:', res.rows[0].count);
  } catch (err) {
    console.error('Error executing script:', err);
  } finally {
    await pool.end();
  }
}

run();
