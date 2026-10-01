import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { driver_id, sender_role = 'Dispatcher', sender_name = 'HQ Dispatch Central', alert_type = 'OVERLOAD_WARNING', title, message } = await request.json();

    if (!driver_id || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert into driver_inbox_messages
    const res = await query(
      `INSERT INTO driver_inbox_messages (
        driver_id, sender_role, category, title, body, priority, is_read
      ) VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING message_id`,
      [driver_id, 'SYSTEM', 'WARNING', title, message, 'HIGH']
    );

    return NextResponse.json({ success: true, message_id: res.rows[0].message_id });
  } catch (error) {
    console.error('Failed to send driver warning:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
