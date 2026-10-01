const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.zkvyfshcxeqlbszyageb:SupaBase2026DrutoSheba@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('1. Adding amount_paid and due_amount columns...');
    await pool.query('ALTER TABLE driver_daily_settlements ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2) DEFAULT 0.00');
    await pool.query('ALTER TABLE driver_daily_settlements ADD COLUMN IF NOT EXISTS due_amount numeric(10,2) DEFAULT 0.00');
    
    console.log('2. Updating check constraint for payment_status...');
    await pool.query('ALTER TABLE driver_daily_settlements DROP CONSTRAINT IF EXISTS chk_settlement_status');
    await pool.query("ALTER TABLE driver_daily_settlements ADD CONSTRAINT chk_settlement_status CHECK (payment_status IN ('Pending', 'Settled', 'Partial'))");

    console.log('3. Settle all historical settlements prior to today (September 20, 2026)...');
    await pool.query(`
      UPDATE driver_daily_settlements
      SET 
        payment_status = 'Settled',
        amount_paid = platform_commission_amount,
        due_amount = 0.00,
        settled_at = COALESCE(settled_at, CURRENT_TIMESTAMP)
      WHERE settlement_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date
    `);

    console.log('4. Clean driver_inbox_messages so inbox is pristine for today...');
    await pool.query(`
      DELETE FROM driver_inbox_messages 
      WHERE category IN ('PAYMENT_REMINDER', 'WARNING')
    `);

    const res = await pool.query(`
      SELECT settlement_id, driver_id, settlement_date, platform_commission_amount, amount_paid, due_amount, payment_status 
      FROM driver_daily_settlements 
      ORDER BY settlement_date DESC
    `);
    console.log('Updated settlements:');
    console.table(res.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
