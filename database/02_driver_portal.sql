-- ==============================================================================
-- Druto Sheba (দ্রুত সেবা) - Driver Portal Schema (Milestone 2)
-- ==============================================================================

-- 1. Enums for Fleet and Driver Operations
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'equipment_lvl') THEN
        CREATE TYPE equipment_lvl AS ENUM (
            'Basic',
            'Advanced',
            'Basic Life Support',
            'Advanced Life Support',
            'ICU Support'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_status') THEN
        CREATE TYPE shift_status AS ENUM (
            'On_Duty',
            'Off_Duty',
            'Available',
            'Dispatched',
            'On_Trip',
            'Offline',
            'EMERGENCY_SOS'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
        CREATE TYPE vehicle_status AS ENUM (
            'Available',
            'Dispatched',
            'Maintenance',
            'Maintenance_Required'
        );
    END IF;
END $$;

-- 2. Dispatch Zones
CREATE TABLE IF NOT EXISTS dispatch_zones (
    zone_id SERIAL PRIMARY KEY,
    zone_name character varying(100) NOT NULL UNIQUE,
    zone_boundary geometry(Polygon,4326),
    priority_level integer DEFAULT 1 CHECK ((priority_level >= 1) AND (priority_level <= 5))
);

-- 3. Registered emergency vehicles, their license plates, and operational tracking
CREATE TABLE IF NOT EXISTS ambulances (
    vehicle_id SERIAL PRIMARY KEY,
    license_plate character varying(50) NOT NULL UNIQUE,
    equipment_level equipment_lvl NOT NULL,
    current_status vehicle_status DEFAULT 'Available'::vehicle_status,
    trips_since_maintenance integer DEFAULT 0,
    hub character varying(100) DEFAULT 'Central Hub'::character varying,
    next_service_date date,
    current_location geometry(Point,4326)
);

-- 4. Ambulance drivers and their current operational shift status
CREATE TABLE IF NOT EXISTS drivers (
    driver_id SERIAL PRIMARY KEY,
    name character varying(100) NOT NULL,
    license_no character varying(50) NOT NULL UNIQUE,
    shift_status shift_status DEFAULT 'Off_Duty'::shift_status,
    phone character varying(20) DEFAULT '+8801711223344'::character varying
);

-- 5. Upcoming and historical shift assignments for drivers
CREATE TABLE IF NOT EXISTS shift_schedules (
    schedule_id SERIAL PRIMARY KEY,
    driver_id integer NOT NULL REFERENCES drivers(driver_id) ON DELETE CASCADE,
    shift_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    zone_assigned integer REFERENCES dispatch_zones(zone_id),
    CONSTRAINT shift_schedules_driver_id_shift_date_start_time_key UNIQUE (driver_id, shift_date, start_time)
);

-- 6. Real-time tracking of medical supplies and oxygen levels within each ambulance
CREATE TABLE IF NOT EXISTS vehicle_inventory (
    inventory_id SERIAL PRIMARY KEY,
    vehicle_id integer NOT NULL REFERENCES ambulances(vehicle_id) ON DELETE CASCADE,
    item_name character varying(100) NOT NULL,
    quantity integer DEFAULT 0 NOT NULL CHECK (quantity >= 0),
    expiry_date date,
    last_restocked timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 7. Driver Certifications & Licensing Details
CREATE TABLE IF NOT EXISTS driver_certifications (
    cert_id SERIAL PRIMARY KEY,
    driver_id integer NOT NULL REFERENCES drivers(driver_id) ON DELETE CASCADE,
    certification_name character varying(150) NOT NULL,
    issuing_authority character varying(150) NOT NULL,
    date_issued date NOT NULL,
    expiry_date date,
    is_active boolean DEFAULT true
);

-- 8. Telemetric logs for active and completed trips
CREATE TABLE IF NOT EXISTS trip_logs (
    trip_id character varying(20) PRIMARY KEY REFERENCES emergency_requests(request_id) ON DELETE CASCADE,
    vehicle_id integer NOT NULL REFERENCES ambulances(vehicle_id),
    driver_id integer NOT NULL REFERENCES drivers(driver_id),
    hospital_id integer NOT NULL REFERENCES hospitals(hospital_id),
    dispatcher_id integer DEFAULT 1,
    time_dispatched timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    time_arrived_scene timestamp without time zone,
    time_reached_hospital timestamp without time zone
);

-- 9. Chat communications between control room and ambulance unit
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id SERIAL PRIMARY KEY,
    trip_id character varying(20),
    sender character varying(50) NOT NULL,
    message_text text NOT NULL,
    timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 10. Grant Permissions
GRANT ALL ON TABLE dispatch_zones TO anon, authenticated, service_role;
GRANT ALL ON TABLE ambulances TO anon, authenticated, service_role;
GRANT ALL ON TABLE drivers TO anon, authenticated, service_role;
GRANT ALL ON TABLE shift_schedules TO anon, authenticated, service_role;
GRANT ALL ON TABLE vehicle_inventory TO anon, authenticated, service_role;
GRANT ALL ON TABLE driver_certifications TO anon, authenticated, service_role;
GRANT ALL ON TABLE trip_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE chat_messages TO anon, authenticated, service_role;
