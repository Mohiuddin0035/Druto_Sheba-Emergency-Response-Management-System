-- ==============================================================================
-- Druto Sheba (দ্রুত সেবা) - Driver Verification, Qualifications & Own Ambulance Schema
-- ==============================================================================

-- 1. Add NID and Assigned Ambulance columns to drivers table if not exist
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS nid_number character varying(30),
ADD COLUMN IF NOT EXISTS verification_status character varying(30) DEFAULT 'Approved',
ADD COLUMN IF NOT EXISTS assigned_ambulance_id integer REFERENCES ambulances(vehicle_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS own_ambulance_plate character varying(50);

-- 2. Create driver_verification_submissions table
-- Holds pending qualifications, certificates, and own ambulance details for admin review
CREATE TABLE IF NOT EXISTS driver_verification_submissions (
    submission_id SERIAL PRIMARY KEY,
    driver_id integer NOT NULL REFERENCES drivers(driver_id) ON DELETE CASCADE,
    submission_type character varying(30) DEFAULT 'QUALIFICATION' CHECK (submission_type IN ('QUALIFICATION', 'PROFILE_CHANGE', 'REGISTRATION')),
    requested_name character varying(100),
    requested_license_no character varying(50),
    requested_nid character varying(30),
    certificate_name character varying(150),
    serial_number character varying(100),
    batch_number character varying(100),
    issuing_authority character varying(150),
    has_own_ambulance boolean DEFAULT false,
    ambulance_license_plate character varying(50),
    issue_date date,
    valid_until date,
    status character varying(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    admin_notes text,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_at timestamp without time zone
);

-- 3. Grants
GRANT ALL ON TABLE driver_verification_submissions TO postgres, anon, authenticated, service_role;
GRANT ALL ON SEQUENCE driver_verification_submissions_submission_id_seq TO postgres, anon, authenticated, service_role;
