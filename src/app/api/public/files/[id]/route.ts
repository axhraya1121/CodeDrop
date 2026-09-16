import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context?.params);
    let fileId = resolvedParams?.id;

    if (!fileId) {
      const segments = request.nextUrl.pathname.split('/').filter(Boolean);
      fileId = segments[segments.length - 1];
    }

    fileId = decodeURIComponent(fileId || '').trim();

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        user: {
          select: { username: true }
        }
      }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Expiration Check
    if (file.expiresAt && new Date() > new Date(file.expiresAt)) {
      return NextResponse.json({ error: 'This share link has expired.' }, { status: 410 });
    }

    // Burn After Read Check
    if (file.maxDownloads !== null && file.downloadCount >= file.maxDownloads) {
      return NextResponse.json({ error: 'This share link has self-destructed (Burned after download).' }, { status: 410 });
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Increment viewCount and record access log asynchronously
    await prisma.$transaction([
      prisma.file.update({
        where: { id: fileId },
        data: { viewCount: { increment: 1 } }
      }),
      prisma.linkAccessLog.create({
        data: {
          fileId: file.id,
          accessType: 'VIEW',
          ipAddress,
          userAgent,
        }
      })
    ]);

    return NextResponse.json({
      id: file.id,
      fileName: file.fileName,
      size: file.size,
      uploadedAt: file.uploadedAt,
      owner: file.user.username,
      expiresAt: file.expiresAt,
      maxDownloads: file.maxDownloads,
      downloadCount: file.downloadCount,
      viewOnly: file.viewOnly,
      viewCount: file.viewCount + 1,
    });
  } catch (error: any) {
    console.error('Public File Metadata Error:', error);
    return NextResponse.json({ error: 'Failed to load file information' }, { status: 500 });
  }
}
