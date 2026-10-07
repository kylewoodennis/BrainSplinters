import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { presignUploadInputSchema, presignUploadResultSchema } from '@brainsplinters/shared';
import { withErrorHandling, jsonResponse, parseJsonBody } from '../http.js';

let s3Client: S3Client | undefined;
function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({});
  }
  return s3Client;
}

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function getBucketName(): string {
  const bucketName = process.env.UPLOADS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('UPLOADS_BUCKET_NAME environment variable is not set');
  }
  return bucketName;
}

function getPublicBaseUrl(): string {
  const baseUrl = process.env.UPLOADS_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error('UPLOADS_PUBLIC_BASE_URL environment variable is not set');
  }
  return baseUrl;
}

/**
 * Issues a short-lived presigned S3 PUT URL for an authenticated admin to
 * upload an image directly from the browser. The file never passes through
 * this Lambda; once uploaded, it's served back through CloudFront at
 * `publicUrl` (see the `/uploads/*` behavior in the CDK stack).
 */
export const handler = withErrorHandling(async (event) => {
  const input = presignUploadInputSchema.parse(parseJsonBody(event));
  const extension = EXTENSION_BY_CONTENT_TYPE[input.contentType];
  const key = `uploads/${randomUUID()}.${extension}`;

  const uploadUrl = await getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      ContentType: input.contentType,
    }),
    { expiresIn: 300 },
  );

  const result = presignUploadResultSchema.parse({
    uploadUrl,
    publicUrl: `${getPublicBaseUrl()}/${key}`,
  });
  return jsonResponse(200, result);
});
