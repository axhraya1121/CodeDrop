import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  ListObjectVersionsCommand,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3';
import { uploadFile as uploadSupabase, downloadFile as downloadSupabase, deleteFile as deleteSupabase } from './supabase';

export function getS3Client(): S3Client | null {
  const endpoint = process.env.S3_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null);
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: 'us-east-1', // Standard default for S3-compatible services
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function uploadFile(path: string, file: Buffer, contentType: string): Promise<void> {
  const s3 = getS3Client();
  
  if (!s3) {
    // Fallback to Supabase Storage if no S3/R2 env vars are set
    return uploadSupabase(path, file, contentType);
  }

  const bucket = process.env.S3_BUCKET_NAME || process.env.R2_BUCKET_NAME || process.env.SUPABASE_STORAGE_BUCKET || 'codedrop-files';
  
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: file,
      ContentType: contentType,
    })
  );
}

export async function downloadFile(path: string): Promise<Blob> {
  const s3 = getS3Client();

  if (!s3) {
    // Fallback to Supabase Storage if no S3/R2 env vars are set
    return downloadSupabase(path);
  }

  const bucket = process.env.S3_BUCKET_NAME || process.env.R2_BUCKET_NAME || process.env.SUPABASE_STORAGE_BUCKET || 'codedrop-files';

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: path,
    })
  );

  if (!response.Body) {
    throw new Error('File content empty or not found');
  }

  const bytes = await response.Body.transformToByteArray();
  return new Blob([Buffer.from(bytes)]);
}

/**
 * Permanently deletes a file and ALL of its object versions & delete markers
 * from Backblaze B2 / S3 storage so it never leaves hidden 0-byte markers or (2) version copies.
 */
export async function deleteFile(path: string): Promise<void> {
  const s3 = getS3Client();

  if (!s3) {
    // Fallback to Supabase Storage if no S3/R2 env vars are set
    return deleteSupabase(path);
  }

  const bucket = process.env.S3_BUCKET_NAME || process.env.R2_BUCKET_NAME || process.env.SUPABASE_STORAGE_BUCKET || 'codedrop-files';

  try {
    // 1. List all versions and delete markers for this specific object key in Backblaze B2
    const versionsResponse = await s3.send(
      new ListObjectVersionsCommand({
        Bucket: bucket,
        Prefix: path,
      })
    );

    const objectsToDelete: { Key: string; VersionId?: string }[] = [];

    // Collect all matching file versions
    if (versionsResponse.Versions) {
      for (const v of versionsResponse.Versions) {
        if (v.Key === path && v.VersionId) {
          objectsToDelete.push({ Key: v.Key, VersionId: v.VersionId });
        }
      }
    }

    // Collect all matching delete markers
    if (versionsResponse.DeleteMarkers) {
      for (const dm of versionsResponse.DeleteMarkers) {
        if (dm.Key === path && dm.VersionId) {
          objectsToDelete.push({ Key: dm.Key, VersionId: dm.VersionId });
        }
      }
    }

    // 2. Permanently delete all collected versions and markers at once
    if (objectsToDelete.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objectsToDelete,
            Quiet: true,
          },
        })
      );
      return;
    }
  } catch (versionError: any) {
    console.warn('[Storage Delete] Version listing notice (falling back to standard delete):', versionError?.message);
  }

  // Fallback: Standard DeleteObjectCommand
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: path,
    })
  );
}
