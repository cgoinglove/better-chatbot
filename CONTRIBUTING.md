# Contributing

Thanks for taking the time. This repository is a pnpm + Turborepo monorepo; the
product lives in `apps/web`.

## Getting set up

```bash
pnpm install        # writes .env from .env.example
pnpm docker:pg      # Postgres with pgvector
pnpm db:migrate
pnpm dev
```

You need the three variables from [the README](README.md#quick-start) filled in.

## Before you open a pull request

```bash
pnpm check          # lint, typecheck, unit tests — all three must pass
```

Add `pnpm build` if you touched streaming, the database schema, or anything
that crosses the client/server boundary. Type errors do not always surface
without it.

## How the code is organized

- `apps/web` — the Next.js app. Almost all changes happen here.
- `apps/desktop` — the Electron shell (local MCP servers, filesystem, keychain).
- `packages/*` — shared MCP schemas and contracts. Never import from `apps/web`
  inside a package.
- `servers/mcp-stdio` — the local-exec MCP server used by the desktop app.

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org):
  `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- **Filenames** are kebab-case. Biome enforces formatting and linting on commit.
- **Migrations are hand-written SQL** in `apps/web/src/lib/db/migrations/pg/`
  plus a matching entry in `meta/_journal.json`. Do not run
  `drizzle-kit generate` — it produces drifted snapshots against this schema.
  `pnpm db:check-parity` verifies a journal replay matches the schema.
- **Auth** goes through `withAuth` from `lib/auth/route-guard`. Repository reads
  and writes are scoped by user and workspace; do not widen them.
- **Tests** cover the happy path plus one failure mode. Unit tests run without a
  database — mock `pgDb`.

## Tests

```bash
pnpm test           # unit tests (vitest)
pnpm test:e2e       # end-to-end (playwright)
```

## Questions

Ask in [Discord](https://discord.gg/9dwdAYKBPp) or open an issue. A short issue
describing what you want to change, before writing a large patch, usually saves
everyone time.
