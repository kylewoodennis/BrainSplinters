import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { postSchema, splinterSchema, type Post, type Splinter } from '@brainsplinters/shared';
import { POST_SK_PREFIX, SPLINTER_META_SK, postSk, splinterPk } from './keys.js';

type SplinterItem = Splinter & { PK: string; SK: string; entityType: 'SPLINTER' };
type PostItem = Post & { PK: string; SK: string; entityType: 'POST' };

function toSplinterItem(splinter: Splinter): SplinterItem {
  return { ...splinter, PK: splinterPk(splinter.id), SK: SPLINTER_META_SK, entityType: 'SPLINTER' };
}

function fromSplinterItem(item: Record<string, unknown>): Splinter {
  const { PK: _pk, SK: _sk, entityType: _entityType, ...rest } = item as SplinterItem;
  return splinterSchema.parse(rest);
}

function toPostItem(post: Post): PostItem {
  return {
    ...post,
    PK: splinterPk(post.splinterId),
    SK: postSk(post.createdAt, post.id),
    entityType: 'POST',
  };
}

function fromPostItem(item: Record<string, unknown>): Post {
  const { PK: _pk, SK: _sk, entityType: _entityType, ...rest } = item as PostItem;
  return postSchema.parse(rest);
}

export async function putSplinter(
  doc: DynamoDBDocumentClient,
  tableName: string,
  splinter: Splinter,
): Promise<void> {
  await doc.send(new PutCommand({ TableName: tableName, Item: toSplinterItem(splinter) }));
}

export async function getSplinter(
  doc: DynamoDBDocumentClient,
  tableName: string,
  splinterId: string,
): Promise<Splinter | null> {
  const result = await doc.send(
    new GetCommand({
      TableName: tableName,
      Key: { PK: splinterPk(splinterId), SK: SPLINTER_META_SK },
    }),
  );
  return result.Item ? fromSplinterItem(result.Item) : null;
}

/** Scans the whole table for Splinter metadata items. Fine for a small, personal dataset. */
export async function listSplinters(
  doc: DynamoDBDocumentClient,
  tableName: string,
): Promise<Splinter[]> {
  const result = await doc.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: '#sk = :sk',
      ExpressionAttributeNames: { '#sk': 'SK' },
      ExpressionAttributeValues: { ':sk': SPLINTER_META_SK },
    }),
  );
  return (result.Items ?? []).map(fromSplinterItem);
}

export async function deleteSplinterAndPosts(
  doc: DynamoDBDocumentClient,
  tableName: string,
  splinterId: string,
): Promise<void> {
  const posts = await listPosts(doc, tableName, splinterId);
  await Promise.all(
    posts.map((post) =>
      doc.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { PK: splinterPk(splinterId), SK: postSk(post.createdAt, post.id) },
        }),
      ),
    ),
  );
  await doc.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { PK: splinterPk(splinterId), SK: SPLINTER_META_SK },
    }),
  );
}

export async function putPost(
  doc: DynamoDBDocumentClient,
  tableName: string,
  post: Post,
): Promise<void> {
  await doc.send(new PutCommand({ TableName: tableName, Item: toPostItem(post) }));
}

/** Lists Posts for a Splinter in chronological order (oldest first), per the sort key ordering. */
export async function listPosts(
  doc: DynamoDBDocumentClient,
  tableName: string,
  splinterId: string,
): Promise<Post[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: '#pk = :pk and begins_with(#sk, :skPrefix)',
      ExpressionAttributeNames: { '#pk': 'PK', '#sk': 'SK' },
      ExpressionAttributeValues: { ':pk': splinterPk(splinterId), ':skPrefix': POST_SK_PREFIX },
    }),
  );
  return (result.Items ?? []).map(fromPostItem);
}

export async function getPost(
  doc: DynamoDBDocumentClient,
  tableName: string,
  splinterId: string,
  postId: string,
): Promise<Post | null> {
  const posts = await listPosts(doc, tableName, splinterId);
  return posts.find((post) => post.id === postId) ?? null;
}

export async function deletePost(
  doc: DynamoDBDocumentClient,
  tableName: string,
  splinterId: string,
  postId: string,
): Promise<void> {
  const post = await getPost(doc, tableName, splinterId, postId);
  if (!post) return;
  await doc.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { PK: splinterPk(splinterId), SK: postSk(post.createdAt, post.id) },
    }),
  );
}
