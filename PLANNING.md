# BrainSplinters.com — Planning Document

## 1. Overview

BrainSplinters.com is a personal site for publishing ideas, projects, recipes, writing, portfolio pieces, and other random concepts ("brain splinters"). This document is the build plan for the initial working version (MVP).

**Guiding principle:** Keep this project intentionally small and straightforward. Build a working vertical slice, not an over-engineered framework. When choosing between clever and boring, choose boring.

## 2. Technology Stack

**Use:**
- TypeScript (strict mode)
- React
- Vite
- AWS CDK (Cloud Development Kit) in TypeScript
- API Gateway (HTTP API)
- Lambda
- DynamoDB
- Cognito (for authentication)
- S3 (Simple Storage Service)
- CloudFront (content delivery network / CDN)
- Zod (runtime validation)
- TipTap (rich-text editor)
- AWS SDK v3

**Do not use:**
- MongoDB / Atlas
- Next.js or server-side rendering (SSR)
- EC2 or ECS
- GraphQL
- Any continuously running backend server
- React Router as a site-wide single-page application (SPA)
- Repository factories, dependency-injection frameworks, event buses, generic CRUD engines, or other unnecessary architectural layers

## 3. Repository Structure

npm-workspace monorepo:

```
brainsplinters/
  apps/
    web/              # Two Vite entry points: homepage + splinter app
  packages/
    shared/           # Shared TypeScript types + Zod schemas
    api/              # Lambda handlers + DynamoDB access
    infrastructure/   # AWS CDK app (stacks for data, API, auth, frontend hosting)
  README.md
  package.json        # npm workspaces root
```

Shared models and Zod schemas live in `packages/shared` and are imported by both `apps/web` and `packages/api`.

## 4. Site Structure (Not a Single SPA)

Two kinds of pages, each a **separate Vite entry point** (separate HTML + React root), not one site-wide SPA:

- `/` — Homepage entry point
- `/splinter/{splinter-id}` — Splinter entry point

**Navigation rule:** Clicking from the homepage to a Splinter is a normal full browser/document navigation (plain `<a href>`), not React Router client-side routing.

**Within a Splinter page:** Once loaded, the Splinter page behaves like its own small SPA:
- Reads the Splinter ID from `window.location.pathname`.
- Supports `?post={postId}` to scroll to and highlight a specific Post.
- Updates the `post` query parameter client-side via the History API (no full reload) when the visitor selects a different post.

**CloudFront routing:** CloudFront rewrites requests under `/splinter/*` to serve the Splinter entry point's `index.html`, while the browser's address bar keeps the original URL (e.g., `/splinter/recipes?post=initial-concept`). This is a targeted rewrite for `/splinter/*` only — **not** a site-wide SPA fallback. All other paths (e.g., `/`) serve the homepage entry point normally.

## 5. Product Model

Defined once in `packages/shared` using Zod, with TypeScript types inferred via `z.infer`.

### Splinter

```ts
type Splinter = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  callout?: string;
  tags: string[];
  type?: "idea" | "project" | "portfolio" | "recipe" | "writing" | "other";
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};
```

### Post

```ts
type Post = {
  id: string;
  splinterId: string;
  slug: string;
  title?: string;
  content: TipTapDocument; // TipTap JSON, not raw HTML
  imageUrl?: string;
  tags: string[];
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};
```

Image URL fields must pass safe URL validation (e.g., restrict to `http`/`https` protocol) via a shared Zod refinement.

## 6. DynamoDB Design

**Single table**, simple keys — no secondary indexes unless a listed requirement truly needs one. This is a personal site with a small dataset, so avoid over-designing.

| Item            | Partition Key (PK)        | Sort Key (SK)                  |
|-----------------|----------------------------|----------------------------------|
| Splinter metadata | `SPLINTER#{splinterId}`   | `META`                          |
| Post             | `SPLINTER#{splinterId}`   | `POST#{createdAt}#{postId}`     |

This supports, via simple `Query`/`GetItem` calls on one partition:
- Listing published Splinters (scan + filter on `status`, acceptable at small scale)
- Retrieving one Splinter (`GetItem` with `SK = META`)
- Retrieving Posts for a Splinter (`Query` with `SK begins_with POST#`, naturally sorted chronologically)
- Retrieving a specific Post (`GetItem` once the sort key is known, or `Query` + filter on post id)
- Create / edit / delete for both Splinters and Posts (`PutItem` / `UpdateItem` / `DeleteItem`)

## 7. API Design

API Gateway **HTTP API** (not REST API, not GraphQL) backed by TypeScript Lambda functions. One Lambda per logical operation (or a small shared handler module) — keep it simple, no generic CRUD engine.

### Public routes (no auth, published content only)

```
GET /splinters
GET /splinters/{splinterId}
GET /splinters/{splinterId}/posts
GET /splinters/{splinterId}/posts/{postId}
```

### Admin routes (Cognito JWT required)

```
POST   /splinters
PUT    /splinters/{splinterId}
DELETE /splinters/{splinterId}

POST   /splinters/{splinterId}/posts
PUT    /splinters/{splinterId}/posts/{postId}
DELETE /splinters/{splinterId}/posts/{postId}
```

Rules:
- Public GET routes filter out anything with `status: "draft"`.
- All request/response bodies validated with Zod.
- Plain JSON responses, sensible HTTP status codes (200/201/204/400/401/403/404/500), simple try/catch error handling — no custom error framework.

## 8. Authentication

- Cognito User Pool with a single administrator account (me). No public sign-up flow.
- Cognito App Client for the admin web app to authenticate (e.g., hosted UI or direct SDK sign-in).
- API Gateway HTTP API uses a Cognito JWT authorizer attached only to the POST/PUT/DELETE routes.
- A simple `/admin` entry point (or route within an entry point) provides a login form and the content-management UI.

## 9. Frontend Pages

### Homepage (`/`)
- Responsive grid of Splinter cards (title, description, cover image, tags, type, latest activity date — some combination as space allows).
- Clicking a card performs a normal browser navigation to `/splinter/{splinter-id}`.
- Simple client-side filtering by tag and/or type (filters the already-fetched published list in-browser).
- Visual tone: personal idea wall / notebook / portfolio, not a corporate dashboard.

### Splinter page (`/splinter/{splinter-id}`)
- Reads splinter id from `window.location.pathname`.
- Fetches Splinter metadata + its published Posts.
- Displays title, description, cover image, tags, and Posts as a chronological feed.
- Each Post has a stable id and a permalink control that updates/copies a URL containing `?post={postId}`.
- On load, if `?post={postId}` is present, scroll that Post into view and apply a highlight style.
- Selecting a different Post updates the query string via `history.pushState`/`replaceState` without a full reload.

### Admin (`/admin`)
- Login screen (Cognito-backed).
- Once authenticated: list/create/edit/delete Splinters; publish/unpublish toggle; list/create/edit/delete Posts within a Splinter; publish/unpublish toggle; tag editing; image URL fields (plain text inputs, validated as safe URLs — no upload).
- TipTap editor for Post content supporting: paragraphs, headings, bold, italic, links, bullet lists, numbered lists, blockquotes, code blocks, images by URL.
- Persists TipTap's JSON document (not HTML) to DynamoDB via the admin API routes.

## 10. Images

Images are plain URL strings stored alongside content. No upload pipeline in this MVP.

## 11. AWS Deployment (CDK)

CDK app in `packages/infrastructure` provisioning:
- DynamoDB table (on-demand billing, simple schema per section 6)
- Lambda functions + API Gateway HTTP API with routes per section 7, Cognito JWT authorizer on admin routes
- Cognito User Pool + App Client
- Private S3 bucket for built frontend assets (block all public access)
- CloudFront distribution serving the S3 bucket via Origin Access Control, with a cache/path behavior that routes `/splinter/*` to the Splinter entry point's `index.html` while leaving the browser URL untouched; default behavior serves the homepage entry point
- Custom domain support for `brainsplinters.com` and `www.brainsplinters.com` (ACM certificate + Route 53 or external DNS, CloudFront alternate domain names)
- Least-privilege IAM roles/policies scoped to exactly what each Lambda needs (e.g., table-level DynamoDB access only)

## 12. Local Development

From the repo root:

```
npm install
npm run dev       # run frontend (and local API if applicable) for local development
npm run build     # build all workspaces
npm test          # run tests across workspaces
npm run deploy    # cdk deploy via packages/infrastructure
```

Frontend must support a configurable API base URL (e.g., via Vite env variable) so it can point at a deployed API Gateway endpoint during local development.

## 13. Quality Bar

- Strict TypeScript across all packages
- ESLint + Prettier
- Zod validation on all API boundaries and for image URL safety
- Least-privilege IAM in CDK
- Targeted automated tests (not exhaustive UI testing):
  - API request/response validation
  - DynamoDB item serialization/deserialization
  - Draft vs. published filtering logic
  - Core CRUD behavior for Splinters and Posts
  - Splinter URL parsing (reading id from `window.location.pathname`)
  - `?post=` selection/highlight behavior

## 14. Build Order

Work through these phases sequentially. Run TypeScript compilation and tests after each phase and fix errors before moving on.

1. Repository / workspace structure (npm workspaces, base configs: TypeScript, ESLint, Prettier)
2. Shared models (`packages/shared`: Zod schemas + inferred types for Splinter, Post, TipTap document)
3. CDK infrastructure skeleton (`packages/infrastructure`: empty-ish stacks so `cdk synth` works early)
4. DynamoDB access layer (`packages/api`: table read/write helpers using AWS SDK v3)
5. API CRUD (Lambda handlers for all public + admin routes, wired to API Gateway in CDK)
6. Cognito authentication (user pool, app client, JWT authorizer wired to admin routes)
7. Homepage (`apps/web`: entry point, Splinter grid, filtering, normal-navigation cards)
8. Splinter page (`apps/web`: entry point, fetch + render, `?post=` scroll/highlight, History API updates)
9. Admin editor (`apps/web`: login + Splinter/Post management UI with TipTap)
10. Tests + README (fill in test coverage from section 13; write setup/deploy instructions)

## 15. Definition of Done (MVP)

I can:
1. Deploy BrainSplinters.com to my AWS account via CDK.
2. Create my Cognito admin user.
3. Log in to `/admin`.
4. Create a Splinter.
5. Add a rich-text Post to it using TipTap.
6. Publish the Splinter and Post.
7. Navigate from the homepage to the Splinter's dedicated URL via a normal link click, and see the published content.
