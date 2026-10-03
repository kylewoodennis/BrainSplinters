import { z } from 'zod';

/**
 * Validates that a string is a safe, absolute URL using only http/https.
 * Used for image URLs and other user-supplied links so we never store
 * `javascript:` URLs or other unsafe schemes.
 */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const safeHttpUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isSafeHttpUrl, { message: 'Must be an absolute http(s) URL' });

export const optionalSafeHttpUrlSchema = z
  .union([safeHttpUrlSchema, z.literal('')])
  .optional()
  .transform((value) => (value === '' ? undefined : value));
