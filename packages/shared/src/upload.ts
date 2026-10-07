import { z } from 'zod';

/** Image types the upload pipeline accepts; kept small and simple for a personal site. */
export const uploadContentTypeSchema = z.enum([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
export type UploadContentType = z.infer<typeof uploadContentTypeSchema>;

export const presignUploadInputSchema = z.object({
  contentType: uploadContentTypeSchema,
});
export type PresignUploadInput = z.infer<typeof presignUploadInputSchema>;

export const presignUploadResultSchema = z.object({
  /** Short-lived S3 presigned URL the client PUTs the file bytes to directly. */
  uploadUrl: z.string().url(),
  /** Permanent CloudFront URL to store and render once the upload completes. */
  publicUrl: z.string().url(),
});
export type PresignUploadResult = z.infer<typeof presignUploadResultSchema>;
