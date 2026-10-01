import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { query, transaction } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'emergency_response_secret_jwt_key_2026');

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, phone, blood_type, username, password, emergency_pin, address, allergies, condition_name, device_id, biometric_credential_id } = body;

    if (!name || !phone || !password) {
      return NextResponse.json({ error: 'Name, phone, and password are required.' }, { status: 400 });
    }

    // Check if biometric credential is already linked to another account
    const cleanBioId = biometric_credential_id ? String(biometric_credential_id).trim() : null;
    if (cleanBioId) {
      const bioExists = await query('SELECT auth_id FROM patient_credentials WHERE biometric_credential_id = $1', [cleanBioId]);
      if (bioExists.rows.length > 0) {
        return NextResponse.json({ 
          error: 'This fingerprint is already registered with another account. One fingerprint can only be linked to one patient account.' 
        }, { status: 409 });
      }
    }

    // Enforce strong password: >=8 chars, uppercase, lowercase, number, special char
    const passwordStr = String(password);
    if (passwordStr.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }
    const hasUpper = /[A-Z]/.test(passwordStr);
    const hasLower = /[a-z]/.test(passwordStr);
    const hasNumber = /[0-9]/.test(passwordStr);
    const hasSpecial = /[^A-Za-z0-9]/.test(passwordStr);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return NextResponse.json({ 
        error: 'Password must contain uppercase letters, lowercase letters, a number, and a special character (e.g. Pass@123).' 
      }, { status: 400 });
    }

    // Default or user-defined 4-digit/char secret emergency PIN
    let safeEmergencyPin = emergency_pin ? String(emergency_pin).trim() : '';
    if (!safeEmergencyPin) {
      // Auto-generate 4-digit PIN if omitted
      const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
      for (let i = 0; i < 4; i++) safeEmergencyPin += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (safeEmergencyPin.length !== 4) {
      return NextResponse.json({ error: 'Emergency Secret PIN must be exactly 4 digits / characters.' }, { status: 400 });
    }

    const cleanPhone = String(phone).trim();
    const desiredUsername = (username || (name.trim().split(' ')[0] + Math.floor(1000 + Math.random() * 9000))).toLowerCase().trim();

    // Check if phone or username exists
    const existingPhone = await query('SELECT patient_id FROM patients WHERE phone = $1', [cleanPhone]);
    if (existingPhone.rows.length > 0) {
      return NextResponse.json({ error: 'A patient with this phone number is already registered.' }, { status: 409 });
    }

    const existingUser = await query('SELECT auth_id FROM patient_credentials WHERE LOWER(username) = $1', [desiredUsername]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'Username is already taken. Please choose another.' }, { status: 409 });
    }

    // Hash password and emergency PIN
    const passwordHash = await bcrypt.hash(password, 10);
    const emergencyPinHash = await bcrypt.hash(safeEmergencyPin, 10);

    const newSessionToken = crypto.randomUUID();
    const deviceSignature = device_id || 'browser-' + Math.random().toString(36).substring(2, 9);

    const newPatient = await transaction(async (client) => {
      // 1. Insert patient
      const pRes = await client.query(`
        INSERT INTO patients (name, phone, blood_type, address, allergies)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [name.trim(), cleanPhone, blood_type || 'O+', address || null, allergies || null]);

      const patient = pRes.rows[0];

      // 2. Insert credentials with hashed password & PIN
      await client.query(`
        INSERT INTO patient_credentials (
          patient_id, 
          username, 
          password_plain, 
          password_hash, 
          emergency_pin_plain, 
          emergency_pin_hash, 
          emergency_login_count, 
          session_token, 
          last_device,
          biometric_credential_id
        )
        VALUES ($1, $2, '', $3, '', $4, 0, $5, $6, $7)
      `, [patient.patient_id, desiredUsername, passwordHash, emergencyPinHash, newSessionToken, deviceSignature, cleanBioId]);

      // 3. Insert condition if provided
      if (condition_name) {
        await client.query(`
          INSERT INTO patient_conditions (patient_id, condition_name)
          VALUES ($1, $2)
        `, [patient.patient_id, condition_name]);
      }

      return patient;
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please sign in with your credentials.',
      patient: {
        id: newPatient.patient_id,
        name: newPatient.name,
        username: desiredUsername,
        phone: newPatient.phone,
        blood_type: newPatient.blood_type
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Patient registration error:', error);
    return NextResponse.json({ error: error.message || 'Registration error' }, { status: 500 });
  }
}
