import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'emergency_response_secret_jwt_key_2026');

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const sessionCookie = req.cookies.get('patient_session');
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);

    // CRITICAL SINGLE-DEVICE ENFORCEMENT:
    // Check if the session_token in cookie matches the current session_token in database!
    // If the patient logged in from another browser, the token in database was overwritten,
    // so this older browser will be automatically signed out!
    const res = await query(`
      SELECT 
        pc.session_token,
        p.patient_id,
        p.name,
        p.phone,
        p.blood_type,
        p.address,
        p.allergies,
        array_agg(pc2.condition_name) FILTER (WHERE pc2.condition_name IS NOT NULL) as conditions
      FROM patient_credentials pc
      JOIN patients p ON pc.patient_id = p.patient_id
      LEFT JOIN patient_conditions pc2 ON p.patient_id = pc2.patient_id
      WHERE pc.patient_id = $1
      GROUP BY pc.session_token, p.patient_id, p.name, p.phone, p.blood_type, p.address, p.allergies
    `, [payload.patientId]);

    if (res.rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const currentRecord = res.rows[0];

    if (currentRecord.session_token && payload.sessionToken && currentRecord.session_token !== payload.sessionToken) {
      // Session has been revoked by login on another browser!
      const response = NextResponse.json({ 
        authenticated: false, 
        revoked: true, 
        message: 'You have been signed out because this account was logged into from another browser or device.' 
      }, { status: 200 });

      response.cookies.set({
        name: 'patient_session',
        value: '',
        httpOnly: true,
        expires: new Date(0),
        path: '/',
      });
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      patient: {
        id: currentRecord.patient_id,
        name: currentRecord.name,
        phone: currentRecord.phone,
        blood_type: currentRecord.blood_type,
        address: currentRecord.address,
        allergies: currentRecord.allergies,
        conditions: currentRecord.conditions || [],
        username: payload.username
      }
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ authenticated: false, error: 'Session expired or invalid' }, { status: 200 });
  }
}
