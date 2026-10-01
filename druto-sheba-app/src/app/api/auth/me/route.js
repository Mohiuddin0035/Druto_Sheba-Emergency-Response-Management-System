import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_development_only');

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const portal = searchParams.get('portal');

    const adminCookie = req.cookies.get('admin_session');
    const dispatcherCookie = req.cookies.get('dispatcher_session');
    
    let sessionCookie;
    if (portal === 'dispatcher') {
      sessionCookie = dispatcherCookie || adminCookie;
    } else if (portal === 'admin') {
      sessionCookie = adminCookie || dispatcherCookie;
    } else {
      sessionCookie = adminCookie || dispatcherCookie;
    }

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);

    let verificationStatus = 'Approved';
    let dispatcherName = null;
    let dispatcherLevel = null;

    if (payload.role === 'Dispatcher' && payload.userId) {
      try {
        const dRes = await query('SELECT name, username, level, verification_status FROM dispatchers WHERE dispatcher_id = $1', [payload.userId]);
        if (dRes.rows.length > 0) {
          const row = dRes.rows[0];
          verificationStatus = row.verification_status || 'Approved';
          dispatcherName = row.name || row.username;
          dispatcherLevel = row.level;
        }
      } catch (e) {
        console.warn('Error fetching dispatcher live status:', e);
      }
    }

    return NextResponse.json({ 
      role: payload.role, 
      username: payload.username, 
      name: dispatcherName || payload.username,
      level: dispatcherLevel,
      userId: payload.userId,
      verification_status: verificationStatus 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}

