import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

export async function deleteFile(path: string): Promise<void> {
  const s3 = getS3Client();

  if (!s3) {
    // Fallback to Supabase Storage if no S3/R2 env vars are set
    return deleteSupabase(path);
  }

  const bucket = process.env.S3_BUCKET_NAME || process.env.R2_BUCKET_NAME || process.env.SUPABASE_STORAGE_BUCKET || 'codedrop-files';

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: path,
    })
  );
}
