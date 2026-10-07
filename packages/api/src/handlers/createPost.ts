import { createPostInputSchema, postSchema } from '@brainsplinters/shared';
import { HttpError, withErrorHandling, jsonResponse, parseJsonBody } from '../http.js';
import { getDocClient, getTableName } from '../dynamo/client.js';
import { getSplinter, getPost, putPost } from '../dynamo/repository.js';
import { getCallerIdentity } from '../auth/verifyJwt.js';
import { nowIso } from '../time.js';

export const handler = withErrorHandling(async (event) => {
  const splinterId = event.pathParameters?.splinterId;
  if (!splinterId) throw new HttpError(400, 'splinterId is required');

  const input = createPostInputSchema.parse(parseJsonBody(event));
  const doc = getDocClient();
  const tableName = getTableName();

  const splinter = await getSplinter(doc, tableName, splinterId);
  if (!splinter) throw new HttpError(404, 'Splinter not found');

  // The slug doubles as the immutable Post id, used in `?post={postId}` URLs,
  // and must be unique within this Splinter.
  const existing = await getPost(doc, tableName, splinterId, input.slug);
  if (existing) {
    throw new HttpError(409, `A Post with slug "${input.slug}" already exists in this Splinter`);
  }

  const now = nowIso();
  const post = postSchema.parse({
    id: input.slug,
    splinterId,
    slug: input.slug,
    title: input.title,
    content: input.content,
    imageUrl: input.imageUrl,
    imageAlt: input.imageAlt,
    images: input.images ?? [],
    tags: input.tags ?? [],
    status: input.status,
    createdAt: now,
    updatedAt: now,
    createdBy: getCallerIdentity(event),
  });
  await putPost(doc, tableName, post);
  return jsonResponse(201, post);
});
