-- ==============================================================================
-- Druto Sheba (দ্রুত সেবা) - Patient Authentication & Credentials Schema
-- ==============================================================================

-- 1. Create patient_credentials table with Emergency PIN and monthly quota support
CREATE TABLE IF NOT EXISTS patient_credentials (
    auth_id SERIAL PRIMARY KEY,
    patient_id integer NOT NULL UNIQUE REFERENCES patients(patient_id) ON DELETE CASCADE,
    username character varying(100) NOT NULL UNIQUE,
    password_plain character varying(255) NOT NULL, -- Stored as readable plain-text for Supabase inspection during lab checks
    password_hash text,                             -- Reserved for production bcrypt hashing
    emergency_pin_plain character varying(10),      -- 4-digit/character secret emergency PIN (e.g. 7421, Ms03) for instant SOS bypass
    emergency_pin_hash text,                        -- Reserved for production bcrypt emergency PIN hashing
    emergency_login_count integer DEFAULT 0,        -- Max 3 times per calendar month
    last_emergency_login_month character varying(7),-- Tracks 'YYYY-MM' for monthly quota reset
    session_token character varying(255),           -- Active single-session token (enforces single-device login)
    biometric_credential_id text UNIQUE,            -- Unique cryptographic WebAuthn fingerprint credential ID (enforces 1 account per fingerprint)
    last_device character varying(255),
    last_login timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 2. Populate realistic unique random passwords (>=8 chars, uppercase, lowercase, special, number) & 4-char secret PINs
-- Password Pattern: [Capitalized Name (>=4 chars)] + [Special Char @/#/!/$/%/&/*] + [3-digit number] (Total >= 8)
-- Example: Rahim@105, Ayesha#188, Nabila$271, Hasan&699
-- Emergency PIN: 4 alphanumeric chars / digits (e.g. zLh5, 6UtF, Dc2R)
INSERT INTO patient_credentials (
    patient_id, 
    username, 
    password_plain, 
    emergency_pin_plain, 
    emergency_login_count
)
SELECT 
    p.patient_id,
    LOWER(SPLIT_PART(p.name, ' ', 1)) || p.patient_id AS username,
    RPAD(INITCAP(SPLIT_PART(p.name, ' ', 1)), 4, 'x') || 
    CASE (p.patient_id % 7)
        WHEN 0 THEN '!'
        WHEN 1 THEN '@'
        WHEN 2 THEN '#'
        WHEN 3 THEN '$'
        WHEN 4 THEN '%'
        WHEN 5 THEN '&'
        ELSE '*'
    END || 
    ((p.patient_id * 83 + 241) % 900 + 100) AS password_plain,
    SUBSTR(MD5(p.name || p.patient_id || 'secret_pin_2026'), 1, 4) AS emergency_pin_plain,
    0 AS emergency_login_count
FROM patients p
ON CONFLICT (patient_id) DO UPDATE 
SET 
    username = EXCLUDED.username,
    password_plain = EXCLUDED.password_plain,
    emergency_pin_plain = COALESCE(patient_credentials.emergency_pin_plain, EXCLUDED.emergency_pin_plain);

-- 3. Grants
GRANT ALL ON TABLE patient_credentials TO postgres, anon, authenticated, service_role;
GRANT ALL ON SEQUENCE patient_credentials_auth_id_seq TO postgres, anon, authenticated, service_role;
