import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driver_id');

    if (!driverId) {
      return NextResponse.json({ error: 'driver_id is required' }, { status: 400 });
    }

    // Direct, 100% accurate PostgreSQL calculation for Today's Active Shift (Asia/Dhaka timezone)
    const todayStatsRes = await query(`
      SELECT 
        COUNT(tl.trip_id) as today_trips_count,
        COALESCE(SUM(
          815 + ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0 * 25)::numeric, 0)
        ), 0) as todays_collection,
        CASE 
          WHEN COUNT(tl.trip_id) > 0 THEN 
            GREATEST(0.1, ROUND((EXTRACT(EPOCH FROM ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka') - MIN(er.timestamp_created))) / 3600.0)::numeric, 1))
          ELSE 0.0
        END as hours_worked
      FROM trip_logs tl
      JOIN emergency_requests er ON tl.trip_id = er.request_id::text
      JOIN hospitals h ON tl.hospital_id = h.hospital_id
      WHERE tl.driver_id = $1 
        AND er.status = 'Resolved'
        AND DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka') = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date
    `, [driverId]);

    const row = todayStatsRes.rows[0] || {};
    const todayTripsCount = Number(row.today_trips_count || 0);
    const todaysCollection = Number(row.todays_collection || 0);
    const hoursWorked = Number(row.hours_worked || 0);
    const isOvertime = hoursWorked >= 8.0;

    return NextResponse.json({
      hours_worked: hoursWorked,
      is_overtime: isOvertime,
      today_trips: todayTripsCount,
      trips_completed: todayTripsCount, // strictly today's trips for the Current Shift ribbon
      todays_collection: todaysCollection,
      estimated_earnings: todaysCollection
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
