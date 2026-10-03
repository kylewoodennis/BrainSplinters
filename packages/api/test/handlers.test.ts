import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { Post, Splinter } from '@brainsplinters/shared';

const publishedSplinter: Splinter = {
  id: 'recipes',
  slug: 'recipes',
  title: 'Recipes',
  tags: [],
  status: 'published',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'kyle',
};

const draftSplinter: Splinter = { ...publishedSplinter, id: 'secret', slug: 'secret', status: 'draft' };

const publishedPost: Post = {
  id: 'initial-concept',
  splinterId: 'recipes',
  slug: 'initial-concept',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  tags: [],
  status: 'published',
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  createdBy: 'kyle',
};

const draftPost: Post = { ...publishedPost, id: 'draft-post', slug: 'draft-post', status: 'draft' };

let isAdmin = false;

vi.mock('../src/dynamo/client.js', () => ({
  getDocClient: () => ({}),
  getTableName: () => 'test-table',
}));

vi.mock('../src/auth/verifyJwt.js', () => ({
  isAuthenticatedAdminRequest: async () => isAdmin,
  getCallerIdentity: () => 'kyle',
}));

vi.mock('../src/dynamo/repository.js', () => ({
  listSplinters: async () => [publishedSplinter, draftSplinter],
  getSplinter: async (_doc: unknown, _table: unknown, id: string) =>
    [publishedSplinter, draftSplinter].find((s) => s.id === id) ?? null,
  listPosts: async () => [publishedPost, draftPost],
  getPost: async (_doc: unknown, _table: unknown, _splinterId: string, id: string) =>
    [publishedPost, draftPost].find((p) => p.id === id) ?? null,
  putSplinter: async () => undefined,
  putPost: async () => undefined,
}));

function makeEvent(pathParameters: Record<string, string> = {}): APIGatewayProxyEventV2 {
  return {
    pathParameters,
    headers: {},
  } as unknown as APIGatewayProxyEventV2;
}

function makeEventWithBody(
  pathParameters: Record<string, string>,
  body: unknown,
): APIGatewayProxyEventV2 {
  return {
    pathParameters,
    headers: {},
    body: JSON.stringify(body),
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => {
  isAdmin = false;
});

describe('listSplinters handler', () => {
  it('returns only published Splinters for anonymous callers', async () => {
    const { handler } = await import('../src/handlers/listSplinters.js');
    const result = await handler(makeEvent());
    const body = JSON.parse((result as { body: string }).body);
    expect(body).toHaveLength(1);
    expect(body[0].status).toBe('published');
  });

  it('returns drafts too for an authenticated admin', async () => {
    isAdmin = true;
    const { handler } = await import('../src/handlers/listSplinters.js');
    const result = await handler(makeEvent());
    const body = JSON.parse((result as { body: string }).body);
    expect(body).toHaveLength(2);
  });
});

describe('getSplinter handler', () => {
  it('404s on a draft Splinter for anonymous callers', async () => {
    const { handler } = await import('../src/handlers/getSplinter.js');
    const result = await handler(makeEvent({ splinterId: 'secret' }));
    expect((result as { statusCode: number }).statusCode).toBe(404);
  });

  it('200s on a draft Splinter for an admin', async () => {
    isAdmin = true;
    const { handler } = await import('../src/handlers/getSplinter.js');
    const result = await handler(makeEvent({ splinterId: 'secret' }));
    expect((result as { statusCode: number }).statusCode).toBe(200);
  });

  it('400s when splinterId is missing', async () => {
    const { handler } = await import('../src/handlers/getSplinter.js');
    const result = await handler(makeEvent());
    expect((result as { statusCode: number }).statusCode).toBe(400);
  });
});

describe('listPosts handler', () => {
  it('filters out draft Posts for anonymous callers', async () => {
    const { handler } = await import('../src/handlers/listPosts.js');
    const result = await handler(makeEvent({ splinterId: 'recipes' }));
    const body = JSON.parse((result as { body: string }).body);
    expect(body).toHaveLength(1);
    expect(body[0].status).toBe('published');
  });

  it('includes draft Posts for an admin', async () => {
    isAdmin = true;
    const { handler } = await import('../src/handlers/listPosts.js');
    const result = await handler(makeEvent({ splinterId: 'recipes' }));
    const body = JSON.parse((result as { body: string }).body);
    expect(body).toHaveLength(2);
  });
});

describe('getPost handler', () => {
  it('404s on a draft Post for anonymous callers', async () => {
    const { handler } = await import('../src/handlers/getPost.js');
    const result = await handler(makeEvent({ splinterId: 'recipes', postId: 'draft-post' }));
    expect((result as { statusCode: number }).statusCode).toBe(404);
  });

  it('200s on a published Post for anonymous callers', async () => {
    const { handler } = await import('../src/handlers/getPost.js');
    const result = await handler(makeEvent({ splinterId: 'recipes', postId: 'initial-concept' }));
    expect((result as { statusCode: number }).statusCode).toBe(200);
  });
});

describe('createSplinter handler', () => {
  it('rejects an invalid slug with 400', async () => {
    const { handler } = await import('../src/handlers/createSplinter.js');
    const result = await handler(
      makeEventWithBody({}, { slug: 'Not A Slug', title: 'Title' }),
    );
    expect((result as { statusCode: number }).statusCode).toBe(400);
  });

  it('rejects a duplicate slug with 409', async () => {
    const { handler } = await import('../src/handlers/createSplinter.js');
    const result = await handler(
      makeEventWithBody({}, { slug: 'recipes', title: 'Recipes again' }),
    );
    expect((result as { statusCode: number }).statusCode).toBe(409);
  });

  it('creates a new Splinter with 201', async () => {
    const { handler } = await import('../src/handlers/createSplinter.js');
    const result = await handler(
      makeEventWithBody({}, { slug: 'new-splinter', title: 'New Splinter' }),
    );
    expect((result as { statusCode: number }).statusCode).toBe(201);
    const body = JSON.parse((result as { body: string }).body);
    expect(body.id).toBe('new-splinter');
    expect(body.status).toBe('draft');
  });
});

describe('createPost handler', () => {
  it('404s when the parent Splinter does not exist', async () => {
    const { handler } = await import('../src/handlers/createPost.js');
    const result = await handler(
      makeEventWithBody({ splinterId: 'missing' }, { slug: 'new-post' }),
    );
    expect((result as { statusCode: number }).statusCode).toBe(404);
  });

  it('creates a new Post with 201', async () => {
    const { handler } = await import('../src/handlers/createPost.js');
    const result = await handler(
      makeEventWithBody({ splinterId: 'recipes' }, { slug: 'new-post', title: 'New Post' }),
    );
    expect((result as { statusCode: number }).statusCode).toBe(201);
    const body = JSON.parse((result as { body: string }).body);
    expect(body.splinterId).toBe('recipes');
  });
});
