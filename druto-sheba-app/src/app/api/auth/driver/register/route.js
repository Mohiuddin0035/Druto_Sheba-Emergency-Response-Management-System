import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { query, transaction } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'emergency_response_secret_jwt_key_2026');

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, phone, license_no, nid_number, username, password, device_id } = body;

    // Driver only needs Name, Phone, and Password during fast initial signup!
    if (!name || !phone || !password) {
      return NextResponse.json({ 
        error: 'Full Name, Phone Number, and Password are required.' 
      }, { status: 400 });
    }

    const cleanPhone = String(phone).trim();
    // If license is not provided during initial signup, assign a temporary pending token
    const cleanLicense = license_no?.trim() 
      ? String(license_no).trim().toUpperCase() 
      : `PENDING-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const cleanNid = nid_number ? String(nid_number).trim() : null;
    const passwordStr = String(password);

    // Enforce strong password: >=8 chars, uppercase, lowercase, number, special char
    if (passwordStr.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }
    const hasUpper = /[A-Z]/.test(passwordStr);
    const hasLower = /[a-z]/.test(passwordStr);
    const hasNumber = /[0-9]/.test(passwordStr);
    const hasSpecial = /[^A-Za-z0-9]/.test(passwordStr);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return NextResponse.json({ 
        error: 'Password must contain uppercase letters, lowercase letters, a number, and a special character (e.g. Driver@123).' 
      }, { status: 400 });
    }

    const desiredUsername = (username || (name.trim().split(' ')[0] + Math.floor(100 + Math.random() * 900))).toLowerCase().trim();

    // Check duplicate phone
    const phoneCheck = await query(`
      SELECT driver_id FROM drivers WHERE phone = $1 LIMIT 1
    `, [cleanPhone]);

    if (phoneCheck.rows.length > 0) {
      return NextResponse.json({ 
        error: `Phone Number "${cleanPhone}" is already registered.` 
      }, { status: 409 });
    }

    // Check specific duplicate license if explicitly provided
    if (license_no?.trim()) {
      const licCheck = await query(`
        SELECT driver_id FROM drivers 
        WHERE UPPER(TRIM(license_no)) = $1
        LIMIT 1
      `, [cleanLicense]);

      if (licCheck.rows.length > 0) {
        return NextResponse.json({ 
          error: `Driving License Number "${cleanLicense}" is already registered to another driver account.` 
        }, { status: 409 });
      }
    }

    // Check duplicate NID if provided
    if (cleanNid) {
      const nidCheck = await query(`
        SELECT driver_id FROM drivers WHERE nid_number = $1 LIMIT 1
      `, [cleanNid]);

      if (nidCheck.rows.length > 0) {
        return NextResponse.json({ 
          error: `NID Number "${cleanNid}" is already registered.` 
        }, { status: 409 });
      }
    }

    // Check if username taken in credentials
    const existingUser = await query(`
      SELECT auth_id FROM driver_credentials WHERE LOWER(username) = $1 LIMIT 1
    `, [desiredUsername]);

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'Username already taken. Please pick another username.' }, { status: 409 });
    }

    // Insert into drivers and driver_credentials inside a transaction
    const newSessionToken = crypto.randomUUID();
    const deviceSignature = device_id || 'browser-driver-' + Math.random().toString(36).substring(2, 9);

    // Hash driver password
    const passwordHash = await bcrypt.hash(passwordStr, 10);

    const result = await transaction(async (client) => {
      // 1. Insert Driver with Pending verification status
      const drvInsert = await client.query(`
        INSERT INTO drivers (name, license_no, phone, nid_number, shift_status, verification_status)
        VALUES ($1, $2, $3, $4, 'Off_Duty', 'Pending')
        RETURNING *
      `, [name.trim(), cleanLicense, cleanPhone, cleanNid]);

      const driver = drvInsert.rows[0];

      // 2. Insert Driver Credentials with password_hash
      await client.query(`
        INSERT INTO driver_credentials (
          driver_id,
          username,
          password_plain,
          password_hash,
          session_token,
          last_device
        )
        VALUES ($1, $2, '', $3, $4, $5)
      `, [driver.driver_id, desiredUsername, passwordHash, newSessionToken, deviceSignature]);

      return driver;
    });

    // Sign JWT
    const token = await new SignJWT({
      driverId: result.driver_id,
      username: desiredUsername,
      name: result.name,
      phone: result.phone,
      license: result.license_no,
      sessionToken: newSessionToken,
      role: 'Driver'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('3650d')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      message: 'Driver registration successful! Please complete your qualification verification.',
      driver: {
        id: result.driver_id,
        name: result.name,
        username: desiredUsername,
        phone: result.phone,
        license: result.license_no,
        nid_number: result.nid_number,
        verification_status: 'Pending',
        session_token: newSessionToken
      }
    }, { status: 201 });

    // Set cookie so they can immediately submit their verification (secure only over HTTPS)
    const isHttps = req.headers.get('x-forwarded-proto') === 'https';
    response.cookies.set({
      name: 'driver_session',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 10,
    });

    return response;
  } catch (error) {
    console.error('Driver registration error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
