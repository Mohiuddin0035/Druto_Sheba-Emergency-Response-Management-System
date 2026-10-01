-- ==============================================================================
-- Druto Sheba (দ্রুত সেবা) - Driver Revenue Commission & Settlement Schema
-- ==============================================================================

-- 1. Table: driver_daily_settlements
-- Stores day-by-day accumulated collection, platform commission, driver net earnings, and settlement status
CREATE TABLE IF NOT EXISTS driver_daily_settlements (
    settlement_id SERIAL PRIMARY KEY,
    driver_id integer NOT NULL REFERENCES drivers(driver_id) ON DELETE CASCADE,
    settlement_date date NOT NULL DEFAULT CURRENT_DATE,
    total_trips integer DEFAULT 0,
    total_cash_collected numeric(10,2) DEFAULT 0.00,
    commission_rate_pct numeric(5,2) NOT NULL DEFAULT 25.00,
    commission_category character varying(60) NOT NULL DEFAULT 'Company Ambulance + Certificate',
    platform_commission_amount numeric(10,2) DEFAULT 0.00,
    driver_net_earnings numeric(10,2) DEFAULT 0.00,
    amount_paid numeric(10,2) DEFAULT 0.00,
    due_amount numeric(10,2) DEFAULT 0.00,
    payment_status character varying(20) DEFAULT 'Pending', -- 'Pending', 'Settled', 'Partial'
    settled_at timestamp without time zone,
    payment_method character varying(30) DEFAULT 'Cash/bKash',
    created_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka'),
    CONSTRAINT uq_driver_date UNIQUE (driver_id, settlement_date),
    CONSTRAINT chk_settlement_status CHECK (payment_status IN ('Pending', 'Settled', 'Partial'))
);

-- 2. Index for high-performance retrieval by driver and date
CREATE INDEX IF NOT EXISTS idx_driver_daily_settlements_driver_date 
ON driver_daily_settlements (driver_id, settlement_date DESC);

-- 3. Seed historical settlements for completed shifts
INSERT INTO driver_daily_settlements (
    driver_id, settlement_date, total_trips, total_cash_collected,
    commission_rate_pct, commission_category, platform_commission_amount,
    driver_net_earnings, payment_status, settled_at, payment_method
) VALUES 
(1, '2026-09-18', 5, 4325.00, 25.00, 'Company Ambulance + Certificate', 1081.25, 3243.75, 'Settled', '2026-09-18 23:30:00', 'bKash Merchant'),
(1, '2026-09-16', 3, 2568.00, 25.00, 'Company Ambulance + Certificate', 642.00, 1926.00, 'Settled', '2026-09-16 22:45:00', 'bKash Merchant'),
(1, '2026-09-15', 1, 856.00, 25.00, 'Company Ambulance + Certificate', 214.00, 642.00, 'Settled', '2026-09-15 21:10:00', 'bKash Merchant'),
(1, '2026-09-13', 1, 889.00, 25.00, 'Company Ambulance + Certificate', 222.25, 666.75, 'Settled', '2026-09-13 22:00:00', 'bKash Merchant'),
(1, '2026-09-11', 1, 982.00, 25.00, 'Company Ambulance + Certificate', 245.50, 736.50, 'Settled', '2026-09-11 20:30:00', 'bKash Merchant')
ON CONFLICT (driver_id, settlement_date) DO NOTHING;

-- 4. Grant full permissions
GRANT ALL ON TABLE driver_daily_settlements TO anon, authenticated, service_role;
