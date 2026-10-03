import { HttpError, withErrorHandling, jsonResponse } from '../http.js';
import { getDocClient, getTableName } from '../dynamo/client.js';
import { getSplinter, getPost } from '../dynamo/repository.js';
import { isAuthenticatedAdminRequest } from '../auth/verifyJwt.js';

export const handler = withErrorHandling(async (event) => {
  const splinterId = event.pathParameters?.splinterId;
  const postId = event.pathParameters?.postId;
  if (!splinterId || !postId) throw new HttpError(400, 'splinterId and postId are required');

  const isAdmin = await isAuthenticatedAdminRequest(event);
  const doc = getDocClient();
  const tableName = getTableName();

  const splinter = await getSplinter(doc, tableName, splinterId);
  if (!splinter || (!isAdmin && splinter.status !== 'published')) {
    throw new HttpError(404, 'Splinter not found');
  }

  const post = await getPost(doc, tableName, splinterId, postId);
  if (!post || (!isAdmin && post.status !== 'published')) {
    throw new HttpError(404, 'Post not found');
  }
  return jsonResponse(200, post);
});
