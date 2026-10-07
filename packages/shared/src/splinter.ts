import { z } from 'zod';
import {
  slugSchema,
  tagsSchema,
  contentStatusSchema,
  isoDateTimeSchema,
  lightboxFitSchema,
  containerFitSchema,
} from './common.js';
import { optionalSafeHttpUrlSchema } from './url.js';

export const splinterTypeSchema = z.enum([
  'idea',
  'project',
  'portfolio',
  'recipe',
  'writing',
  'other',
]);
export type SplinterType = z.infer<typeof splinterTypeSchema>;

export const splinterSchema = z.object({
  id: z.string().min(1),
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20000).optional(),
  coverImageUrl: optionalSafeHttpUrlSchema,
  coverImageAlt: z.string().trim().max(300).optional(),
  coverImageFit: lightboxFitSchema.optional(),
  coverImageContainerFit: containerFitSchema.optional(),
  callout: z.string().trim().max(2000).optional(),
  tags: tagsSchema,
  type: splinterTypeSchema.optional(),
  status: contentStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  createdBy: z.string().min(1),
});
export type Splinter = z.infer<typeof splinterSchema>;

/** Fields an admin provides when creating a Splinter; server fills in the rest. */
export const createSplinterInputSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20000).optional(),
  coverImageUrl: optionalSafeHttpUrlSchema,
  coverImageAlt: z.string().trim().max(300).optional(),
  coverImageFit: lightboxFitSchema.optional(),
  coverImageContainerFit: containerFitSchema.optional(),
  callout: z.string().trim().max(2000).optional(),
  tags: tagsSchema.optional(),
  type: splinterTypeSchema.optional(),
  status: contentStatusSchema.optional().default('draft'),
});
export type CreateSplinterInput = z.infer<typeof createSplinterInputSchema>;

/** Fields an admin may change when editing a Splinter. All optional (partial update). */
export const updateSplinterInputSchema = z.object({
  slug: slugSchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(20000).optional(),
  coverImageUrl: optionalSafeHttpUrlSchema,
  coverImageAlt: z.string().trim().max(300).optional(),
  coverImageFit: lightboxFitSchema.optional(),
  coverImageContainerFit: containerFitSchema.optional(),
  callout: z.string().trim().max(2000).optional(),
  tags: tagsSchema.optional(),
  type: splinterTypeSchema.optional(),
  status: contentStatusSchema.optional(),
});
export type UpdateSplinterInput = z.infer<typeof updateSplinterInputSchema>;
