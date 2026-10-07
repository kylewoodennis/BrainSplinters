import { useState } from 'react';
import type { UploadContentType } from '@brainsplinters/shared';
import { api, ApiError } from './api.js';

const ALLOWED_CONTENT_TYPES: UploadContentType[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

function isUploadContentType(value: string): value is UploadContentType {
  return (ALLOWED_CONTENT_TYPES as string[]).includes(value);
}

/**
 * Uploads a file straight from the browser to S3 via a presigned URL (the
 * file never passes through our API), returning the resulting public
 * CloudFront URL.
 */
export function useImageUpload(token: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<string | null> {
    if (!isUploadContentType(file.type)) {
      setError('Please choose a PNG, JPEG, WebP, or GIF image.');
      return null;
    }

    setError(null);
    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await api.presignUpload({ contentType: file.type }, token);
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error('Upload failed. Please try again.');
      }
      return publicUrl;
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Upload failed.');
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error, setError };
}
