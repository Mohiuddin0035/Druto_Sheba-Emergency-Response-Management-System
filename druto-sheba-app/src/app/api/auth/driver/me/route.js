import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'emergency_response_secret_jwt_key_2026');

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const sessionCookie = req.cookies.get('driver_session');
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);

    // Verify session token against database
    const res = await query(`
      SELECT 
        dc.session_token,
        d.driver_id,
        d.name,
        d.phone,
        d.license_no,
        d.shift_status,
        d.verification_status,
        d.nid_number,
        d.assigned_ambulance_id,
        d.own_ambulance_plate,
        a.license_plate AS vehicle
      FROM driver_credentials dc
      JOIN drivers d ON dc.driver_id = d.driver_id
      LEFT JOIN ambulances a ON d.assigned_ambulance_id = a.vehicle_id
      WHERE dc.driver_id = $1
    `, [payload.driverId]);

    if (res.rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const currentRecord = res.rows[0];

    if (currentRecord.session_token && payload.sessionToken && currentRecord.session_token !== payload.sessionToken) {
      // Session revoked by login on another browser
      const response = NextResponse.json({ 
        authenticated: false, 
        revoked: true, 
        message: 'You have been signed out because this driver account was logged into from another browser or device.' 
      }, { status: 200 });

      response.cookies.set({
        name: 'driver_session',
        value: '',
        httpOnly: true,
        expires: new Date(0),
        path: '/',
      });
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      driver: {
        id: currentRecord.driver_id,
        name: currentRecord.name,
        username: payload.username,
        phone: currentRecord.phone,
        license: currentRecord.license_no,
        status: currentRecord.shift_status,
        verification_status: currentRecord.verification_status || 'Approved',
        nid_number: currentRecord.nid_number || null,
        assigned_ambulance_id: currentRecord.assigned_ambulance_id || null,
        own_ambulance_plate: currentRecord.own_ambulance_plate || null,
        vehicle: currentRecord.vehicle || null
      }
    }, { status: 200 });

  } catch (error) {
    const response = NextResponse.json({ authenticated: false, error: 'Session expired or invalid' }, { status: 200 });
    response.cookies.set({
      name: 'driver_session',
      value: '',
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });
    return response;
  }
}
