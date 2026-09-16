import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getAuthFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const file = await prisma.file.findUnique({
      where: { id: params.id },
      include: {
        accessLogs: {
          orderBy: { accessedAt: 'desc' },
          take: 30,
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (file.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      id: file.id,
      fileName: file.fileName,
      viewCount: file.viewCount,
      downloadCount: file.downloadCount,
      maxDownloads: file.maxDownloads,
      expiresAt: file.expiresAt,
      viewOnly: file.viewOnly,
      accessLogs: file.accessLogs,
    });
  } catch (error: any) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch file analytics' }, { status: 500 });
  }
}
