import { useRef } from 'react';
import type { ContainerFit, LightboxFit } from '@brainsplinters/shared';
import { useImageUpload } from '../lib/useImageUpload.js';
import { useLightbox } from '../lib/Lightbox.js';
import { LightboxFitControls } from './LightboxFitControls.js';
import { ContainerFitControls } from './ContainerFitControls.js';

/**
 * A text input for an image URL, plus a button to upload a file instead.
 * Uploads go straight from the browser to S3 via a presigned URL (the file
 * never passes through our API), then the resulting CloudFront URL is set
 * as the field's value.
 */
export function ImageUploadField({
  id,
  label,
  value,
  altValue,
  token,
  fitValue,
  containerFitValue,
  onChange,
  onAltChange,
  onFitChange,
  onContainerFitChange,
}: {
  id: string;
  label: string;
  value: string;
  altValue: string;
  token: string;
  fitValue?: LightboxFit;
  containerFitValue?: ContainerFit;
  onChange: (url: string) => void;
  onAltChange: (alt: string) => void;
  onFitChange?: (fit: LightboxFit | undefined) => void;
  onContainerFitChange?: (fit: ContainerFit | undefined) => void;
}): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useImageUpload(token);
  const openLightbox = useLightbox();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const publicUrl = await upload(file);
    if (publicUrl) onChange(publicUrl);
  }


  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… (or upload a file below)"
      />
      <div className="chip-row">
        <button
          className="btn secondary"
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Upload image'}
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
      {value && (
        <>
          <img
            className="image-preview image-preview--clickable"
            src={value}
            alt={altValue || 'Preview'}
            style={
              containerFitValue?.size === 'fit'
                ? { objectFit: 'contain', objectPosition: 'center', background: '#000' }
                : containerFitValue?.align
                  ? { objectPosition: containerFitValue.align }
                  : undefined
            }
            onClick={() =>
              openLightbox([{ url: value, alt: altValue, fit: fitValue }], 0)
            }
          />
          <label htmlFor={`${id}-alt`}>Image description (for screen readers)</label>
          <input
            id={`${id}-alt`}
            value={altValue}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="Describe what's in this image…"
          />
          {onContainerFitChange && (
            <ContainerFitControls
              idPrefix={id}
              value={containerFitValue}
              onChange={onContainerFitChange}
            />
          )}
          {onFitChange && (
            <LightboxFitControls idPrefix={id} value={fitValue} onChange={onFitChange} />
          )}
        </>
      )}
    </div>
  );
}
