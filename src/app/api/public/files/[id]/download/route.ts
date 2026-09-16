import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { downloadFile } from '@/lib/r2';

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

    const blob = await downloadFile(file.storagePath);
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const isInline = request.nextUrl.searchParams.get('inline') === 'true';
    const disposition = isInline ? `inline; filename="${file.fileName}"` : `attachment; filename="${file.fileName}"`;

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': disposition,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error: any) {
    console.error('Public Download API Error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
