import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { deleteFile } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawId = params?.id || request.nextUrl.pathname.split('/').pop() || '';
    const fileId = decodeURIComponent(rawId).trim();

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    // 1. Locate file record to verify ownership and get storage path
    const file = await prisma.file.findFirst({
      where: { 
        id: fileId,
        userId // Enforce ownership check directly in query
      }
    });

    if (file) {
      // 2. Try deleting from storage (Backblaze / S3 / Supabase)
      if (file.storagePath) {
        try {
          await deleteFile(file.storagePath);
        } catch (storageError: any) {
          console.warn('[Delete API] Storage delete warning (continuing with DB purge):', storageError?.message);
        }
      }
    }

    // 3. Delete DB record using deleteMany (prevents P2025 error if record was already removed)
    const result = await prisma.file.deleteMany({
      where: {
        id: fileId,
        userId // Ensures user can only delete their own files
      }
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count,
      message: 'File deleted successfully' 
    });

  } catch (error: any) {
    console.error('[Delete API Error]:', error);
    return NextResponse.json({ 
      error: error?.message || 'Internal server error while deleting file' 
    }, { status: 500 });
  }
}
