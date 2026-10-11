import { z } from 'zod';

/**
 * TipTap stores rich text as a JSON document tree (ProseMirror JSON).
 * We validate the shape loosely: every node has a `type`, and may have
 * `attrs`, nested `content`, `text`, and `marks`. We do not attempt to
 * enumerate every possible node/mark type here -- the editor's own
 * extension set is the source of truth for what is actually produced.
 * This schema's job is just to guard against malformed/unsafe payloads.
 */
export type TipTapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type TipTapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: TipTapMark[];
};

export type TipTapDocument = TipTapNode & { type: 'doc' };

const markSchema: z.ZodType<TipTapMark> = z.object({
  type: z.string().min(1),
  attrs: z.record(z.unknown()).optional(),
});

const nodeSchema: z.ZodType<TipTapNode> = z.lazy(() =>
  z.object({
    type: z.string().min(1),
    attrs: z.record(z.unknown()).optional(),
    content: z.array(nodeSchema).optional(),
    text: z.string().optional(),
    marks: z.array(markSchema).optional(),
  }),
);

export const tiptapDocumentSchema: z.ZodType<TipTapDocument> = z.object({
  type: z.literal('doc'),
  attrs: z.record(z.unknown()).optional(),
  content: z.array(nodeSchema).optional(),
  text: z.string().optional(),
  marks: z.array(markSchema).optional(),
});

export const emptyTipTapDocument: TipTapDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

/**
 * Converts plain text (e.g. from a visitor submission's multiline textarea)
 * into a minimal TipTap document: each non-empty line becomes its own
 * paragraph node. Used so visitor-submitted Posts render through the same
 * `TipTapContent` component as admin-authored ones.
 */
export function textToTipTapDocument(text: string): TipTapDocument {
  const paragraphs = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return emptyTipTapDocument;
  return {
    type: 'doc',
    content: paragraphs.map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
}
