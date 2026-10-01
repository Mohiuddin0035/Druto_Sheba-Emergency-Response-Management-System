import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'emergency_response_secret_jwt_key_2026');

export async function POST(req) {
  try {
    const body = await req.json();
    const { identifier, password, device_id } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Username, Phone number, or License number and password are required' }, { status: 400 });
    }

    const cleanId = String(identifier).trim().toLowerCase();

    // Query driver credentials by username, phone number, OR license number
    const result = await query(`
      SELECT 
        dc.auth_id,
        dc.driver_id,
        dc.username,
        dc.password_plain,
        dc.password_hash,
        dc.session_token,
        d.name,
        d.license_no,
        d.shift_status,
        d.phone
      FROM driver_credentials dc
      JOIN drivers d ON dc.driver_id = d.driver_id
      WHERE LOWER(dc.username) = $1 
         OR LOWER(d.phone) = $1 
         OR LOWER(d.license_no) = $1
      LIMIT 1
    `, [cleanId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No driver account found with this username, phone, or license' }, { status: 401 });
    }

    const account = result.rows[0];

    // Password verification:
    // 1. Bcrypt hash check (primary secure mode)
    let passwordMatch = false;
    if (account.password_hash) {
      passwordMatch = await bcrypt.compare(password, account.password_hash);
    }
    // 2. Fallback plain text check
    if (!passwordMatch && account.password_plain) {
      passwordMatch = (password === account.password_plain);
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid password. Please check your credentials.' }, { status: 401 });
    }

    // Generate unique session token for single-device restriction
    const newSessionToken = crypto.randomUUID();
    const deviceSignature = device_id || 'browser-' + Math.random().toString(36).substring(2, 9);

    await query(`
      UPDATE driver_credentials 
      SET 
        session_token = $1,
        last_device = $2,
        last_login = CURRENT_TIMESTAMP
      WHERE driver_id = $3
    `, [newSessionToken, deviceSignature, account.driver_id]);

    // Sign JWT (Valid for 10 years / persistent access until explicit logout)
    const token = await new SignJWT({
      driverId: account.driver_id,
      username: account.username,
      name: account.name,
      phone: account.phone,
      license: account.license_no,
      sessionToken: newSessionToken,
      role: 'Driver'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('3650d')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      driver: {
        id: account.driver_id,
        name: account.name,
        username: account.username,
        phone: account.phone,
        license: account.license_no,
        status: account.shift_status,
        session_token: newSessionToken
      }
    }, { status: 200 });

    // Set persistent HTTP-only cookie (secure only if served over HTTPS)
    const isHttps = req.headers.get('x-forwarded-proto') === 'https';
    response.cookies.set({
      name: 'driver_session',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
    });

    return response;
  } catch (error) {
    console.error('Driver Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
