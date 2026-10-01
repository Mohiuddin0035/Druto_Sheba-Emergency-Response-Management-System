import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_development_only');

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const portal = searchParams.get('portal');

    let user;
    let userRole;
    let passwordMatch = false;

    if (portal === 'dispatcher') {
      const cleanIdentifier = String(username).trim();
      const result = await query(
        'SELECT * FROM dispatchers WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) OR phone = $1',
        [cleanIdentifier]
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid dispatcher credentials' }, { status: 401 });
      }
      user = result.rows[0];
      userRole = 'Dispatcher';
      // Verify bcrypt hash (primary) or fallback to plaintext check
      if (user.password && user.password.startsWith('$2')) {
        passwordMatch = await bcrypt.compare(password, user.password);
      } else {
        passwordMatch = (password === user.password);
      }
    } else {
      const cleanUsername = String(username).trim();
      const result = await query('SELECT * FROM staff_users WHERE LOWER(username) = LOWER($1)', [cleanUsername]);
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      user = result.rows[0];
      userRole = user.role || user.Role;
      
      if (portal === 'admin' && !userRole.toLowerCase().includes('admin')) {
        return NextResponse.json({ error: 'Unauthorized: Admin role required for this portal' }, { status: 403 });
      }
      passwordMatch = await bcrypt.compare(password, user.password_hash || user.Password_Hash);
    }
    
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.blocked || user.Blocked) {
      return NextResponse.json({ error: 'Your account has been blocked.' }, { status: 403 });
    }

    const resolvedUserId = user.dispatcher_id || user.user_id || user.User_ID;

    // Generate JWT
    const token = await new SignJWT({ 
        userId: resolvedUserId, 
        username: user.username || user.Username, 
        role: userRole 
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    const isAdmin = userRole.toLowerCase().includes('admin');
    const cookieName = isAdmin ? 'admin_session' : 'dispatcher_session';

    const response = NextResponse.json({ 
      success: true, 
      role: userRole, 
      userId: resolvedUserId,
      user: {
        id: resolvedUserId,
        dispatcher_id: user.dispatcher_id || resolvedUserId,
        username: user.username || user.Username,
        name: user.name || user.username || user.Username,
        role: userRole,
        verification_status: user.verification_status || 'Approved'
      }
    }, { status: 200 });
    
    // Set session cookie (no maxAge/expires so it is destroyed when browser closes; secure only over HTTPS)
    const isHttps = req.headers.get('x-forwarded-proto') === 'https';
    response.cookies.set({
      name: cookieName,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
