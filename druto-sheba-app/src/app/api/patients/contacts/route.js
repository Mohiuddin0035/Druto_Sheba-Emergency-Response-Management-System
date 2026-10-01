import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const patient_id = searchParams.get('patient_id');

  if (!patient_id) {
    return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
  }

  try {
    const query = `SELECT * FROM Patient_Emergency_Contacts WHERE Patient_ID = $1 ORDER BY Contact_ID ASC`;
    const result = await db.query(query, [patient_id]);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching emergency contacts:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { patient_id, contact_name, relationship, phone } = body;

    if (!patient_id || !contact_name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const query = `
      INSERT INTO Patient_Emergency_Contacts (Patient_ID, Contact_Name, Relationship, Phone)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [patient_id, contact_name, relationship || '', phone];
    
    const result = await db.query(query, values);
    return NextResponse.json({ success: true, contact: result.rows[0] });
  } catch (err) {
    console.error('Error adding emergency contact:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const contact_id = searchParams.get('contact_id');

  if (!contact_id) {
    return NextResponse.json({ error: 'contact_id is required' }, { status: 400 });
  }

  try {
    const query = `DELETE FROM Patient_Emergency_Contacts WHERE Contact_ID = $1 RETURNING *`;
    const result = await db.query(query, [contact_id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting emergency contact:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
