import { useState } from 'react';
import type { Post } from '@brainsplinters/shared';
import { TipTapContent } from '../lib/TipTapContent.js';

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

export function PostView({
  post,
  elementId,
  isHighlighted,
  onSelectPermalink,
}: {
  post: Post;
  elementId: string;
  isHighlighted: boolean;
  onSelectPermalink: () => string;
}): React.JSX.Element {
  const [copied, setCopied] = useState(false);

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
        <button className="post-permalink" onClick={handlePermalinkClick} type="button">
          {copied ? 'Link copied!' : '🔗 Permalink'}
        </button>
      </div>
      <div className="meta-line">{formatDate(post.createdAt)}</div>
      {post.imageUrl && <img src={post.imageUrl} alt="" loading="lazy" />}
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
