import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rawIds = request.nextUrl.searchParams.get('ids') || '';
    const ids = rawIds.split(',').map(id => id.trim()).filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No file IDs provided' }, { status: 400 });
    }

    const files = await prisma.file.findMany({
      where: {
        id: { in: ids }
      },
      select: {
        id: true,
        fileName: true,
        size: true,
        uploadedAt: true,
        user: {
          select: { username: true }
        }
      }
    });

    const formattedFiles = files.map(f => ({
      id: f.id,
      fileName: f.fileName,
      size: f.size,
      uploadedAt: f.uploadedAt,
      owner: f.user.username
    }));

    return NextResponse.json({
      files: formattedFiles
    });
  } catch (error: any) {
    console.error('Batch Public Files Error:', error);
    return NextResponse.json({ error: 'Failed to fetch shared files' }, { status: 500 });
  }
}
