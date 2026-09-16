import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: { username: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context?.params);
    let username = resolvedParams?.username;

    if (!username) {
      const segments = request.nextUrl.pathname.split('/').filter(Boolean);
      username = segments[segments.length - 1];
    }

    username = decodeURIComponent(username || '').trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { username },
      select: {
        id: true,
        username: true,
        createdAt: true,
        files: {
          orderBy: { uploadedAt: 'desc' },
          select: {
            id: true,
            fileName: true,
            size: true,
            uploadedAt: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    const totalUsedBytes = user.files.reduce((acc, f) => acc + f.size, 0);

    return NextResponse.json({
      username: user.username,
      createdAt: user.createdAt,
      totalFiles: user.files.length,
      totalUsedBytes,
      files: user.files
    });
  } catch (error: any) {
    console.error('Public Vault Metadata Error:', error);
    return NextResponse.json({ error: 'Failed to load vault details' }, { status: 500 });
  }
}
