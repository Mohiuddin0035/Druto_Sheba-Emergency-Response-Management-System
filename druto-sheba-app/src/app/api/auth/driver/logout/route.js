import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'emergency_response_secret_jwt_key_2026');

export async function POST(req) {
  try {
    const sessionCookie = req.cookies.get('driver_session');
    if (sessionCookie) {
      try {
        const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
        if (payload?.driverId) {
          // Invalidate active session in DB
          await query('UPDATE driver_credentials SET session_token = NULL WHERE driver_id = $1', [payload.driverId]);
        }
      } catch (e) {}
    }

    const response = NextResponse.json({ success: true, message: 'Driver logged out successfully' }, { status: 200 });

    response.cookies.set({
      name: 'driver_session',
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
