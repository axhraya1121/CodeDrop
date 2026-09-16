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

    return NextResponse.json({
      id: file.id,
      fileName: file.fileName,
      size: file.size,
      uploadedAt: file.uploadedAt,
      owner: file.user.username
    });
  } catch (error: any) {
    console.error('Public File Metadata Error:', error);
    return NextResponse.json({ error: 'Failed to load file information' }, { status: 500 });
  }
}
