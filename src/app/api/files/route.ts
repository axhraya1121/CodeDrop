import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const files = await prisma.file.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        size: true,
        uploadedAt: true
      }
    });

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
