import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { deleteFile } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fileIds, deleteAll } = body;

    let targetFiles: { id: string; storagePath: string }[] = [];

    if (deleteAll) {
      targetFiles = await prisma.file.findMany({
        where: { userId },
        select: { id: true, storagePath: true }
      });
    } else if (Array.isArray(fileIds) && fileIds.length > 0) {
      targetFiles = await prisma.file.findMany({
        where: { id: { in: fileIds }, userId },
        select: { id: true, storagePath: true }
      });
    } else {
      return NextResponse.json({ error: 'No files specified for deletion' }, { status: 400 });
    }

    if (targetFiles.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0 });
    }

    // 1. Purge all storage objects from Backblaze / S3
    for (const file of targetFiles) {
      if (file.storagePath) {
        try {
          await deleteFile(file.storagePath);
        } catch (storageError: any) {
          console.warn('[Bulk Delete Storage Notice]:', storageError?.message);
        }
      }
    }

    // 2. Batch delete all DB records
    const idsToDelete = targetFiles.map(f => f.id);
    const result = await prisma.file.deleteMany({
      where: {
        id: { in: idsToDelete },
        userId
      }
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `${result.count} files deleted successfully`
    });

  } catch (error: any) {
    console.error('Bulk Delete API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to execute bulk deletion' }, { status: 500 });
  }
}
