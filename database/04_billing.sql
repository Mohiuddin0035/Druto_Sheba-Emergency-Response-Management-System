-- ==============================================================================
-- Druto Sheba (দ্রুত সেবা) - Billing & Invoice Schema
-- ==============================================================================

-- Financial records and invoices generated upon completion of emergency trips
CREATE TABLE IF NOT EXISTS billing (
    bill_id SERIAL PRIMARY KEY,
    trip_id character varying(20) NOT NULL REFERENCES trip_logs(trip_id) ON DELETE CASCADE,
    patient_id integer NOT NULL REFERENCES patients(patient_id),
    amount numeric(10,2) NOT NULL,
    tax numeric(10,2) DEFAULT 0.00,
    total_amount numeric(10,2) GENERATED ALWAYS AS ((amount + tax)) STORED,
    payment_status character varying(20) DEFAULT 'Unpaid'::character varying,
    date_issued date DEFAULT CURRENT_DATE,
    date_paid date,
    CONSTRAINT billing_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['Unpaid'::character varying, 'Paid'::character varying, 'Waived'::character varying, 'Insurance'::character varying])::text[])))
);

-- Grant Permissions
GRANT ALL ON TABLE billing TO anon, authenticated, service_role;
