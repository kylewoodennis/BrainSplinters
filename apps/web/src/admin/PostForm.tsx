import { useState } from 'react';
import { emptyTipTapDocument, type Post, type TipTapDocument } from '@brainsplinters/shared';
import { TipTapEditor } from './TipTapEditor.js';

export type PostFormValues = {
  slug: string;
  title: string;
  imageUrl: string;
  tags: string;
  status: 'draft' | 'published';
  content: TipTapDocument;
};

function toFormValues(post: Post | null): PostFormValues {
  return {
    slug: post?.slug ?? '',
    title: post?.title ?? '',
    imageUrl: post?.imageUrl ?? '',
    tags: post?.tags.join(', ') ?? '',
    status: post?.status ?? 'draft',
    content: post?.content ?? emptyTipTapDocument,
  };
}

export function PostForm({
  post,
  onSubmit,
  onCancel,
}: {
  post: Post | null;
  onSubmit: (values: PostFormValues) => Promise<void>;
  onCancel: () => void;
}): React.JSX.Element {
  const [values, setValues] = useState<PostFormValues>(() => toFormValues(post));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this Post.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="post-slug">Slug (used as ?post=)</label>
        <input
          id="post-slug"
          value={values.slug}
          onChange={(e) => update('slug', e.target.value)}
          placeholder="initial-concept"
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="post-title">Title (optional)</label>
        <input id="post-title" value={values.title} onChange={(e) => update('title', e.target.value)} />
      </div>
      <div className="form-field">
        <label htmlFor="post-image">Image URL (optional)</label>
        <input
          id="post-image"
          value={values.imageUrl}
          onChange={(e) => update('imageUrl', e.target.value)}
          placeholder="https://…"
        />
      </div>
      <div className="form-field">
        <label htmlFor="post-tags">Tags (comma separated)</label>
        <input
          id="post-tags"
          value={values.tags}
          onChange={(e) => update('tags', e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor="post-status">Status</label>
        <select
          id="post-status"
          value={values.status}
          onChange={(e) => update('status', e.target.value as 'draft' | 'published')}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>
      <div className="form-field">
        <label>Content</label>
        <TipTapEditor value={values.content} onChange={(doc) => update('content', doc)} />
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="chip-row">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save Post'}
        </button>
        <button className="btn secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
