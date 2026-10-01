-- ==============================================================================
-- Druto Sheba (দ্রুত সেবা) - Driver Official Inbox & Notifications Schema
-- ==============================================================================

-- 1. Table: driver_inbox_messages
-- Stores direct official messages, payment reminders, policy notices, and dispatch alerts
CREATE TABLE IF NOT EXISTS driver_inbox_messages (
    message_id SERIAL PRIMARY KEY,
    driver_id integer NOT NULL REFERENCES drivers(driver_id) ON DELETE CASCADE,
    sender_role character varying(30) DEFAULT 'ADMIN' CHECK (sender_role IN ('ADMIN', 'DISPATCHER', 'SYSTEM')),
    category character varying(40) DEFAULT 'GENERAL' CHECK (category IN ('PAYMENT_REMINDER', 'WARNING', 'SUSPENSION', 'LEGAL_NOTICE', 'GENERAL')),
    title character varying(200) NOT NULL,
    body text NOT NULL,
    priority character varying(20) DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'HIGH', 'URGENT')),
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')
);

-- 2. Performance Index
CREATE INDEX IF NOT EXISTS idx_driver_inbox_driver_created 
ON driver_inbox_messages (driver_id, created_at DESC);

-- 3. Seed initial welcome notice for driver 1 (Karim Ahmed)
INSERT INTO driver_inbox_messages (
    driver_id, sender_role, category, title, body, priority, is_read
) VALUES 
(
    1, 
    'ADMIN', 
    'GENERAL', 
    'Welcome to Druto Sheba Fleet Portal', 
    'Greetings Karim Ahmed! Your paramedic certification and driver profile have been verified by Admin. Always ensure end-of-day commission settlements and safe patient transport.',
    'NORMAL',
    true
)
ON CONFLICT DO NOTHING;

-- 4. Grant full permissions
GRANT ALL ON TABLE driver_inbox_messages TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE driver_inbox_messages_message_id_seq TO anon, authenticated, service_role;
