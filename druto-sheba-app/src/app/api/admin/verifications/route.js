import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'ALL';

    // Ensure necessary columns exist
    await query('ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS dispatcher_id INTEGER').catch(() => {});
    await query('ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50)').catch(() => {});
    await query('ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS refund_trx_id VARCHAR(100)').catch(() => {});
    await query('ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS admin_notes TEXT').catch(() => {});
    await query('ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS verified_by_admin_id VARCHAR(50)').catch(() => {});
    await query('ALTER TABLE platform_payments ALTER COLUMN verified_by_admin_id TYPE VARCHAR(50)').catch(() => {});
    await query('ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE').catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS staff_inbox_messages (
        message_id SERIAL PRIMARY KEY,
        staff_id INTEGER,
        title VARCHAR(255),
        body TEXT,
        sender_role VARCHAR(50) DEFAULT 'ADMIN',
        category VARCHAR(50) DEFAULT 'VERIFICATION',
        priority VARCHAR(20) DEFAULT 'HIGH',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS driver_inbox_messages (
        message_id SERIAL PRIMARY KEY,
        driver_id INTEGER,
        title VARCHAR(255),
        body TEXT,
        sender_role VARCHAR(50) DEFAULT 'ADMIN',
        category VARCHAR(50) DEFAULT 'VERIFICATION',
        priority VARCHAR(20) DEFAULT 'HIGH',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    let drivers = [];
    let dispatchers = [];

    if (type === 'ALL' || type === 'DRIVER') {
      const drvRes = await query(`
        SELECT 
          d.driver_id,
          d.name AS driver_name,
          d.phone AS driver_reg_phone,
          d.nid_number,
          d.license_no,
          d.verification_status,
          d.own_ambulance_plate,
          COALESCE(p.created_at, CURRENT_TIMESTAMP) AS registered_at,
          p.payment_id,
          p.transaction_id,
          p.sender_phone AS refund_sender_number,
          p.payment_method,
          p.amount_expected,
          p.amount_paid,
          p.status AS payment_status,
          p.refund_status,
          p.refund_trx_id,
          p.admin_notes,
          p.created_at AS payment_submitted_at,
          COALESCE((
            SELECT COUNT(*) FROM driver_verification_submissions dvs 
            WHERE dvs.driver_id = d.driver_id
          ), 0) AS total_submissions,
          (
            SELECT json_agg(
              json_build_object(
                'submission_id', dvs.submission_id,
                'submission_type', dvs.submission_type,
                'certificate_name', dvs.certificate_name,
                'serial_number', dvs.serial_number,
                'batch_number', dvs.batch_number,
                'issuing_authority', dvs.issuing_authority,
                'issue_date', dvs.issue_date,
                'valid_until', dvs.valid_until,
                'has_own_ambulance', dvs.has_own_ambulance,
                'ambulance_license_plate', dvs.ambulance_license_plate,
                'status', dvs.status,
                'submitted_at', dvs.submitted_at
              )
            )
            FROM driver_verification_submissions dvs
            WHERE dvs.driver_id = d.driver_id
          ) AS submissions
        FROM drivers d
        LEFT JOIN LATERAL (
          SELECT * FROM platform_payments pp
          WHERE pp.driver_id = d.driver_id AND pp.payment_purpose = 'Driver_Verification'
          ORDER BY pp.created_at DESC
          LIMIT 1
        ) p ON true
        ORDER BY d.driver_id DESC
        LIMIT 200
      `);
      drivers = drvRes.rows;
    }

    if (type === 'ALL' || type === 'DISPATCHER') {
      const dispRes = await query(`
        SELECT 
          disp.dispatcher_id,
          disp.name AS dispatcher_name,
          disp.phone AS dispatcher_reg_phone,
          disp.email,
          disp.username,
          disp.nid_number,
          disp.verification_status,
          disp.created_at AS registered_at,
          p.payment_id,
          p.transaction_id,
          p.sender_phone AS refund_sender_number,
          p.payment_method,
          p.amount_expected,
          p.amount_paid,
          p.status AS payment_status,
          p.refund_status,
          p.refund_trx_id,
          p.admin_notes,
          p.created_at AS payment_submitted_at,
          (
            SELECT json_agg(
              json_build_object(
                'id', dv.id,
                'hsc_year', dv.hsc_year,
                'hsc_passing_year', dv.hsc_year,
                'education_board', dv.hsc_board,
                'hsc_board', dv.hsc_board,
                'hsc_registration_number', dv.hsc_reg_no,
                'hsc_reg_no', dv.hsc_reg_no,
                'hsc_roll_number', dv.hsc_roll_no,
                'hsc_roll_no', dv.hsc_roll_no,
                'nid_number', dv.nid_number,
                'extra_qualifications', dv.extra_qualifications,
                'status', dv.status,
                'submitted_at', dv.created_at
              )
            )
            FROM dispatcher_verifications dv
            WHERE dv.dispatcher_id = disp.dispatcher_id
          ) AS verifications
        FROM dispatchers disp
        LEFT JOIN LATERAL (
          SELECT * FROM platform_payments pp
          WHERE pp.dispatcher_id = disp.dispatcher_id AND pp.payment_purpose = 'Dispatcher_Verification'
          ORDER BY pp.created_at DESC
          LIMIT 1
        ) p ON true
        ORDER BY disp.created_at DESC
        LIMIT 200
      `);
      dispatchers = dispRes.rows;
    }

    return NextResponse.json({
      success: true,
      drivers,
      dispatchers,
      counts: {
        pending_drivers: drivers.filter(d => d.verification_status === 'Pending' || d.payment_status === 'Under_Verification').length,
        pending_dispatchers: dispatchers.filter(d => d.verification_status === 'Pending' || d.payment_status === 'Under_Verification').length,
        refund_queue_count: drivers.filter(d => d.refund_status === 'Pending_48h' || d.refund_status === 'Pending').length +
                            dispatchers.filter(d => d.refund_status === 'Pending_48h' || d.refund_status === 'Pending').length
      }
    });

  } catch (error) {
    console.error('Admin Verifications GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      action,
      target_type,
      target_id,
      payment_id,
      rejection_reason,
      custom_notes,
      refund_trx_id,
      admin_id = 'Admin'
    } = body;

    if (!action || !target_type || !target_id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (action === 'APPROVE') {
      if (target_type === 'DRIVER') {
        await query(`
          UPDATE drivers 
          SET verification_status = 'Verified'
          WHERE driver_id = $1
        `, [target_id]);

        await query(`
          UPDATE driver_verification_submissions 
          SET status = 'Approved' 
          WHERE driver_id = $1
        `, [target_id]).catch(() => {});

        if (payment_id) {
          await query(`
            UPDATE platform_payments
            SET status = 'Verified',
                verified_by_admin_id = $1,
                verified_at = CURRENT_TIMESTAMP
            WHERE payment_id = $2
          `, [String(admin_id), payment_id]);
        } else {
          await query(`
            UPDATE platform_payments
            SET status = 'Verified',
                verified_by_admin_id = $1,
                verified_at = CURRENT_TIMESTAMP
            WHERE driver_id = $2 AND payment_purpose = 'Driver_Verification'
          `, [String(admin_id), target_id]);
        }

        // V_APPROVED_03 from driver future.md
        const welcomeTitle = 'দ্রুত সেবা পরিবারে স্বাগতম! ভেরিফিকেশন সম্পন্ন';
        const welcomeBody = 'অভিনন্দন! দ্রুত সেবা প্ল্যাটফর্মে আপনার ড্রাইভার অ্যাকাউন্টটি সফলভাবে ভেরিফাইড ও সক্রিয় করা হয়েছে। অনুগ্রহ করে প্ল্যাটফর্মের সকল সুরক্ষা ও ট্রাফিক নীতিমালা মেনে চলুন এবং আপনার দৈনিক কমিশন নিয়মিত পরিশোধ রাখুন। যেকোনো প্রয়োজনে আমাদের হটলাইনে যোগাযোগ করুন। দ্রুত সেবা পরিবারের সাথে আপনার একটি নিরাপদ ও সমৃদ্ধ যাত্রা কামনা করছি।';

        await query(`
          INSERT INTO driver_inbox_messages (driver_id, title, body, sender_role, category, priority)
          VALUES ($1, $2, $3, 'SYSTEM', 'GENERAL', 'HIGH')
        `, [target_id, welcomeTitle, welcomeBody]);

        return NextResponse.json({ success: true, message: 'Driver verified and approved successfully!' });
      }

      if (target_type === 'DISPATCHER') {
        const dvRes = await query(`
          SELECT * FROM dispatcher_verifications 
          WHERE dispatcher_id = $1 AND status = 'Pending'
          ORDER BY created_at DESC LIMIT 1
        `, [target_id]);

        let isSenior = false;
        if (dvRes.rows.length > 0) {
          const v = dvRes.rows[0];
          let extra = [];
          if (v.extra_qualifications) {
            try {
              extra = typeof v.extra_qualifications === 'string' ? JSON.parse(v.extra_qualifications) : v.extra_qualifications;
            } catch (e) {}
          }
          if (extra && extra.is_profile_edit && extra.changes) {
            // If it's a profile edit that adds new qualifications, also promote to Senior
            const hasNewQuals = Array.isArray(extra.changes.new_qualifications) && extra.changes.new_qualifications.length > 0;
            const hadOldQuals = Array.isArray(extra.previous_extras) && extra.previous_extras.length > 0;
            if (hasNewQuals || hadOldQuals) isSenior = true;

            // Also update dispatcher name/phone/email if requested
            const updates = [];
            const values = [];
            let vIdx = 1;
            if (extra.changes.requested_name) { updates.push(`name = $${vIdx++}`); values.push(extra.changes.requested_name); }
            if (extra.changes.requested_email) { updates.push(`email = $${vIdx++}`); values.push(extra.changes.requested_email); }
            if (extra.changes.requested_phone) { updates.push(`phone = $${vIdx++}`); values.push(extra.changes.requested_phone); }
            
            if (updates.length > 0) {
              values.push(target_id);
              await query(`UPDATE dispatchers SET ${updates.join(', ')} WHERE dispatcher_id = $${vIdx}`, values).catch(() => {});
            }
          } else if (Array.isArray(extra) && extra.length > 0) {
            isSenior = true;
          }
        }

        if (isSenior) {
          await query(`
            UPDATE dispatchers 
            SET verification_status = 'Approved', level = 'Senior'
            WHERE dispatcher_id = $1
          `, [target_id]);
        } else {
          await query(`
            UPDATE dispatchers 
            SET verification_status = 'Approved'
            WHERE dispatcher_id = $1
          `, [target_id]);
        }

        await query(`
          UPDATE dispatcher_verifications
          SET status = 'Approved'
          WHERE dispatcher_id = $1
        `, [target_id]).catch(() => {});

        if (payment_id) {
          await query(`
            UPDATE platform_payments
            SET status = 'Verified',
                verified_by_admin_id = $1,
                verified_at = CURRENT_TIMESTAMP
            WHERE payment_id = $2
          `, [String(admin_id), payment_id]);
        } else {
          await query(`
            UPDATE platform_payments
            SET status = 'Verified',
                verified_by_admin_id = $1,
                verified_at = CURRENT_TIMESTAMP
            WHERE dispatcher_id = $2 AND payment_purpose = 'Dispatcher_Verification'
          `, [String(admin_id), target_id]);
        }

        return NextResponse.json({ success: true, message: 'Dispatcher verified and approved successfully!' });
      }
    }

    if (action === 'REJECT') {
      const isPaymentIssue = rejection_reason?.includes('Payment') || rejection_reason === 'PAYMENT_ISSUE';
      const isDocIssue = rejection_reason?.includes('Document') || rejection_reason?.includes('Certificate') || rejection_reason === 'DOC_ISSUE';

      let driverTitle = 'ভেরিফিকেশন আবেদন সংক্রান্ত নোটিশ';
      let driverBody = custom_notes || '';

      if (isPaymentIssue) {
        // V_REJECT_PARTIAL from driver future.md
        driverTitle = 'ভেরিফিকেশন আবেদন বাতিল ও রিফান্ড নোটিশ';
        driverBody = custom_notes || 'আপনার ভেরিফিকেশন ফি সম্পূর্ণ পরিশোধ না করায় আবেদনটি বাতিল করা হয়েছে। আপনার প্রেরিত অর্থ আগামী ৪৮ ঘণ্টার মধ্যে আপনার পেমেন্টকৃত মোবাইল নম্বরে রিফান্ড করে দেওয়া হবে।';
      } else if (rejection_reason === 'UNPAID_CANCEL') {
        driverTitle = 'আবেদন বাতিল: পেমেন্ট অসম্পূর্ণ';
        driverBody = custom_notes || 'আপনার ভেরিফিকেশন ফি প্রদান না করায় আবেদনটি বাতিল করা হয়েছে। দ্রুত সেবা প্ল্যাটফর্মে কাজ করতে চাইলে অনুগ্রহ করে পুনরায় সঠিক পেমেন্ট করে আবেদন করুন।';
      } else if (rejection_reason === 'DUE_CANCEL') {
        driverTitle = 'আবেদন বাতিল ও রিফান্ড নোটিশ';
        driverBody = custom_notes || 'আপনার ভেরিফিকেশন ফি সম্পূর্ণ পরিশোধ না করায় আবেদনটি বাতিল করা হয়েছে। আপনার প্রেরিত অর্থ আগামী ৪৮ ঘণ্টার মধ্যে রিফান্ড করে দেওয়া হবে।';
      } else if (isDocIssue) {
        // V_REJECT_DOC from driver future.md
        driverTitle = 'আবেদন বাতিল: তথ্যে অসঙ্গতি';
        driverBody = custom_notes || 'আপনার দাখিলকৃত নথিপত্রে অসঙ্গতি থাকায় আবেদনটি বাতিল করা হয়েছে। বিস্তারিত তথ্যের জন্য আমাদের সাপোর্ট সেন্টারে যোগাযোগ করুন।';
      } else {
        const fullNotes = [rejection_reason, custom_notes].filter(Boolean).join(' | ');
        driverBody = custom_notes || `দুঃখিত, আপনার ভেরিফিকেশন আবেদনটি পর্যালোচনা শেষে বাতিল করা হয়েছে। কারণ: ${fullNotes || 'কাগজপত্রে ত্রুটি বা পেমেন্ট অসঙ্গতি'}।`;
      }

      if (target_type === 'DRIVER') {
        await query(`
          UPDATE drivers 
          SET verification_status = 'Rejected'
          WHERE driver_id = $1
        `, [target_id]);

        await query(`
          UPDATE driver_verification_submissions 
          SET status = 'Rejected'
          WHERE driver_id = $1
        `, [target_id]).catch(() => {});

        const adminNotes = rejection_reason || 'Rejected by Admin';
        if (payment_id) {
          await query(`
            UPDATE platform_payments
            SET status = 'Rejected',
                refund_status = 'Pending_48h',
                admin_notes = $1,
                verified_by_admin_id = $2,
                verified_at = CURRENT_TIMESTAMP
            WHERE payment_id = $3
          `, [adminNotes, String(admin_id), payment_id]);
        } else {
          await query(`
            UPDATE platform_payments
            SET status = 'Rejected',
                refund_status = 'Pending_48h',
                admin_notes = $1,
                verified_by_admin_id = $2,
                verified_at = CURRENT_TIMESTAMP
            WHERE driver_id = $3 AND payment_purpose = 'Driver_Verification'
          `, [adminNotes, String(admin_id), target_id]);
        }

        await query(`
          INSERT INTO driver_inbox_messages (driver_id, title, body, sender_role, category, priority)
          VALUES ($1, $2, $3, 'ADMIN', 'GENERAL', 'HIGH')
        `, [target_id, driverTitle, driverBody]);

        return NextResponse.json({ success: true, message: 'Driver decision applied and notice dispatched to inbox.' });
      }

      if (target_type === 'DISPATCHER') {
        await query(`
          UPDATE dispatchers 
          SET verification_status = 'Rejected'
          WHERE dispatcher_id = $1
        `, [target_id]);

        await query(`
          UPDATE dispatcher_verifications
          SET status = 'Rejected'
          WHERE dispatcher_id = $1
        `, [target_id]).catch(() => {});

        const adminNotes = rejection_reason || 'Rejected by Admin';
        if (payment_id) {
          await query(`
            UPDATE platform_payments
            SET status = 'Rejected',
                refund_status = 'Pending_48h',
                admin_notes = $1,
                verified_by_admin_id = $2,
                verified_at = CURRENT_TIMESTAMP
            WHERE payment_id = $3
          `, [adminNotes, String(admin_id), payment_id]);
        } else {
          await query(`
            UPDATE platform_payments
            SET status = 'Rejected',
                refund_status = 'Pending_48h',
                admin_notes = $1,
                verified_by_admin_id = $2,
                verified_at = CURRENT_TIMESTAMP
            WHERE dispatcher_id = $3 AND payment_purpose = 'Dispatcher_Verification'
          `, [adminNotes, String(admin_id), target_id]);
        }

        await query(`
          INSERT INTO staff_inbox_messages (staff_id, title, body, sender_role, category, priority)
          VALUES ($1, $2, $3, 'ADMIN', 'GENERAL', 'HIGH')
        `, [target_id, driverTitle, driverBody]);

        return NextResponse.json({ success: true, message: 'Dispatcher application rejected and notice dispatched.' });
      }
    }

    if (action === 'REFUND_SETTLE') {
      if (!refund_trx_id || !payment_id) {
        return NextResponse.json({ error: 'Refund TrxID and Payment ID are required' }, { status: 400 });
      }

      await query(`
        UPDATE platform_payments
        SET refund_status = 'Refunded',
            refund_trx_id = $1
        WHERE payment_id = $2
      `, [refund_trx_id.trim(), payment_id]);

      const refundNoticeBody = `আপনার রিফান্ড সফলভাবে সম্পন্ন হয়েছে。\nরিফান্ড ট্রানজ্যাকশন আইডি (TrxID): ${refund_trx_id.trim()}。\nদ্রুত সেবার পাশে থাকার জন্য ধন্যবাদ।`;

      if (target_type === 'DRIVER') {
        await query(`
          INSERT INTO driver_inbox_messages (driver_id, title, body, sender_role, category, priority)
          VALUES ($1, 'রিফান্ড নিশ্চিতকরণ নোটিশ (Refund Completed)', $2, 'ADMIN', 'GENERAL', 'HIGH')
        `, [target_id, refundNoticeBody]);
      } else if (target_type === 'DISPATCHER') {
        await query(`
          INSERT INTO staff_inbox_messages (staff_id, title, body, sender_role, category, priority)
          VALUES ($1, 'রিফান্ড নিশ্চিতকরণ নোটিশ (Refund Completed)', $2, 'ADMIN', 'GENERAL', 'HIGH')
        `, [target_id, refundNoticeBody]);
      }

      return NextResponse.json({ success: true, message: 'Refund marked as settled and confirmation notice dispatched' });
    }

    return NextResponse.json({ error: 'Invalid action provided' }, { status: 400 });

  } catch (error) {
    console.error('Admin Verifications POST Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
