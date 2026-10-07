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

/**
 * Per-image overrides for how an image is displayed in the shadowbox
 * (lightbox) overlay. Any field left unset falls back to the default
 * behavior (which itself depends on the image's aspect ratio and the
 * Splinter's type). Useful for cases the default heuristics get wrong,
 * e.g. a tall mobile screenshot that should be shown shrunk-to-fit instead
 * of filling the width and scrolling.
 */
export const lightboxAlignSchema = z.enum(['top', 'center']);
export type LightboxAlign = z.infer<typeof lightboxAlignSchema>;

export const lightboxSizeSchema = z.enum(['fill', 'fit']);
export type LightboxSize = z.infer<typeof lightboxSizeSchema>;

export const lightboxOverflowSchema = z.enum(['scroll', 'hidden']);
export type LightboxOverflow = z.infer<typeof lightboxOverflowSchema>;

export const lightboxFitSchema = z.object({
  align: lightboxAlignSchema.optional(),
  size: lightboxSizeSchema.optional(),
  overflow: lightboxOverflowSchema.optional(),
});
export type LightboxFit = z.infer<typeof lightboxFitSchema>;

/**
 * Per-image overrides for how an image is displayed in its static on-page
 * container (e.g. a Splinter's header image box), as opposed to the
 * shadowbox overlay. `size: 'fit'` letterboxes the image (shrunk to fit
 * entirely within the container, with the rest of the box filled in black);
 * `size: 'fill'` crops the image to fill the container. `align` controls
 * where the image is anchored within the box.
 */
export const containerFitSchema = z.object({
  align: lightboxAlignSchema.optional(),
  size: lightboxSizeSchema.optional(),
});
export type ContainerFit = z.infer<typeof containerFitSchema>;

