import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key';

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const BUCKET_NAME = 'attachments';

export async function uploadFile(
  fileBytes: Buffer,
  fileName: string,
  contentType: string
): Promise<{ path: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBytes, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { path: null, error: error.message };
    }
    return { path: data.path, error: null };
  } catch (err: any) {
    console.error('Supabase upload exception:', err);
    return { path: null, error: err.message };
  }
}

export async function generateSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error('Exception generating signed URL:', err);
    return null;
  }
}
