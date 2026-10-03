import { z } from 'zod';

/** Lowercase kebab-case slug, e.g. "anonymous-age-verification". */
export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case (a-z, 0-9, -)');

export const tagsSchema = z.array(z.string().trim().min(1).max(50)).max(50).default([]);

export const contentStatusSchema = z.enum(['draft', 'published']);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

export const isoDateTimeSchema = z.string().datetime({ offset: true });
