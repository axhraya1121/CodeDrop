import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { downloadFile } from '@/lib/r2';

export const dynamic = 'force-dynamic';

function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'json': return 'application/json';
    case 'txt': case 'md': case 'js': case 'ts': case 'py': case 'c': case 'cpp': case 'java': case 'css': case 'html':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context?.params);
    let fileId = resolvedParams?.id;

    if (!fileId) {
      const segments = request.nextUrl.pathname.split('/').filter(Boolean);
      const downloadIdx = segments.indexOf('download');
      fileId = downloadIdx > 0 ? segments[downloadIdx - 1] : segments[segments.length - 1];
    }

    fileId = decodeURIComponent(fileId || '').trim();

    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const isInline = request.nextUrl.searchParams.get('inline') === 'true';

    // View-Only Enforcement: Block raw downloads if file is in View-Only mode and not an inline preview request
    if (file.viewOnly && !isInline) {
      return NextResponse.json({ error: 'Downloads are disabled for this file (View-Only Mode).' }, { status: 403 });
    }

    // Expiration Check
    if (file.expiresAt && new Date() > new Date(file.expiresAt)) {
      return NextResponse.json({ error: 'This share link has expired.' }, { status: 410 });
    }

    // Burn After Read Check
    if (file.maxDownloads !== null && file.downloadCount >= file.maxDownloads) {
      return NextResponse.json({ error: 'This share link has self-destructed (Burned after download).' }, { status: 410 });
    }

    const blob = await downloadFile(file.storagePath);
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Increment download count and record access log if it's an actual file download
    if (!isInline) {
      const updated = await prisma.file.update({
        where: { id: fileId },
        data: { downloadCount: { increment: 1 } }
      });

      const isBurned = updated.maxDownloads !== null && updated.downloadCount >= updated.maxDownloads;

      await prisma.linkAccessLog.create({
        data: {
          fileId: file.id,
          accessType: isBurned ? 'BURN' : 'DOWNLOAD',
          ipAddress,
          userAgent,
        }
      });
    }

    const contentType = isInline ? getContentType(file.fileName) : 'application/octet-stream';
    const disposition = isInline ? `inline; filename="${file.fileName}"` : `attachment; filename="${file.fileName}"`;

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error: any) {
    console.error('Public Download API Error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
