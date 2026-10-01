import { NextResponse } from 'next/server';

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const portal = searchParams.get('portal');
  
  const response = NextResponse.json({ success: true }, { status: 200 });
  
  if (portal === 'admin') {
    response.cookies.set({
      name: 'admin_session',
      value: '',
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });
  } else if (portal === 'dispatcher') {
    response.cookies.set({
      name: 'dispatcher_session',
      value: '',
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });
  } else {
    // Clear both
    response.cookies.set({
      name: 'admin_session',
      value: '',
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });
    response.cookies.set({
      name: 'dispatcher_session',
      value: '',
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });
  }

  return response;
}
