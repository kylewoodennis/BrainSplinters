import { HttpError, withErrorHandling, jsonResponse } from '../http.js';
import { getDocClient, getTableName } from '../dynamo/client.js';
import { getPost, deletePost } from '../dynamo/repository.js';

export const handler = withErrorHandling(async (event) => {
  const splinterId = event.pathParameters?.splinterId;
  const postId = event.pathParameters?.postId;
  if (!splinterId || !postId) throw new HttpError(400, 'splinterId and postId are required');

  const doc = getDocClient();
  const tableName = getTableName();
  const existing = await getPost(doc, tableName, splinterId, postId);
  if (!existing) throw new HttpError(404, 'Post not found');

  await deletePost(doc, tableName, splinterId, postId);
  return jsonResponse(204, undefined);
});
