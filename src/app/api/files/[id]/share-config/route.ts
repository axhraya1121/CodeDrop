import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const userId = await getAuthFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(context?.params);
    let fileId = resolvedParams?.id;

    if (!fileId) {
      const segments = request.nextUrl.pathname.split('/').filter(Boolean);
      fileId = segments[segments.length - 2];
    }

    fileId = decodeURIComponent(fileId || '').trim();

    const body = await request.json();
    const { expiryOption, viewOnly } = body; // 'never' | '1_download' | '1_hour' | '24_hours' | '7_days', viewOnly: boolean

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    let expiresAt: Date | null = null;
    let maxDownloads: number | null = null;

    const now = new Date();

    if (expiryOption === '1_download') {
      maxDownloads = 1;
    } else if (expiryOption === '1_hour') {
      expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (expiryOption === '24_hours') {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (expiryOption === '7_days') {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    await prisma.file.update({
      where: { id: fileId },
      data: {
        expiresAt,
        maxDownloads,
        downloadCount: 0,
        viewOnly: Boolean(viewOnly),
      }
    });

    return NextResponse.json({
      success: true,
      expiresAt,
      maxDownloads,
      viewOnly: Boolean(viewOnly),
    });

  } catch (error: any) {
    console.error('Share Config Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update share configuration' }, { status: 500 });
  }
}
