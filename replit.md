# Aureon Store

A loja virtual da Aureon apresenta acessórios de tecnologia e oferece um painel privado para administrar o catálogo.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/aureon-store` — storefront, Clerk login and admin catalog interface
- `artifacts/api-server` — product API and protected admin mutations
- `lib/db/src/schema/products.ts` — product database model
- `lib/api-spec/openapi.yaml` — source of truth for product API contracts

## Architecture decisions

- Clerk handles browser authentication and sessions; the API does not accept custom password or bearer-token implementations.
- Public product reads are separate from protected catalog mutations.
- Product image changes use a URL field so the owner can replace imagery without a storage provider.

## Product

Customers can browse the Aureon catalog and featured products. The administrator signs in through Clerk and can add, edit, feature, update prices and images, or delete products from `/admin`.

## User preferences

- The admin account is intended for `rodrigodumont11@gmail.com`.

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`.
- The initial product catalog is seeded in the development database; production schema changes are applied through the Publish flow.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
