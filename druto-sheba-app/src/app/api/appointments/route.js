import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    // Auto-cancel appointments older than 3 hours that are still Unpaid or Pending verification
    try {
      const expiredAppointments = await query(`
        SELECT 
          da.assignment_id,
          da.patient_id,
          da.payment_status,
          da.status,
          pp.payment_id
        FROM doctor_assignments da
        LEFT JOIN platform_payments pp ON (pp.payment_purpose = 'Patient_Medical_Bill' AND pp.request_id = da.assignment_id::text)
        WHERE da.status = 'Pending'
          AND da.payment_status IN ('Unpaid', 'Pending')
          AND da.created_at < (CURRENT_TIMESTAMP - INTERVAL '3 hours')
      `);

      for (const exp of expiredAppointments.rows) {
        await query(
          `UPDATE doctor_assignments 
           SET status = 'Cancelled', 
               payment_status = CASE WHEN payment_status = 'Pending' THEN 'Refunded' ELSE 'N/A' END
           WHERE assignment_id = $1`,
          [exp.assignment_id]
        );

        if (exp.payment_id) {
          await query(
            `UPDATE platform_payments 
             SET refund_status = 'Pending', status = 'Cancelled'
             WHERE payment_id = $1`,
            [exp.payment_id]
          );
        }

        // Notify patient inbox
        const noticeExists = await query(`
          SELECT 1 FROM patient_inbox_messages 
          WHERE patient_id = $1 AND title LIKE $2
        `, [exp.patient_id, `%#${exp.assignment_id}%`]);

        if (noticeExists.rows.length === 0) {
          const bodyText = exp.payment_id
            ? `আপনার অ্যাপয়েন্টমেন্ট (#${exp.assignment_id}) ৩ ঘণ্টার মধ্যে পেমেন্ট ভেরিফিকেশন সম্পন্ন না হওয়ায় বাতিল করা হয়েছে। আপনি বিকাশ/রকেটে যে অর্থ প্রদান করেছিলেন, তা আগামী ৪৮ ঘণ্টার মধ্যে আপনার নম্বরে রিফান্ড করে দেওয়া হবে।`
            : `আপনার অ্যাপয়েন্টমেন্ট (#${exp.assignment_id}) নির্ধারিত ৩ ঘণ্টার মধ্যে পেমেন্ট সম্পন্ন না হওয়ায় স্বয়ংক্রিয়ভাবে বাতিল করা হয়েছে। নতুন অ্যাপয়েন্টমেন্ট বুকিং করতে আবার চেষ্টা করুন।`;

          await query(`
            INSERT INTO patient_inbox_messages (patient_id, sender_role, category, title, body, priority)
            VALUES ($1, 'SYSTEM', 'AUTO_CANCEL', $2, $3, 'HIGH')
          `, [
            exp.patient_id,
            `⚠️ অ্যাপয়েন্টমেন্ট বাতিল ও নোটিশ (#${exp.assignment_id})`,
            bodyText
          ]);
        }
      }
    } catch (expErr) {
      console.error('Error during appointment auto-expiry:', expErr);
    }

    if (patientId) {
      const result = await query(
        `SELECT da.*,
                d.name AS doctor_name, d.phone AS doctor_phone,
                h.name AS hospital_name,
                s.spec_name
         FROM doctor_assignments da
         JOIN doctors d ON da.doctor_id = d.doctor_id
         LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
         LEFT JOIN specializations s ON d.spec_id = s.spec_id
         WHERE da.patient_id = $1::integer
         ORDER BY da.assignment_id DESC`,
        [patientId]
      );

      const formatted = result.rows.map(row => ({
        assignment_id: row.assignment_id,
        patient_id: row.patient_id,
        doctor_id: row.doctor_id,
        appointment_date: row.appointment_date,
        appointment_time: row.appointment_time,
        status: row.status,
        payment_status: row.payment_status,
        payment_reminder_sent: row.payment_reminder_sent,
        doctors: {
          name: row.doctor_name,
          phone: row.doctor_phone,
          hospitals: { name: row.hospital_name },
          specializations: { spec_name: row.spec_name }
        }
      }));

      return NextResponse.json(formatted);
    } else {
      // Admin dashboard view
      const result = await query(
        `SELECT da.*,
                p.name AS patient_name,
                d.name AS doctor_name
         FROM doctor_assignments da
         JOIN patients p ON da.patient_id = p.patient_id
         JOIN doctors d ON da.doctor_id = d.doctor_id
         ORDER BY da.assignment_id DESC`
      );

      const formatted = result.rows.map(row => ({
        assignment_id: row.assignment_id,
        patient_id: row.patient_id,
        doctor_id: row.doctor_id,
        appointment_date: row.appointment_date,
        appointment_time: row.appointment_time,
        status: row.status,
        payment_status: row.payment_status,
        payment_reminder_sent: row.payment_reminder_sent,
        patients: { name: row.patient_name },
        doctors: { name: row.doctor_name }
      }));

      return NextResponse.json(formatted);
    }
  } catch (error) {
    console.error('Fetch appointments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time } = await request.json();

    if (!patient_id || !doctor_id || !appointment_date) {
      return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
    }

    const timeString = appointment_time || '10:00:00';

    const result = await query(
      `INSERT INTO doctor_assignments (patient_id, doctor_id, appointment_date, appointment_time, payment_status, status)
       VALUES ($1::integer, $2::integer, $3::date, $4::time, 'Unpaid', 'Pending')
       RETURNING *`,
      [patient_id, doctor_id, appointment_date, timeString]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Create appointment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { assignment_id, status, payment_status, payment_reminder_sent, appointment_date, appointment_time } = await request.json();

    if (!assignment_id) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    const setClauses = [];
    const params = [];

    let finalPaymentStatus = payment_status;

    // Automatic cancellation refund/NA logic
    if (status === 'Cancelled') {
      const currentRes = await query('SELECT payment_status FROM doctor_assignments WHERE assignment_id = $1::integer', [assignment_id]);
      if (currentRes.rows.length > 0) {
        const currentPay = currentRes.rows[0].payment_status;
        if (currentPay === 'Paid') {
          finalPaymentStatus = 'Refunded';
        } else if (currentPay === 'Unpaid') {
          finalPaymentStatus = 'N/A';
        }
      }
    }

    if (status !== undefined) {
      params.push(status);
      setClauses.push(`status = $${params.length}`);
    }

    if (finalPaymentStatus !== undefined) {
      params.push(finalPaymentStatus);
      setClauses.push(`payment_status = $${params.length}`);
    }

    if (payment_reminder_sent !== undefined) {
      params.push(payment_reminder_sent);
      setClauses.push(`payment_reminder_sent = $${params.length}::boolean`);
    }

    if (appointment_date !== undefined) {
      params.push(appointment_date);
      setClauses.push(`appointment_date = $${params.length}::date`);
    }

    if (appointment_time !== undefined) {
      params.push(appointment_time);
      setClauses.push(`appointment_time = $${params.length}::time`);
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    params.push(assignment_id);
    const sql = `
      UPDATE doctor_assignments 
      SET ${setClauses.join(', ')}
      WHERE assignment_id = $${params.length}::integer 
      RETURNING *
    `;

    const result = await query(sql, params);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Appointment assignment not found' }, { status: 404 });
    }

    const updatedRow = result.rows[0];
    const patId = updatedRow.patient_id;

    // 1. If reminder triggered, send reminder inbox notification
    if (payment_reminder_sent && patId) {
      await query(`
        INSERT INTO patient_inbox_messages (patient_id, sender_role, category, title, body, priority)
        VALUES ($1, 'ADMIN', 'PAYMENT_REMINDER', '📢 ডক্টর অ্যাপয়েন্টমেন্ট পেমেন্ট রিমাইন্ডার', $2, 'HIGH')
      `, [
        patId,
        `সম্মানিত রোগী, আপনার একটি ডক্টর অ্যাপয়েন্টমেন্ট (#${assignment_id}) পেন্ডিং রয়েছে। আপনি হয়তো এখনো পেমেন্ট সম্পন্ন করেননি অথবা সম্পূর্ণ অর্থ পরিশোধ করেননি। অনুগ্রহ করে দ্রুত পেমেন্ট সম্পন্ন করুন অথবা অ্যাপয়েন্টমেন্ট বাতিল করুন। উল্লেখ্য, ৩ ঘণ্টার মধ্যে পেমেন্ট সম্পন্ন না হলে অ্যাপয়েন্টমেন্টটি স্বয়ংক্রিয়ভাবে বাতিল হয়ে যাবে।`
      ]).catch(e => console.error('Patient reminder inbox error:', e));
    }

    // 2. If status is Confirmed, send confirmation inbox notification
    if (status === 'Confirmed' && patId) {
      const docRes = await query('SELECT name FROM doctors WHERE doctor_id = $1', [updatedRow.doctor_id]);
      const doctorName = docRes.rows[0]?.name || 'ডাক্তার';
      const appDate = updatedRow.appointment_date ? new Date(updatedRow.appointment_date).toLocaleDateString() : '';
      const appTime = updatedRow.appointment_time ? updatedRow.appointment_time.slice(0, 5) : '';

      await query(`
        INSERT INTO patient_inbox_messages (patient_id, sender_role, category, title, body, priority)
        VALUES ($1, 'ADMIN', 'APPOINTMENT_CONFIRMED', '✅ Appointment Confirmed', $2, 'HIGH')
      `, [
        patId,
        `অভিনন্দন! ${doctorName}-এর সাথে আপনার ডক্টর অ্যাপয়েন্টমেন্ট সফলভাবে কনফার্ম করা হয়েছে। তারিখ: ${appDate}, সময়: ${appTime}। অনুগ্রহ করে নির্ধারিত সময়ের ১৫ মিনিট পূর্বে হাসপাতালে উপস্থিত থাকার জন্য অনুরোধ করা হচ্ছে। দ্রুত সেবা পরিবারের সাথে থাকার জন্য ধন্যবাদ।`
      ]).catch(e => console.error('Patient confirm inbox error:', e));
    }

    // 3. If refunded or explicitly cancelled with refund
    if (finalPaymentStatus === 'Refunded' && patId) {
      await query(`
        INSERT INTO patient_inbox_messages (patient_id, sender_role, category, title, body, priority)
        VALUES ($1, 'ADMIN', 'REFUND_NOTICE', '⚠️ পেমেন্ট রিফান্ড ও অ্যাপয়েন্টমেন্ট বাতিল', $2, 'HIGH')
      `, [
        patId,
        `অনিবার্য কারণবশত আপনার ডক্টর অ্যাপয়েন্টমেন্টটি (#${assignment_id}) বাতিল করা হয়েছে এবং আপনার প্রদত্ত পেমেন্ট রিফান্ড করে দেওয়া হয়েছে। দয়া করে আপনার পেমেন্ট অ্যাকাউন্ট চেক করুন। দ্রুত সেবার পাশে থাকার জন্য ধন্যবাদ।`
      ]).catch(e => console.error('Patient refund inbox error:', e));

      // Also flag platform_payments for this assignment as Refunded
      await query(`
        UPDATE platform_payments 
        SET refund_status = 'Refunded', status = 'Refunded'
        WHERE payment_purpose = 'Patient_Medical_Bill' AND request_id = $1::text
      `, [String(assignment_id)]).catch(e => console.error('Payment refund status update error:', e));
    }

    return NextResponse.json(updatedRow);
  } catch (error) {
    console.error('Update appointment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
