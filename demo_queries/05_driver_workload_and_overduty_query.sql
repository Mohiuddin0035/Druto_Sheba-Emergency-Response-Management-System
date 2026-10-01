-- ==============================================================================
-- DEMO QUERY 05: Driver Monthly Workload, Overwork & Earnings Evaluation
-- File: demo_queries/05_driver_workload_and_overduty_query.sql
-- Description: Queries the dedicated `driver_monthly_work_summary` table to inspect
--              completed trips, active working days, total duty hours, 
--              daily average duty hours, and flags critical overload.
-- ==============================================================================

-- 1. Direct Inspection of the Dedicated Table (Sir Demo Query)
SELECT 
    d.driver_id,
    d.name AS driver_name,
    d.phone_number,
    dm.month_name,
    dm.trips_completed,
    dm.active_days,
    dm.total_duty_hours,
    dm.avg_daily_hours,
    dm.total_earnings,
    dm.is_over_duty,
    CASE 
        WHEN dm.is_over_duty THEN '⚠️ OVERLOAD / EXCESSIVE DUTY'
        ELSE '✅ NORMAL WORKLOAD'
    END AS duty_risk_status,
    dm.last_updated
FROM driver_monthly_work_summary dm
JOIN drivers d ON dm.driver_id = d.driver_id
ORDER BY dm.month_key DESC, dm.trips_completed DESC;

-- 2. Advanced Aggregate: Fleet Overwork & Pressure Summary (For Admin/Dispatcher)
SELECT 
    month_name,
    COUNT(driver_id) AS total_active_drivers,
    SUM(trips_completed) AS fleet_monthly_trips,
    ROUND(AVG(avg_daily_hours), 1) AS fleet_avg_duty_hours_per_day,
    SUM(total_earnings) AS total_fleet_payout,
    COUNT(CASE WHEN is_over_duty THEN 1 END) AS drivers_facing_overload
FROM driver_monthly_work_summary
GROUP BY month_key, month_name
ORDER BY month_key DESC;
