-- ==============================================================================
-- Druto Sheba (দ্রুত সেবা) - Milestone 2 Seed Data (Drivers, Ambulances, Shifts, Inventory)
-- ==============================================================================

-- 1. Seed Dispatch Zones
INSERT INTO dispatch_zones (zone_id, zone_name, priority_level) VALUES
(1, 'Gulshan-Banani Zone', 1),
(2, 'Dhanmondi-Panthapath Zone', 1),
(3, 'Uttara Sector 1-14 Zone', 2),
(4, 'Mirpur Zone', 2),
(5, 'Old Dhaka-Motijheel Zone', 2),
(6, 'Bashundhara-Baridhara Zone', 1)
ON CONFLICT (zone_id) DO NOTHING;

-- 2. Seed Drivers
INSERT INTO drivers (name, license_no, shift_status, phone) VALUES
('Karim Ahmed', 'LIC42254', 'On_Duty', '01711000001'),
('Naimur Mirza', 'LIC81911', 'On_Duty', '01711000002'),
('Naimur Sikder', 'LIC18483', 'On_Duty', '01711000003'),
('Jamal Sikder', 'LIC43123', 'On_Duty', '01711000004'),
('Arif Uddin', 'LIC81076', 'On_Duty', '01711000005'),
('Naimur Akter', 'LIC15225', 'On_Duty', '01711000006'),
('Rafiq Mirza', 'LIC32711', 'On_Duty', '01711000007'),
('Karim Ahmed', 'LIC71288', 'On_Duty', '01711000008'),
('Rakib Khan', 'LIC27293', 'On_Duty', '01711000009'),
('Riaz Sikder', 'LIC95009', 'On_Duty', '01711000010'),
('Imran Khan', 'LIC49354', 'On_Duty', '01711000011'),
('Rakib Begum', 'LIC70932', 'On_Duty', '01711000012'),
('Arif Begum', 'LIC37405', 'On_Duty', '01711000013'),
('Omar Akter', 'LIC51859', 'On_Duty', '01711000014'),
('Omar Hossain', 'LIC77488', 'On_Duty', '01711000015'),
('Rafiq Chowdhury', 'LIC88758', 'On_Duty', '01711000016'),
('Rakib Rahman', 'LIC21996', 'On_Duty', '01711000017'),
('Rahim Das', 'LIC72481', 'On_Duty', '01711000018'),
('Karim Hossain', 'LIC77995', 'On_Duty', '01711000019'),
('Karim Ahmed', 'LIC99403', 'On_Duty', '01711000020')
ON CONFLICT (license_no) DO NOTHING;

-- 3. Seed Ambulances
INSERT INTO ambulances (license_plate, equipment_level, current_status, trips_since_maintenance, current_location) VALUES
('DHA-Metro-45-5880', 'Advanced Life Support', 'Available', 0, ST_SetSRID(ST_MakePoint(90.4125, 23.8103), 4326)),
('DHA-Metro-51-5527', 'Advanced Life Support', 'Available', 0, ST_SetSRID(ST_MakePoint(90.3700, 23.7500), 4326)),
('DHA-Metro-30-1562', 'Advanced Life Support', 'Available', 0, ST_SetSRID(ST_MakePoint(90.4200, 23.7700), 4326)),
('DHA-Metro-85-9832', 'Advanced Life Support', 'Available', 0, ST_SetSRID(ST_MakePoint(90.3800, 23.7900), 4326)),
('DHA-Metro-63-7500', 'Advanced Life Support', 'Available', 0, ST_SetSRID(ST_MakePoint(90.4000, 23.7300), 4326)),
('DHA-Metro-97-8414', 'Advanced Life Support', 'Available', 0, ST_SetSRID(ST_MakePoint(90.4300, 23.7600), 4326)),
('DHA-Metro-80-6885', 'Advanced Life Support', 'Available', 0, ST_SetSRID(ST_MakePoint(90.3600, 23.7400), 4326)),
('DHA-Metro-72-2201', 'Advanced Life Support', 'Available', 0, ST_SetSRID(ST_MakePoint(90.4100, 23.7800), 4326)),
('DHA-Metro-92-8143', 'Advanced Life Support', 'Available', 0, ST_SetSRID(ST_MakePoint(90.3900, 23.7500), 4326)),
('DHA-Metro-15-3565', 'Advanced Life Support', 'Available', 0, ST_SetSRID(ST_MakePoint(90.4400, 23.8000), 4326))
ON CONFLICT (license_plate) DO NOTHING;

-- 4. Seed Vehicle Inventory for Ambulances
INSERT INTO vehicle_inventory (vehicle_id, item_name, quantity, expiry_date)
SELECT a.vehicle_id, item.name, item.qty, CURRENT_DATE + item.exp_interval
FROM ambulances a
CROSS JOIN (
    VALUES 
    ('Oxygen Level (%)', 85, INTERVAL '1 year'),
    ('Defibrillator', 1, INTERVAL '2 years'),
    ('Basic Supplies', 10, INTERVAL '6 months'),
    ('Emergency Trauma Kit', 4, INTERVAL '18 months'),
    ('Sterile Syringes (Pack)', 25, INTERVAL '6 months')
) AS item(name, qty, exp_interval)
ON CONFLICT DO NOTHING;

-- 5. Seed Driver Certifications
INSERT INTO driver_certifications (driver_id, certification_name, issuing_authority, date_issued, expiry_date, is_active)
SELECT d.driver_id, cert.name, cert.auth, CURRENT_DATE - cert.issued_interval, CURRENT_DATE + cert.exp_interval, true
FROM (SELECT driver_id FROM drivers LIMIT 10) d
CROSS JOIN (
    VALUES 
    ('Advanced Cardiac Life Support (ACLS)', 'Bangladesh Resuscitation Council', INTERVAL '6 months', INTERVAL '18 months'),
    ('Emergency Vehicle Operator Course (EVOC)', 'BRTA Certified EMT Institute', INTERVAL '1 year', INTERVAL '2 years'),
    ('Pre-Hospital Trauma Life Support (PHTLS)', 'National Health Services', INTERVAL '3 months', INTERVAL '21 months')
) AS cert(name, auth, issued_interval, exp_interval)
ON CONFLICT DO NOTHING;

-- 6. Seed Shift Schedules
INSERT INTO shift_schedules (driver_id, shift_date, start_time, end_time, zone_assigned)
SELECT d.driver_id, CURRENT_DATE + s.day_offset, s.start_t::time, s.end_t::time, s.zone
FROM (SELECT driver_id FROM drivers LIMIT 10) d
CROSS JOIN (
    VALUES 
    (0, '08:00:00', '16:00:00', 1),
    (1, '08:00:00', '16:00:00', 1),
    (2, '14:00:00', '22:00:00', 2)
) AS s(day_offset, start_t, end_t, zone)
ON CONFLICT (driver_id, shift_date, start_time) DO NOTHING;
