import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    if (!patientId) {
      return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
    }

    // 1. First trigger auto-expiration check for appointments older than 3 hours
    try {
      const expiredAppointments = await query(`
        SELECT 
          da.assignment_id,
          da.patient_id,
          da.payment_status,
          da.status,
          pp.payment_id,
          pp.amount_paid,
          pp.transaction_id
        FROM doctor_assignments da
        LEFT JOIN platform_payments pp ON (pp.payment_purpose = 'Patient_Medical_Bill' AND pp.request_id = da.assignment_id::text)
        WHERE da.patient_id = $1::integer
          AND da.status = 'Pending'
          AND da.payment_status IN ('Unpaid', 'Pending')
          AND da.created_at < (CURRENT_TIMESTAMP - INTERVAL '3 hours')
      `, [patientId]);

      for (const exp of expiredAppointments.rows) {
        // Mark appointment cancelled
        await query(
          `UPDATE doctor_assignments 
           SET status = 'Cancelled', 
               payment_status = CASE WHEN payment_status = 'Pending' THEN 'Refunded' ELSE 'N/A' END
           WHERE assignment_id = $1`,
          [exp.assignment_id]
        );

        // If there was a payment transaction submitted, mark it for refund in platform_payments
        if (exp.payment_id) {
          await query(
            `UPDATE platform_payments 
             SET refund_status = 'Pending', status = 'Cancelled'
             WHERE payment_id = $1`,
            [exp.payment_id]
          );
        }

        // Check if cancellation notice already sent for this assignment
        const noticeExists = await query(`
          SELECT 1 FROM patient_inbox_messages 
          WHERE patient_id = $1 AND title LIKE $2
        `, [patientId, `%#${exp.assignment_id}%`]);

        if (noticeExists.rows.length === 0) {
          const bodyText = exp.payment_id
            ? `আপনার অ্যাপয়েন্টমেন্ট (#${exp.assignment_id}) ৩ ঘণ্টার মধ্যে পেমেন্ট ভেরিফিকেশন সম্পন্ন না হওয়ায় বাতিল করা হয়েছে। আপনি বিকাশ/রকেটে যে অর্থ প্রদান করেছিলেন, তা আগামী ৪৮ ঘণ্টার মধ্যে আপনার নম্বরে রিফান্ড করে দেওয়া হবে।`
            : `আপনার অ্যাপয়েন্টমেন্ট (#${exp.assignment_id}) নির্ধারিত ৩ ঘণ্টার মধ্যে পেমেন্ট সম্পন্ন না হওয়ায় স্বয়ংক্রিয়ভাবে বাতিল করা হয়েছে। নতুন অ্যাপয়েন্টমেন্ট বুকিং করতে আবার চেষ্টা করুন।`;

          await query(`
            INSERT INTO patient_inbox_messages (patient_id, sender_role, category, title, body, priority)
            VALUES ($1, 'SYSTEM', 'AUTO_CANCEL', $2, $3, 'HIGH')
          `, [
            patientId,
            `⚠️ অ্যাপয়েন্টমেন্ট বাতিল ও নোটিশ (#${exp.assignment_id})`,
            bodyText
          ]);
        }
      }
    } catch (expErr) {
      console.error('Error during auto-expire check:', expErr);
    }

    // 2. Fetch all messages for the patient
    const messagesResult = await query(`
      SELECT 
        message_id as id,
        patient_id,
        sender_role,
        category,
        title,
        body,
        priority,
        is_read,
        created_at
      FROM patient_inbox_messages
      WHERE patient_id = $1::integer
      ORDER BY created_at DESC
    `, [patientId]);

    // 3. Count unread messages
    const unreadCountResult = await query(`
      SELECT COUNT(*) as unread_count
      FROM patient_inbox_messages
      WHERE patient_id = $1::integer AND is_read = false
    `, [patientId]);

    return NextResponse.json({
      messages: messagesResult.rows,
      unread_count: parseInt(unreadCountResult.rows[0]?.unread_count || '0', 10)
    });

  } catch (err) {
    console.error('Error in Patient Inbox API:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { message_id, is_read } = await request.json();
    if (!message_id) {
      return NextResponse.json({ error: 'message_id is required' }, { status: 400 });
    }

    await query(
      `UPDATE patient_inbox_messages SET is_read = $1 WHERE message_id = $2`,
      [is_read ?? true, message_id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating patient inbox message:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
