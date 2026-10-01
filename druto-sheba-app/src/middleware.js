import { NextResponse } from 'next/server';

export default function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect Patient Portal Routes
  const patientProtectedRoutes = ['/sos', '/track', '/profile', '/history'];
  const isPatientRoute = patientProtectedRoutes.some(route => pathname.startsWith(route));

  if (isPatientRoute) {
    const sessionCookie = request.cookies.get('patient_session');
    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL('/login?portal=patient', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }
  }

  // Protect Driver Portal Routes
  const driverProtectedRoutes = ['/duty', '/schedule', '/driver-history', '/settings'];
  const isDriverRoute = driverProtectedRoutes.some(route => pathname.startsWith(route));

  if (isDriverRoute) {
    const sessionCookie = request.cookies.get('driver_session');
    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL('/login?portal=driver', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }
  }

  // Protect Dispatcher Portal Routes
  const dispatcherProtectedRoutes = ['/dashboard', '/operations', '/requests', '/fleet', '/shifts', '/trips', '/dispatcher-reviews', '/dispatcher-profile'];
  const isDispatcherRoute = dispatcherProtectedRoutes.some(route => pathname.startsWith(route));

  if (isDispatcherRoute) {
    const sessionCookie = request.cookies.get('dispatcher_session');
    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL('/login?portal=dispatcher', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }
  }

  // Protect Admin Portal Routes
  const adminProtectedRoutes = [
    '/control', '/analytics', '/admin-reviews', '/logs', '/hospitals', 
    '/billing', '/admin-verifications', '/admin-mail', '/maintenance', '/doctors'
  ];
  const isAdminRoute = adminProtectedRoutes.some(route => pathname.startsWith(route));

  if (isAdminRoute) {
    const sessionCookie = request.cookies.get('admin_session');
    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL('/login?portal=admin', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }
  }

  // Prevent login page flash: If already authenticated and navigating to /login, redirect straight to portal
  if (pathname === '/login') {
    const portal = request.nextUrl.searchParams.get('portal');
    const isRegistered = request.nextUrl.searchParams.get('registered');
    const driverCookie = request.cookies.get('driver_session');
    const patientCookie = request.cookies.get('patient_session');

    // Only auto-redirect if not explicitly showing post-registration confirmation
    if (!isRegistered) {
      if (portal === 'admin' && request.cookies.get('admin_session')?.value) {
        return NextResponse.redirect(new URL('/control', request.url));
      }
      if (portal === 'dispatcher' && request.cookies.get('dispatcher_session')?.value) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      if (portal === 'driver' && driverCookie?.value) {
        return NextResponse.redirect(new URL('/duty', request.url));
      }
      if ((!portal || portal === 'patient') && patientCookie?.value) {
        return NextResponse.redirect(new URL('/sos', request.url));
      }
      // If no portal specified but driver cookie exists, redirect to driver duty
      if (!portal && driverCookie?.value && !patientCookie?.value) {
        return NextResponse.redirect(new URL('/duty', request.url));
      }
    }
  }

  const response = NextResponse.next();
  if (isPatientRoute || isDriverRoute || isDispatcherRoute || isAdminRoute || pathname === '/login') {
    // Ensure active pages are never stored in back-forward cache (bfcache)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
