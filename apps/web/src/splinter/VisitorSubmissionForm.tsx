import { useState } from 'react';
import type { VisitorSubmissionConfig } from '@brainsplinters/shared';
import { api, ApiError } from '../lib/api.js';

type ImageInput = { url: string; alt: string };

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s().-]{7,20}$/;

function RequiredMark(): React.JSX.Element {
  return (
    <span className="required-mark" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

/**
 * Public "share your own post" form rendered on a Splinter page when
 * `splinter.visitorSubmissions?.enabled` is true. Submits directly to the
 * unauthenticated `/splinters/{splinterId}/visitor-posts` route; the admin
 * reviews and approves/rejects it later from the admin Inbox.
 */
export function VisitorSubmissionForm({
  splinterId,
  config,
}: {
  splinterId: string;
  config: VisitorSubmissionConfig;
}): React.JSX.Element {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<ImageInput[]>([{ url: '', alt: '' }]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const singleImageMode = config.minImages === 1 && config.maxImages === 1;
  const imagesRequired = (config.minImages ?? 0) > 0;

  function updateImage(index: number, patch: Partial<ImageInput>) {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, ...patch } : img)));
  }

  function addImage() {
    setImages((prev) => [...prev, { url: '', alt: '' }]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  const wordCount = countWords(content);
  const underMinWords = config.minWordCount ? wordCount < config.minWordCount : false;
  const overMaxWords = config.maxWordCount ? wordCount > config.maxWordCount : false;
  const showWordCount = Boolean(config.minWordCount || config.maxWordCount);
  const wordCountRangeText = config.minWordCount && config.maxWordCount
    ? `${config.minWordCount}–${config.maxWordCount}`
    : config.minWordCount
      ? `min ${config.minWordCount}`
      : config.maxWordCount
        ? `max ${config.maxWordCount}`
        : '';

  const cleanImages = images
    .filter((img) => img.url.trim())
    .map((img) => ({ url: img.url.trim(), alt: img.alt.trim() || undefined }));

  const emailInvalid = email.trim() !== '' && !EMAIL_REGEX.test(email.trim());
  const phoneInvalid = phone.trim() !== '' && !PHONE_REGEX.test(phone.trim());

  const isValid =
    content.trim() !== '' &&
    !underMinWords &&
    !overMaxWords &&
    !(config.minImages && cleanImages.length < config.minImages) &&
    !(config.maxImages && cleanImages.length > config.maxImages) &&
    !(config.firstName?.required && !firstName.trim()) &&
    !(config.lastName?.required && !lastName.trim()) &&
    !(config.email?.required && !email.trim()) &&
    !(config.phone?.required && !phone.trim()) &&
    !emailInvalid &&
    !phoneInvalid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (config.firstName?.required && !firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (config.lastName?.required && !lastName.trim()) {
      setError('Last name is required.');
      return;
    }
    if (config.email?.required && !email.trim()) {
      setError('Email is required.');
      return;
    }
    if (config.phone?.required && !phone.trim()) {
      setError('Phone is required.');
      return;
    }
    if (emailInvalid) {
      setError('Please enter a valid email address.');
      return;
    }
    if (phoneInvalid) {
      setError('Please enter a valid phone number.');
      return;
    }

    if (underMinWords) {
      setError(`Please write at least ${config.minWordCount} words.`);
      return;
    }
    if (overMaxWords) {
      setError(`Please keep it under ${config.maxWordCount} words.`);
      return;
    }

    if (config.minImages && cleanImages.length < config.minImages) {
      setError(`Please include at least ${config.minImages} image(s).`);
      return;
    }
    if (config.maxImages && cleanImages.length > config.maxImages) {
      setError(`Please include at most ${config.maxImages} image(s).`);
      return;
    }

    setBusy(true);
    try {
      await api.createVisitorPost(splinterId, {
        content,
        images: cleanImages.length > 0 ? cleanImages : undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        anonymous: config.allowAnonymous ? anonymous : undefined,
        honeypot: honeypot || undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your Post. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <section className="visitor-submission-form">
        <h2>Share your own Post</h2>
        <p className="empty-state">Thanks! Your submission is awaiting review.</p>
      </section>
    );
  }

  return (
    <section className="visitor-submission-form">
      <h2>Share your own Post</h2>
      {config.prompt && <p>{config.prompt}</p>}
      <form onSubmit={handleSubmit}>
        {/* Hidden honeypot field: real visitors never see or fill this in. */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="visitor-honeypot"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <div className="form-field">
          <div className="visitor-content-label-row">
            <label htmlFor="vsf-content">Your Post</label>
            {showWordCount && (
              <span className={`word-count${underMinWords || overMaxWords ? ' is-invalid' : ''}`}>
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
                {wordCountRangeText ? ` (${wordCountRangeText})` : ''}
              </span>
            )}
          </div>
          <textarea
            id="vsf-content"
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <span className="lightbox-fit-label">
            Images
            {imagesRequired && <RequiredMark />}
          </span>
          {(singleImageMode ? images.slice(0, 1) : images).map((img, index) => (
            <div className="visitor-field-row" key={index}>
              <input
                className="flex-input"
                type="url"
                placeholder="Image URL"
                value={img.url}
                onChange={(e) => updateImage(index, { url: e.target.value })}
              />
              <input
                className="flex-input"
                type="text"
                placeholder="Description (optional)"
                value={img.alt}
                onChange={(e) => updateImage(index, { alt: e.target.value })}
              />
              {!singleImageMode && (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => removeImage(index)}
                  disabled={images.length === 1}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {!singleImageMode && (
            <button className="btn secondary" type="button" onClick={addImage}>
              + Add image
            </button>
          )}
        </div>

        {(config.firstName?.enabled || config.lastName?.enabled) && (
          <div className="visitor-field-row">
            {config.firstName?.enabled && (
              <div className="form-field flex-input">
                <label htmlFor="vsf-first-name">
                  First name
                  {config.firstName.required && <RequiredMark />}
                </label>
                <input
                  id="vsf-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required={config.firstName.required}
                />
              </div>
            )}
            {config.lastName?.enabled && (
              <div className="form-field flex-input">
                <label htmlFor="vsf-last-name">
                  Last name
                  {config.lastName.required && <RequiredMark />}
                </label>
                <input
                  id="vsf-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required={config.lastName.required}
                />
              </div>
            )}
          </div>
        )}

        {config.email?.enabled && (
          <div className="form-field">
            <label htmlFor="vsf-email">
              Email
              {config.email.required && <RequiredMark />}
            </label>
            <input
              id="vsf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              required={config.email.required}
              aria-invalid={emailTouched && emailInvalid}
            />
            {emailTouched && emailInvalid && (
              <p className="error-text">Please enter a valid email address.</p>
            )}
          </div>
        )}

        {config.phone?.enabled && (
          <div className="form-field">
            <label htmlFor="vsf-phone">
              Phone
              {config.phone.required && <RequiredMark />}
            </label>
            <input
              id="vsf-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setPhoneTouched(true)}
              required={config.phone.required}
              aria-invalid={phoneTouched && phoneInvalid}
            />
            {phoneTouched && phoneInvalid && (
              <p className="error-text">Please enter a valid phone number.</p>
            )}
          </div>
        )}

        {config.allowAnonymous && (
          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />{' '}
              Submit anonymously
            </label>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        <button className="btn" type="submit" disabled={busy || !isValid}>
          {busy ? 'Submitting…' : 'Submit'}
        </button>
      </form>
    </section>
  );
}

