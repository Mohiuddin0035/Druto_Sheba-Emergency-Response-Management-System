import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

/** Run a query safely — returns empty rows on failure instead of throwing */
async function safeQuery(sql, params = []) {
  try {
    return await query(sql, params);
  } catch (e) {
    console.error('[Analytics] Query failed:', e.message.substring(0, 120));
    return { rows: [], rowCount: 0 };
  }
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      hospitalRank, zoneAnalysis, maintenanceStats, inventoryAlerts,
      costTrend, recentReviews, responseTime, specDist, trendStats,
      revenueStats, monthlyRevenue
    ] = await Promise.all([
      safeQuery(`
        SELECT Name, ICU_Beds, General_Beds,
        RANK() OVER (ORDER BY ICU_Beds DESC) as icu_rank
        FROM Hospitals
      `),
      safeQuery(`
        SELECT dz.name as zone_name, COUNT(er.request_id) as count
        FROM dispatch_zones dz
        LEFT JOIN emergency_requests er ON er.zone_id = dz.zone_id 
          AND EXTRACT(YEAR FROM er.timestamp_created) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY dz.zone_id, dz.name
        ORDER BY count DESC
        LIMIT 10
      `),
      safeQuery(`
        SELECT a.License_Plate, ml.Maintenance_Type, ml.Cost, ml.Date_Started,
        SUM(ml.Cost) OVER (PARTITION BY ml.Vehicle_ID ORDER BY ml.Date_Started) as running_total
        FROM Maintenance_Logs ml
        JOIN Ambulances a ON ml.Vehicle_ID = a.Vehicle_ID
        ORDER BY ml.Date_Started DESC
      `),
      safeQuery(`
        SELECT a.License_Plate, vi.Item_Name, vi.Quantity,
        'LOW' as status
        FROM Vehicle_Inventory vi
        JOIN Ambulances a ON vi.Vehicle_ID = a.Vehicle_ID
        WHERE (vi.Item_Name = 'Oxygen Level (%)' AND vi.Quantity <= 20)
           OR (vi.Item_Name = 'Defibrillator' AND vi.Quantity = 0)
           OR (vi.Item_Name = 'Basic Supplies' AND vi.Quantity = 0)
      `),
      safeQuery(`
        SELECT TO_CHAR(DATE_TRUNC('day', Date_Started), 'DD Mon') as day, SUM(Cost) as total_cost
        FROM Maintenance_Logs
        GROUP BY day ORDER BY MIN(Date_Started) ASC
      `),
      safeQuery(`
        SELECT tf.*, p.name as patient_name
        FROM Trip_Feedback tf
        JOIN Trip_Logs tl ON tf.trip_id = tl.trip_id
        JOIN Emergency_Requests er ON tl.trip_id = er.request_id::text::text
        JOIN Patients p ON er.patient_id = p.patient_id
        ORDER BY tf.created_at DESC LIMIT 5
      `),
      safeQuery(`
        SELECT 
          CASE 
            WHEN (EXTRACT(EPOCH FROM (tl.time_dispatched - er.timestamp_created)) / 60) < 5 THEN '< 5 min'
            WHEN (EXTRACT(EPOCH FROM (tl.time_dispatched - er.timestamp_created)) / 60) < 10 THEN '5-10 min'
            WHEN (EXTRACT(EPOCH FROM (tl.time_dispatched - er.timestamp_created)) / 60) < 15 THEN '10-15 min'
            ELSE '15+ min'
          END as range,
          COUNT(*) as count
        FROM trip_logs tl
        JOIN emergency_requests er ON tl.trip_id = er.request_id::text
        GROUP BY range
      `),
      safeQuery(`
        SELECT 
          CASE 
            WHEN emergency_type IN ('Cardiac', 'Cardiac Arrest', 'Cardiology') THEN 'Cardiac'
            WHEN emergency_type IN ('Accident', 'Trauma', 'Road Traffic Accident') THEN 'Accident'
            WHEN emergency_type IN ('Maternity', 'Pregnancy', 'Obstetrics') THEN 'Maternity'
            ELSE 'General'
          END as category,
          COUNT(*) as count
        FROM emergency_requests
        WHERE EXTRACT(YEAR FROM timestamp_created) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY category
        ORDER BY count DESC
      `),
      safeQuery(`
        SELECT TO_CHAR(DATE_TRUNC('day', timestamp_created), 'DD Mon') as day, COUNT(*) as count 
        FROM emergency_requests 
        WHERE timestamp_created > NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY MIN(timestamp_created) ASC
      `),
      safeQuery(`
        SELECT 
          COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) THEN amount_paid ELSE 0 END), 0) as current_year_revenue,
          COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) - 1 THEN amount_paid ELSE 0 END), 0) as previous_year_revenue
        FROM platform_payments
        WHERE amount_paid > 0 AND status NOT IN ('Rejected', 'Refunded', 'Cancelled')
      `),
      safeQuery(`
        SELECT EXTRACT(MONTH FROM created_at) as month, SUM(amount_paid) as revenue
        FROM platform_payments
        WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND amount_paid > 0 AND status NOT IN ('Rejected', 'Refunded', 'Cancelled')
        GROUP BY month
        ORDER BY month ASC
      `)
    ]);

    // Zero-pad trend for consistency — always 7 days
    const requestTrend = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
      const found = trendStats.rows.find(r => r.day === dayStr);
      requestTrend.push({
        day: dayStr,
        count: found ? parseInt(found.count) : 0
      });
    }

    // Process monthly revenue (1 to 12)
    const monthlyRev = [];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 1; i <= 12; i++) {
      const mRow = monthlyRevenue.rows.find(r => parseInt(r.month) === i);
      monthlyRev.push({
        month: shortMonths[i - 1],
        revenue: mRow ? parseFloat(mRow.revenue) : 0
      });
    }

    // Ensure all 4 SOS categories are consistently represented
    const sosCategories = ['Accident', 'Cardiac', 'Maternity', 'General'];
    const specDistFormatted = sosCategories.map(cat => {
      const found = specDist.rows.find(r => r.category === cat);
      return {
        spec: cat,
        count: found ? parseInt(found.count) : 0
      };
    }).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      hospitalRank: hospitalRank.rows,
      zoneAnalysis: zoneAnalysis.rows,
      maintenanceStats: maintenanceStats.rows,
      inventoryAlerts: inventoryAlerts.rows,
      costTrend: costTrend.rows,
      recentReviews: recentReviews.rows,
      responseTime: responseTime.rows,
      specDist: specDistFormatted,
      requestTrend,
      revenueStats: revenueStats.rows[0] || { current_year_revenue: 0, previous_year_revenue: 0 },
      monthlyRevenue: monthlyRev
    });
  } catch (error) {
    console.error('[Analytics] Unexpected error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
