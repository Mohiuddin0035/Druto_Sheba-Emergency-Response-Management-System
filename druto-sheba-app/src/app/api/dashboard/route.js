import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Proactively re-define active_dashboard_view to ensure driver_phone column is available
    await query(`
      CREATE OR REPLACE VIEW active_dashboard_view AS
       SELECT er.request_id,
          er.patient_id,
          p.name AS patient_name,
          p.blood_type,
          p.allergies,
          er.primary_specialization,
          st_x((er.pickup_coords)::geometry) AS patient_lon,
          st_y((er.pickup_coords)::geometry) AS patient_lat,
          er.severity_level,
          er.emergency_type,
          er.requested_for,
          er.timestamp_created,
          er.status AS request_status,
          a.license_plate AS assigned_ambulance,
          h.name AS destination_hospital,
          h.type AS hospital_type,
          st_x((a.current_location)::geometry) AS ambulance_lon,
          st_y((a.current_location)::geometry) AS ambulance_lat,
          tl.driver_id,
          d.name AS driver_name,
          d.phone AS driver_phone
         FROM (((((emergency_requests er
           JOIN patients p ON ((er.patient_id = p.patient_id)))
           LEFT JOIN trip_logs tl ON (((er.request_id)::text = (tl.trip_id)::text)))
           LEFT JOIN ambulances a ON ((tl.vehicle_id = a.vehicle_id)))
           LEFT JOIN hospitals h ON ((COALESCE(tl.hospital_id, er.hospital_id) = h.hospital_id)))
           LEFT JOIN drivers d ON ((tl.driver_id = d.driver_id)))
        WHERE (er.status = ANY (ARRAY['Broadcast'::req_status, 'Pending'::req_status, 'Active'::req_status, 'En Route'::req_status, 'Picked Up'::req_status, 'Arrived'::req_status]));
    `).catch(err => console.error("Failed to patch active_dashboard_view:", err));

    const results = await Promise.all([
      query(`SELECT COUNT(*) as total, 
             COUNT(*) FILTER (WHERE status IN ('Broadcast', 'Pending')) as pending,
             COUNT(*) FILTER (WHERE status IN ('Active', 'En Route', 'Picked Up', 'Arrived')) as active
             FROM emergency_requests WHERE status IN ('Broadcast', 'Pending', 'Active', 'En Route', 'Picked Up', 'Arrived')`),
      query(`SELECT current_status, COUNT(*) as count FROM ambulances GROUP BY current_status`),
      query(`SELECT COUNT(*) as count FROM ambulances WHERE current_status = 'Maintenance_Required'`),
      query(`SELECT SUM(general_beds) as total_general, SUM(icu_beds) as total_icu FROM hospitals`),
      query(`SELECT shift_status, COUNT(*) as count FROM drivers GROUP BY shift_status`),
      query(`
        SELECT 
          v.*,
          COALESCE(json_agg(DISTINCT pc.condition_name) FILTER (WHERE pc.condition_name IS NOT NULL), '[]') as conditions,
          (SELECT json_build_object('name', contact_name, 'phone', phone, 'relationship', relationship) 
           FROM patient_emergency_contacts 
           WHERE patient_id = v.patient_id LIMIT 1) as emergency_contact
        FROM active_dashboard_view v
        LEFT JOIN patient_conditions pc ON v.patient_id = pc.patient_id
        GROUP BY v.request_id, v.patient_id, v.patient_name, v.blood_type, v.allergies,
                 v.primary_specialization, v.patient_lon, v.patient_lat, v.severity_level,
                 v.emergency_type, v.requested_for, v.timestamp_created, v.request_status,
                 v.assigned_ambulance, v.destination_hospital, v.hospital_type,
                 v.ambulance_lon, v.ambulance_lat, v.driver_id, v.driver_name, v.driver_phone
        ORDER BY 
          CASE v.severity_level 
            WHEN 'Critical' THEN 1 
            WHEN 'High' THEN 2 
            WHEN 'Medium' THEN 3 
            WHEN 'Low' THEN 4 
          END
      `),
      query(`SELECT tl.trip_id, (tl.time_dispatched AT TIME ZONE 'UTC') as time_dispatched, p.name as patient_name, h.name as hospital_name, a.license_plate
             FROM trip_logs tl
             JOIN emergency_requests er ON tl.trip_id = er.request_id::text
             JOIN patients p ON er.patient_id = p.patient_id
             JOIN hospitals h ON tl.hospital_id = h.hospital_id
             JOIN ambulances a ON tl.vehicle_id = a.vehicle_id
             ORDER BY tl.time_dispatched DESC LIMIT 5`),
      query(`SELECT * FROM chat_messages ORDER BY timestamp ASC`),
      query(`SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (tl.time_dispatched - er.timestamp_created)) / 60), 0) as avg_response_time
             FROM trip_logs tl
             JOIN emergency_requests er ON tl.trip_id = er.request_id::text`),
      query(`SELECT COALESCE(p.address, 'Unknown Area') as area
             FROM emergency_requests er
             JOIN patients p ON er.patient_id = p.patient_id
             GROUP BY p.address
             ORDER BY COUNT(*) DESC
             LIMIT 1`),
      query(`SELECT TO_CHAR(DATE_TRUNC('day', timestamp_created), 'DD Mon') as day, COUNT(*) as count 
             FROM emergency_requests 
             WHERE timestamp_created > NOW() - INTERVAL '7 days'
             GROUP BY day ORDER BY MIN(timestamp_created) ASC`),
      query(`
        SELECT COALESCE(p.primary_specialization, 'General Care') as spec, COUNT(*) as count 
        FROM emergency_requests er
        JOIN patients p ON er.patient_id = p.patient_id
        GROUP BY p.primary_specialization 
        ORDER BY count DESC 
        LIMIT 5
      `),
      query(`SELECT * FROM drivers`),
      query(`SELECT *, ST_X(current_location::geometry) as lon, ST_Y(current_location::geometry) as lat FROM ambulances`),
      query(`SELECT * FROM hospitals`),
      query(`SELECT * FROM system_advisories WHERE id = 1`),
      query(`
        SELECT 
            d.driver_id,
            d.name AS driver_name,
            d.phone,
            TO_CHAR(er.timestamp_created AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM') AS report_month,
            COUNT(tl.trip_id) AS total_monthly_trips,
            COUNT(DISTINCT DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka')) AS active_duty_days,
            ROUND(
                (COUNT(tl.trip_id) * 1.5) / GREATEST(COUNT(DISTINCT DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka')), 1), 
                1
            ) AS avg_daily_duty_hours,
            CASE 
                WHEN ((COUNT(tl.trip_id) * 1.5) / GREATEST(COUNT(DISTINCT DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka')), 1)) >= 8.0 
                     AND COUNT(tl.trip_id) >= 50 THEN 'CRITICAL_OVERLOAD'
                WHEN ((COUNT(tl.trip_id) * 1.5) / GREATEST(COUNT(DISTINCT DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka')), 1)) >= 8.0 THEN 'OVERTIME'
                ELSE 'NORMAL'
            END AS fatigue_risk_status
        FROM drivers d
        JOIN trip_logs tl ON d.driver_id = tl.driver_id
        JOIN emergency_requests er ON tl.trip_id = er.request_id::text
        WHERE er.status IN ('Resolved', 'Admitted', 'Arrived', 'Active', 'Picked Up', 'En Route')
          AND TO_CHAR(er.timestamp_created AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM') = TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM')
        GROUP BY d.driver_id, d.name, d.phone, TO_CHAR(er.timestamp_created AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM')
        ORDER BY total_monthly_trips DESC;
      `)
    ]);

    const [activeRequests, fleetStatus, maintenanceStatus, bedStatus, driverStatus, dashboardView, recentTrips, chatMessages, responseStats, hotspotStats, trendStats, specStats, driversList, ambulancesList, hospitalsList, advisoryRes, overworkRes] = results;

    const fleet = {};
    fleetStatus.rows.forEach(r => { fleet[r.current_status] = parseInt(r.count); });

    const drivers = {};
    driverStatus.rows.forEach(r => { drivers[r.shift_status] = parseInt(r.count); });

    // Generate last 7 days to ensure graph always has 7 points
    const trend = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
      const found = trendStats.rows.find(r => r.day === dayStr);
      trend.push({
        day: dayStr,
        count: found ? parseInt(found.count) : 0
      });
    }

    return NextResponse.json({
      stats: {
        activeEmergencies: parseInt(activeRequests.rows[0].total),
        pendingRequests: parseInt(activeRequests.rows[0].pending),
        activeDispatches: parseInt(activeRequests.rows[0].active),
        availableAmbulances: fleet['Available'] || 0,
        dispatchedAmbulances: fleet['Dispatched'] || 0,
        totalGeneralBeds: parseInt(bedStatus.rows[0].total_general),
        totalIcuBeds: parseInt(bedStatus.rows[0].total_icu),
        onDutyDrivers: drivers['On_Duty'] || 0,
        maintenanceAlerts: parseInt(maintenanceStatus.rows[0].count),
      },
      activeView: dashboardView.rows,
      recentTrips: recentTrips.rows,
      chatMessages: chatMessages.rows,
      insights: {
        avgResponseTime: parseFloat(responseStats.rows[0]?.avg_response_time || 0).toFixed(1),
        hotspot: hotspotStats.rows[0]?.area || 'N/A'
      },
      trend: trend,
      specializationStats: specStats.rows,
      drivers: driversList.rows,
      ambulances: ambulancesList.rows,
      hospitals: hospitalsList.rows,
      advisory: advisoryRes.rows[0],
      overworkStats: overworkRes.rows
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
