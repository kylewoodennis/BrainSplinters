import { updatePostInputSchema, postSchema } from '@brainsplinters/shared';
import { HttpError, withErrorHandling, jsonResponse, parseJsonBody } from '../http.js';
import { getDocClient, getTableName } from '../dynamo/client.js';
import { getPost, putPost } from '../dynamo/repository.js';
import { nowIso } from '../time.js';

export const handler = withErrorHandling(async (event) => {
  const splinterId = event.pathParameters?.splinterId;
  const postId = event.pathParameters?.postId;
  if (!splinterId || !postId) throw new HttpError(400, 'splinterId and postId are required');

  const input = updatePostInputSchema.parse(parseJsonBody(event));
  const doc = getDocClient();
  const tableName = getTableName();

  const existing = await getPost(doc, tableName, splinterId, postId);
  if (!existing) throw new HttpError(404, 'Post not found');

  // `id` and `createdAt` never change after creation (createdAt is part of the
  // DynamoDB sort key), even if `slug` is edited.
  const updated = postSchema.parse({
    ...existing,
    ...input,
    id: existing.id,
    splinterId: existing.splinterId,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  });
  await putPost(doc, tableName, updated);
  return jsonResponse(200, updated);
});
