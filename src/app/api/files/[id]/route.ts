import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { deleteFile } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const userId = await getAuthFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
    }

    // Safely resolve params (supports both direct object and Promise in Next.js 14/15)
    const resolvedParams = await Promise.resolve(context?.params);
    let fileId = resolvedParams?.id;

    if (!fileId) {
      const segments = request.nextUrl.pathname.split('/').filter(Boolean);
      fileId = segments[segments.length - 1];
    }

    fileId = decodeURIComponent(fileId || '').trim();

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    // 1. Locate file record to verify ownership and retrieve storage path
    const file = await prisma.file.findFirst({
      where: { 
        id: fileId,
        userId
      }
    });

    if (file) {
      // 2. Delete file object from Backblaze / S3 / Supabase storage
      if (file.storagePath) {
        try {
          await deleteFile(file.storagePath);
        } catch (storageError: any) {
          console.warn('[Delete API] Storage purge notice:', storageError?.message);
        }
      }
    }

    // 3. Delete DB record using deleteMany (safe against missing records / double delete)
    const result = await prisma.file.deleteMany({
      where: {
        id: fileId,
        userId
      }
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count,
      message: 'File deleted successfully' 
    });

  } catch (error: any) {
    console.error('[Delete API Critical Error]:', error);
    return NextResponse.json({ 
      error: error?.message || 'Failed to delete file' 
    }, { status: 500 });
  }
}
