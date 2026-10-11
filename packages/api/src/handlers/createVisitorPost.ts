import { randomUUID } from 'node:crypto';
import {
  createVisitorPostInputSchema,
  postSchema,
  countWords,
  textToTipTapDocument,
} from '@brainsplinters/shared';
import { HttpError, withErrorHandling, jsonResponse, parseJsonBody } from '../http.js';
import { getDocClient, getTableName } from '../dynamo/client.js';
import { getSplinter, putPost } from '../dynamo/repository.js';
import { nowIso } from '../time.js';

/**
 * Public, unauthenticated route letting a visitor submit a Post for admin
 * review. Always writes with `status: "draft"` and `source: "visitor"` --
 * it never becomes visible on the public Splinter page until an admin
 * approves it (via the existing `updatePost` route) from the admin Inbox.
 */
export const handler = withErrorHandling(async (event) => {
  const splinterId = event.pathParameters?.splinterId;
  if (!splinterId) throw new HttpError(400, 'splinterId is required');

  const input = createVisitorPostInputSchema.parse(parseJsonBody(event));

  // Honeypot: real visitors never see or fill in this hidden field. A bot
  // that blindly fills every field trips it; pretend success rather than
  // giving an attacker a signal, but don't write anything.
  if (input.honeypot) {
    return jsonResponse(202, { message: 'Submitted' });
  }

  const doc = getDocClient();
  const tableName = getTableName();
  const splinter = await getSplinter(doc, tableName, splinterId);
  if (!splinter || splinter.status !== 'published') {
    throw new HttpError(404, 'Splinter not found');
  }

  const config = splinter.visitorSubmissions;
  if (!config?.enabled) {
    throw new HttpError(403, 'This Splinter is not accepting visitor submissions');
  }

  if (config.firstName?.required && !input.firstName) {
    throw new HttpError(400, 'First name is required');
  }
  if (config.lastName?.required && !input.lastName) {
    throw new HttpError(400, 'Last name is required');
  }
  if (config.email?.required && !input.email) {
    throw new HttpError(400, 'Email is required');
  }
  if (config.phone?.required && !input.phone) {
    throw new HttpError(400, 'Phone is required');
  }

  const wordCount = countWords(input.content);
  if (config.minWordCount && wordCount < config.minWordCount) {
    throw new HttpError(400, `Post must be at least ${config.minWordCount} words`);
  }
  if (config.maxWordCount && wordCount > config.maxWordCount) {
    throw new HttpError(400, `Post must be at most ${config.maxWordCount} words`);
  }

  const imageCount = input.images?.length ?? 0;
  if (config.minImages && imageCount < config.minImages) {
    throw new HttpError(400, `Please include at least ${config.minImages} image(s)`);
  }
  if (config.maxImages && imageCount > config.maxImages) {
    throw new HttpError(400, `Please include at most ${config.maxImages} image(s)`);
  }

  // Apply the configured static-display layout when the submission has
  // exactly one image (e.g. letterboxing it instead of cropping to fill).
  const images =
    imageCount === 1 && config.singleImageContainerFit && input.images
      ? [{ ...input.images[0], containerFit: config.singleImageContainerFit }]
      : input.images;

  const now = nowIso();
  const id = randomUUID();
  const post = postSchema.parse({
    id,
    splinterId,
    slug: id,
    content: textToTipTapDocument(input.content),
    images,
    imageUrl: images?.[0]?.url,
    imageAlt: images?.[0]?.alt,
    tags: [],
    status: 'draft',
    source: 'visitor',
    submitter: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      anonymous: config.allowAnonymous ? (input.anonymous ?? false) : false,
    },
    createdAt: now,
    updatedAt: now,
    createdBy: 'visitor',
  });
  await putPost(doc, tableName, post);
  return jsonResponse(201, { message: 'Submitted' });
});
