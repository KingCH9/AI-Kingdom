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

### Migration failed on release

If a migration failed (e.g. UTF-8 BOM in `migration.sql`, P3009):

```bash
# Migration failed before applying SQL — mark as rolled back, then redeploy
railway run npx prisma migrate resolve --rolled-back 20260609000000_baseline
railway run npm run db:migrate:deploy
```

Use `--rolled-back` when the migration **did not** successfully create schema (typical BOM/SQL error).

Use `--applied` only if you manually applied the migration SQL and need to mark it complete:

```bash
railway run npx prisma migrate resolve --applied 20260609000000_baseline
```

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
