import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const driver_id = searchParams.get('driver_id');

  if (!driver_id) {
    return NextResponse.json({ error: 'driver_id is required' }, { status: 400 });
  }

  try {
    const query = `SELECT * FROM Driver_Certifications WHERE Driver_ID = $1 ORDER BY Expiry_Date ASC`;
    const result = await db.query(query, [driver_id]);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching certifications:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { driver_id, certification_name, issuing_authority, date_issued, expiry_date } = await req.json();

    if (!driver_id || !certification_name || !issuing_authority) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const query = `
      INSERT INTO Driver_Certifications (Driver_ID, Certification_Name, Issuing_Authority, Date_Issued, Expiry_Date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [driver_id, certification_name, issuing_authority, date_issued || null, expiry_date || null];
    
    const result = await db.query(query, values);
    return NextResponse.json({ success: true, certification: result.rows[0] });
  } catch (err) {
    console.error('Error adding certification:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const cert_id = searchParams.get('cert_id');

  if (!cert_id) {
    return NextResponse.json({ error: 'cert_id is required' }, { status: 400 });
  }

  try {
    const query = `DELETE FROM Driver_Certifications WHERE Certification_ID = $1 RETURNING *`;
    const result = await db.query(query, [cert_id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting certification:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
