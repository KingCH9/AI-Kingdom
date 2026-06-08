# PostgreSQL Migration Plan — SQLite to Production

This document describes how AI Empire moves from local SQLite development to PostgreSQL on Railway.

## Why separate migration histories?

Existing migrations in `prisma/migrations/` were generated for **SQLite** and use SQLite-specific syntax (`PRAGMA`, table rebuilds, `AUTOINCREMENT`). They cannot run on PostgreSQL.

Production uses:

| Asset | Purpose |
|-------|---------|
| `prisma/schema.postgresql.prisma` | Production schema (same models, `provider = postgresql`) |
| `prisma/migrations-postgresql/` | PostgreSQL-only baseline migration |
| `prisma.config.ts` | Auto-selects schema + migrations from `DATABASE_URL` |

When `DATABASE_URL` starts with `postgresql://` or `postgres://`, Prisma uses the PostgreSQL schema and migration folder automatically.

## Fresh production deploy (recommended)

No data to migrate — Railway greenfield:

1. Provision Railway PostgreSQL plugin
2. Railway injects `DATABASE_URL` (PostgreSQL)
3. Deploy runs `npx prisma migrate deploy` (release command)
4. Baseline migration `20260609000000_baseline` creates all tables

## Migrating existing SQLite data to PostgreSQL

When you have local SQLite data to carry forward:

### Step 1 — Export from SQLite

```bash
# Ensure local SQLite is current
npx prisma migrate deploy

# Export tables (example using sqlite3 CLI)
sqlite3 prisma/dev.db .dump > sqlite-export.sql
```

For structured export, prefer Prisma scripts or `pgloader` for direct SQLite → PostgreSQL transfer.

### Step 2 — Apply PostgreSQL schema

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db" npx prisma migrate deploy
```

### Step 3 — Import data

Options (pick one):

| Tool | Notes |
|------|-------|
| **pgloader** | Best for bulk SQLite → PostgreSQL with type mapping |
| **Custom Prisma script** | Read from SQLite client, write via PostgreSQL client |
| **CSV per table** | Export/import for small datasets |

### Step 4 — Verify

```bash
DATABASE_URL="postgresql://..." npx prisma migrate status
curl https://your-app.railway.app/api/health
```

Check row counts on critical tables: `Store`, `Order`, `Revenue`, `Opportunity`.

## Schema parity rules

After any model change:

1. Update **both** `prisma/schema.prisma` (SQLite dev) and `prisma/schema.postgresql.prisma`
2. Create SQLite migration: `npx prisma migrate dev --name your_change`
3. Create PostgreSQL migration: `npx prisma migrate dev --name your_change --schema prisma/schema.postgresql.prisma`  
   (with `DATABASE_URL` pointing to PostgreSQL)
4. Or regenerate diff:  
   `npx prisma migrate diff --from-migrations prisma/migrations-postgresql --to-schema-datamodel prisma/schema.postgresql.prisma --script`

## Local PostgreSQL testing

```bash
docker compose -f docker-compose.postgres.yml up -d
npm run db:verify-postgres
```

Uses `VERIFY_DATABASE_URL` or defaults to `postgresql://ai_empire:ai_empire_test@localhost:5433/ai_empire`.

## Rollback

Railway PostgreSQL supports point-in-time recovery on paid plans. Before major migrations:

1. Create a manual backup: `pg_dump $DATABASE_URL > backup.sql`
2. Test restore on a staging database first

## Future: single provider

When the team standardizes on PostgreSQL for all environments, consolidate to one schema file and one migration history by:

1. Switching local dev to Docker PostgreSQL
2. Retiring SQLite migrations
3. Using `prisma/migrations-postgresql/` as the sole migration path
