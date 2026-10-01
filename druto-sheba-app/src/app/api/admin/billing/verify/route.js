import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  try {
    const data = await request.json();
    const { payment_id, driver_id, status, amount_verified } = data;

    // 1. Update platform_payments
    await query(
      `UPDATE platform_payments 
       SET status = $1, amount_paid = $2, verified_at = CURRENT_TIMESTAMP,
           refund_status = CASE WHEN $1::varchar = 'Refunded' THEN 'Processed' ELSE refund_status END
       WHERE payment_id = $3`,
      [status, amount_verified, payment_id]
    );

    const paymentRow = await query(`SELECT payment_purpose, patient_id, request_id FROM platform_payments WHERE payment_id = $1`, [payment_id]);
    const { payment_purpose, patient_id, request_id } = paymentRow.rows[0] || {};

    if (driver_id) {
      // 2. Update driver_daily_settlements
      if (status === 'Settled') {
        await query(
          `UPDATE driver_daily_settlements 
           SET payment_status = 'Settled', 
               amount_paid = platform_commission_amount, 
               due_amount = 0,
               settled_at = CURRENT_TIMESTAMP
           WHERE driver_id = $1 AND due_amount > 0`,
          [driver_id]
        );
      } else if (status === 'Due') {
        const oldestPending = await query(
          `SELECT settlement_id, due_amount FROM driver_daily_settlements 
           WHERE driver_id = $1 AND due_amount > 0 
           ORDER BY settlement_date ASC LIMIT 1`,
          [driver_id]
        );
        if (oldestPending.rows.length > 0) {
          const sid = oldestPending.rows[0].settlement_id;
          const newDue = Math.max(0, oldestPending.rows[0].due_amount - amount_verified);
          await query(
            `UPDATE driver_daily_settlements 
             SET amount_paid = COALESCE(amount_paid, 0) + $1, 
                 due_amount = $2,
                 payment_status = CASE WHEN $2 <= 0 THEN 'Settled' ELSE 'Pending' END,
                 settled_at = CASE WHEN $2 <= 0 THEN CURRENT_TIMESTAMP ELSE NULL END
             WHERE settlement_id = $3`,
            [amount_verified, newDue, sid]
          );
        }
      }

      // 3. Send notification to driver
      const title = status === 'Settled' ? '✅ Payment Verified (Settled)' : '⚠️ Partial Payment Received';
      const body = status === 'Settled' 
        ? `Your payment of ৳${amount_verified} has been verified and your dues are fully settled. Thank you!` 
        : `We received a partial payment of ৳${amount_verified}. You still have an outstanding due.`;

      await query(
        `INSERT INTO driver_inbox_messages (driver_id, sender_role, category, title, body, priority)
         VALUES ($1, 'ADMIN', 'GENERAL', $2, $3, 'NORMAL')`,
        [driver_id, title, body]
      );
    } else if (payment_purpose === 'Patient_Medical_Bill' && request_id) {
      // 2. Update doctor_assignments: Mark Paid, but status stays Pending until Doctor tab confirms
      if (status === 'Settled') {
        await query(
          `UPDATE doctor_assignments 
           SET payment_status = 'Paid'
           WHERE assignment_id = $1::integer`,
          [request_id]
        );

        if (patient_id) {
          await query(
            `INSERT INTO patient_inbox_messages (patient_id, sender_role, category, title, body, priority)
             VALUES ($1, 'ADMIN', 'PAYMENT_VERIFIED', '💳 পেমেন্ট সফল হয়েছে (Payment Successful)', $2, 'HIGH')`,
            [
              patient_id,
              `আপনার ৳${amount_verified} পেমেন্ট অ্যাডমিন কর্তৃক সফলভাবে ভেরিফাই করা হয়েছে। আপনার অ্যাপয়েন্টমেন্ট শিডিউল চূড়ান্ত কনফার্মেশনের জন্য অপেক্ষা করুন (সাধারণত ৫-১০ মিনিট)। কনফার্ম হলে আপনি পরবর্তী নোটিফিকেশন পেয়ে যাবেন। ধন্যবাদ!`
            ]
          ).catch(e => console.error('Patient inbox insert error:', e));
        }
      } else if (status === 'Due') {
        // Just flag it as Due, no automatic cancellation yet
        await query(
          `UPDATE doctor_assignments 
           SET payment_status = 'Unpaid'
           WHERE assignment_id = $1::integer`,
          [request_id]
        );

        if (patient_id) {
          await query(
            `INSERT INTO patient_inbox_messages (patient_id, sender_role, category, title, body, priority)
             VALUES ($1, 'ADMIN', 'PAYMENT_ISSUE', '⚠️ আংশিক পেমেন্ট নোটিশ (Partial Payment)', $2, 'HIGH')`,
            [
              patient_id,
              `আপনার পেমেন্ট ভেরিফিকেশনটি আংশিক সম্পন্ন হয়েছে। সম্পূর্ণ পেমেন্ট না করা পর্যন্ত অ্যাপয়েন্টমেন্টটি পেন্ডিং থাকবে। অনুগ্রহ করে বাকি পেমেন্ট সম্পন্ন করুন।`
            ]
          ).catch(e => console.error('Patient inbox insert error:', e));
        }
      } else if (status === 'Refunded') {
        // Mark the assignment payment as Refunded
        await query(
          `UPDATE doctor_assignments 
           SET payment_status = 'Refunded', status = 'Cancelled'
           WHERE assignment_id = $1::integer`,
          [request_id]
        );

        if (patient_id) {
          await query(
            `INSERT INTO patient_inbox_messages (patient_id, sender_role, category, title, body, priority)
             VALUES ($1, 'ADMIN', 'PAYMENT_ISSUE', '💸 রিফান্ড প্রসেসড (Refund Processed)', $2, 'HIGH')`,
            [
              patient_id,
              `আপনার ৳${amount_verified} পেমেন্টের রিফান্ড সফলভাবে প্রসেস করা হয়েছে। এটি আপনার একাউন্টে পৌঁছাতে কিছু সময় লাগতে পারে। সময় অতিক্রান্ত হওয়া বা বাতিল হওয়ার কারণে এই রিফান্ডটি দেওয়া হয়েছে।`
            ]
          ).catch(e => console.error('Patient inbox insert error:', e));
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error verifying payment:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
