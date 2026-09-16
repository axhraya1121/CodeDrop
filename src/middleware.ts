import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE_NAME = 'codedrop_session';
const JWT_SECRET = process.env.JWT_SECRET || 'codedrop-default-dev-secret-key-change-in-prod';

export async function middleware(request: NextRequest) {
  try {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
    const { pathname } = request.nextUrl;

    const isValidToken = async (token: string) => {
      try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        await jwtVerify(token, secret);
        return true;
      } catch {
        return false;
      }
    };

    const isDashboardRoute = pathname.startsWith('/dashboard');
    const isHomeRoute = pathname === '/';

    if (isDashboardRoute) {
      if (!authCookie) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      const valid = await isValidToken(authCookie.value);
      if (!valid) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    if (isHomeRoute) {
      if (authCookie) {
        const valid = await isValidToken(authCookie.value);
        if (valid) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware execution error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
