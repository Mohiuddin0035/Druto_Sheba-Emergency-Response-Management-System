const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.zkvyfshcxeqlbszyageb:SupaBase2026DrutoSheba@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  
  await client.query(`
    ALTER TABLE emergency_requests 
    ADD COLUMN IF NOT EXISTS base_fare NUMERIC(10,2) DEFAULT 750,
    ADD COLUMN IF NOT EXISTS per_km_charge NUMERIC(10,2) DEFAULT 25;
  `);
  
  // Backfill existing rows with current pricing
  await client.query(`
    UPDATE emergency_requests 
    SET base_fare = (SELECT base_fare FROM pricing_config ORDER BY config_id DESC LIMIT 1),
        per_km_charge = (SELECT per_km_charge FROM pricing_config ORDER BY config_id DESC LIMIT 1)
    WHERE base_fare = 750 AND per_km_charge = 25;
  `);

  console.log('Added pricing columns to emergency_requests successfully!');

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
