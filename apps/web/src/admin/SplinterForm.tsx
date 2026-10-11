import { useState } from 'react';
import type { ContainerFit, LightboxFit, Splinter, SplinterType } from '@brainsplinters/shared';
import { ImageUploadField } from './ImageUploadField.js';
import {
  VisitorSubmissionsFields,
  DEFAULT_VISITOR_FIELD,
  type VisitorSubmissionsFormValues,
} from './VisitorSubmissionsFields.js';

const TYPES: SplinterType[] = ['idea', 'project', 'portfolio', 'recipe', 'writing', 'other'];

export type SplinterFormValues = {
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string;
  coverImageAlt: string;
  coverImageFit: LightboxFit | undefined;
  coverImageContainerFit: ContainerFit | undefined;
  callout: string;
  tags: string;
  type: SplinterType | '';
  status: 'draft' | 'published';
  visitorSubmissions: VisitorSubmissionsFormValues;
};

function toFormValues(splinter: Splinter | null): SplinterFormValues {
  return {
    slug: splinter?.slug ?? '',
    title: splinter?.title ?? '',
    description: splinter?.description ?? '',
    coverImageUrl: splinter?.coverImageUrl ?? '',
    coverImageAlt: splinter?.coverImageAlt ?? '',
    coverImageFit: splinter?.coverImageFit,
    coverImageContainerFit: splinter?.coverImageContainerFit,
    callout: splinter?.callout ?? '',
    tags: splinter?.tags.join(', ') ?? '',
    type: splinter?.type ?? '',
    status: splinter?.status ?? 'draft',
    visitorSubmissions: {
      enabled: splinter?.visitorSubmissions?.enabled ?? false,
      prompt: splinter?.visitorSubmissions?.prompt ?? '',
      firstName: splinter?.visitorSubmissions?.firstName ?? DEFAULT_VISITOR_FIELD,
      lastName: splinter?.visitorSubmissions?.lastName ?? DEFAULT_VISITOR_FIELD,
      email: splinter?.visitorSubmissions?.email ?? DEFAULT_VISITOR_FIELD,
      phone: splinter?.visitorSubmissions?.phone ?? DEFAULT_VISITOR_FIELD,
      allowAnonymous: splinter?.visitorSubmissions?.allowAnonymous ?? false,
      minWordCount: splinter?.visitorSubmissions?.minWordCount ?? 0,
      maxWordCount: splinter?.visitorSubmissions?.maxWordCount ?? 0,
      minImages: splinter?.visitorSubmissions?.minImages ?? 0,
      maxImages: splinter?.visitorSubmissions?.maxImages ?? 0,
      singleImageContainerFit: splinter?.visitorSubmissions?.singleImageContainerFit,
    },
  };
}

export function SplinterForm({
  splinter,
  token,
  onSubmit,
  onCancel,
}: {
  splinter: Splinter | null;
  token: string;
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
          placeholder="omnidirectional-treadmill"
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
      <ImageUploadField
        id="coverImageUrl"
        label="Cover image"
        value={values.coverImageUrl}
        altValue={values.coverImageAlt}
        fitValue={values.coverImageFit}
        containerFitValue={values.coverImageContainerFit}
        token={token}
        onChange={(url) => update('coverImageUrl', url)}
        onAltChange={(alt) => update('coverImageAlt', alt)}
        onFitChange={(fit) => update('coverImageFit', fit)}
        onContainerFitChange={(fit) => update('coverImageContainerFit', fit)}
      />
      <div className="form-field">
        <label htmlFor="callout">Callout (e.g. a request for collaboration or support)</label>
        <textarea
          id="callout"
          value={values.callout}
          onChange={(e) => update('callout', e.target.value)}
          rows={2}
          placeholder="Looking for collaborators on…"
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
      <VisitorSubmissionsFields
        value={values.visitorSubmissions}
        onChange={(visitorSubmissions) => update('visitorSubmissions', visitorSubmissions)}
      />
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
