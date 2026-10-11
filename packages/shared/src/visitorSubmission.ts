import { z } from 'zod';
import { safeHttpUrlSchema } from './url.js';
import { containerFitSchema } from './common.js';

/** Whether a given personal-info field is collected, and whether it's required, on the public submission form. */
export const visitorFieldConfigSchema = z.object({
  enabled: z.boolean().default(false),
  required: z.boolean().default(false),
});
export type VisitorFieldConfig = z.infer<typeof visitorFieldConfigSchema>;

/**
 * Per-Splinter configuration for the public "visitor submissions" feature.
 * When `enabled`, the public Splinter page shows a form letting anonymous
 * visitors submit a Post for admin review (created with `status: "draft"`
 * and `source: "visitor"`; see `Post.source` in post.ts). Leaving a
 * min/max count at 0 (or unset) means that constraint isn't enforced.
 */
export const visitorSubmissionConfigSchema = z.object({
  enabled: z.boolean().default(false),
  prompt: z.string().trim().max(2000).optional(),
  firstName: visitorFieldConfigSchema.optional(),
  lastName: visitorFieldConfigSchema.optional(),
  email: visitorFieldConfigSchema.optional(),
  phone: visitorFieldConfigSchema.optional(),
  allowAnonymous: z.boolean().optional(),
  minWordCount: z.number().int().min(0).optional(),
  maxWordCount: z.number().int().min(0).optional(),
  minImages: z.number().int().min(0).optional(),
  maxImages: z.number().int().min(0).optional(),
  /** How a visitor-submitted Post's image is displayed on the page when the submission has exactly one image; see `containerFitSchema`. */
  singleImageContainerFit: containerFitSchema.optional(),
});
export type VisitorSubmissionConfig = z.infer<typeof visitorSubmissionConfigSchema>;

/** Counts words by splitting on whitespace; used to enforce min/max word count. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

export const visitorSubmissionImageSchema = z.object({
  url: safeHttpUrlSchema,
  alt: z.string().trim().max(300).optional(),
});
export type VisitorSubmissionImage = z.infer<typeof visitorSubmissionImageSchema>;

/**
 * Payload submitted by an anonymous visitor via the public submission form.
 * `honeypot` must be left empty -- it's a hidden field real visitors never
 * see or fill in, so a non-empty value is a strong signal of an automated
 * submission; the server silently pretends success without writing anything.
 */
export const createVisitorPostInputSchema = z.object({
  content: z.string().trim().min(1).max(20000),
  images: z.array(visitorSubmissionImageSchema).max(20).optional(),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(300).optional(),
  phone: z.string().trim().max(50).optional(),
  anonymous: z.boolean().optional(),
  honeypot: z.string().max(200).optional(),
});
export type CreateVisitorPostInput = z.infer<typeof createVisitorPostInputSchema>;
