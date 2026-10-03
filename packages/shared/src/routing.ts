/**
 * Pure helpers for the `/splinter/{splinterId}` URL scheme, shared so both
 * the splinter frontend app and tests can exercise the same logic without
 * needing a DOM.
 */

const SPLINTER_PATH_PATTERN = /^\/splinter\/([^/?#]+)\/?$/;

/** Extracts the splinter id from a pathname like "/splinter/recipes", or null if it doesn't match. */
export function parseSplinterIdFromPathname(pathname: string): string | null {
  const match = SPLINTER_PATH_PATTERN.exec(pathname);
  if (!match) return null;
  const [, id] = match;
  if (!id) return null;
  return decodeURIComponent(id);
}

/** Reads the `post` query parameter (post id) from a search string like "?post=initial-concept". */
export function parsePostIdFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const postId = params.get('post');
  return postId && postId.length > 0 ? postId : null;
}

/** Builds a new search string with `post` set to the given id (or removed if null/undefined). */
export function buildSearchWithPostId(search: string, postId: string | null | undefined): string {
  const params = new URLSearchParams(search);
  if (postId) {
    params.set('post', postId);
  } else {
    params.delete('post');
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}
