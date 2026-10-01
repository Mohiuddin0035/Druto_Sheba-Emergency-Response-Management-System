import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'emergency_response_secret_jwt_key_2026');

export async function POST(req) {
  try {
    const body = await req.json();
    const { identifier, pin, device_id } = body;

    if (!identifier || !pin) {
      return NextResponse.json({ 
        error: 'Phone number/Username and 4-digit Emergency PIN are required.' 
      }, { status: 400 });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const cleanPin = String(pin).trim();

    if (cleanPin.length !== 4) {
      return NextResponse.json({ 
        error: 'Emergency PIN must be exactly 4 digits / characters.' 
      }, { status: 400 });
    }

    // Query patient credentials
    const result = await query(`
      SELECT 
        pc.auth_id,
        pc.patient_id,
        pc.username,
        pc.emergency_pin_plain,
        pc.emergency_pin_hash,
        pc.emergency_login_count,
        pc.last_emergency_login_month,
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
      return NextResponse.json({ 
        error: 'No registered patient account found with this phone number or username.' 
      }, { status: 404 });
    }

    const account = result.rows[0];

    // Current calendar month in format 'YYYY-MM'
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Reset quota if month has rolled over
    let currentUsage = account.emergency_login_count || 0;
    if (account.last_emergency_login_month !== currentMonth) {
      currentUsage = 0;
    }

    // CHECK MONTHLY LIMIT (MAX 3 TIMES PER MONTH)
    if (currentUsage >= 3) {
      return NextResponse.json({
        quotaExceeded: true,
        error: "You can't emergency log in more than 3 times in a month. Contact our emergency hotline for emergency help.",
        adminContact: "+999-01711-HELP-SOS",
        currentMonth: currentMonth
      }, { status: 429 });
    }

    // Emergency PIN verification
    // 1. Bcrypt hash check (primary secure mode)
    let isPinMatch = false;
    if (account.emergency_pin_hash) {
      isPinMatch = await bcrypt.compare(cleanPin, account.emergency_pin_hash);
    }
    // 2. Fallback plain text check
    if (!isPinMatch && account.emergency_pin_plain) {
      isPinMatch = (account.emergency_pin_plain === cleanPin);
    }

    if (!isPinMatch) {
      return NextResponse.json({ 
        error: 'Incorrect Emergency PIN. Please enter the valid 4-digit secret PIN.' 
      }, { status: 401 });
    }

    // Increment monthly emergency login count
    const updatedCount = currentUsage + 1;
    const newSessionToken = crypto.randomUUID();
    const deviceSignature = device_id || 'browser-emergency-' + Math.random().toString(36).substring(2, 9);

    await query(`
      UPDATE patient_credentials 
      SET 
        emergency_login_count = $1,
        last_emergency_login_month = $2,
        session_token = $3,
        last_device = $4,
        last_login = CURRENT_TIMESTAMP
      WHERE patient_id = $5
    `, [updatedCount, currentMonth, newSessionToken, deviceSignature, account.patient_id]);

    // Sign JWT (Valid for 10 years / permanent emergency access)
    const token = await new SignJWT({
      patientId: account.patient_id,
      username: account.username,
      name: account.name,
      phone: account.phone,
      sessionToken: newSessionToken,
      role: 'Patient',
      isEmergencyAuth: true
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('3650d')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      message: `Emergency login granted. Used ${updatedCount} of 3 monthly allowances.`,
      quotaUsed: updatedCount,
      quotaRemaining: Math.max(0, 3 - updatedCount),
      patient: {
        id: account.patient_id,
        name: account.name,
        username: account.username,
        phone: account.phone,
        blood_type: account.blood_type,
        session_token: newSessionToken
      }
    }, { status: 200 });

    // Set persistent cookie (secure only over HTTPS)
    const isHttps = req.headers.get('x-forwarded-proto') === 'https';
    response.cookies.set({
      name: 'patient_session',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 3650 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Emergency login error:', error);
    return NextResponse.json({ error: error.message || 'Emergency authentication error' }, { status: 500 });
  }
}
