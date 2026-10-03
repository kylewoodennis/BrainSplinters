import { describe, expect, it } from 'vitest';
import { isSafeHttpUrl } from '../src/url.js';
import { splinterSchema, createSplinterInputSchema } from '../src/splinter.js';
import { postSchema } from '../src/post.js';
import { tiptapDocumentSchema, emptyTipTapDocument } from '../src/tiptap.js';

describe('isSafeHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isSafeHttpUrl('https://example.com/cat.png')).toBe(true);
    expect(isSafeHttpUrl('http://example.com/cat.png')).toBe(true);
  });

  it('rejects javascript: and other unsafe schemes', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHttpUrl('ftp://example.com/file')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isSafeHttpUrl('not a url')).toBe(false);
  });
});

describe('createSplinterInputSchema', () => {
  it('accepts a minimal valid input and defaults status to draft', () => {
    const result = createSplinterInputSchema.parse({
      slug: 'recipes',
      title: 'Recipes',
    });
    expect(result.status).toBe('draft');
    expect(result.tags).toBeUndefined();
  });

  it('rejects an invalid slug', () => {
    expect(() =>
      createSplinterInputSchema.parse({ slug: 'Not A Slug', title: 'x' }),
    ).toThrow();
  });

  it('rejects an unsafe cover image URL', () => {
    expect(() =>
      createSplinterInputSchema.parse({
        slug: 'recipes',
        title: 'Recipes',
        coverImageUrl: 'javascript:alert(1)',
      }),
    ).toThrow();
  });
});

describe('splinterSchema', () => {
  const base = {
    id: 'splinter-1',
    slug: 'recipes',
    title: 'Recipes',
    tags: [],
    status: 'published' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'kyle',
  };

  it('parses a full splinter record', () => {
    expect(() => splinterSchema.parse(base)).not.toThrow();
  });

  it('rejects an invalid status', () => {
    expect(() => splinterSchema.parse({ ...base, status: 'archived' })).toThrow();
  });
});

describe('postSchema / tiptapDocumentSchema', () => {
  it('accepts the empty document', () => {
    expect(() => tiptapDocumentSchema.parse(emptyTipTapDocument)).not.toThrow();
  });

  it('rejects a document whose root type is not "doc"', () => {
    expect(() => tiptapDocumentSchema.parse({ type: 'paragraph' })).toThrow();
  });

  it('accepts a nested document with marks', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello', marks: [{ type: 'bold' }] }],
        },
      ],
    };
    expect(() => tiptapDocumentSchema.parse(doc)).not.toThrow();
  });

  it('parses a full post record', () => {
    const post = {
      id: 'post-1',
      splinterId: 'splinter-1',
      slug: 'initial-concept',
      content: emptyTipTapDocument,
      tags: [],
      status: 'published' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'kyle',
    };
    expect(() => postSchema.parse(post)).not.toThrow();
  });
});
