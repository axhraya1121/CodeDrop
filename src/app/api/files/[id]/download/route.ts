import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { downloadFile } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileId = params?.id || request.nextUrl.pathname.split('/')[3];

    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (file.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const blob = await downloadFile(file.storagePath);
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.fileName}"`
      }
    });
  } catch (error: any) {
    console.error('Download API Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
