import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'emergency_response_secret_jwt_key_2026');

export async function POST(req) {
  try {
    const sessionCookie = req.cookies.get('patient_session');
    if (sessionCookie) {
      try {
        const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
        if (payload?.patientId) {
          // Invalidate active session in DB
          await query('UPDATE patient_credentials SET session_token = NULL WHERE patient_id = $1', [payload.patientId]);
        }
      } catch (e) {}
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' }, { status: 200 });

    response.cookies.set({
      name: 'patient_session',
      value: '',
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
