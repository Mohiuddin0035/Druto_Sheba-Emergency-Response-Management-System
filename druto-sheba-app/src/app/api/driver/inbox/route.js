import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driver_id') || '1';

    // 1. Evaluate any unpaid commissions from past 24-hour cycles and auto-generate daily reminder notice
    try {
      // Step A: Check if any previous day has completed trips but no record in driver_daily_settlements yet
      const unrecordedPastDays = await query(`
        SELECT 
          DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka') AS past_date,
          COUNT(*) AS trip_count,
          SUM(
            COALESCE(
              815 + ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0 * 25)::numeric, 0),
              880
            )
          ) AS gross_cash
        FROM trip_logs tl
        JOIN emergency_requests er ON tl.trip_id = er.request_id::text
        JOIN hospitals h ON tl.hospital_id = h.hospital_id
        WHERE tl.driver_id = $1
          AND er.status = 'Resolved'
          AND DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka') < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date
          AND NOT EXISTS (
            SELECT 1 FROM driver_daily_settlements 
            WHERE driver_id = $1 AND settlement_date = DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka')
          )
        GROUP BY DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka')
      `, [driverId]);

      // If unrecorded past days exist, snapshot them as Pending settlements
      if (unrecordedPastDays.rows.length > 0) {
        for (const pastDay of unrecordedPastDays.rows) {
          const gross = Number(pastDay.gross_cash || 0);
          const commission = Math.round(gross * 0.25); // default or tier rate
          const net = gross - commission;
          await query(`
            INSERT INTO driver_daily_settlements (
              driver_id, settlement_date, total_trips, total_cash_collected,
              commission_rate_pct, commission_category, platform_commission_amount,
              driver_net_earnings, payment_status, amount_paid, due_amount
            ) VALUES ($1, $2, $3, $4, 25.00, 'Company Ambulance + Certificate', $5, $6, 'Pending', 0.00, $5)
            ON CONFLICT (driver_id, settlement_date) DO NOTHING
          `, [driverId, pastDay.past_date, Number(pastDay.trip_count), gross, commission, net]);
        }
      }

      // Step B: Find past pending/partial settlements where due_amount > 0
      const overdueSettlements = await query(`
        SELECT 
          s.settlement_id,
          s.settlement_date,
          s.platform_commission_amount,
          COALESCE(s.amount_paid, 0) AS amount_paid,
          COALESCE(s.due_amount, s.platform_commission_amount) AS due_amount,
          s.payment_status,
          d.name AS driver_name,
          d.license_no
        FROM driver_daily_settlements s
        JOIN drivers d ON s.driver_id = d.driver_id
        WHERE s.driver_id = $1
          AND s.payment_status IN ('Pending', 'Partial')
          AND COALESCE(s.due_amount, s.platform_commission_amount) > 0
          AND s.settlement_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date
        ORDER BY s.settlement_date ASC
      `, [driverId]);

      if (overdueSettlements.rows.length > 0) {
        // Count consecutive days overdue
        const consecutiveDays = overdueSettlements.rows.length;
        const totalOverdue = overdueSettlements.rows.reduce(
          (acc, row) => acc + Number(row.due_amount || 0), 0
        );
        const latestOverdue = overdueSettlements.rows[overdueSettlements.rows.length - 1];
        const driverName = latestOverdue.driver_name || 'Driver';
        const licenseNo = latestOverdue.license_no || 'N/A';
        const dayDate = new Date(latestOverdue.settlement_date).toLocaleDateString('en-US', {
          timeZone: 'Asia/Dhaka',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        // Only send automatic reminders up to 7 consecutive days
        if (consecutiveDays <= 7) {
          // Check if an automated alert was already created for this driver today (strictly 1 message per day, up to day 7)
          const todayAlertCheck = await query(`
            SELECT message_id FROM driver_inbox_messages
            WHERE driver_id = $1
              AND category IN ('PAYMENT_REMINDER', 'WARNING')
              AND (
                DATE(created_at AT TIME ZONE 'Asia/Dhaka') = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date
                OR DATE(created_at) = CURRENT_DATE
                OR title LIKE $2
              )
            LIMIT 1
          `, [driverId, `%Day ${consecutiveDays} of 7%`]);

          if (todayAlertCheck.rows.length === 0) {
            let title = '';
            let body = '';
            let priority = 'HIGH';
            let category = 'PAYMENT_REMINDER';

            if (consecutiveDays < 7) {
              title = `⚠️ Daily Settlement Due Alert (Day ${consecutiveDays} of 7) - ৳${Math.round(totalOverdue).toLocaleString()}`;
              body = `সম্মানিত ${driverName} (Employee ID: EMP-${driverId.toString().padStart(4, '0')}, Driving License: ${licenseNo}), আপনার দৈনিক ২৪ ঘণ্টার শিফট সমাপ্ত হওয়ার পরেও Druto Sheba প্ল্যাটফর্ম কমিশন পরিশোধ করা হয়নি। বিগত দিন (${dayDate})-এর বকেয়া কমিশন ৳${Math.round(Number(latestOverdue.due_amount)).toLocaleString()} সহ আপনার সর্বমোট অপরিশোধিত বকেয়া দাঁড়িয়েছে ৳${Math.round(totalOverdue).toLocaleString()}। অনুগ্রহ করে ড্রাইভার পোর্টালের 'Bill Pay' অপশন থেকে দ্রুত বকেয়া পরিশোধ সম্পন্ন করুন। উল্লেখ্য, টানা ৭ দিন পর্যন্ত এই অটোমেটিক রিমাইন্ডার প্রেরিত হবে।`;
            } else {
              // 7th consecutive day: Final automatic notice, case escalating to admin
              priority = 'URGENT';
              category = 'WARNING';
              title = `🚨 Final Settlement Notice (Day 7/7) - Immediate Action Required`;
              body = `জরুরি নোটিশ: সম্মানিত ${driverName} (Employee ID: EMP-${driverId.toString().padStart(4, '0')}, Driving License: ${licenseNo}), আপনার Druto Sheba প্ল্যাটফর্ম কমিশন বিগত ৭ দিন ধরে অপরিশোধিত রয়েছে। সর্বমোট বকেয়া পরিমাণ ৳${Math.round(totalOverdue).toLocaleString()}। নিয়ম অনুযায়ী এটি আপনার ৭ম এবং সর্বশেষ অটোমেটিক রিমাইন্ডার। এরপর আর কোনো অটোমেটিক অ্যালার্ট আসবে না এবং বিষয়টি সরাসরি কেন্দ্রীয় অ্যাডমিন প্যানেল ও শৃঙ্খলা কমিটির নিয়ন্ত্রণে চলে যাবে। পরবর্তী আইনি পদক্ষেপ বা অ্যাকাউন্ট সাময়িক স্থগিতাদেশ এড়াতে অনতিবিলম্বে বকেয়া পরিশোধ করুন।`;
            }

            await query(`
              INSERT INTO driver_inbox_messages (
                driver_id, sender_role, category, title, body, priority, is_read
              ) VALUES ($1, 'SYSTEM', $2, $3, $4, $5, false)
            `, [driverId, category, title, body, priority]);
          }
        }
      }
    } catch (evalErr) {
      console.error('Error auto-generating overdue settlement alerts:', evalErr);
    }

    // 2. Fetch driver inbox messages
    const res = await query(`
      SELECT 
        message_id,
        driver_id,
        sender_role,
        category,
        title,
        body,
        priority,
        is_read,
        created_at
      FROM driver_inbox_messages
      WHERE driver_id = $1
      ORDER BY created_at DESC
    `, [driverId]);

    const messages = res.rows.map(m => ({
      id: m.message_id,
      sender: m.sender_role,
      category: m.category,
      title: m.title,
      body: m.body,
      priority: m.priority,
      is_read: m.is_read,
      date: new Date(m.created_at).toLocaleString('en-US', {
        timeZone: 'Asia/Dhaka',
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    }));

    const unreadCount = messages.filter(m => !m.is_read).length;

    return NextResponse.json({
      messages,
      unread_count: unreadCount
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { message_id, is_read = true } = await request.json();

    if (!message_id) {
      return NextResponse.json({ error: 'message_id is required' }, { status: 400 });
    }

    await query(`
      UPDATE driver_inbox_messages
      SET is_read = $1
      WHERE message_id = $2
    `, [is_read, message_id]);

    return NextResponse.json({ success: true, message: 'Message updated' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
