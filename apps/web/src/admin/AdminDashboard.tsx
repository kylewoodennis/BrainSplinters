import { useCallback, useEffect, useState } from 'react';
import type { Post, Splinter } from '@brainsplinters/shared';
import { api, ApiError } from '../lib/api.js';
import { TipTapContent } from '../lib/TipTapContent.js';
import type { AuthSession } from '../lib/auth.js';
import { SplinterForm, type SplinterFormValues } from './SplinterForm.js';
import { PostForm, type PostFormValues } from './PostForm.js';

type SplinterMode = 'list' | 'new' | { edit: Splinter };
type PostMode = 'list' | 'new' | { edit: Post };

function parseTags(tags: string): string[] {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function toCreateSplinterInput(values: SplinterFormValues) {
  const vs = values.visitorSubmissions;
  return {
    slug: values.slug,
    title: values.title,
    description: values.description || undefined,
    coverImageUrl: values.coverImageUrl || undefined,
    coverImageAlt: values.coverImageAlt || undefined,
    coverImageFit: values.coverImageFit,
    coverImageContainerFit: values.coverImageContainerFit,
    callout: values.callout || undefined,
    tags: parseTags(values.tags),
    type: values.type || undefined,
    status: values.status,
    visitorSubmissions: {
      enabled: vs.enabled,
      prompt: vs.prompt || undefined,
      firstName: vs.firstName,
      lastName: vs.lastName,
      email: vs.email,
      phone: vs.phone,
      allowAnonymous: vs.allowAnonymous,
      minWordCount: vs.minWordCount || undefined,
      maxWordCount: vs.maxWordCount || undefined,
      minImages: vs.minImages || undefined,
      maxImages: vs.maxImages || undefined,
      singleImageContainerFit: vs.singleImageContainerFit,
    },
  };
}

function toCreatePostInput(values: PostFormValues) {
  const images = values.images
    .filter((img) => img.url.trim())
    .map((img) => ({ url: img.url.trim(), alt: img.alt.trim() || undefined, fit: img.fit }));
  return {
    slug: values.slug,
    title: values.title || undefined,
    images,
    imageUrl: images[0]?.url,
    imageAlt: images[0]?.alt,
    tags: parseTags(values.tags),
    status: values.status,
    content: values.content,
  };
}


export function AdminDashboard({
  session,
  onSignOut,
}: {
  session: AuthSession;
  onSignOut: () => void;
}): React.JSX.Element {
  const [splinters, setSplinters] = useState<Splinter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [splinterMode, setSplinterMode] = useState<SplinterMode>('list');
  const [selectedSplinterId, setSelectedSplinterId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [postMode, setPostMode] = useState<PostMode>('list');
  const [showInbox, setShowInbox] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState<Post[] | null>(null);

  const loadInbox = useCallback(() => {
    api
      .listVisitorSubmissions(session.idToken)
      .then((result) => setPendingSubmissions(result.sort((a, b) => a.createdAt.localeCompare(b.createdAt))))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Load failed.'));
  }, [session.idToken]);

  useEffect(loadInbox, [loadInbox]);

  const loadSplinters = useCallback(() => {
    api
      .listSplinters(session.idToken)
      .then(setSplinters)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Load failed.'));
  }, [session.idToken]);

  useEffect(loadSplinters, [loadSplinters]);

  const loadPosts = useCallback(
    (splinterId: string) => {
      api
        .listPosts(splinterId, session.idToken)
        .then((result) => setPosts(result.sort((a, b) => a.createdAt.localeCompare(b.createdAt))))
        .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Load failed.'));
    },
    [session.idToken],
  );

  function openSplinter(splinterId: string) {
    setSelectedSplinterId(splinterId);
    setPostMode('list');
    loadPosts(splinterId);
  }

  const selectedSplinter = splinters?.find((s) => s.id === selectedSplinterId) ?? null;

  async function handleCreateSplinter(values: SplinterFormValues) {
    await api.createSplinter(toCreateSplinterInput(values), session.idToken);
    setSplinterMode('list');
    loadSplinters();
  }

  async function handleEditSplinter(splinter: Splinter, values: SplinterFormValues) {
    await api.updateSplinter(splinter.id, toCreateSplinterInput(values), session.idToken);
    setSplinterMode('list');
    loadSplinters();
  }

  async function handleDeleteSplinter(splinter: Splinter) {
    if (!window.confirm(`Delete "${splinter.title}" and all of its Posts? This cannot be undone.`))
      return;
    await api.deleteSplinter(splinter.id, session.idToken);
    if (selectedSplinterId === splinter.id) setSelectedSplinterId(null);
    loadSplinters();
  }

  async function handleTogglePublishSplinter(splinter: Splinter) {
    await api.updateSplinter(
      splinter.id,
      { status: splinter.status === 'published' ? 'draft' : 'published' },
      session.idToken,
    );
    loadSplinters();
  }

  async function handleCreatePost(values: PostFormValues) {
    if (!selectedSplinterId) return;
    await api.createPost(selectedSplinterId, toCreatePostInput(values), session.idToken);
    setPostMode('list');
    loadPosts(selectedSplinterId);
  }

  async function handleEditPost(post: Post, values: PostFormValues) {
    await api.updatePost(post.splinterId, post.id, toCreatePostInput(values), session.idToken);
    setPostMode('list');
    loadPosts(post.splinterId);
  }

  async function handleDeletePost(post: Post) {
    if (!window.confirm(`Delete Post "${post.title ?? post.slug}"?`)) return;
    await api.deletePost(post.splinterId, post.id, session.idToken);
    loadPosts(post.splinterId);
  }

  async function handleTogglePublishPost(post: Post) {
    await api.updatePost(
      post.splinterId,
      post.id,
      { status: post.status === 'published' ? 'draft' : 'published' },
      session.idToken,
    );
    loadPosts(post.splinterId);
  }

  async function handleApproveSubmission(post: Post) {
    await api.updatePost(post.splinterId, post.id, { status: 'published' }, session.idToken);
    loadInbox();
    if (selectedSplinterId === post.splinterId) loadPosts(post.splinterId);
  }

  async function handleRejectSubmission(post: Post) {
    if (!window.confirm('Reject and delete this submission? This cannot be undone.')) return;
    await api.deletePost(post.splinterId, post.id, session.idToken);
    loadInbox();
    if (selectedSplinterId === post.splinterId) loadPosts(post.splinterId);
  }

  return (
    <div className="admin-shell">
      <div className="site-header">
        <h1 className="site-title">Admin</h1>
        <button className="btn secondary" onClick={onSignOut} type="button">
          Sign out
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {!selectedSplinterId && (
        <section>
          <div className="site-header">
            <h2>Splinters</h2>
            <div className="chip-row">
              <button className="btn secondary" type="button" onClick={() => setShowInbox((v) => !v)}>
                {showInbox ? 'Hide Inbox' : `Inbox (${pendingSubmissions?.length ?? 0})`}
              </button>
              {splinterMode === 'list' && (
                <button className="btn" type="button" onClick={() => setSplinterMode('new')}>
                  + New Splinter
                </button>
              )}
            </div>
          </div>

          {showInbox && (
            <div className="admin-inbox">
              {(pendingSubmissions ?? []).length === 0 && (
                <p className="empty-state">No pending submissions.</p>
              )}
              {(pendingSubmissions ?? []).map((post) => {
                const splinterTitle =
                  splinters?.find((s) => s.id === post.splinterId)?.title ?? post.splinterId;
                const submitter = post.submitter;
                const name =
                  submitter?.anonymous || (!submitter?.firstName && !submitter?.lastName)
                    ? 'Anonymous'
                    : [submitter?.firstName, submitter?.lastName].filter(Boolean).join(' ');
                return (
                  <div className="admin-list-item admin-inbox-item" key={post.id}>
                    <div>
                      <strong>{name}</strong> <span className="meta-line">→ {splinterTitle}</span>
                      {submitter?.email && <div className="meta-line">{submitter.email}</div>}
                      {submitter?.phone && <div className="meta-line">{submitter.phone}</div>}
                      <div className="inbox-content-preview">
                        <TipTapContent doc={post.content} />
                      </div>
                    </div>
                    <div className="chip-row">
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => handleApproveSubmission(post)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn danger"
                        type="button"
                        onClick={() => handleRejectSubmission(post)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {splinterMode === 'new' && (
            <SplinterForm
              splinter={null}
              token={session.idToken}
              onSubmit={handleCreateSplinter}
              onCancel={() => setSplinterMode('list')}
            />
          )}
          {typeof splinterMode === 'object' && 'edit' in splinterMode && (
            <SplinterForm
              splinter={splinterMode.edit}
              token={session.idToken}
              onSubmit={(values) => handleEditSplinter(splinterMode.edit, values)}
              onCancel={() => setSplinterMode('list')}
            />
          )}

          {splinterMode === 'list' &&
            (splinters ?? []).map((splinter) => (
              <div className="admin-list-item" key={splinter.id}>
                <div>
                  <strong>{splinter.title}</strong>{' '}
                  <span className="chip">{splinter.status}</span>{' '}
                  <span className="meta-line">/splinter/{splinter.id}</span>
                </div>
                <div className="chip-row">
                  <button className="btn secondary" type="button" onClick={() => openSplinter(splinter.id)}>
                    Manage Posts
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => setSplinterMode({ edit: splinter })}
                  >
                    Edit
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => handleTogglePublishSplinter(splinter)}
                  >
                    {splinter.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    className="btn danger"
                    type="button"
                    onClick={() => handleDeleteSplinter(splinter)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </section>
      )}

      {selectedSplinter && (
        <section>
          <div className="site-header">
            <h2>{selectedSplinter.title} — Posts</h2>
            <div className="chip-row">
              {postMode === 'list' && (
                <button className="btn" type="button" onClick={() => setPostMode('new')}>
                  + New Post
                </button>
              )}
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  setSelectedSplinterId(null);
                  setPosts(null);
                }}
              >
                Back to Splinters
              </button>
            </div>
          </div>

          {postMode === 'new' && (
            <PostForm
              post={null}
              defaultTags={selectedSplinter.tags}
              token={session.idToken}
              onSubmit={handleCreatePost}
              onCancel={() => setPostMode('list')}
            />
          )}
          {typeof postMode === 'object' && 'edit' in postMode && (
            <PostForm
              post={postMode.edit}
              token={session.idToken}
              onSubmit={(values) => handleEditPost(postMode.edit, values)}
              onCancel={() => setPostMode('list')}
            />
          )}

          {postMode === 'list' &&
            (posts ?? []).map((post) => (
              <div className="admin-list-item" key={post.id}>
                <div>
                  <strong>{post.title ?? post.slug}</strong> <span className="chip">{post.status}</span>
                </div>
                <div className="chip-row">
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => setPostMode({ edit: post })}
                  >
                    Edit
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => handleTogglePublishPost(post)}
                  >
                    {post.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="btn danger" type="button" onClick={() => handleDeletePost(post)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          {postMode === 'list' && posts && posts.length === 0 && (
            <p className="empty-state">No Posts yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
