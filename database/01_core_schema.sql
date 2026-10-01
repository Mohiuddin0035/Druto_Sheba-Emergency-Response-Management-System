SELECT pg_catalog.set_config('search_path', 'public', false);

CREATE SCHEMA IF NOT EXISTS public;

COMMENT ON SCHEMA public IS 'standard public schema';

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Enumerated Types for Milestone 1
CREATE TYPE hospital_type AS ENUM (
    'Government',
    'Private'
);

CREATE TYPE req_status AS ENUM (
    'Pending',
    'Active',
    'En Route',
    'Picked Up',
    'Arrived',
    'Resolved',
    'Cancelled',
    'Broadcast',
    'Admitted'
);

CREATE TYPE severity_lvl AS ENUM (
    'Low',
    'Medium',
    'High',
    'Critical'
);

-- Unique Emergency Request ID Generator
CREATE OR REPLACE FUNCTION generate_emergency_id() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN 'NX-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
END;
$$;

-- 3. Milestone 1 Core Tables

-- Registered hospital facilities and their geolocation data
CREATE TABLE hospitals (
    hospital_id SERIAL PRIMARY KEY,
    name character varying(150) NOT NULL,
    location_coords public.geometry(Point,4326) NOT NULL,
    general_beds integer DEFAULT 0 NOT NULL,
    icu_beds integer DEFAULT 0 NOT NULL,
    type hospital_type DEFAULT 'Private'::hospital_type NOT NULL
);

-- Registered patient demographic profiles
CREATE TABLE patients (
    patient_id SERIAL PRIMARY KEY,
    name character varying(100) NOT NULL,
    phone character varying(20) NOT NULL,
    blood_type character varying(5),
    address text,
    primary_specialization character varying(100),
    allergies text
);

-- Patient chronic and acute medical conditions
CREATE TABLE patient_conditions (
    record_id SERIAL PRIMARY KEY,
    patient_id integer NOT NULL,
    condition_name character varying(100) NOT NULL,
    CONSTRAINT fk_patient_conditions_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- Emergency contact phone numbers associated with patients
CREATE TABLE patient_emergency_contacts (
    contact_id SERIAL PRIMARY KEY,
    patient_id integer NOT NULL,
    contact_name character varying(100) NOT NULL,
    relationship character varying(50) NOT NULL,
    phone character varying(20) NOT NULL,
    CONSTRAINT fk_emergency_contacts_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- Emergency service requests dispatched via SOS
CREATE TABLE emergency_requests (
    request_id character varying(20) DEFAULT generate_emergency_id() NOT NULL PRIMARY KEY,
    patient_id integer NOT NULL,
    pickup_coords public.geometry(Point,4326) NOT NULL,
    severity_level severity_lvl NOT NULL,
    timestamp_created timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status req_status DEFAULT 'Pending'::req_status,
    primary_specialization character varying(100),
    emergency_type character varying(100) DEFAULT 'General'::character varying,
    requested_for character varying(100) DEFAULT 'Self'::character varying,
    hospital_id integer REFERENCES hospitals(hospital_id),
    CONSTRAINT fk_emergency_requests_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- 4. Spatial & Performance Indexes (GiST)
CREATE INDEX idx_hospitals_location ON hospitals USING gist (location_coords);
CREATE INDEX idx_requests_pickup ON emergency_requests USING gist (pickup_coords);
CREATE INDEX idx_requests_status ON emergency_requests USING btree (status);

-- 5. Permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
