import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/auth';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public paths that don't require authentication
  const isPublicPath = path === '/login' || path.startsWith('/api/auth/login');

  // Protected paths
  const isProtectedPath = path.startsWith('/dashboard') || 
                          (path.startsWith('/api') && !path.startsWith('/api/auth/login'));

  // Get session token from cookies
  const token = request.cookies.get('session')?.value;

  // If trying to access protected path without session, redirect to login
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify session token
  if (token && isProtectedPath) {
    const session = await verifySession(token);
    if (!session) {
      // Invalid session, clear cookie and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }
  }

  // If logged in and trying to access login page, redirect to dashboard
  if (token && path === '/login') {
    const session = await verifySession(token);
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

