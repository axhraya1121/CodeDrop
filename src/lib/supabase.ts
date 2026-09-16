import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
  return createClient(supabaseUrl, supabaseKey);
}

export async function uploadFile(path: string, file: Buffer, contentType: string): Promise<void> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'user-files';
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

export async function downloadFile(path: string): Promise<Blob> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'user-files';
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('File not found');
  }

  return data;
}

export async function deleteFile(path: string): Promise<void> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'user-files';
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

