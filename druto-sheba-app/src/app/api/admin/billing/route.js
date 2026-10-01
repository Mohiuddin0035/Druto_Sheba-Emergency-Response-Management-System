import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // 1. Live Daily Platform Receivables
    const statsResult = await query(`
      SELECT 
        (SELECT COALESCE(SUM(total_cash_collected), 0) FROM driver_daily_settlements WHERE settlement_date = CURRENT_DATE) as total_cash_collected,
        (SELECT COALESCE(SUM(due_amount), 0) FROM driver_daily_settlements WHERE payment_status != 'Settled' AND settlement_date = CURRENT_DATE) as total_pending_commission,
        (SELECT COALESCE(SUM(amount_paid), 0) FROM platform_payments WHERE DATE(verified_at) = CURRENT_DATE AND driver_id IS NOT NULL AND status IN ('Settled', 'Due', 'Verified')) as total_settled_commission
    `);

    // 2. Driver Settlement Ledger Table
    // Get aggregated due across all unpaid days per driver to see total due and consecutive overdue days (avoid Cartesian product)
    const driversResult = await query(`
      SELECT 
        d.driver_id,
        d.name,
        d.phone,
        d.own_ambulance_plate,
        COALESCE(
          (SELECT COUNT(DISTINCT ds.settlement_id) 
           FROM driver_daily_settlements ds 
           WHERE ds.driver_id = d.driver_id AND ds.due_amount > 0), 0
        ) as consecutive_days_overdue,
        COALESCE(
          (SELECT SUM(ds.due_amount) 
           FROM driver_daily_settlements ds 
           WHERE ds.driver_id = d.driver_id AND ds.due_amount > 0), 0
        ) as cumulative_due,
        (SELECT MAX(ds.settlement_date) 
         FROM driver_daily_settlements ds 
         WHERE ds.driver_id = d.driver_id AND ds.due_amount > 0) as last_due_date,
        (SELECT total_cash_collected 
         FROM driver_daily_settlements 
         WHERE driver_id = d.driver_id AND settlement_date = CURRENT_DATE LIMIT 1) as todays_cash,
        (SELECT payment_status 
         FROM driver_daily_settlements 
         WHERE driver_id = d.driver_id ORDER BY settlement_date DESC LIMIT 1) as latest_status
      FROM drivers d
      ORDER BY consecutive_days_overdue DESC, cumulative_due DESC
    `);

    // 3. Submitted Transactions List (Under Verification)
    // 3. Submitted Transactions List (Under Verification and Refund Needed)
    const transactionsResult = await query(`
      SELECT 
        p.payment_id,
        p.payment_purpose,
        p.transaction_id,
        p.sender_phone,
        p.registered_phone,
        p.amount_expected,
        p.amount_paid,
        p.driver_id,
        p.patient_id,
        p.request_id,
        p.created_at,
        p.status,
        p.refund_status,
        COALESCE(d.name, drv_phone.name) as driver_name,
        pat.name as patient_name,
        COALESCE(disp.name, disp.username, disp_phone.name, disp_phone.username) as dispatcher_name,
        CASE 
          WHEN p.payment_purpose LIKE 'Dispatcher%' OR p.dispatcher_id IS NOT NULL OR disp_phone.dispatcher_id IS NOT NULL THEN 'DISPATCHER'
          WHEN p.payment_purpose LIKE 'Driver%' OR p.driver_id IS NOT NULL OR drv_phone.driver_id IS NOT NULL THEN 'DRIVER'
          WHEN p.patient_id IS NOT NULL OR p.payment_purpose = 'Patient_Medical_Bill' THEN 'PATIENT'
          ELSE 'OTHER'
        END as payer_type,
        COALESCE(d.name, drv_phone.name, disp.name, disp.username, disp_phone.name, disp_phone.username, pat.name, p.registered_phone, 'Applicant') as payer_name,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.created_at)) / 3600.0 as hours_elapsed,
        da.status as appointment_status
      FROM platform_payments p
      LEFT JOIN drivers d ON p.driver_id = d.driver_id
      LEFT JOIN drivers drv_phone ON p.registered_phone = drv_phone.phone
      LEFT JOIN dispatchers disp ON p.dispatcher_id = disp.dispatcher_id
      LEFT JOIN dispatchers disp_phone ON p.registered_phone = disp_phone.phone
      LEFT JOIN patients pat ON p.patient_id = pat.patient_id
      LEFT JOIN doctor_assignments da ON (p.payment_purpose = 'Patient_Medical_Bill' AND p.request_id = da.assignment_id::text)
      WHERE p.status = 'Under_Verification' OR p.refund_status = 'Pending'
      ORDER BY p.created_at DESC
    `);

    // 4. Patients List for manual mail
    const patientsResult = await query(`
      SELECT patient_id, name, phone, blood_type
      FROM patients
      ORDER BY name ASC
    `);

    return NextResponse.json({
      stats: statsResult.rows[0],
      drivers: driversResult.rows,
      transactions: transactionsResult.rows,
      patients: patientsResult.rows
    });
  } catch (err) {
    console.error('Error in Admin Billing API:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
