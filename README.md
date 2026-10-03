# BrainSplinters.com

A small personal site for publishing ideas, projects, recipes, writing, portfolio
pieces, and other "brain splinters." See [PLANNING.md](PLANNING.md) for the full
design doc.

## Stack

TypeScript, React, Vite, AWS CDK, API Gateway (HTTP API), Lambda, DynamoDB,
Cognito, S3, CloudFront, Zod, TipTap. AWS SDK v3 throughout. No servers, no
GraphQL, no SSR — just static frontends behind CloudFront and a handful of
small Lambda functions.

## Repository layout

```
apps/
  web/               Vite app with three entry points: homepage, Splinter page, admin
packages/
  shared/            Zod schemas + inferred TypeScript types, shared by web + api
  api/                DynamoDB access + Lambda handlers
  infrastructure/    AWS CDK app
```

## Prerequisites

- Node.js 20+
- An AWS account and credentials configured locally (`aws configure` or env vars)
- `npx cdk bootstrap` run once per account/region (see "Deploying" below)

## Commands

```bash
npm install          # install all workspaces
npm run dev          # run the frontend locally (Vite dev server)
npm run build        # build shared -> api -> web (also what CDK deploys)
npm test             # run all tests (shared, api, web, infrastructure)
npm run lint         # eslint across the whole repo
npm run deploy       # build, then `cdk deploy` from packages/infrastructure
```

## Local development

The frontend needs to know where the API lives. Copy the example env file and
point it at a deployed API (there's no local API emulator in this MVP):

```bash
cp apps/web/.env.example apps/web/.env.local
# edit apps/web/.env.local with the outputs from your CDK deploy
npm run dev
```

`apps/web/.env.local` needs:

- `VITE_API_URL` — the `ApiUrl` CDK output
- `VITE_USER_POOL_ID` — the `UserPoolId` CDK output
- `VITE_USER_POOL_CLIENT_ID` — the `UserPoolClientId` CDK output
- `VITE_AWS_REGION` — the region you deployed to

During `npm run dev`, Vite serves `index.html` (homepage) at `/`, and you can
visit `/splinter.html?...` and `/admin.html` directly to exercise those apps
(CloudFront is what maps the clean `/splinter/*` and `/admin` URLs to these
entry points in production).

## Deploying

From `packages/infrastructure`:

```bash
# first time only, per AWS account/region
npx cdk bootstrap

# deploy with the default CloudFront domain (no custom domain)
npm run deploy --workspace packages/infrastructure

# or, from the repo root, which also rebuilds the frontend first:
npm run deploy
```

To use `brainsplinters.com` / `www.brainsplinters.com`, you need a Route 53
hosted zone for the domain already set up, then pass context values:

```bash
cd packages/infrastructure
npx cdk deploy \
  -c domainName=brainsplinters.com \
  -c hostedZoneId=Z0123456789EXAMPLE
```

The stack outputs include `SiteUrl`, `ApiUrl`, `UserPoolId`, `UserPoolClientId`,
`TableName`, and `DistributionId`.

### Creating your admin user

There's no sign-up flow. Create the one administrator account via the AWS CLI
after deploying:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username you@example.com \
  --user-attributes Name=email,Value=you@example.com Name=email_verified,Value=true \
  --temporary-password "SomeTemporaryPassw0rd!"
```

Then visit `/admin`, sign in with that email + temporary password, and you'll
be prompted to set a permanent password on first login.

## How routing works

This is intentionally **not** a single site-wide SPA:

- `/` serves the homepage entry point. Clicking a Splinter card does a normal
  full-page navigation to `/splinter/{id}` (a plain `<a href>`, not a router).
- CloudFront Functions rewrite `/splinter/*` and `/admin*` requests (at the
  origin-request level) to `splinter.html` / `admin.html` respectively, while
  the browser's address bar keeps the original URL. No other paths are
  rewritten — there is no site-wide SPA fallback.
- Once a Splinter page has loaded, it behaves like its own small SPA: it reads
  the Splinter id from `window.location.pathname`, and selecting a Post updates
  `?post={postId}` via the History API without a full reload.

## Data model

Single DynamoDB table, two item shapes:

| Item               | PK                      | SK                           |
| ------------------ | ----------------------- | ----------------------------- |
| Splinter metadata   | `SPLINTER#{splinterId}` | `META`                       |
| Post                | `SPLINTER#{splinterId}` | `POST#{createdAt}#{postId}`  |

Public API routes only ever return `status: "published"` items. Admin routes
(`POST`/`PUT`/`DELETE`) require a Cognito JWT, verified by API Gateway's JWT
authorizer.

## Testing

- `packages/shared`: Zod schema validation, safe-URL checks, and the
  `/splinter/{id}` + `?post=` URL-parsing helpers.
- `packages/api`: DynamoDB item (de)serialization, and handler-level tests for
  draft-vs-published filtering and core CRUD behavior.
- `packages/infrastructure`: CDK stack synthesis assertions (key resources
  exist, custom-domain path adds Route 53 records).
- `apps/web`: the TipTap JSON renderer (including unsafe-URL filtering) and the
  homepage Splinter card.

## Known trade-offs

- `cdk-lib`'s `DnsValidatedCertificate` (used only when a custom domain is
  configured) is deprecated upstream but still functional; it was kept to avoid
  a cross-region stack, which would add complexity for little benefit on a
  personal site.
- Images are plain URLs — there's no upload pipeline in this MVP.
- `listSplinters` uses a DynamoDB `Scan` rather than a secondary index. Fine
  for a personal site's small dataset; revisit if the Splinter count grows
  large.
