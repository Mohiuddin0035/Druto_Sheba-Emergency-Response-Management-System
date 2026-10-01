const fs = require('fs');
const { Pool } = require('pg');

const connString = 'postgresql://postgres.zkvyfshcxeqlbszyageb:SupaBase2026DrutoSheba@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres';

const pool = new Pool({
  connectionString: connString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const sql = fs.readFileSync('../database/15_audit_logs_setup.sql', 'utf8');
  try {
    console.log('Running SQL...');
    await pool.query(sql);
    console.log('Success!');
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
