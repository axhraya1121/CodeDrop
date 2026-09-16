import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ error: 'Username must be 3-20 characters long and contain only lowercase letters, numbers, and underscores.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const lowerCaseUsername = username.toLowerCase();
    const passwordHash = await hashPassword(password);

    try {
      const user = await prisma.user.create({
        data: {
          username: lowerCaseUsername,
          passwordHash
        }
      });

      const token = await signToken(user.id);
      const response = NextResponse.json({ success: true, message: 'User created successfully' });
      setAuthCookie(response, token);
      
      return response;
    } catch (dbError: any) {
      if (dbError.code === 'P2002') {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error('Signup Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
