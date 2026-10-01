import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { purpose, entityId, registeredPhone, senderPhone, transactionId, method, amount } = data;

    if (!transactionId || !senderPhone || !registeredPhone) {
      return NextResponse.json({ error: 'Missing mandatory fields' }, { status: 400 });
    }

    // Determine which ID to link based on purpose
    let driver_id = null;
    let patient_id = null;
    let request_id = null;
    let dispatcher_id = null;

    // Ensure dispatcher_id column exists
    await query('ALTER TABLE platform_payments ADD COLUMN IF NOT EXISTS dispatcher_id INTEGER').catch(() => {});

    if (purpose === 'Driver_Verification' || purpose === 'Driver_Daily_Settlement') {
      driver_id = entityId;
    } else if (purpose === 'Dispatcher_Verification') {
      dispatcher_id = entityId;
    } else if (purpose === 'Patient_Medical_Bill') {
      request_id = String(entityId);
      // Look up assignment to get patient_id
      const assignRes = await query('SELECT patient_id FROM doctor_assignments WHERE assignment_id = $1::integer', [entityId]);
      if (assignRes.rows.length > 0) {
        patient_id = assignRes.rows[0].patient_id;
      } else {
        // Fallback: lookup by registeredPhone
        const patRes = await query('SELECT patient_id FROM patients WHERE phone = $1 LIMIT 1', [registeredPhone]);
        if (patRes.rows.length > 0) patient_id = patRes.rows[0].patient_id;
      }
    } else if (purpose === 'Emergency_Request') {
      request_id = String(entityId);
    }

    const result = await query(
      `INSERT INTO platform_payments (
        payment_purpose, transaction_id, registered_phone, sender_phone, payment_method, amount_expected, driver_id, patient_id, request_id, dispatcher_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING payment_id`,
      [purpose, transactionId, registeredPhone, senderPhone, method, parseFloat(amount), driver_id || null, patient_id || null, request_id || null, dispatcher_id || null]
    );

    // If it's a dispatcher payment, push a message to staff_inbox_messages or platform_inbox_messages
    if (dispatcher_id) {
      await query(`
        CREATE TABLE IF NOT EXISTS staff_inbox_messages (
          message_id SERIAL PRIMARY KEY,
          staff_id INTEGER,
          title VARCHAR(255),
          body TEXT,
          sender_role VARCHAR(50) DEFAULT 'SYSTEM',
          category VARCHAR(50) DEFAULT 'GENERAL',
          priority VARCHAR(20) DEFAULT 'NORMAL',
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `).catch(() => {});

      await query(
        `INSERT INTO staff_inbox_messages (staff_id, title, body, sender_role, category, priority)
         VALUES ($1, $2, $3, 'SYSTEM', 'PAYMENT_REMINDER', 'HIGH')`,
        [
          dispatcher_id,
          'ডিসপ্যাচার ভেরিফিকেশন পেমেন্ট যাচাইকরণ চলমান (Dispatcher Verification in Progress)',
          `আপনার ডিসপ্যাচার ভেরিফিকেশন ফি (৳${amount}) সফলভাবে প্রাপ্ত হয়েছে (TrxID: ${transactionId})। অ্যাডমিন টিম আপনার জাতীয় পরিচয়পত্র, এইচএসসি সনদ ও পেমেন্ট অডিট শেষে অ্যাকাউন্ট সক্রিয় করে নোটিফিকেশন পাঠাবে। অনুগ্রহ করে অপেক্ষা করুন।`
        ]
      ).catch(e => console.error('Staff inbox insert failed:', e));
    }

    // If it's a driver payment, push a message to driver_inbox_messages
    if (driver_id) {
      await query(
        `INSERT INTO driver_inbox_messages (driver_id, title, body, sender_role, category, priority)
         VALUES ($1, $2, $3, 'SYSTEM', 'PAYMENT_REMINDER', 'HIGH')`,
        [
          driver_id, 
          'পেমেন্ট যাচাইকরণ চলমান (Payment Verification in Progress)', 
          `আপনার পেমেন্ট ভেরিফিকেশন চলছে (TrxID: ${transactionId})। অ্যাডমিন ভেরিফাই করা শেষে আপডেট করলেই আপনার পোর্টালে তা স্বয়ংক্রিয়ভাবে অ্যাডজাস্ট হয়ে যাবে। সাধারণত ৩০ মিনিট থেকে ১ ঘণ্টার মধ্যে আপডেট হয়ে গিয়ে থাকে, দয়া করে অপেক্ষা করুন।`
        ]
      ).catch(e => console.error('Driver inbox insert failed:', e));
    }

    // If it's a patient payment, push a message to patient_inbox_messages
    if (patient_id) {
      await query(
        `INSERT INTO patient_inbox_messages (patient_id, title, body, sender_role, category, priority)
         VALUES ($1, $2, $3, 'SYSTEM', 'PAYMENT_CONFIRMATION', 'HIGH')`,
        [
          patient_id,
          'পেমেন্ট যাচাইকরণ চলমান (Payment Verification in Progress)',
          `আপনার ডক্টর অ্যাপয়েন্টমেন্ট পেমেন্ট সাবমিশন সফল হয়েছে (TrxID: ${transactionId}, পরিমাণ: ৳${amount})। অ্যাডমিন আপনার পেমেন্ট ভেরিফাই করলে আপনার অ্যাপয়েন্টমেন্ট কনফার্ম হয়ে যাবে। অনুগ্রহ করে অপেক্ষা করুন।`
        ]
      ).catch(e => console.error('Patient inbox insert failed:', e));
    }

    return NextResponse.json({ success: true, payment_id: result.rows[0].payment_id });

  } catch (err) {
    console.error('Payment API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
