export const splinterPk = (splinterId: string): string => `SPLINTER#${splinterId}`;

export const SPLINTER_META_SK = 'META';

export const POST_SK_PREFIX = 'POST#';

export const postSk = (createdAt: string, postId: string): string =>
  `${POST_SK_PREFIX}${createdAt}#${postId}`;
