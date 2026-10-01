-- ==============================================================================
-- Demo Query 3: Subquery with HAVING Clause (High-Frequency Distress Patients)
-- Uses: patients, emergency_requests
-- ==============================================================================
SELECT 
    patient_id,
    name,
    phone,
    blood_type
FROM patients
WHERE patient_id IN (
    SELECT patient_id 
    FROM emergency_requests 
    WHERE severity_level IN ('High', 'Critical')
    GROUP BY patient_id 
    HAVING COUNT(*) >= 1
);
