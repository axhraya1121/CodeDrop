import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { downloadFile, uploadFile } from '@/lib/r2';

export const dynamic = 'force-dynamic';

const MAX_USER_QUOTA = 100 * 1024 * 1024; // 100 MB Limit

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const userId = await getAuthFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'You must be logged in to save files to your vault.' }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(context?.params);
    let fileId = resolvedParams?.id;

    if (!fileId) {
      const segments = request.nextUrl.pathname.split('/').filter(Boolean);
      fileId = segments[segments.length - 2];
    }

    fileId = decodeURIComponent(fileId || '').trim();

    const sourceFile = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!sourceFile) {
      return NextResponse.json({ error: 'Source file not found' }, { status: 404 });
    }

    // Expiration & Burn Checks
    if (sourceFile.expiresAt && new Date() > new Date(sourceFile.expiresAt)) {
      return NextResponse.json({ error: 'This share link has expired.' }, { status: 410 });
    }
    if (sourceFile.maxDownloads !== null && sourceFile.downloadCount >= sourceFile.maxDownloads) {
      return NextResponse.json({ error: 'This share link has self-destructed.' }, { status: 410 });
    }

    // Storage Quota Enforcement
    const userFiles = await prisma.file.findMany({
      where: { userId },
      select: { size: true }
    });

    const currentUsedBytes = userFiles.reduce((acc, f) => acc + (f.size || 0), 0);

    if (currentUsedBytes + sourceFile.size > MAX_USER_QUOTA) {
      const remainingMB = Math.max(0, (MAX_USER_QUOTA - currentUsedBytes) / (1024 * 1024)).toFixed(1);
      return NextResponse.json({
        error: `Storage quota exceeded. This file is ${(sourceFile.size / (1024 * 1024)).toFixed(1)} MB, but you only have ${remainingMB} MB remaining of your 100 MB limit.`
      }, { status: 400 });
    }

    // Download source binary from B2/S3
    const blob = await downloadFile(sourceFile.storagePath);
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create target storage path
    const newFileId = crypto.randomUUID();
    const newStoragePath = `${userId}/${newFileId}-${sourceFile.fileName}`;

    // Upload copy to B2/S3
    await uploadFile(newStoragePath, buffer, 'application/octet-stream');

    // Create target DB record
    const importedFile = await prisma.file.create({
      data: {
        id: newFileId,
        userId,
        fileName: sourceFile.fileName,
        storagePath: newStoragePath,
        size: sourceFile.size,
      },
    });

    return NextResponse.json({
      success: true,
      message: `'${sourceFile.fileName}' saved to your vault!`,
      file: importedFile,
    });
  } catch (error: any) {
    console.error('Import File Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to import file to vault' }, { status: 500 });
  }
}
