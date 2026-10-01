-- ==============================================================================
-- Demo Query 2: Multi-Table JOIN for Patient Medical Profile & Emergency Contacts
-- Uses: patients, patient_conditions, patient_emergency_contacts (3NF Schema)
-- ==============================================================================
SELECT 
    p.patient_id,
    p.name AS patient_name,
    p.phone AS patient_phone,
    p.blood_type,
    COALESCE(c.condition_name, 'No Recorded Condition') AS chronic_illness,
    COALESCE(e.contact_name, 'N/A') AS next_of_kin,
    COALESCE(e.relationship, 'N/A') AS relationship,
    COALESCE(e.phone, 'N/A') AS emergency_phone
FROM patients p
LEFT JOIN patient_conditions c ON p.patient_id = c.patient_id
LEFT JOIN patient_emergency_contacts e ON p.patient_id = e.patient_id
WHERE p.patient_id <= 10
ORDER BY p.patient_id;
