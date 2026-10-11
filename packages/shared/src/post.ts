import { z } from 'zod';
import {
  slugSchema,
  tagsSchema,
  contentStatusSchema,
  isoDateTimeSchema,
  lightboxFitSchema,
  containerFitSchema,
} from './common.js';
import { safeHttpUrlSchema, optionalSafeHttpUrlSchema } from './url.js';
import { tiptapDocumentSchema, emptyTipTapDocument } from './tiptap.js';

export const postImageSchema = z.object({
  url: safeHttpUrlSchema,
  alt: z.string().trim().max(300).optional(),
  fit: lightboxFitSchema.optional(),
  /** How this image is displayed in its static on-page container when it's the Post's sole image (see `containerFitSchema`). */
  containerFit: containerFitSchema.optional(),
});
export type PostImage = z.infer<typeof postImageSchema>;

/** Whether a Post was authored directly by the admin, or submitted by a public visitor for review. */
export const postSourceSchema = z.enum(['admin', 'visitor']);
export type PostSource = z.infer<typeof postSourceSchema>;

/** Contact info collected from a visitor submission. All fields optional based on the Splinter's `visitorSubmissions` config. */
export const postSubmitterSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(300).optional(),
  phone: z.string().trim().max(50).optional(),
  anonymous: z.boolean().optional(),
});
export type PostSubmitter = z.infer<typeof postSubmitterSchema>;

export const postSchema = z.object({
  id: z.string().min(1),
  splinterId: z.string().min(1),
  slug: slugSchema,
  title: z.string().trim().min(1).max(200).optional(),
  content: tiptapDocumentSchema,
  imageUrl: optionalSafeHttpUrlSchema,
  imageAlt: z.string().trim().max(300).optional(),
  images: z.array(postImageSchema).max(20).optional(),
  tags: tagsSchema,
  status: contentStatusSchema,
  source: postSourceSchema.optional().default('admin'),
  submitter: postSubmitterSchema.optional(),
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
  imageAlt: z.string().trim().max(300).optional(),
  images: z.array(postImageSchema).max(20).optional(),
  tags: tagsSchema.optional(),
  status: contentStatusSchema.optional().default('draft'),
});
export type CreatePostInput = z.infer<typeof createPostInputSchema>;

export const updatePostInputSchema = z.object({
  slug: slugSchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  content: tiptapDocumentSchema.optional(),
  imageUrl: optionalSafeHttpUrlSchema,
  imageAlt: z.string().trim().max(300).optional(),
  images: z.array(postImageSchema).max(20).optional(),
  tags: tagsSchema.optional(),
  status: contentStatusSchema.optional(),
});
export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;

