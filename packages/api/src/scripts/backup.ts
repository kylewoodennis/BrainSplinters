/**
 * Dumps every Splinter (including drafts) and every Post to a local JSON
 * file, in case the DynamoDB table is ever accidentally wiped out. Run with
 * `npm run backup --workspace packages/api` (requires AWS credentials for
 * the account the site is deployed to, e.g. after `aws login`).
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listSplinters, listPosts } from '../dynamo/repository.js';

const DEFAULT_TABLE_NAME = 'BrainSplintersStack-TableCD117FA1-H656NE1VYIWF';
const DEFAULT_REGION = 'us-west-2';

// .../packages/api/dist/scripts/backup.js -> repo root.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

async function main(): Promise<void> {
  const tableName = process.env.TABLE_NAME ?? DEFAULT_TABLE_NAME;
  const region = process.env.AWS_REGION ?? DEFAULT_REGION;

  const client = new DynamoDBClient({ region });
  const doc = DynamoDBDocumentClient.from(client);

  console.log(`Backing up table "${tableName}" in ${region}...`);

  const splinters = await listSplinters(doc, tableName);
  const postLists = await Promise.all(
    splinters.map((splinter) => listPosts(doc, tableName, splinter.id)),
  );
  const posts = postLists.flat();

  const createdAt = new Date().toISOString();
  const backup = { createdAt, tableName, splinters, posts };

  const backupsDir = join(repoRoot, 'backups');
  mkdirSync(backupsDir, { recursive: true });
  const filePath = join(backupsDir, `backup-${createdAt.replace(/[:.]/g, '-')}.json`);
  writeFileSync(filePath, JSON.stringify(backup, null, 2));

  console.log(
    `Wrote ${splinters.length} Splinter(s) and ${posts.length} Post(s) to ${filePath}`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
