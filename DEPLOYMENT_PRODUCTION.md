# AI Empire — Production Deployment (Railway)

Step-by-step guide for deploying the AI Empire dashboard to Railway with PostgreSQL.

For local development, see `.env.example`. For security model details, see `DEPLOYMENT.md`.

---

## Overview

| Component | Production choice |
|-----------|-------------------|
| Hosting | [Railway](https://railway.app) |
| Database | Railway PostgreSQL |
| Runtime | Node.js 20+ (Nixpacks) |
| Health probe | `GET /api/health` |
| Readiness UI | `/readiness` |

Configuration files:

- `railway.toml` — build, release, health check
- `prisma/schema.postgresql.prisma` — production schema
- `prisma/migrations-postgresql/` — PostgreSQL migrations
- `.env.production.example` — env template

---

## Phase 1 — Prerequisites

- [ ] Railway account
- [ ] GitHub repo connected to Railway (or Railway CLI)
- [ ] Anthropic API key
- [ ] Stripe keys (test for staging, live for production payments)
- [ ] Generated `EMPIRE_API_KEY` (64-char hex recommended)

Generate a new API key:

```bash
npx tsx -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('hex'))"
```

---

## Phase 2 — Railway project setup

### 2.1 Create project

1. Railway Dashboard → **New Project**
2. **Deploy from GitHub repo** → select `dasboard`
3. Railway detects Next.js via Nixpacks

### 2.2 Add PostgreSQL

1. Project → **+ New** → **Database** → **PostgreSQL**
2. Railway creates `DATABASE_URL` automatically
3. Link the database to your web service (Variables → reference `${{Postgres.DATABASE_URL}}`)

### 2.3 Configure environment variables

Copy from `.env.production.example` and set in Railway **Variables**:

#### Required

| Variable | Example / notes |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Auto from PostgreSQL plugin |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `EMPIRE_API_KEY` | Your generated 64-char secret |
| `APP_URL` | `https://your-app.up.railway.app` |

#### Stripe (when accepting payments)

| Variable | Notes |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` for production |
| `STRIPE_WEBHOOK_SECRET` | Live webhook signing secret |

#### Optional

| Variable | Purpose |
|----------|---------|
| `EMPIRE_ADMIN_PASSWORD` | Dashboard mutation unlock via sidebar |
| `TASK_WORKER_CRON_SECRET` | Secures `/api/tasks/worker/tick` |
| `VALIDATOR_CRON_SECRET` | Secures `/api/validator/run-cycle` |

See **Production Environment Variable Checklist** below.

---

## Phase 3 — Deploy

Railway reads `railway.toml`:

```toml
buildCommand  = npm run build
releaseCommand = npm run db:migrate:deploy
startCommand  = npm run start:production
healthcheckPath = /api/health
```

### What happens on deploy

1. **Build** — installs deps, runs `prisma generate && next build`
2. **Release** — runs `npm run db:migrate:deploy` (best-effort before start)
3. **Start** — `npm run start:production` applies migrations, then starts Next.js; `instrumentation.ts` logs startup diagnostics
4. **Health check** — Railway polls `/api/health`

### Manual deploy (CLI)

```bash
railway login
railway link
railway up
```

---

## Phase 4 — Post-deploy verification

### 4.1 Health endpoint

```bash
curl -s https://your-app.up.railway.app/api/health | jq
```

Expected:

- HTTP **200** (healthy or degraded)
- HTTP **503** only when critical checks fail
- `database_provider`: pass — PostgreSQL
- `empire_api_key`: pass
- `anthropic`: pass

### 4.2 Readiness dashboard

Open `https://your-app.up.railway.app/readiness` and confirm all critical checks pass.

### 4.3 Startup logs

Railway → Service → **Deployments** → View logs. Look for:

```
[ai-empire startup] environment=production status=healthy
[ai-empire startup] database: Connected (PostgreSQL)
[ai-empire startup] database_provider: PostgreSQL
```

### 4.4 Stripe webhook (when live)

1. Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://your-app.up.railway.app/api/webhooks/stripe`
3. Events: `checkout.session.completed`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET` in Railway
5. Redeploy or restart service

---

## Phase 5 — SQLite data migration (optional)

If migrating existing local data, follow `docs/POSTGRESQL_MIGRATION_PLAN.md`.

For greenfield production deploys, skip this — the baseline migration creates an empty schema.

---

## Production Environment Variable Checklist

Use this before marking production live:

### Core (required)

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` — PostgreSQL (Railway plugin)
- [ ] `ANTHROPIC_API_KEY` — valid and funded
- [ ] `EMPIRE_API_KEY` — unique 64-char secret, not the example value
- [ ] `APP_URL` — public HTTPS URL matching Railway domain

### Database

- [ ] `npx prisma migrate deploy` succeeded in release phase
- [ ] `/api/health` shows `database_provider: PostgreSQL`
- [ ] Railway PostgreSQL backups enabled (Pro plan) or manual `pg_dump` schedule documented

### Security

- [ ] `EMPIRE_API_KEY` set — app fails fast without it
- [ ] No secrets committed to git
- [ ] Mutation APIs require `x-api-key` header

### Stripe (if commerce enabled)

- [ ] `STRIPE_SECRET_KEY` — live key for production
- [ ] `STRIPE_WEBHOOK_SECRET` — live signing secret
- [ ] Webhook endpoint registered in Stripe Dashboard
- [ ] Small live payment smoke test completed

### Monitoring

- [ ] Railway health check on `/api/health` passing
- [ ] External uptime monitor configured (optional)
- [ ] Stripe Dashboard alerts for failed webhooks enabled

---

## Troubleshooting

### App won't start — `EMPIRE_API_KEY is required in production`

Set `EMPIRE_API_KEY` in Railway Variables and redeploy.

### App won't start — `SQLite DATABASE_URL is not supported in production`

Ensure Railway PostgreSQL is linked and `DATABASE_URL` references the Postgres plugin, not `file:./`.

### App won't start — `Production database connection failed`

- Confirm PostgreSQL service is running
- Check `DATABASE_URL` format: `postgresql://user:pass@host:port/db`
- Verify network linking between web service and database

### Migration failed on release (P3009 / stuck baseline)

Root cause on first deploy: `20260609000000_baseline/migration.sql` had a UTF-8 BOM, so
PostgreSQL rejected the first SQL line. Prisma records the migration as **failed** and
blocks further deploys until the state is cleared. The BOM is fixed on `main` (commit
`6d26194`); the Railway database still needs a one-time resolve.

**You cannot run Prisma against Railway Postgres from your PC** — `DATABASE_URL` uses
`postgres.railway.internal`, which is only reachable inside Railway's network.

#### Where to run recovery commands

| Method | Where | Notes |
|--------|-------|-------|
| **Railway CLI (recommended)** | Your PC terminal | `railway run` executes on Railway's network with `DATABASE_URL` injected |
| **Railway Shell** | Dashboard → web service → Shell | Same env as running app; run npm scripts directly |

#### Step 1 — Inspect (read-only)

From your PC (after `railway login` and `railway link`):

```bash
railway run npm run db:railway:inspect
```

This prints `_prisma_migrations` rows and which of the 9 baseline tables exist.

#### Step 2 — Recover (most common: migration never applied)

When inspection shows **0/9 baseline tables** (typical BOM failure):

```bash
railway run npx prisma migrate resolve --rolled-back 20260609000000_baseline
railway run npm run db:migrate:deploy
railway run npx prisma migrate status
```

Or run the automated recovery script:

```bash
railway run npm run db:railway:recover
```

#### Step 3 — If all 9 tables already exist (rare)

Schema applied but history stuck — mark applied instead:

```bash
railway run npx prisma migrate resolve --applied 20260609000000_baseline
railway run npx prisma migrate status
```

#### Step 4 — If some but not all tables exist (very rare)

Prisma runs each migration in a transaction, so partial apply is unlikely after a BOM
error. If inspection shows partial tables, drop them on Railway, then:

```sql
DROP TABLE IF EXISTS "AgentLog" CASCADE;
DROP TABLE IF EXISTS "Task" CASCADE;
DROP TABLE IF EXISTS "Revenue" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "Customer" CASCADE;
DROP TABLE IF EXISTS "Store" CASCADE;
DROP TABLE IF EXISTS "Opportunity" CASCADE;
DROP TABLE IF EXISTS "Agent" CASCADE;
```

Then:

```bash
railway run npx prisma migrate resolve --rolled-back 20260609000000_baseline
railway run npm run db:migrate:deploy
```

**Do not run `migrate resolve` locally** — local `.env` uses SQLite (`file:./dev.db`).

Use `--rolled-back` when the migration **did not** successfully create schema (typical BOM/SQL error).

Use `--applied` only if all baseline tables exist and schema matches.

Check status:

```bash
railway run npx prisma migrate status
```

See `docs/POSTGRESQL_MIGRATION_PLAN.md`.

### Health returns 503

Inspect `/api/health` JSON for `"status": "fail"` checks. Common causes:

- Missing `ANTHROPIC_API_KEY`
- Database unreachable
- No migrations applied

---

## Local PostgreSQL verification

Before deploying, verify migrations against a local Postgres instance:

```bash
docker compose -f docker-compose.postgres.yml up -d
npm run db:verify-postgres
```

---

## Related docs

| Document | Purpose |
|----------|---------|
| `DEPLOYMENT.md` | Security model, API auth, Lean 8A–8D |
| `docs/POSTGRESQL_MIGRATION_PLAN.md` | SQLite → PostgreSQL data migration |
| `.env.production.example` | Production env template |
| `/readiness` | Live diagnostics dashboard |
