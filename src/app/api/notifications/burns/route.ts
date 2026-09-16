import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const userId = await getAuthFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all files belonging to user that have BURN access logs in the past 24 hours
    const burnLogs = await prisma.linkAccessLog.findMany({
      where: {
        accessType: 'BURN',
        file: { userId },
      },
      include: {
        file: {
          select: { fileName: true },
        },
      },
      orderBy: { accessedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json(
      burnLogs.map((log) => ({
        id: log.id,
        fileId: log.fileId,
        fileName: log.file?.fileName || 'Shared File',
        burnedAt: log.accessedAt,
        ipAddress: log.ipAddress,
      }))
    );
  } catch (error: any) {
    console.error('Burn notifications fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch burn notifications' }, { status: 500 });
  }
}
