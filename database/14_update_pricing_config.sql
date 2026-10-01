ALTER TABLE pricing_config DROP COLUMN IF EXISTS night_multiplier;
ALTER TABLE pricing_config DROP COLUMN IF EXISTS critical_surcharge;

ALTER TABLE pricing_config ADD COLUMN IF NOT EXISTS commission_company_cert NUMERIC(5, 2) DEFAULT 25.0;
ALTER TABLE pricing_config ADD COLUMN IF NOT EXISTS commission_company_nocert NUMERIC(5, 2) DEFAULT 30.0;
ALTER TABLE pricing_config ADD COLUMN IF NOT EXISTS commission_own_cert NUMERIC(5, 2) DEFAULT 3.0;
ALTER TABLE pricing_config ADD COLUMN IF NOT EXISTS commission_own_nocert NUMERIC(5, 2) DEFAULT 5.0;

-- Update the default row
INSERT INTO pricing_config (config_id, base_fare, per_km_charge, commission_company_cert, commission_company_nocert, commission_own_cert, commission_own_nocert)
VALUES (1, 750, 25, 25.0, 30.0, 3.0, 5.0)
ON CONFLICT (config_id) DO UPDATE
SET base_fare = 750, per_km_charge = 25;
