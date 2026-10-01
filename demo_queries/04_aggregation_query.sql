-- ==============================================================================
-- Demo Query 4: Capacity & Emergency Triage Aggregation (GROUP BY & COUNT)
-- Uses: emergency_requests & hospitals
-- ==============================================================================

-- 1. Emergency distribution grouped by Severity Level
SELECT 
    severity_level, 
    COUNT(*) AS request_count
FROM emergency_requests
GROUP BY severity_level
ORDER BY request_count DESC;

-- 2. Hospital Bed & ICU Capacity Audit by Category (Govt vs Private)
SELECT 
    type AS hospital_category,
    COUNT(*) AS total_hospitals,
    SUM(general_beds) AS total_general_beds,
    SUM(icu_beds) AS total_icu_beds
FROM hospitals
GROUP BY type;
