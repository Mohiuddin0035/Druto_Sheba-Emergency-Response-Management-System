-- ==============================================================================
-- Druto Sheba (দ্রুত সেবা) - Initial Emergency Requests, Trip Logs & Billing Seed Data
-- Adds historical completed trips for the first 5 patients (patient_id 1 to 5)
-- ==============================================================================

-- 1. Insert Resolved Emergency Requests for Patients 1 to 5
INSERT INTO emergency_requests (
    request_id,
    patient_id,
    pickup_coords,
    severity_level,
    timestamp_created,
    status,
    primary_specialization,
    emergency_type,
    requested_for,
    hospital_id
) VALUES
('TRIP-PAT-101', 1, ST_SetSRID(ST_MakePoint(90.399452, 23.777176), 4326), 'High', CURRENT_TIMESTAMP - INTERVAL '3 days', 'Resolved', 'Cardiology', 'Cardiac Arrest', 'Self', 1),
('TRIP-PAT-102', 1, ST_SetSRID(ST_MakePoint(90.395120, 23.772540), 4326), 'Medium', CURRENT_TIMESTAMP - INTERVAL '10 days', 'Resolved', 'General', 'Severe Respiratory Distress', 'Self', 2),
('TRIP-PAT-201', 2, ST_SetSRID(ST_MakePoint(90.412500, 23.781200), 4326), 'Critical', CURRENT_TIMESTAMP - INTERVAL '2 days', 'Resolved', 'Neurology', 'Acute Stroke', 'Family Member', 3),
('TRIP-PAT-202', 2, ST_SetSRID(ST_MakePoint(90.418900, 23.785600), 4326), 'Low', CURRENT_TIMESTAMP - INTERVAL '8 days', 'Resolved', 'Orthopedics', 'Bone Fracture', 'Self', 4),
('TRIP-PAT-301', 3, ST_SetSRID(ST_MakePoint(90.378900, 23.791200), 4326), 'High', CURRENT_TIMESTAMP - INTERVAL '1 day', 'Resolved', 'Trauma', 'Road Traffic Accident', 'Self', 1),
('TRIP-PAT-302', 3, ST_SetSRID(ST_MakePoint(90.385200, 23.794500), 4326), 'Medium', CURRENT_TIMESTAMP - INTERVAL '5 days', 'Resolved', 'General', 'High Fever & Seizure', 'Self', 5),
('TRIP-PAT-401', 4, ST_SetSRID(ST_MakePoint(90.428500, 23.774500), 4326), 'Critical', CURRENT_TIMESTAMP - INTERVAL '4 days', 'Resolved', 'Cardiology', 'Chest Pain / Angina', 'Self', 2),
('TRIP-PAT-501', 5, ST_SetSRID(ST_MakePoint(90.369800, 23.738900), 4326), 'High', CURRENT_TIMESTAMP - INTERVAL '2 days', 'Resolved', 'Pulmonology', 'Asthma Exacerbation', 'Self', 5)
ON CONFLICT (request_id) DO UPDATE SET 
    status = EXCLUDED.status,
    hospital_id = EXCLUDED.hospital_id;

-- 2. Insert Completed Trip Logs
INSERT INTO trip_logs (
    trip_id,
    vehicle_id,
    driver_id,
    hospital_id,
    dispatcher_id,
    time_dispatched,
    time_arrived_scene,
    time_reached_hospital
) VALUES
('TRIP-PAT-101', 1, 1, 1, 1, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '12 minutes', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '28 minutes'),
('TRIP-PAT-102', 2, 2, 2, 1, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '15 minutes', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '35 minutes'),
('TRIP-PAT-201', 3, 3, 3, 1, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '9 minutes', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '22 minutes'),
('TRIP-PAT-202', 4, 4, 4, 1, CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days' + INTERVAL '18 minutes', CURRENT_TIMESTAMP - INTERVAL '8 days' + INTERVAL '40 minutes'),
('TRIP-PAT-301', 5, 5, 1, 1, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '11 minutes', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '25 minutes'),
('TRIP-PAT-302', 1, 1, 5, 1, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days' + INTERVAL '14 minutes', CURRENT_TIMESTAMP - INTERVAL '5 days' + INTERVAL '32 minutes'),
('TRIP-PAT-401', 2, 2, 2, 1, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '10 minutes', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '24 minutes'),
('TRIP-PAT-501', 3, 3, 5, 1, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '13 minutes', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '29 minutes')
ON CONFLICT (trip_id) DO UPDATE SET 
    hospital_id = EXCLUDED.hospital_id,
    driver_id = EXCLUDED.driver_id,
    vehicle_id = EXCLUDED.vehicle_id;

-- 3. Insert Invoices into Billing Table
INSERT INTO billing (
    trip_id,
    patient_id,
    amount,
    tax,
    payment_status,
    date_issued,
    date_paid
) VALUES
('TRIP-PAT-101', 1, 1200.00, 60.00, 'Paid', CURRENT_DATE - 3, CURRENT_DATE - 3),
('TRIP-PAT-102', 1, 850.00, 42.50, 'Paid', CURRENT_DATE - 10, CURRENT_DATE - 10),
('TRIP-PAT-201', 2, 1500.00, 75.00, 'Paid', CURRENT_DATE - 2, CURRENT_DATE - 2),
('TRIP-PAT-202', 2, 700.00, 35.00, 'Paid', CURRENT_DATE - 8, CURRENT_DATE - 8),
('TRIP-PAT-301', 3, 1350.00, 67.50, 'Paid', CURRENT_DATE - 1, CURRENT_DATE - 1),
('TRIP-PAT-302', 3, 900.00, 45.00, 'Paid', CURRENT_DATE - 5, CURRENT_DATE - 5),
('TRIP-PAT-401', 4, 1400.00, 70.00, 'Paid', CURRENT_DATE - 4, CURRENT_DATE - 4),
('TRIP-PAT-501', 5, 1100.00, 55.00, 'Paid', CURRENT_DATE - 2, CURRENT_DATE - 2)
ON CONFLICT DO NOTHING;
