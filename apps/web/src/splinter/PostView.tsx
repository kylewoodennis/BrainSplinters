import { useState } from 'react';
import type { Post } from '@brainsplinters/shared';
import { TipTapContent } from '../lib/TipTapContent.js';
import { useLightbox, type LightboxImage } from '../lib/Lightbox.js';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getPostImages(post: Post, isPortfolio: boolean): LightboxImage[] {
  const variant = isPortfolio ? ('portfolio' as const) : undefined;
  if (post.images && post.images.length > 0) {
    return post.images.map((img) => ({ url: img.url, alt: img.alt, variant, fit: img.fit }));
  }
  if (post.imageUrl) {
    return [{ url: post.imageUrl, alt: post.imageAlt, variant }];
  }
  return [];
}

export function PostView({
  post,
  elementId,
  isHighlighted,
  isPortfolio = false,
  onSelectPermalink,
}: {
  post: Post;
  elementId: string;
  isHighlighted: boolean;
  isPortfolio?: boolean;
  onSelectPermalink: () => string;
}): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const openLightbox = useLightbox();
  const images = getPostImages(post, isPortfolio);

  async function handlePermalinkClick() {
    const url = onSelectPermalink();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (e.g. insecure context); the URL is still updated.
    }
  }


  return (
    <article
      id={elementId}
      className={`post${isHighlighted ? ' is-highlighted' : ''}`}
    >
      <div className="post-header">
        {post.title ? <h2>{post.title}</h2> : <span />}
        <button
          className="post-share"
          onClick={handlePermalinkClick}
          type="button"
          aria-label={copied ? 'Link copied' : 'Copy link to this Post'}
          title={copied ? 'Link copied!' : 'Copy link to this Post'}
        >
          {copied ? (
            '✓ Copied'
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"
              />
            </svg>
          )}
        </button>
      </div>
      <div className="meta-line">{formatDate(post.createdAt)}</div>
      {images.length === 1 && images[0] && (
        <img
          className="post-image"
          src={images[0].url}
          alt={images[0].alt ?? ''}
          loading="lazy"
          onClick={() => openLightbox(images, 0)}
        />
      )}
      {images.length > 1 && (
        <div className="post-gallery">
          {images.map((img, index) => (
            <img
              key={img.url}
              className="post-gallery-image"
              src={img.url}
              alt={img.alt ?? ''}
              loading="lazy"
              onClick={() => openLightbox(images, index)}
            />
          ))}
        </div>
      )}
      <TipTapContent doc={post.content} />
      {post.tags.length > 0 && (
        <div className="chip-row">
          {post.tags.map((tag) => (
            <span className="chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
