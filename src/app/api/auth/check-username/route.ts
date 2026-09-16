import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const u = searchParams.get('u');

  if (!u || u.trim() === '') {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { username: u.toLowerCase() }
    });

    if (user) {
      return NextResponse.json({ available: false });
    }
    return NextResponse.json({ available: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
