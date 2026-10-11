import { withErrorHandling, jsonResponse } from '../http.js';
import { getDocClient, getTableName } from '../dynamo/client.js';
import { listSplinters, listPosts } from '../dynamo/repository.js';

/**
 * Admin-only (JWT-protected route): returns every visitor-submitted Post
 * still awaiting review (`source: "visitor"`, `status: "draft"`) across all
 * Splinters, for the admin Inbox. Fine to scan all Splinters + Posts at this
 * site's small scale (same tradeoff as `listSplinters`).
 */
export const handler = withErrorHandling(async () => {
  const doc = getDocClient();
  const tableName = getTableName();

  const splinters = await listSplinters(doc, tableName);
  const postLists = await Promise.all(
    splinters.map((splinter) => listPosts(doc, tableName, splinter.id)),
  );
  const pending = postLists
    .flat()
    .filter((post) => post.source === 'visitor' && post.status === 'draft');

  return jsonResponse(200, pending);
});
