import { beforeEach, describe, expect, it } from 'vitest';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type { Post, Splinter } from '@brainsplinters/shared';
import {
  putSplinter,
  getSplinter,
  listSplinters,
  deleteSplinterAndPosts,
  putPost,
  listPosts,
  getPost,
  deletePost,
} from '../src/dynamo/repository.js';

const ddbMock = mockClient(DynamoDBDocumentClient);
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = 'test-table';

const splinter: Splinter = {
  id: 'recipes',
  slug: 'recipes',
  title: 'Recipes',
  tags: ['food'],
  status: 'published',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'kyle',
};

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'initial-concept',
    splinterId: 'recipes',
    slug: 'initial-concept',
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    tags: [],
    status: 'published',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    createdBy: 'kyle',
    ...overrides,
  };
}

beforeEach(() => {
  ddbMock.reset();
});

describe('Splinter repository', () => {
  it('writes a Splinter item with PK/SK and strips them back out on read', async () => {
    ddbMock.onAnyCommand().resolves({});
    await putSplinter(doc, TABLE, splinter);
    const putCall = ddbMock.calls()[0];
    expect(putCall.args[0].input).toMatchObject({
      TableName: TABLE,
      Item: expect.objectContaining({ PK: 'SPLINTER#recipes', SK: 'META' }),
    });

    ddbMock.onAnyCommand().resolves({
      Item: { ...splinter, PK: 'SPLINTER#recipes', SK: 'META', entityType: 'SPLINTER' },
    });
    const result = await getSplinter(doc, TABLE, 'recipes');
    expect(result).toEqual(splinter);
  });

  it('returns null when a Splinter does not exist', async () => {
    ddbMock.onAnyCommand().resolves({});
    expect(await getSplinter(doc, TABLE, 'missing')).toBeNull();
  });

  it('lists Splinters by scanning for META items', async () => {
    ddbMock.onAnyCommand().resolves({
      Items: [{ ...splinter, PK: 'SPLINTER#recipes', SK: 'META', entityType: 'SPLINTER' }],
    });
    const result = await listSplinters(doc, TABLE);
    expect(result).toEqual([splinter]);
  });

  it('deletes a Splinter and all of its Posts', async () => {
    const post = makePost();
    ddbMock.onAnyCommand().resolves({
      Items: [{ ...post, PK: 'SPLINTER#recipes', SK: 'POST#2026-01-02T00:00:00.000Z#initial-concept' }],
    });
    await deleteSplinterAndPosts(doc, TABLE, 'recipes');
    const deleteCalls = ddbMock.calls().filter((c) => c.args[0].constructor.name === 'DeleteCommand');
    expect(deleteCalls).toHaveLength(2);
  });
});

describe('Post repository', () => {
  it('writes a Post item keyed by createdAt + id', async () => {
    ddbMock.onAnyCommand().resolves({});
    const post = makePost();
    await putPost(doc, TABLE, post);
    const putCall = ddbMock.calls()[0];
    expect(putCall.args[0].input).toMatchObject({
      TableName: TABLE,
      Item: expect.objectContaining({
        PK: 'SPLINTER#recipes',
        SK: 'POST#2026-01-02T00:00:00.000Z#initial-concept',
      }),
    });
  });

  it('lists Posts for a Splinter in chronological (sort key) order', async () => {
    const postA = makePost({ id: 'a', slug: 'a', createdAt: '2026-01-01T00:00:00.000Z' });
    const postB = makePost({ id: 'b', slug: 'b', createdAt: '2026-01-02T00:00:00.000Z' });
    ddbMock.onAnyCommand().resolves({
      Items: [
        { ...postA, PK: 'SPLINTER#recipes', SK: 'POST#2026-01-01T00:00:00.000Z#a' },
        { ...postB, PK: 'SPLINTER#recipes', SK: 'POST#2026-01-02T00:00:00.000Z#b' },
      ],
    });
    const result = await listPosts(doc, TABLE, 'recipes');
    expect(result.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('finds a specific Post by id among a Splinter Posts', async () => {
    const post = makePost();
    ddbMock.onAnyCommand().resolves({
      Items: [{ ...post, PK: 'SPLINTER#recipes', SK: 'POST#2026-01-02T00:00:00.000Z#initial-concept' }],
    });
    const result = await getPost(doc, TABLE, 'recipes', 'initial-concept');
    expect(result).toEqual(post);
  });

  it('returns null for a Post that does not exist', async () => {
    ddbMock.onAnyCommand().resolves({ Items: [] });
    expect(await getPost(doc, TABLE, 'recipes', 'missing')).toBeNull();
  });

  it('deletes a Post by looking up its sort key first', async () => {
    const post = makePost();
    ddbMock.onAnyCommand().resolves({
      Items: [{ ...post, PK: 'SPLINTER#recipes', SK: 'POST#2026-01-02T00:00:00.000Z#initial-concept' }],
    });
    await deletePost(doc, TABLE, 'recipes', 'initial-concept');
    const deleteCalls = ddbMock.calls().filter((c) => c.args[0].constructor.name === 'DeleteCommand');
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0].args[0].input).toMatchObject({
      Key: { PK: 'SPLINTER#recipes', SK: 'POST#2026-01-02T00:00:00.000Z#initial-concept' },
    });
  });
});
