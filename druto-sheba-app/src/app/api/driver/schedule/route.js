import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const driver_id = parseInt(searchParams.get('driver_id')) || 1;

  try {
    const res = await query(
      `SELECT shift_date as date, start_time, end_time 
       FROM shift_schedules 
       WHERE driver_id = $1 
       ORDER BY shift_date ASC, start_time ASC`,
      [driver_id]
    );

    let rawShifts = res?.rows || [];

    // First check driver verification status
    const driverRes = await query(
      `SELECT verification_status, assigned_ambulance_id, own_ambulance_plate 
       FROM drivers WHERE driver_id = $1`,
      [driver_id]
    );
    const driverInfo = driverRes.rows[0];

    // If driver is pending verification or not approved, do not show template shifts until admin verifies and assigns
    if (driverInfo && driverInfo.verification_status !== 'Approved') {
      return NextResponse.json({
        hours: '0 hrs',
        nextShift: 'Pending Verification',
        shifts: []
      });
    }

    // If database has no records, generate a full 7-day schedule for verified drivers
    if (rawShifts.length === 0) {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sun, 1 = Mon...
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1)); // start on Monday

      const template = [
        { offset: 0, start: '08:00:00', end: '16:00:00', type: 'Morning', role: 'Regular' },
        { offset: 1, start: '08:00:00', end: '16:00:00', type: 'Morning', role: 'Regular' },
        { offset: 2, start: '14:00:00', end: '22:00:00', type: 'Evening', role: 'Regular' },
        { offset: 3, start: '14:00:00', end: '22:00:00', type: 'Evening', role: 'Regular' },
        { offset: 4, start: '22:00:00', end: '06:00:00', type: 'Night', role: 'Emergency On-Call' },
        { offset: 5, start: '00:00:00', end: '00:00:00', type: 'Off', role: 'Scheduled Off' },
        { offset: 6, start: '08:00:00', end: '16:00:00', type: 'Morning', role: 'Regular' },
      ];

      rawShifts = template.map(t => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + t.offset);
        return {
          date: d.toISOString().split('T')[0],
          start_time: t.start,
          end_time: t.end,
          customType: t.type,
          customRole: t.role
        };
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let totalWorkingHours = 0;
    let nextShiftInfo = 'Tomorrow, 08:00 AM';

    const formattedShifts = rawShifts.map(s => {
      const startHour = parseInt((s.start_time || '08:00').split(':')[0]);
      let shiftType = s.customType || 'Morning';
      if (!s.customType) {
        if (s.start_time === '00:00:00' && s.end_time === '00:00:00') {
          shiftType = 'Off';
        } else if (startHour >= 14 && startHour < 22) {
          shiftType = 'Evening';
        } else if (startHour >= 22 || startHour < 6) {
          shiftType = 'Night';
        }
      }

      if (shiftType !== 'Off') {
        totalWorkingHours += 8;
      }

      let dateStr = '';
      let shiftDate;

      if (s.date instanceof Date) {
        shiftDate = s.date;
        dateStr = s.date.toISOString().split('T')[0];
      } else if (typeof s.date === 'string') {
        dateStr = s.date.split('T')[0];
        shiftDate = new Date(dateStr + 'T00:00:00');
      } else {
        shiftDate = new Date();
        dateStr = shiftDate.toISOString().split('T')[0];
      }

      // Check if valid date
      if (isNaN(shiftDate.getTime())) {
        shiftDate = new Date();
        dateStr = shiftDate.toISOString().split('T')[0];
      }

      const currentDayIndex = new Date().getDay();
      const shiftDayIndex = shiftDate.getDay();
      const isPast = shiftDayIndex < currentDayIndex;
      const isToday = shiftDayIndex === currentDayIndex;

      let status = 'Upcoming';
      if (shiftType === 'Off') {
        status = 'Rest Day';
      } else if (isPast) {
        status = 'Completed';
      } else if (isToday) {
        status = 'Active Today';
        nextShiftInfo = `Today at ${String(s.start_time || '08:00').substring(0, 5)}`;
      }

      return {
        day: shiftDate.toLocaleDateString('en-US', { weekday: 'long' }),
        date: 'Weekly',
        shift: shiftType,
        time: shiftType === 'Off' ? 'No Shift' : `${String(s.start_time || '08:00').substring(0, 5)} - ${String(s.end_time || '16:00').substring(0, 5)}`,
        status,
        type: s.customRole || (shiftType === 'Night' ? 'Emergency On-Call' : shiftType === 'Off' ? 'Scheduled Off' : 'Regular')
      };
    });

    return NextResponse.json({
      hours: `${totalWorkingHours} hrs`,
      nextShift: nextShiftInfo,
      shifts: formattedShifts
    });
  } catch (error) {
    console.error('Error fetching driver schedule:', error);
    return NextResponse.json({
      hours: '40 hrs',
      nextShift: 'Tomorrow, 08:00 AM',
      shifts: []
    });
  }
}
