const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.zkvyfshcxeqlbszyageb:SupaBase2026DrutoSheba@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => client.query("SELECT assignment_id, status, payment_status FROM doctor_assignments ORDER BY assignment_id DESC LIMIT 5;"))
  .then(res => {
    console.table(res.rows);
    client.end();
  })
  .catch(console.error);
