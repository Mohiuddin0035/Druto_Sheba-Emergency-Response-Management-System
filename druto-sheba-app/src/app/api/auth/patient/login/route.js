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
      return NextResponse.json({ error: 'Username/Phone number and password are required' }, { status: 400 });
    }

    const cleanId = String(identifier).trim().toLowerCase();

    // Query patient credentials by username OR phone number
    const result = await query(`
      SELECT 
        pc.auth_id,
        pc.patient_id,
        pc.username,
        pc.password_plain,
        pc.password_hash,
        pc.session_token,
        p.name,
        p.phone,
        p.blood_type,
        p.address,
        p.allergies
      FROM patient_credentials pc
      JOIN patients p ON pc.patient_id = p.patient_id
      WHERE LOWER(pc.username) = $1 OR p.phone = $2
      LIMIT 1
    `, [cleanId, cleanId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No account found with this username or phone number' }, { status: 401 });
    }

    const account = result.rows[0];

    // Password verification:
    // 1. Bcrypt hash check (primary secure mode)
    let passwordMatch = false;
    if (account.password_hash) {
      passwordMatch = await bcrypt.compare(password, account.password_hash);
    }
    // 2. Fallback plain text check if not yet hashed
    if (!passwordMatch && account.password_plain) {
      passwordMatch = (password === account.password_plain);
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Generate unique session token for single-device restriction
    // If logged in on another browser previously, generating a new token invalidates that device!
    const newSessionToken = crypto.randomUUID();
    const deviceSignature = device_id || 'browser-' + Math.random().toString(36).substring(2, 9);

    await query(`
      UPDATE patient_credentials 
      SET 
        session_token = $1,
        last_device = $2,
        last_login = CURRENT_TIMESTAMP
      WHERE patient_id = $3
    `, [newSessionToken, deviceSignature, account.patient_id]);

    // Sign JWT (Valid for 10 years / permanent emergency access)
    const token = await new SignJWT({
      patientId: account.patient_id,
      username: account.username,
      name: account.name,
      phone: account.phone,
      sessionToken: newSessionToken,
      role: 'Patient'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('3650d') // 10 years lifetime login
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      patient: {
        id: account.patient_id,
        name: account.name,
        username: account.username,
        phone: account.phone,
        blood_type: account.blood_type,
        session_token: newSessionToken
      }
    }, { status: 200 });

    // Set permanent HTTP-only cookie (10 years, secure only over HTTPS)
    const isHttps = req.headers.get('x-forwarded-proto') === 'https';
    response.cookies.set({
      name: 'patient_session',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 3650 * 24 * 60 * 60, // 10 years
    });

    return response;
  } catch (error) {
    console.error('Patient login error:', error);
    return NextResponse.json({ error: error.message || 'Authentication error' }, { status: 500 });
  }
}
