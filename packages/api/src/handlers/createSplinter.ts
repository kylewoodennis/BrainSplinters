import { createSplinterInputSchema, splinterSchema } from '@brainsplinters/shared';
import { HttpError, withErrorHandling, jsonResponse, parseJsonBody } from '../http.js';
import { getDocClient, getTableName } from '../dynamo/client.js';
import { getSplinter, putSplinter } from '../dynamo/repository.js';
import { getCallerIdentity } from '../auth/verifyJwt.js';
import { nowIso } from '../time.js';

export const handler = withErrorHandling(async (event) => {
  const input = createSplinterInputSchema.parse(parseJsonBody(event));
  const doc = getDocClient();
  const tableName = getTableName();

  // The slug doubles as the immutable Splinter id, which is what appears in
  // `/splinter/{splinterId}` URLs -- so it must be unique.
  const existing = await getSplinter(doc, tableName, input.slug);
  if (existing) {
    throw new HttpError(409, `A Splinter with slug "${input.slug}" already exists`);
  }

  const now = nowIso();
  const splinter = splinterSchema.parse({
    id: input.slug,
    slug: input.slug,
    title: input.title,
    description: input.description,
    coverImageUrl: input.coverImageUrl,
    tags: input.tags ?? [],
    type: input.type,
    status: input.status,
    createdAt: now,
    updatedAt: now,
    createdBy: getCallerIdentity(event),
  });
  await putSplinter(doc, tableName, splinter);
  return jsonResponse(201, splinter);
});
