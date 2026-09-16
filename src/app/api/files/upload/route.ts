import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { uploadFile } from '@/lib/r2';
import crypto from 'crypto';

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
