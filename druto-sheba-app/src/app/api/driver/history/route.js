import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const driver_id = searchParams.get('driver_id') || '1';

  try {
    // 1. Resolve Driver's Commission Rate based on Ambulance Ownership & Certified Status
    const driverInfoRes = await query(`
      SELECT 
        d.driver_id,
        d.name,
        d.own_ambulance_plate,
        d.verification_status,
        (
          SELECT COUNT(*) FROM driver_certifications 
          WHERE driver_id = d.driver_id AND is_active = true
        ) + (
          SELECT COUNT(*) FROM driver_verification_submissions 
          WHERE driver_id = d.driver_id AND status = 'Approved' AND certificate_name IS NOT NULL
        ) AS cert_count
      FROM drivers d
      WHERE d.driver_id = $1
    `, [driver_id]);

    const driverInfo = driverInfoRes.rows[0];
    const isOwnAmbulance = Boolean(driverInfo?.own_ambulance_plate && driverInfo.own_ambulance_plate.trim() !== '');
    const isCertified = Number(driverInfo?.cert_count || 0) > 0;

    let commissionRate = 0.25; // default
    if (!isOwnAmbulance && !isCertified) commissionRate = 0.30;
    else if (!isOwnAmbulance && isCertified) commissionRate = 0.25;
    else if (isOwnAmbulance && !isCertified) commissionRate = 0.05;
    else if (isOwnAmbulance && isCertified) commissionRate = 0.03;

    const driverShareRate = 1 - commissionRate;

    // 2. Fetch completed trips with exact ৳815 + (km * ৳25) calculation
    const res = await query(
      `SELECT tl.trip_id, er.timestamp_created, p.name as patient_name, 
              h.name as hospital_name, er.status,
              COALESCE(
                ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0)::numeric, 1),
                2.5
              ) as distance_km,
              COALESCE(
                815 + ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0 * 25)::numeric, 0),
                880
              ) as total_gross_fare
       FROM trip_logs tl
       JOIN emergency_requests er ON tl.trip_id = er.request_id::text
       JOIN patients p ON er.patient_id = p.patient_id
       JOIN hospitals h ON tl.hospital_id = h.hospital_id
       WHERE tl.driver_id = $1 AND er.status = 'Resolved'
       ORDER BY er.timestamp_created DESC`,
      [driver_id]
    );

    // Fetch feedback ratings submitted by patients
    const feedbackRes = await query(`
      SELECT tf.rating, tf.comments, tl.trip_id
      FROM trip_feedback tf
      JOIN trip_logs tl ON tf.trip_id = tl.trip_id
      WHERE tl.driver_id = $1
    `, [driver_id]);

    const feedbackMap = {};
    feedbackRes.rows.forEach(f => {
      feedbackMap[f.trip_id] = Number(f.rating);
    });

    const trips = res.rows.map(t => {
      const dist = Number(t.distance_km || 2.5);
      const estMinutes = Math.max(12, Math.round(dist * 3.5 + 10));
      const grossFare = Number(t.total_gross_fare || 880);
      const netDriverIncome = Math.round(grossFare * driverShareRate);

      return {
        id: t.trip_id,
        date: new Date(t.timestamp_created).toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' }),
        patient: t.patient_name,
        from: 'Emergency Location',
        to: t.hospital_name,
        gross_fare: '৳' + grossFare.toLocaleString(),
        fare: '৳' + netDriverIncome.toLocaleString(), // Driver Net Earnings after Druto Sheba commission
        rating: feedbackMap[t.trip_id] !== undefined ? feedbackMap[t.trip_id] : null,
        time: `${estMinutes}m`,
        distance_km: dist
      };
    });

    const feedbackList = feedbackRes.rows;
    let avgRating = null;
    if (feedbackList.length > 0) {
      const sum = feedbackList.reduce((acc, f) => acc + Number(f.rating), 0);
      avgRating = (sum / feedbackList.length).toFixed(1);
    }

    // Total net earnings across all resolved trips
    const totalGross = res.rows.reduce((sum, t) => sum + Number(t.total_gross_fare || 880), 0);
    const totalNetEarnings = Math.round(totalGross * driverShareRate);

    // 3. Sync to dedicated table `driver_monthly_work_summary` with net driver earnings
    await query(`
      INSERT INTO driver_monthly_work_summary (
        driver_id, month_key, month_name, trips_completed, active_days, 
        total_duty_hours, avg_daily_hours, total_earnings, is_over_duty, last_updated
      )
      SELECT 
        tl.driver_id,
        TO_CHAR(er.timestamp_created AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM') AS month_key,
        TO_CHAR(er.timestamp_created AT TIME ZONE 'Asia/Dhaka', 'FMMonth YYYY') AS month_name,
        COUNT(tl.trip_id) AS trips_completed,
        COUNT(DISTINCT DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka')) AS active_days,
        ROUND(COUNT(tl.trip_id) * 1.5, 2) AS total_duty_hours,
        ROUND((COUNT(tl.trip_id) * 1.5) / GREATEST(COUNT(DISTINCT DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka')), 1), 1) AS avg_daily_hours,
        COALESCE(ROUND(SUM(
          COALESCE(
            815 + ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0 * 25)::numeric, 0),
            880
          )
        ) * $2, 2), 0) AS total_earnings,
        CASE 
          WHEN ((COUNT(tl.trip_id) * 1.5) / GREATEST(COUNT(DISTINCT DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka')), 1)) >= 8.0 THEN TRUE
          ELSE FALSE
        END AS is_over_duty,
        CURRENT_TIMESTAMP
      FROM trip_logs tl
      JOIN emergency_requests er ON tl.trip_id = er.request_id::text
      JOIN hospitals h ON tl.hospital_id = h.hospital_id
      WHERE tl.driver_id = $1 AND er.status = 'Resolved'
      GROUP BY tl.driver_id, TO_CHAR(er.timestamp_created AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM'), TO_CHAR(er.timestamp_created AT TIME ZONE 'Asia/Dhaka', 'FMMonth YYYY')
      ON CONFLICT (driver_id, month_key) 
      DO UPDATE SET
        trips_completed = EXCLUDED.trips_completed,
        active_days = EXCLUDED.active_days,
        total_duty_hours = EXCLUDED.total_duty_hours,
        avg_daily_hours = EXCLUDED.avg_daily_hours,
        total_earnings = EXCLUDED.total_earnings,
        is_over_duty = EXCLUDED.is_over_duty,
        last_updated = CURRENT_TIMESTAMP
    `, [driver_id, driverShareRate]);

    // 4. Fetch from dedicated table `driver_monthly_work_summary`
    const monthlyRes = await query(`
      SELECT 
        summary_id,
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
      FROM driver_monthly_work_summary
      WHERE driver_id = $1
      ORDER BY month_key DESC
    `, [driver_id]);

    // 5. Query Yearly Aggregation
    const yearlyRes = await query(`
      SELECT 
        SUBSTRING(month_key FROM 1 FOR 4) AS report_year,
        COUNT(month_key) AS active_months_count,
        COALESCE(SUM(trips_completed), 0) AS total_yearly_trips,
        COALESCE(SUM(active_days), 0) AS total_yearly_active_days,
        COALESCE(SUM(total_duty_hours), 0) AS total_yearly_duty_hours,
        COALESCE(SUM(total_earnings), 0) AS total_yearly_earnings,
        ROUND(COALESCE(SUM(total_duty_hours), 0) / GREATEST(COALESCE(SUM(active_days), 0), 1), 1) AS yearly_avg_daily_hours
      FROM driver_monthly_work_summary
      WHERE driver_id = $1
      GROUP BY SUBSTRING(month_key FROM 1 FOR 4)
      ORDER BY report_year DESC
    `, [driver_id]);

    const currentYear = new Date().getFullYear().toString();

    const monthlyBreakdown = monthlyRes.rows.map(m => ({
      month_key: m.month_key,
      month_name: m.month_name.trim(),
      year: m.month_key.substring(0, 4),
      trips_count: Number(m.trips_completed || 0),
      earnings: '৳' + Math.round(Number(m.total_earnings || 0)).toLocaleString(),
      raw_earnings: Number(m.total_earnings || 0),
      active_days: Number(m.active_days || 0),
      total_duty_hours: Number(m.total_duty_hours || 0),
      avg_daily_hours: Number(m.avg_daily_hours || 0),
      is_over_duty: Boolean(m.is_over_duty)
    }));

    const yearlyReviews = yearlyRes.rows.map(y => {
      const yearStr = String(y.report_year);
      const monthsInThisYear = monthlyBreakdown.filter(m => m.year === yearStr);
      return {
        year: yearStr,
        is_current_year: yearStr === currentYear,
        total_trips: Number(y.total_yearly_trips || 0),
        total_earnings: '৳' + Math.round(Number(y.total_yearly_earnings || 0)).toLocaleString(),
        raw_earnings: Number(y.total_yearly_earnings || 0),
        total_active_days: Number(y.total_yearly_active_days || 0),
        total_duty_hours: Number(y.total_yearly_duty_hours || 0),
        yearly_avg_daily_hours: Number(y.yearly_avg_daily_hours || 0),
        monthly_list: monthsInThisYear
      };
    });

    return NextResponse.json({ 
      earnings: '৳' + totalNetEarnings.toLocaleString(), 
      rating: avgRating ? parseFloat(avgRating) : null,
      reviews_count: feedbackList.length,
      trips_count: trips.length,
      trips,
      commission_rate_pct: Math.round(commissionRate * 100),
      current_year: currentYear,
      monthly_breakdown: monthlyBreakdown,
      yearly_reviews: yearlyReviews
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
