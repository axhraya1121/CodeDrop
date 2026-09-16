import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { username: username.toLowerCase() }
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = await signToken(user.id);
    const response = NextResponse.json({ success: true, message: 'Logged in successfully' });
    setAuthCookie(response, token);

    return response;
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
