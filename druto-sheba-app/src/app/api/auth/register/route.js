import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_development_only');

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, password, role, name, email, phone } = body;

    if (!password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role === 'Admin') {
      return NextResponse.json({ 
        error: 'Registration disabled: Administrators cannot register online. Admins are directly appointed by Company Owners/Board of Trustees.' 
      }, { status: 403 });
    }

    if (!['Dispatcher'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (role === 'Dispatcher') {
      if (!name || !phone || !email) {
        return NextResponse.json({ error: 'Name, phone number, and official email are required for dispatcher registration' }, { status: 400 });
      }

      const effectiveUsername = (username && username.trim()) 
        ? username.trim() 
        : ('disp_' + phone.replace(/\D/g, '').slice(-6));

      // Check existing dispatcher in dispatchers table
      const existing = await query(
        'SELECT dispatcher_id FROM dispatchers WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2) OR phone = $3',
        [effectiveUsername, email.trim(), phone.trim()]
      );

      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'A dispatcher account with this username, email, or phone number already exists' }, { status: 409 });
      }

      // Hash dispatcher password
      const passwordHash = await bcrypt.hash(password, 10);

      const result = await query(
        `INSERT INTO dispatchers (username, password, name, email, phone, role, level, status, verification_status)
         VALUES ($1, $2, $3, $4, $5, 'Dispatcher', 'Junior', 'Active', 'Pending')
         RETURNING dispatcher_id, username, role, name, email, phone, level, status, verification_status`,
        [effectiveUsername, passwordHash, name.trim(), email.trim(), phone.trim()]
      );

      const newDisp = result.rows[0];

      // Sign JWT session cookie so newly registered dispatcher is authenticated
      const token = await new SignJWT({
        userId: newDisp.dispatcher_id,
        username: newDisp.username,
        role: 'Dispatcher'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET);

      const isHttps = req.headers.get('x-forwarded-proto') === 'https';
      const response = NextResponse.json({
        success: true,
        user: {
          dispatcher_id: newDisp.dispatcher_id,
          id: newDisp.dispatcher_id,
          username: newDisp.username,
          name: newDisp.name,
          role: 'Dispatcher',
          verification_status: 'Pending'
        }
      }, { status: 201 });

      response.cookies.set({
        name: 'dispatcher_session',
        value: token,
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        path: '/'
      });

      return response;
    }

    return NextResponse.json({ error: 'Invalid registration request' }, { status: 400 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

