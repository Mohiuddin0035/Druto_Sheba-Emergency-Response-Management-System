const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://postgres.zkvyfshcxeqlbszyageb:SupaBase2026DrutoSheba@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'zones_seed.sql'), 'utf8');
    await client.query(sql);
    console.log('Zones seeded successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
main();
