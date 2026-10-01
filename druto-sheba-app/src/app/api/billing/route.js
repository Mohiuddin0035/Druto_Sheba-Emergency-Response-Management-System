import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await query(`
      SELECT 
        b.Bill_ID,
        b.Trip_ID,
        p.Name as patient_name,
        b.Amount,
        b.Tax,
        b.Total_Amount,
        b.Payment_Status,
        b.Date_Issued,
        b.payment_reminder_sent
      FROM Billing b
      JOIN Patients p ON b.Patient_ID = p.Patient_ID
      ORDER BY b.Bill_ID DESC
    `);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { bill_id, status, payment_reminder_sent } = await request.json();
    if (!bill_id) return NextResponse.json({ error: 'Missing bill_id' }, { status: 400 });

    const setClauses = [];
    const params = [];

    if (status !== undefined) {
      params.push(status);
      setClauses.push(`Payment_Status = $${params.length}`);
    }

    if (payment_reminder_sent !== undefined) {
      params.push(payment_reminder_sent);
      setClauses.push(`payment_reminder_sent = $${params.length}::boolean`);
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    params.push(bill_id);
    const res = await query(`
      UPDATE Billing 
      SET ${setClauses.join(', ')} 
      WHERE Bill_ID = $${params.length} 
      RETURNING *
    `, params);

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
