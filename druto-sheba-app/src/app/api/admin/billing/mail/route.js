import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { recipient_type, recipient_id, title, body, priority, category } = data;

    if (!recipient_type || !recipient_id || !title || !body) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (recipient_type === 'DRIVER') {
      await query(
        `INSERT INTO driver_inbox_messages (driver_id, sender_role, category, title, body, priority)
         VALUES ($1, 'ADMIN', $2, $3, $4, $5)`,
        [recipient_id, category || 'GENERAL', title, body, priority || 'HIGH']
      );
    } else if (recipient_type === 'PATIENT') {
      await query(
        `INSERT INTO patient_inbox_messages (patient_id, sender_role, category, title, body, priority)
         VALUES ($1, 'ADMIN', $2, $3, $4, $5)`,
        [recipient_id, category || 'GENERAL', title, body, priority || 'HIGH']
      );
    } else {
      return NextResponse.json({ error: 'Invalid recipient type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in manual mail dispatch:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
