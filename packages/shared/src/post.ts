import { z } from 'zod';
import { slugSchema, tagsSchema, contentStatusSchema, isoDateTimeSchema } from './common.js';
import { optionalSafeHttpUrlSchema } from './url.js';
import { tiptapDocumentSchema, emptyTipTapDocument } from './tiptap.js';

export const postSchema = z.object({
  id: z.string().min(1),
  splinterId: z.string().min(1),
  slug: slugSchema,
  title: z.string().trim().min(1).max(200).optional(),
  content: tiptapDocumentSchema,
  imageUrl: optionalSafeHttpUrlSchema,
  tags: tagsSchema,
  status: contentStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  createdBy: z.string().min(1),
});
export type Post = z.infer<typeof postSchema>;

export const createPostInputSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(200).optional(),
  content: tiptapDocumentSchema.optional().default(emptyTipTapDocument),
  imageUrl: optionalSafeHttpUrlSchema,
  tags: tagsSchema.optional(),
  status: contentStatusSchema.optional().default('draft'),
});
export type CreatePostInput = z.infer<typeof createPostInputSchema>;

export const updatePostInputSchema = z.object({
  slug: slugSchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  content: tiptapDocumentSchema.optional(),
  imageUrl: optionalSafeHttpUrlSchema,
  tags: tagsSchema.optional(),
  status: contentStatusSchema.optional(),
});
export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;
