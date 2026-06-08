# AI Empire — Deployment Guide

This document covers Lean 8A security and deployment. For local development, see `.env.example`.

## Prerequisites

- Node.js 20+
- Anthropic API key (`ANTHROPIC_API_KEY`)
- SQLite database (default) — run `npx prisma migrate deploy` and `npm run seed` on first deploy

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | SQLite path or future PostgreSQL URL |
| `ANTHROPIC_API_KEY` | Yes | Opportunity generation |
| `APP_URL` | Production | Absolute URL for server-side links |
| `EMPIRE_API_KEY` | **Required in production** | Secures mutation API routes; unlocks Server Actions via sidebar |
| `EMPIRE_ADMIN_PASSWORD` | Optional | Alternative credential for dashboard mutation unlock |
| `TASK_WORKER_CRON_SECRET` | Optional | Secures `POST /api/tasks/worker/tick` |
| `VALIDATOR_CRON_SECRET` | Optional | Secures `POST /api/validator/run-cycle` |
| `ENABLE_TASK_WORKER` | Optional | Enable background worker process |

Copy `.env.example` to `.env` and fill in values before starting.

## Security model (Lean 8A / 8A.1)

### Production fail-fast

When `NODE_ENV=production`, the application **will not start** without `EMPIRE_API_KEY`.

### Dashboard UI (Server Actions)

Server Actions require mutation credentials in production (or in dev when auth env vars are set).

1. Use **Mutation access** in the sidebar — enter `EMPIRE_API_KEY` or `EMPIRE_ADMIN_PASSWORD` once per browser session (httpOnly cookie).
2. Or call mutation APIs directly with `x-api-key` (external automation).

Unauthorized Server Action calls return a clear error message.

### Mutation API routes

When `EMPIRE_API_KEY` is **unset** in development, mutation routes and Server Actions remain open.

When `EMPIRE_API_KEY` is **set** (or in production), these routes require the key:

| Route | Method |
|-------|--------|
| `/api/opportunities/generate` | POST |
| `/api/opportunities/[id]/status` | POST |
| `/api/opportunities/[id]/validate` | POST |
| `/api/agents/trend-hunter` | POST |
| `/api/tasks/[id]/execute` | POST |
| `/api/tasks/execute-pending` | POST |
| `/api/revenue` | POST |

Cron routes require a valid cron secret **or** `EMPIRE_API_KEY`. If a cron secret is configured, requests without credentials are **always rejected** (no open fallthrough).

| Route | Cron secret env |
|-------|-----------------|
| `/api/tasks/worker/tick` | `TASK_WORKER_CRON_SECRET` |
| `/api/validator/run-cycle` | `VALIDATOR_CRON_SECRET` |

Pass credentials via:

```http
x-api-key: your-empire-api-key
```

or

```http
Authorization: Bearer your-empire-api-key
```

For cron jobs:

```http
x-cron-secret: your-cron-secret
```

### Deprecated endpoints (410 Gone)

These no longer create data:

- `POST /api/stores` — stores created by Forge build tasks
- `POST /api/products` — products created by Gamma marketing tasks
- `GET /api/empire` — use `POST /api/opportunities/generate`

## Production checklist

1. Set `EMPIRE_API_KEY` to a long random string (32+ characters). **Required — app will not boot without it.**
2. Optionally set `EMPIRE_ADMIN_PASSWORD` for dashboard unlock without using the API key in the sidebar.
2. Set `APP_URL` to your public domain.
3. Set `ANTHROPIC_API_KEY`.
4. Run database migrations: `npx prisma migrate deploy`.
5. Optionally run seed: `npm run seed` (development data only).
6. Build: `npm run build && npm run start`.
7. For background automation, run `task-worker` as a separate process with `ENABLE_TASK_WORKER=true`.
8. Schedule cron against `/api/tasks/worker/tick` with `TASK_WORKER_CRON_SECRET` or `EMPIRE_API_KEY`.

## Local development

```bash
cp .env.example .env
# Add ANTHROPIC_API_KEY
# Leave EMPIRE_API_KEY unset for open local mutations
npm install
npx prisma migrate dev
npm run dev
```

## Category intelligence (Lean 8A)

New opportunities receive a real `category` from Claude output or keyword inference (not hardcoded `"Ecommerce"`). This improves empire intelligence recommendations over time.

## What is NOT in Lean 8A / 8A.1

- PostgreSQL migration
- User accounts / NextAuth / RBAC
- Campaign, Supplier, Expense models
- WebhookEvent queue / retry workers

## Lean 8B — Orders & Stripe

First real order flow: **Order → Revenue → Store lifecycle → Opportunity sync → Intelligence**.

### Schema

- `Customer` — per-store email identity with order aggregates
- `Order` — line items as JSON, unique on `(source, externalId)` for idempotency
- `Revenue.orderId` — optional FK linking revenue to an order

### Manual order entry

Store command centre (`/stores/[id]`) includes a **Record Order** form (Server Action, auth-guarded).

### Stripe webhook

`POST /api/webhooks/stripe` handles `checkout.session.completed`:

1. Verifies `stripe-signature` using `STRIPE_WEBHOOK_SECRET`
2. Parses store id from `metadata.storeId` or `client_reference_id`
3. Calls `recordOrderRevenue()` — duplicate sessions are ignored via Order uniqueness

Configure in Stripe Dashboard:

- Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
- Event: `checkout.session.completed`
- On Checkout Session creation, set `metadata.storeId` (or `client_reference_id`) to the Empire store id

### Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `STRIPE_WEBHOOK_SECRET` | For Stripe ingestion | Webhook signature verification |

Webhook route does **not** use `EMPIRE_API_KEY` — Stripe signature is the auth mechanism.

## Lean 8C — Stripe Checkout Creation

Creates Checkout Sessions so real Stripe payments enter the Lean 8B webhook pipeline.

### Checkout API

`POST /api/stores/[id]/checkout` (requires `EMPIRE_API_KEY` when auth is enabled):

- Body (optional): `{ "email": "customer@example.com" }`
- Returns: `{ "success": true, "url": "...", "sessionId": "cs_..." }`
- Uses the store's first product (by id) for line item and price
- Sets `metadata.storeId`, `client_reference_id`, optional `metadata.customerEmail` and `metadata.lineItems`
- Redirect URLs: `/stores/[id]?checkout=success` / `?checkout=cancelled`

Validation errors (422): killed store, no product, invalid price. Missing Stripe key returns 503.

### Store UI

`/stores/[id]` includes **Pay with Stripe (Test)** (Server Action, auth-guarded):

1. Operator clicks button → `createStripeCheckoutAction`
2. Browser redirects to Stripe hosted checkout
3. On payment, Stripe webhook fires → existing Lean 8B ingestion

A test-mode banner appears when `STRIPE_SECRET_KEY` starts with `sk_test_`.

### Local testing with Stripe CLI

```bash
# Terminal 1 — forward webhooks to local app
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy whsec_... from CLI output into .env as STRIPE_WEBHOOK_SECRET

# Terminal 2 — dev server
npm run dev
```

1. Set `STRIPE_SECRET_KEY=sk_test_...` and `STRIPE_WEBHOOK_SECRET=whsec_...` in `.env`
2. Open `/stores/[id]` for a store with at least one product
3. Click **Pay with Stripe (Test)** — use card `4242 4242 4242 4242`
4. Confirm order, revenue, store lifecycle, and opportunity sync update

### Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `STRIPE_SECRET_KEY` | For checkout creation | Stripe API — Checkout Sessions |
| `STRIPE_WEBHOOK_SECRET` | For Stripe ingestion | Webhook signature verification |
| `APP_URL` | Recommended | Success/cancel redirect URLs (defaults to localhost:3000) |

## Phase 8D.0 — Production Readiness

### Schema alignment

Migration `20260608200000_revenue_order_fk` adds the missing `Revenue.orderId` foreign key to match `schema.prisma`.

Before deploy:

```bash
npx prisma migrate deploy
npx prisma generate
```

Verify:

```bash
npx prisma migrate status
```

Expected: **Database schema is up to date!**

Align Prisma packages (both must match):

```json
"prisma": "6.19.3",
"@prisma/client": "6.19.3"
```

### Health and diagnostics

| Endpoint / surface | Purpose |
|--------------------|---------|
| `GET /api/health` | JSON health report; **503** when unhealthy |
| `/readiness` | Human-readable production readiness dashboard |
| Startup logs | `[ai-empire startup]` lines on boot via `instrumentation.ts` |

Health checks: database connection, env vars, Anthropic, Stripe, migration history.

### Production deployment checklist

**Environment validation**

- [ ] `DATABASE_URL` set and reachable
- [ ] `ANTHROPIC_API_KEY` set
- [ ] `EMPIRE_API_KEY` set (required in production — app fails fast without it)
- [ ] `APP_URL` set to public HTTPS domain
- [ ] `npx prisma migrate deploy` completed
- [ ] `GET /api/health` returns `healthy` or acceptable `degraded`

**Backups**

- [ ] SQLite: scheduled copy of `prisma/dev.db` (or migrate to PostgreSQL for production)
- [ ] Off-site encrypted backup storage
- [ ] Restore procedure tested on staging

**Stripe live mode** (when accepting real payments)

- [ ] Replace `sk_test_` with `sk_live_` secret key
- [ ] Live webhook endpoint → `https://your-domain.com/api/webhooks/stripe`
- [ ] Update `STRIPE_WEBHOOK_SECRET` with live signing secret
- [ ] Confirm Checkout redirect URLs use production `APP_URL`
- [ ] Small live payment smoke test through full commerce pipeline
- [ ] Stripe Dashboard alerts for webhook failures enabled

### Monitoring

Point uptime monitors at `GET /api/health`. Treat **503** as down; **200** with `degraded` as warning (e.g. Stripe not configured on a non-commerce deployment).
