-- ==============================================================================
-- DATABASE MIGRATION SCRIPT: DRIVER MONTHLY WORK SUMMARY & OVERLOAD TRACKING
-- File: database/09_driver_monthly_work_summary.sql
-- Description: Creates the dedicated `driver_monthly_work_summary` table and 
--              populates/syncs historical workload, earnings, active days, 
--              and average daily duty hours per driver per month.
-- ==============================================================================

-- 1. Create the dedicated monthly summary table
CREATE TABLE IF NOT EXISTS driver_monthly_work_summary (
    summary_id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(driver_id) ON DELETE CASCADE,
    month_key VARCHAR(7) NOT NULL,            -- e.g. '2026-09'
    month_name VARCHAR(50) NOT NULL,          -- e.g. 'September 2026'
    trips_completed INTEGER DEFAULT 0,        -- Total completed emergency dispatches
    active_days INTEGER DEFAULT 0,            -- Number of distinct calendar days worked
    total_duty_hours NUMERIC(6, 2) DEFAULT 0.0, -- Estimated total duty hours (trips * 1.5h)
    avg_daily_hours NUMERIC(4, 1) DEFAULT 0.0,  -- Average daily duty hours = total_hours / active_days
    total_earnings NUMERIC(10, 2) DEFAULT 0.0,  -- Total revenue generated from resolved trips (BDT)
    is_over_duty BOOLEAN DEFAULT FALSE,       -- Flag: TRUE if avg_daily_hours >= 8.0
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_driver_month UNIQUE (driver_id, month_key)
);

-- Index for instant lookup by driver and month key
CREATE INDEX IF NOT EXISTS idx_driver_monthly_summary_driver_month 
ON driver_monthly_work_summary(driver_id, month_key);

-- 2. Populate & Synchronize from historical trip logs
INSERT INTO driver_monthly_work_summary (
    driver_id,
    month_key,
    month_name,
    trips_completed,
    active_days,
    total_duty_hours,
    avg_daily_hours,
    total_earnings,
    is_over_duty,
    last_updated
)
SELECT 
    tl.driver_id,
    TO_CHAR(er.timestamp_created, 'YYYY-MM') AS month_key,
    TO_CHAR(er.timestamp_created, 'FMMonth YYYY') AS month_name,
    COUNT(tl.trip_id) AS trips_completed,
    COUNT(DISTINCT DATE(er.timestamp_created)) AS active_days,
    ROUND(COUNT(tl.trip_id) * 1.5, 2) AS total_duty_hours,
    ROUND((COUNT(tl.trip_id) * 1.5) / GREATEST(COUNT(DISTINCT DATE(er.timestamp_created)), 1), 1) AS avg_daily_hours,
    COALESCE(SUM(
        COALESCE(
            750 + ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0 * 20)::numeric, 0),
            800
        )
    ), 0) AS total_earnings,
    CASE 
        WHEN ((COUNT(tl.trip_id) * 1.5) / GREATEST(COUNT(DISTINCT DATE(er.timestamp_created)), 1)) >= 8.0 THEN TRUE
        ELSE FALSE
    END AS is_over_duty,
    CURRENT_TIMESTAMP
FROM trip_logs tl
JOIN emergency_requests er ON tl.trip_id = er.request_id::text
JOIN hospitals h ON tl.hospital_id = h.hospital_id
WHERE er.status = 'Resolved'
GROUP BY tl.driver_id, TO_CHAR(er.timestamp_created, 'YYYY-MM'), TO_CHAR(er.timestamp_created, 'FMMonth YYYY')
ON CONFLICT (driver_id, month_key) 
DO UPDATE SET
    trips_completed = EXCLUDED.trips_completed,
    active_days = EXCLUDED.active_days,
    total_duty_hours = EXCLUDED.total_duty_hours,
    avg_daily_hours = EXCLUDED.avg_daily_hours,
    total_earnings = EXCLUDED.total_earnings,
    is_over_duty = EXCLUDED.is_over_duty,
    last_updated = CURRENT_TIMESTAMP;

-- 3. Verification Query for Demo & Evaluation (Sir-friendly)
-- Run this query to inspect any driver's monthly work hours and earnings:
-- SELECT * FROM driver_monthly_work_summary ORDER BY month_key DESC, driver_id ASC;

-- 4. Pure SQL Query: Driver Yearly Review Aggregation (Past Year Closed Report)
-- When a calendar year ends (e.g. 2026 ends and 2027 begins), this query aggregates all 12 months
-- of that closed year into a comprehensive Yearly Review Card with monthly breakdown list:
SELECT 
    driver_id,
    SUBSTRING(month_key FROM 1 FOR 4) AS report_year,
    COUNT(month_key) AS active_months_count,
    SUM(trips_completed) AS total_yearly_trips,
    SUM(active_days) AS total_yearly_active_days,
    SUM(total_duty_hours) AS total_yearly_duty_hours,
    SUM(total_earnings) AS total_yearly_earnings,
    ROUND(SUM(total_duty_hours) / GREATEST(SUM(active_days), 1), 1) AS yearly_avg_daily_hours,
    COUNT(CASE WHEN is_over_duty THEN 1 END) AS overload_months_count
FROM driver_monthly_work_summary
GROUP BY driver_id, SUBSTRING(month_key FROM 1 FOR 4)
ORDER BY report_year DESC;
