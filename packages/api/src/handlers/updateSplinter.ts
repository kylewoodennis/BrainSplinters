import { updateSplinterInputSchema, splinterSchema } from '@brainsplinters/shared';
import { HttpError, withErrorHandling, jsonResponse, parseJsonBody } from '../http.js';
import { getDocClient, getTableName } from '../dynamo/client.js';
import { getSplinter, putSplinter } from '../dynamo/repository.js';
import { nowIso } from '../time.js';

export const handler = withErrorHandling(async (event) => {
  const splinterId = event.pathParameters?.splinterId;
  if (!splinterId) throw new HttpError(400, 'splinterId is required');

  const input = updateSplinterInputSchema.parse(parseJsonBody(event));
  const doc = getDocClient();
  const tableName = getTableName();

  const existing = await getSplinter(doc, tableName, splinterId);
  if (!existing) throw new HttpError(404, 'Splinter not found');

  // Note: `id` (and therefore the `/splinter/{id}` URL) never changes after
  // creation, even if `slug` is edited -- changing it would require moving
  // the item and all of its Posts to a new partition key.
  const updated = splinterSchema.parse({
    ...existing,
    ...input,
    id: existing.id,
    updatedAt: nowIso(),
  });
  await putSplinter(doc, tableName, updated);
  return jsonResponse(200, updated);
});
