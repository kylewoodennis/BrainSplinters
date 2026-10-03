import { HttpError, withErrorHandling, jsonResponse } from '../http.js';
import { getDocClient, getTableName } from '../dynamo/client.js';
import { getSplinter, listPosts } from '../dynamo/repository.js';
import { isAuthenticatedAdminRequest } from '../auth/verifyJwt.js';

export const handler = withErrorHandling(async (event) => {
  const splinterId = event.pathParameters?.splinterId;
  if (!splinterId) throw new HttpError(400, 'splinterId is required');

  const isAdmin = await isAuthenticatedAdminRequest(event);
  const doc = getDocClient();
  const tableName = getTableName();

  const splinter = await getSplinter(doc, tableName, splinterId);
  if (!splinter || (!isAdmin && splinter.status !== 'published')) {
    throw new HttpError(404, 'Splinter not found');
  }

  const posts = await listPosts(doc, tableName, splinterId);
  const visible = isAdmin ? posts : posts.filter((post) => post.status === 'published');
  return jsonResponse(200, visible);
});
