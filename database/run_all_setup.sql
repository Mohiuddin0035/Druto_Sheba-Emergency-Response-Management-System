-- ==============================================================================
-- Druto Sheba (দ্রুত সেবা) - Emergency Response System
-- Complete Database Initialization Script (Milestone 1 + Milestone 2)
-- ==============================================================================

-- 1. Enable Spatial Database Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Execute SQL files from database folder in order:
\i database/01_core_schema.sql
\i database/02_driver_portal.sql
\i database/03_patient_auth.sql
\i database/04_billing.sql
\i database/05_driver_auth.sql
\i database/06_driver_verification.sql
\i database/07_trip_feedback.sql
\i database/08_patient_trip_history_seed.sql
\i database/09_driver_monthly_work_summary.sql
\i database/10_driver_commission_settlement.sql
\i database/11_driver_inbox.sql
\i database/12_dispatcher_portal.sql
\i database/13_admin_board_setup.sql
\i database/milestone1_seed_data.sql
\i database/milestone2_seed_data.sql
\i database/milestone3_seed_data.sql

-- ==============================================================================
-- Milestone 2 Demo & Operational Verification Queries
-- ==============================================================================

-- Query 1: Nearest Hospitals from Patient Location using PostGIS ST_DistanceSphere
SELECT 
    name,
    type,
    general_beds,
    icu_beds,
    ROUND((ST_DistanceSphere(location_coords, ST_SetSRID(ST_MakePoint(90.399452, 23.777176), 4326)) / 1000)::numeric, 2) AS distance_km
FROM hospitals
ORDER BY location_coords <-> ST_SetSRID(ST_MakePoint(90.399452, 23.777176), 4326)
LIMIT 5;

-- Query 2: Active Fleet Availability with Equipment Levels & Base Hubs
SELECT 
    vehicle_id,
    license_plate,
    equipment_level,
    current_status,
    hub,
    trips_since_maintenance
FROM ambulances
ORDER BY vehicle_id;

-- Query 3: Driver Shift Rosters with Assigned Zones
SELECT 
    d.driver_id,
    d.name AS driver_name,
    d.shift_status,
    s.shift_date,
    s.start_time,
    s.end_time,
    z.zone_name
FROM drivers d
JOIN shift_schedules s ON d.driver_id = s.driver_id
LEFT JOIN dispatch_zones z ON s.zone_assigned = z.zone_id
ORDER BY s.shift_date, s.start_time;

-- Query 4: Vehicle Inventory Status (Oxygen, Defibrillator & Emergency Supplies)
SELECT 
    a.license_plate,
    vi.item_name,
    vi.quantity,
    vi.expiry_date
FROM vehicle_inventory vi
JOIN ambulances a ON vi.vehicle_id = a.vehicle_id
WHERE a.vehicle_id = 1;
