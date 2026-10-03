import { useEffect, useMemo, useState } from 'react';
import type { Post, Splinter } from '@brainsplinters/shared';
import { parsePostIdFromSearch, parseSplinterIdFromPathname } from '@brainsplinters/shared';
import { api, ApiError } from '../lib/api.js';
import { PostView } from './PostView.js';

function postElementId(postId: string): string {
  return `post-${postId}`;
}

export function App(): React.JSX.Element {
  const splinterId = useMemo(
    () => parseSplinterIdFromPathname(window.location.pathname),
    [],
  );
  const [splinter, setSplinter] = useState<Splinter | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(() =>
    parsePostIdFromSearch(window.location.search),
  );

  useEffect(() => {
    if (!splinterId) return;
    Promise.all([api.getSplinter(splinterId), api.listPosts(splinterId)])
      .then(([splinterResult, postsResult]) => {
        setSplinter(splinterResult);
        setPosts(postsResult.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load this Splinter.'),
      );
  }, [splinterId]);

  // Scroll the selected Post into view once Posts have loaded (handles the
  // initial `?post=` on page load).
  useEffect(() => {
    if (!selectedPostId || !posts) return;
    const el = document.getElementById(postElementId(selectedPostId));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [posts, selectedPostId]);

  // Keep state in sync with browser back/forward navigation.
  useEffect(() => {
    const onPopState = () => setSelectedPostId(parsePostIdFromSearch(window.location.search));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function selectPost(postId: string): string {
    const params = new URLSearchParams(window.location.search);
    params.set('post', postId);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(null, '', newUrl);
    setSelectedPostId(postId);
    document.getElementById(postElementId(postId))?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    return `${window.location.origin}${newUrl}`;
  }

  if (!splinterId) {
    return (
      <div className="page">
        <p className="error-text">This doesn&apos;t look like a valid Splinter URL.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <a href="/">&larr; Back to BrainSplinters</a>

      {error && <p className="error-text">{error}</p>}
      {!error && !splinter && <p className="empty-state">Loading…</p>}

      {splinter && (
        <>
          <header className="splinter-header">
            {splinter.coverImageUrl && (
              <img className="splinter-cover" src={splinter.coverImageUrl} alt="" />
            )}
            <h1 className="site-title">{splinter.title}</h1>
            {splinter.description && <p className="site-tagline">{splinter.description}</p>}
            {splinter.tags.length > 0 && (
              <div className="chip-row">
                {splinter.type && <span className="chip chip-type">{splinter.type}</span>}
                {splinter.tags.map((tag) => (
                  <span className="chip" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {posts && posts.length === 0 && <p className="empty-state">No Posts yet.</p>}

          <div className="post-feed">
            {(posts ?? []).map((post) => (
              <PostView
                key={post.id}
                post={post}
                elementId={postElementId(post.id)}
                isHighlighted={post.id === selectedPostId}
                onSelectPermalink={() => selectPost(post.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
