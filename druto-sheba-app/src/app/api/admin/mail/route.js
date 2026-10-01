import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. Fetch Drivers with Username
    const driversResult = await query(`
      SELECT 
        d.driver_id,
        d.name,
        d.phone,
        d.license_no,
        d.own_ambulance_plate,
        d.verification_status,
        COALESCE(dc.username, LOWER(REPLACE(d.name, ' ', '')) || d.driver_id::text) as username,
        COALESCE(
          (SELECT SUM(ds.due_amount) FROM driver_daily_settlements ds WHERE ds.driver_id = d.driver_id AND ds.due_amount > 0), 0
        ) as cumulative_due,
        COALESCE(
          (SELECT COUNT(DISTINCT ds.settlement_id) FROM driver_daily_settlements ds WHERE ds.driver_id = d.driver_id AND ds.due_amount > 0), 0
        ) as consecutive_days_overdue
      FROM drivers d
      LEFT JOIN driver_credentials dc ON d.driver_id = dc.driver_id
      ORDER BY d.name ASC
    `);

    // 2. Fetch Patients with Username
    const patientsResult = await query(`
      SELECT 
        p.patient_id,
        p.name,
        p.phone,
        p.blood_type,
        COALESCE(pc.username, LOWER(REPLACE(p.name, ' ', '')) || p.patient_id::text) as username
      FROM patients p
      LEFT JOIN patient_credentials pc ON p.patient_id = pc.patient_id
      ORDER BY p.name ASC
    `);

    // 3. Fetch Recent Sent Notices History
    const driverNotices = await query(`
      SELECT 
        m.message_id,
        m.created_at,
        m.title,
        m.body,
        m.category,
        m.priority,
        'DRIVER' as recipient_type,
        d.name as recipient_name,
        d.phone as recipient_phone,
        COALESCE(dc.username, d.name) as recipient_username
      FROM driver_inbox_messages m
      JOIN drivers d ON m.driver_id = d.driver_id
      LEFT JOIN driver_credentials dc ON d.driver_id = dc.driver_id
      WHERE m.sender_role = 'ADMIN'
      ORDER BY m.created_at DESC
      LIMIT 30
    `);

    const patientNotices = await query(`
      SELECT 
        m.message_id,
        m.created_at,
        m.title,
        m.body,
        m.category,
        m.priority,
        'PATIENT' as recipient_type,
        p.name as recipient_name,
        p.phone as recipient_phone,
        COALESCE(pc.username, p.name) as recipient_username
      FROM patient_inbox_messages m
      JOIN patients p ON m.patient_id = p.patient_id
      LEFT JOIN patient_credentials pc ON p.patient_id = pc.patient_id
      WHERE m.sender_role = 'ADMIN'
      ORDER BY m.created_at DESC
      LIMIT 30
    `);

    const history = [...driverNotices.rows, ...patientNotices.rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);

    return NextResponse.json({
      drivers: driversResult.rows,
      patients: patientsResult.rows,
      history
    });
  } catch (err) {
    console.error('Error fetching admin mail directory:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { recipient_type, recipient_id, title, body, priority, category } = data;

    if (!recipient_type || !recipient_id || !title || !body) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (recipient_type === 'DRIVER') {
      await query(
        `INSERT INTO driver_inbox_messages (driver_id, sender_role, category, title, body, priority, is_read)
         VALUES ($1, 'ADMIN', $2, $3, $4, $5, false)`,
        [recipient_id, category || 'WARNING', title, body, priority || 'HIGH']
      );

      // Check if notice is suspension
      if (category === 'SUSPENSION') {
        await query(`UPDATE drivers SET verification_status = 'Suspended' WHERE driver_id = $1`, [recipient_id]);
      }
    } else if (recipient_type === 'PATIENT') {
      await query(
        `INSERT INTO patient_inbox_messages (patient_id, sender_role, category, title, body, priority, is_read)
         VALUES ($1, 'ADMIN', $2, $3, $4, $5, false)`,
        [recipient_id, category || 'GENERAL', title, body, priority || 'HIGH']
      );
    } else {
      return NextResponse.json({ error: 'Invalid recipient type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error sending manual mail:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
