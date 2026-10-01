import { query, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const driver_id = searchParams.get('driver_id') || '1';

  try {
    // 1. Resolve Driver Profile, Ambulance Ownership & Certifications
    const driverRes = await query(`
      SELECT 
        d.driver_id,
        d.name,
        d.phone,
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

    const driver = driverRes.rows[0];
    const isOwnAmbulance = Boolean(driver?.own_ambulance_plate && driver.own_ambulance_plate.trim() !== '');
    const isCertified = Number(driver?.cert_count || 0) > 0;

    const pricingRes = await query(`SELECT * FROM pricing_config WHERE config_id = 1`);
    const pc = pricingRes.rows[0] || { commission_company_cert: 25, commission_company_nocert: 30, commission_own_cert: 3, commission_own_nocert: 5, base_fare: 750, per_km_charge: 25 };

    let commissionRatePct = Number(pc.commission_company_cert);
    let commissionCategory = 'Company Ambulance + Certificate';

    if (!isOwnAmbulance && !isCertified) {
      commissionRatePct = Number(pc.commission_company_nocert);
      commissionCategory = 'Company Ambulance (No Certificate)';
    } else if (!isOwnAmbulance && isCertified) {
      commissionRatePct = Number(pc.commission_company_cert);
      commissionCategory = 'Company Ambulance + Verified Certificate';
    } else if (isOwnAmbulance && !isCertified) {
      commissionRatePct = Number(pc.commission_own_nocert);
      commissionCategory = "Driver's Own Ambulance (No Certificate)";
    } else if (isOwnAmbulance && isCertified) {
      commissionRatePct = Number(pc.commission_own_cert);
      commissionCategory = "Driver's Own Ambulance + Verified Certificate";
    }

    const commissionRate = commissionRatePct / 100.0;
    const driverShareRate = 1.0 - commissionRate;

    // 2. Fetch today's resolved trips for this driver (Dhaka local time)
    const todayTripsRes = await query(`
      SELECT 
        tl.trip_id,
        er.timestamp_created,
        p.name as patient_name,
        h.name as hospital_name,
        COALESCE(
          ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0)::numeric, 1),
          2.5
        ) as distance_km,
        COALESCE(
          pc.base_fare + ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0 * pc.per_km_charge)::numeric, 0),
          pc.base_fare
        ) as gross_fare
      FROM trip_logs tl
      CROSS JOIN (SELECT base_fare, per_km_charge FROM pricing_config WHERE config_id = 1) pc
      JOIN emergency_requests er ON tl.trip_id = er.request_id::text
      JOIN patients p ON er.patient_id = p.patient_id
      JOIN hospitals h ON tl.hospital_id = h.hospital_id
      WHERE tl.driver_id = $1
        AND er.status = 'Resolved'
        AND DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka') = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date
      ORDER BY er.timestamp_created DESC
    `, [driver_id]);

    const todayTrips = todayTripsRes.rows.map(t => {
      const gross = Number(t.gross_fare || 880);
      const commission = Math.round(gross * commissionRate);
      const net = gross - commission;
      return {
        trip_id: t.trip_id,
        time: new Date(t.timestamp_created).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' }),
        patient_name: t.patient_name,
        hospital_name: t.hospital_name,
        distance_km: Number(t.distance_km || 2.5),
        gross_collected: gross,
        platform_commission: commission,
        driver_net: net
      };
    });

    const todayTotalTrips = todayTrips.length;
    const todayTotalCash = todayTrips.reduce((acc, t) => acc + t.gross_collected, 0);
    const todayPlatformCommission = Math.round(todayTotalCash * commissionRate);
    const todayDriverNet = todayTotalCash - todayPlatformCommission;

    // Check if today's ledger is already settled
    const todaySettlementCheck = await query(`
      SELECT settlement_id, payment_status, settled_at, payment_method, platform_commission_amount
      FROM driver_daily_settlements
      WHERE driver_id = $1 
        AND settlement_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date
    `, [driver_id]);

    const isTodaySettledInDb = todaySettlementCheck.rows.length > 0 && todaySettlementCheck.rows[0].payment_status === 'Settled';
    const todaySettlementDetails = todaySettlementCheck.rows[0] || null;

    // Fetch prior unpaid/overdue commissions across all previous days
    const priorUnpaidRes = await query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN due_amount IS NOT NULL AND due_amount > 0 THEN due_amount 
          ELSE platform_commission_amount 
        END
      ), 0) AS overdue_total
      FROM driver_daily_settlements
      WHERE driver_id = $1 
        AND payment_status IN ('Pending', 'Partial')
        AND settlement_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date
    `, [driver_id]);

    const priorOverdueCommission = Number(priorUnpaidRes.rows[0]?.overdue_total || 0);
    const todayPayableCommission = isTodaySettledInDb ? 0 : todayPlatformCommission;
    const totalCumulativeCommission = priorOverdueCommission + todayPayableCommission;
    const isOverallSettled = totalCumulativeCommission === 0 && (todayTotalCash === 0 || isTodaySettledInDb);

    // 3. Fetch past settlement history from driver_daily_settlements
    const pastSettlementsRes = await query(`
      SELECT 
        settlement_id,
        settlement_date,
        total_trips,
        total_cash_collected,
        commission_rate_pct,
        commission_category,
        platform_commission_amount,
        amount_paid,
        due_amount,
        driver_net_earnings,
        payment_status,
        settled_at,
        payment_method
      FROM driver_daily_settlements
      WHERE driver_id = $1
      ORDER BY settlement_date DESC
      LIMIT 30
    `, [driver_id]);

    const pastSettlements = pastSettlementsRes.rows.map(s => {
      const commissionTotal = Number(s.platform_commission_amount || 0);
      const paid = Number(s.amount_paid || (s.payment_status === 'Settled' ? commissionTotal : 0));
      const due = Number(s.due_amount !== null && s.due_amount !== undefined ? s.due_amount : (s.payment_status === 'Settled' ? 0 : commissionTotal));

      return {
        settlement_id: s.settlement_id,
        date: new Date(s.settlement_date).toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric', year: 'numeric' }),
        total_trips: Number(s.total_trips || 0),
        total_cash_collected: Number(s.total_cash_collected || 0),
        commission_rate_pct: Number(s.commission_rate_pct || 25),
        commission_category: s.commission_category,
        platform_commission_amount: commissionTotal,
        amount_paid: paid,
        due_amount: due,
        driver_net_earnings: Number(s.driver_net_earnings || 0),
        payment_status: s.payment_status,
        settled_at: s.settled_at ? new Date(s.settled_at).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' }) : null,
        payment_method: s.payment_method || 'bKash Merchant'
      };
    });

    return NextResponse.json({
      driver: {
        driver_id: driver?.driver_id,
        name: driver?.name,
        phone: driver?.phone,
        is_own_ambulance: isOwnAmbulance,
        ambulance_plate: isOwnAmbulance ? driver.own_ambulance_plate : 'Company Fleet',
        is_certified: isCertified
      },
      commission_tier: {
        rate_pct: commissionRatePct,
        category: commissionCategory,
        driver_share_pct: Math.round(driverShareRate * 100)
      },
      active_today: {
        is_settled: isOverallSettled,
        is_today_paid: isTodaySettledInDb,
        settled_at: todaySettlementDetails?.settled_at,
        total_trips: todayTotalTrips,
        total_cash_collected: todayTotalCash,
        today_commission_amount: todayPlatformCommission,
        prior_overdue_commission: priorOverdueCommission,
        platform_commission_payable: totalCumulativeCommission,
        driver_net_income: todayDriverNet,
        trips: todayTrips
      },
      history: pastSettlements
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { driver_id, payment_method = 'bKash Merchant' } = body;

    if (!driver_id) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
    }

    let settlementRecord = null;

    await transaction(async (client) => {
      // 1. Resolve Driver details
      const drv = await client.query(`
        SELECT 
          d.driver_id,
          d.own_ambulance_plate,
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

      const driver = drv.rows[0];
      const isOwnAmbulance = Boolean(driver?.own_ambulance_plate && driver.own_ambulance_plate.trim() !== '');
      const isCertified = Number(driver?.cert_count || 0) > 0;

      const pricingRes = await client.query(`SELECT * FROM pricing_config WHERE config_id = 1`);
      const pc = pricingRes.rows[0] || { commission_company_cert: 25, commission_company_nocert: 30, commission_own_cert: 3, commission_own_nocert: 5, base_fare: 750, per_km_charge: 25 };

      let commissionRatePct = Number(pc.commission_company_cert);
      let commissionCategory = 'Company Ambulance + Certificate';
      if (!isOwnAmbulance && !isCertified) {
        commissionRatePct = Number(pc.commission_company_nocert);
        commissionCategory = 'Company Ambulance (No Certificate)';
      } else if (!isOwnAmbulance && isCertified) {
        commissionRatePct = Number(pc.commission_company_cert);
        commissionCategory = 'Company Ambulance + Verified Certificate';
      } else if (isOwnAmbulance && !isCertified) {
        commissionRatePct = Number(pc.commission_own_nocert);
        commissionCategory = "Driver's Own Ambulance (No Certificate)";
      } else if (isOwnAmbulance && isCertified) {
        commissionRatePct = Number(pc.commission_own_cert);
        commissionCategory = "Driver's Own Ambulance + Verified Certificate";
      }

      const commissionRate = commissionRatePct / 100.0;

      // 2. Query today's resolved trips totals
      const totalsRes = await client.query(`
        SELECT 
          COUNT(tl.trip_id) as total_trips,
          COALESCE(SUM(
            pc.base_fare + ROUND((ST_DistanceSphere(er.pickup_coords, COALESCE(h.location_coords, er.pickup_coords)) / 1000.0 * pc.per_km_charge)::numeric, 0)
          ), 0) as total_cash
        FROM trip_logs tl
        CROSS JOIN (SELECT base_fare, per_km_charge FROM pricing_config WHERE config_id = 1) pc
        JOIN emergency_requests er ON tl.trip_id = er.request_id::text
        JOIN hospitals h ON tl.hospital_id = h.hospital_id
        WHERE tl.driver_id = $1
          AND er.status = 'Resolved'
          AND DATE(er.timestamp_created AT TIME ZONE 'Asia/Dhaka') = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date
      `, [driver_id]);

      const totalTrips = Number(totalsRes.rows[0]?.total_trips || 0);
      const totalCash = Number(totalsRes.rows[0]?.total_cash || 0);
      const commissionAmount = Math.round(totalCash * commissionRate);
      const netEarnings = totalCash - commissionAmount;

      // 3. Upsert today's record in driver_daily_settlements
      const upsertRes = await client.query(`
        INSERT INTO driver_daily_settlements (
          driver_id, settlement_date, total_trips, total_cash_collected,
          commission_rate_pct, commission_category, platform_commission_amount,
          driver_net_earnings, payment_status, settled_at, payment_method
        ) VALUES (
          $1, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date, $2, $3,
          $4, $5, $6, $7, 'Settled', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka'), $8
        )
        ON CONFLICT (driver_id, settlement_date)
        DO UPDATE SET
          total_trips = EXCLUDED.total_trips,
          total_cash_collected = EXCLUDED.total_cash_collected,
          commission_rate_pct = EXCLUDED.commission_rate_pct,
          commission_category = EXCLUDED.commission_category,
          platform_commission_amount = EXCLUDED.platform_commission_amount,
          driver_net_earnings = EXCLUDED.driver_net_earnings,
          payment_status = 'Settled',
          settled_at = EXCLUDED.settled_at,
          payment_method = EXCLUDED.payment_method
        RETURNING *
      `, [driver_id, totalTrips, totalCash, commissionRatePct, commissionCategory, commissionAmount, netEarnings, payment_method]);

      settlementRecord = upsertRes.rows[0];
    });

    return NextResponse.json({
      success: true,
      message: 'Commission settled successfully! Today\'s daily platform ledger is closed.',
      settlement: settlementRecord
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
