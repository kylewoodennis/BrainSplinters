import { HttpError, withErrorHandling, jsonResponse } from '../http.js';
import { getDocClient, getTableName } from '../dynamo/client.js';
import { getSplinter, deleteSplinterAndPosts } from '../dynamo/repository.js';

export const handler = withErrorHandling(async (event) => {
  const splinterId = event.pathParameters?.splinterId;
  if (!splinterId) throw new HttpError(400, 'splinterId is required');

  const doc = getDocClient();
  const tableName = getTableName();
  const existing = await getSplinter(doc, tableName, splinterId);
  if (!existing) throw new HttpError(404, 'Splinter not found');

  await deleteSplinterAndPosts(doc, tableName, splinterId);
  return jsonResponse(204, undefined);
});
