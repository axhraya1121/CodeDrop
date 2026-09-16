import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { uploadFile } from '@/lib/r2';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const MAX_USER_STORAGE_BYTES = 100 * 1024 * 1024; // 100 MB limit

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as globalThis.File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Calculate user's current total storage usage
    const existingFiles = await prisma.file.findMany({
      where: { userId },
      select: { size: true }
    });

    const currentUsedBytes = existingFiles.reduce((sum, f) => sum + f.size, 0);

    if (currentUsedBytes + file.size > MAX_USER_STORAGE_BYTES) {
      const remainingBytes = Math.max(0, MAX_USER_STORAGE_BYTES - currentUsedBytes);
      const remainingMB = (remainingBytes / (1024 * 1024)).toFixed(1);
      return NextResponse.json({ 
        error: `Storage limit exceeded (100 MB quota). You have ${remainingMB} MB remaining.` 
      }, { status: 400 });
    }

    const fileId = crypto.randomUUID();
    const storagePath = `${userId}/${fileId}-${file.name}`;
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(storagePath, buffer, file.type || 'application/octet-stream');

    const newFile = await prisma.file.create({
      data: {
        id: fileId,
        userId,
        fileName: file.name,
        storagePath,
        size: file.size
      }
    });

    return NextResponse.json({
      id: newFile.id,
      fileName: newFile.fileName,
      size: newFile.size,
      uploadedAt: newFile.uploadedAt
    });
  } catch (error: any) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
