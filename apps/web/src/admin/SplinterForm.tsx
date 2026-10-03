import { useState } from 'react';
import type { Splinter, SplinterType } from '@brainsplinters/shared';

const TYPES: SplinterType[] = ['idea', 'project', 'portfolio', 'recipe', 'writing', 'other'];

export type SplinterFormValues = {
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string;
  tags: string;
  type: SplinterType | '';
  status: 'draft' | 'published';
};

function toFormValues(splinter: Splinter | null): SplinterFormValues {
  return {
    slug: splinter?.slug ?? '',
    title: splinter?.title ?? '',
    description: splinter?.description ?? '',
    coverImageUrl: splinter?.coverImageUrl ?? '',
    tags: splinter?.tags.join(', ') ?? '',
    type: splinter?.type ?? '',
    status: splinter?.status ?? 'draft',
  };
}

export function SplinterForm({
  splinter,
  onSubmit,
  onCancel,
}: {
  splinter: Splinter | null;
  onSubmit: (values: SplinterFormValues) => Promise<void>;
  onCancel: () => void;
}): React.JSX.Element {
  const [values, setValues] = useState<SplinterFormValues>(() => toFormValues(splinter));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof SplinterFormValues>(key: K, value: SplinterFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this Splinter.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="slug">Slug (used in the URL)</label>
        <input
          id="slug"
          value={values.slug}
          onChange={(e) => update('slug', e.target.value)}
          placeholder="anonymous-age-verification"
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
        />
      </div>
      <div className="form-field">
        <label htmlFor="coverImageUrl">Cover image URL</label>
        <input
          id="coverImageUrl"
          value={values.coverImageUrl}
          onChange={(e) => update('coverImageUrl', e.target.value)}
          placeholder="https://…"
        />
      </div>
      <div className="form-field">
        <label htmlFor="tags">Tags (comma separated)</label>
        <input id="tags" value={values.tags} onChange={(e) => update('tags', e.target.value)} />
      </div>
      <div className="form-field">
        <label htmlFor="type">Type</label>
        <select id="type" value={values.type} onChange={(e) => update('type', e.target.value as SplinterType | '')}>
          <option value="">(none)</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={values.status}
          onChange={(e) => update('status', e.target.value as 'draft' | 'published')}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="chip-row">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save Splinter'}
        </button>
        <button className="btn secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
