# market. — Single-Vendor E-Commerce Platform (Ethiopia)

A full-stack, single-vendor e-commerce platform built with **Turborepo**, **Bun**, **NestJS**, **Next.js (App Router)**, **Prisma 6**, **PostgreSQL 16**, **Redis / BullMQ**, and **MinIO / S3**.

## Monorepo Structure

```text
meskot/
├── apps/
│   ├── api/                 # NestJS modular monolith (/api/v1 + Swagger /api/docs)
│   ├── web/                 # Next.js App Router (Storefront + Staff & Delivery Dashboard)
│   └── worker/              # BullMQ background worker (15-min stock reservation expiry)
├── packages/
│   ├── database/            # Prisma 6 schema, migrations, generated client, seed
│   ├── shared-types/        # Status transition matrices, RBAC codes, ETB currency formatter
│   └── shared-schemas/      # Shared Zod schemas & Ethiopian phone normalization
└── infrastructure/docker/   # Dev & production Dockerfiles and Compose stacks
```

## Quick Start (Local Development)

1. **Install dependencies**
   ```bash
   bun install
   ```
2. **Configure environment**
   Copy `.env.example` to `.env` and set `DATABASE_URL` (either start Docker services with `bun run docker:up` or point to a local PostgreSQL database).
3. **Run Prisma 6 migrations & seed data**
   ```bash
   bun run db:generate
   bun run db:migrate -- --name init
   bun run db:seed
   ```
4. **Start API & Web dev servers**
   ```bash
   bun run turbo dev --filter=@meskot/api --filter=@meskot/web
   ```
   - Storefront & Dashboard: `http://localhost:3000`
   - NestJS API: `http://localhost:4000/api/v1`
   - Swagger Docs: `http://localhost:4000/api/docs`

### Seeded Development Accounts (Password: `Password123!`)
| Role | Email | Phone |
| :--- | :--- | :--- |
| Super Admin | `meron@market.et` | `+251911000001` |
| Delivery Agent | `dawit.delivery@market.et` | `+251911000002` |
| Customer | `selam@example.com` | `+251911000003` |

## Testing & Verification

```bash
# Unit & SRS Section 12 acceptance tests (ORD-06, PAY-02, DEL-04, upload magic bytes)
bun test

# Full monorepo TypeScript check
bun run typecheck

# Playwright E2E tests (requires running web & api servers)
bunx playwright install chromium
bun run test:e2e
```

## Production Deployment (Docker Compose)

```bash
docker compose -f infrastructure/docker/docker-compose.prod.yml up -d --build
```
