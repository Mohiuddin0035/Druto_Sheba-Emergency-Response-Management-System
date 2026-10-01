const { Client } = require('pg');

const client = new Client({ 
    connectionString: 'postgresql://postgres.zkvyfshcxeqlbszyageb:SupaBase2026DrutoSheba@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres', 
    ssl: { rejectUnauthorized: false } 
});

const sql = `
CREATE TABLE IF NOT EXISTS platform_payments (
    payment_id SERIAL PRIMARY KEY,
    payment_purpose character varying(40) NOT NULL, 
    transaction_id character varying(100) NOT NULL,
    registered_phone character varying(20) NOT NULL,
    sender_phone character varying(20) NOT NULL,
    payment_method character varying(30) NOT NULL,
    amount_expected numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0.00,
    driver_id integer REFERENCES drivers(driver_id),
    patient_id integer REFERENCES patients(patient_id),
    request_id character varying(50), -- REFERENCES emergency_requests(request_id) if it is indeed a string. Actually I'll just skip the foreign key constraint just to be safe if types mismatch.
    status character varying(30) NOT NULL DEFAULT 'Under_Verification',
    admin_notes text,
    verified_by_admin_id integer,
    verified_at timestamp without time zone,
    refund_status character varying(30) DEFAULT 'None',
    refund_trx_id character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_registered_phone ON platform_payments(registered_phone);
CREATE INDEX IF NOT EXISTS idx_payments_trxid ON platform_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_purpose_status ON platform_payments(payment_purpose, status);
`;

async function main() {
    await client.connect();
    await client.query(sql);
    console.log('Table platform_payments created');
    process.exit(0);
}
main();
