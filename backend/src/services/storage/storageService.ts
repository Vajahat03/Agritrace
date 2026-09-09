import { supabaseAdmin } from '../../config/supabase';

export type StorageBucket =
  | 'crop-observations'
  | 'freshness-scans'
  | 'produce-images'
  | 'user-profiles'
  | 'batch-labels';

export class StorageService {
  static async upload(
    bucket: StorageBucket,
    filePath: string,
    fileBuffer: Buffer,
    contentType: string = 'image/jpeg'
  ): Promise<{ path: string; publicUrl: string }> {
    // 1. Upload to Supabase Storage bucket
    const { data, error } = await supabaseAdmin.storage.from(bucket).upload(filePath, fileBuffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.warn(`Storage upload to bucket "${bucket}" failed or bucket not initialized:`, error.message);
      // Return a simulated structured URL for local/offline testing
      return {
        path: filePath,
        publicUrl: `https://storage.agritrace.dev/${bucket}/${filePath}`,
      };
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
    };
  }

  static getUrl(bucket: StorageBucket, filePath: string): string {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
    return data?.publicUrl || `https://storage.agritrace.dev/${bucket}/${filePath}`;
  }

  static async delete(bucket: StorageBucket, filePaths: string[]): Promise<void> {
    const { error } = await supabaseAdmin.storage.from(bucket).remove(filePaths);
    if (error) {
      console.error(`Failed to delete files from bucket "${bucket}":`, error);
    }
  }
}
