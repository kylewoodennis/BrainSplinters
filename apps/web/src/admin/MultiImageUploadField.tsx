import { useRef } from 'react';
import type { LightboxFit } from '@brainsplinters/shared';
import { useImageUpload } from '../lib/useImageUpload.js';
import { useLightbox } from '../lib/Lightbox.js';
import { LightboxFitControls } from './LightboxFitControls.js';

export type PostImageValue = { url: string; alt: string; fit?: LightboxFit };

/**
 * Lets an admin attach zero or more images to a Post. Each image can be
 * uploaded (via presigned S3 URL) or pasted as a URL, and has its own alt
 * text. When there's more than one image, they're laid out in the Post's
 * header as a flex gallery on the public site.
 */
export function MultiImageUploadField({
  images,
  token,
  onChange,
}: {
  images: PostImageValue[];
  token: string;
  onChange: (images: PostImageValue[]) => void;
}): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useImageUpload(token);
  const openLightbox = useLightbox();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const publicUrl = await upload(file);
    if (publicUrl) onChange([...images, { url: publicUrl, alt: '' }]);
  }

  function updateImage(index: number, patch: Partial<PostImageValue>) {
    onChange(images.map((img, i) => (i === index ? { ...img, ...patch } : img)));
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="form-field">
      <label>Images</label>
      {images.length > 0 && (
        <div className="image-list">
          {images.map((img, index) => (
            <div className="image-list-item" key={index}>
              {img.url && (
                <img
                  className="image-preview image-preview--clickable"
                  src={img.url}
                  alt={img.alt || 'Preview'}
                  onClick={() =>
                    openLightbox(
                      images.map((i) => ({ url: i.url, alt: i.alt, fit: i.fit })),
                      index,
                    )
                  }
                />
              )}
              <input
                value={img.url}
                onChange={(e) => updateImage(index, { url: e.target.value })}
                placeholder="https://…"
              />
              <input
                value={img.alt}
                onChange={(e) => updateImage(index, { alt: e.target.value })}
                placeholder="Image description (for screen readers)"
              />
              <LightboxFitControls
                idPrefix={`post-image-${index}`}
                value={img.fit}
                onChange={(fit) => updateImage(index, { fit })}
              />
              <button
                className="btn danger"
                type="button"
                onClick={() => removeImage(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="chip-row">
        <button
          className="btn secondary"
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Add image'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
