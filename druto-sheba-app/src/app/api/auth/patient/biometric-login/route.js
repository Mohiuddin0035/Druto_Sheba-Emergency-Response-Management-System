import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'emergency_response_secret_jwt_key_2026');

export async function POST(req) {
  try {
    const body = await req.json();
    const { credential_id, patient_id, identifier, device_id } = body;

    if (!credential_id) {
      return NextResponse.json({ 
        error: 'Biometric credential ID is required for fingerprint authentication.' 
      }, { status: 400 });
    }

    const cleanBioId = String(credential_id).trim();

    // If patient_id or identifier is provided, query that exact account to ensure fingerprint matches target account
    let result;
    if (patient_id) {
      result = await query(`
        SELECT 
          pc.auth_id,
          pc.patient_id,
          pc.username,
          pc.biometric_credential_id,
          pc.session_token,
          p.name,
          p.phone,
          p.blood_type,
          p.address,
          p.allergies
        FROM patient_credentials pc
        JOIN patients p ON pc.patient_id = p.patient_id
        WHERE pc.patient_id = $1 AND pc.biometric_credential_id = $2
        LIMIT 1
      `, [patient_id, cleanBioId]);
    } else {
      result = await query(`
        SELECT 
          pc.auth_id,
          pc.patient_id,
          pc.username,
          pc.biometric_credential_id,
          pc.session_token,
          p.name,
          p.phone,
          p.blood_type,
          p.address,
          p.allergies
        FROM patient_credentials pc
        JOIN patients p ON pc.patient_id = p.patient_id
        WHERE pc.biometric_credential_id = $1
        LIMIT 1
      `, [cleanBioId]);
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ 
        error: 'No patient account registered with this fingerprint. Please register first.' 
      }, { status: 404 });
    }

    const account = result.rows[0];

    // Generate unique session token for single-device restriction
    const newSessionToken = crypto.randomUUID();
    const deviceSignature = device_id || 'biometric-browser-' + Math.random().toString(36).substring(2, 9);

    await query(`
      UPDATE patient_credentials 
      SET 
        session_token = $1,
        last_device = $2,
        last_login = CURRENT_TIMESTAMP
      WHERE patient_id = $3
    `, [newSessionToken, deviceSignature, account.patient_id]);

    // Issue signed 10-year persistent session JWT
    const token = await new SignJWT({
      patientId: account.patient_id,
      username: account.username,
      name: account.name,
      phone: account.phone,
      sessionToken: newSessionToken,
      role: 'Patient',
      isBiometricAuth: true
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('3650d')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      message: `Welcome back, ${account.name}! Biometric Fingerprint verified.`,
      patient: {
        id: account.patient_id,
        name: account.name,
        username: account.username,
        phone: account.phone,
        blood_type: account.blood_type
      }
    });

    // Set cookie (secure only over HTTPS)
    const isHttps = req.headers.get('x-forwarded-proto') === 'https';
    response.cookies.set({
      name: 'patient_session',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Biometric login error:', error);
    return NextResponse.json({ error: error.message || 'Biometric authentication failed.' }, { status: 500 });
  }
}
