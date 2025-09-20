# Repository Guidelines

## Project Structure & Module Organization
- Source in `src/` (Next.js app in `src/app`, UI in `src/components`, shared logic in `src/lib`, hooks in `src/hooks`).
- Tests: unit in `src/**/*.test.ts(x)`, E2E in `tests/` (Playwright).
- Database and migrations in `src/lib/db` and `src/lib/db/migrations/pg` (Drizzle + Postgres).
- Scripts in `scripts/`, docs in `docs/tips-guides/`, Docker in `docker/`.

## Build, Test, and Development Commands
- Dev server: `pnpm dev` (HTTPS: `pnpm dev:https`).
- Build/serve: `pnpm build` then `pnpm start` (use `build:local` to skip HTTPS).
- Unit tests: `pnpm test` (watch: `pnpm test:watch`).
- E2E tests: `pnpm test:e2e` (UI mode: `pnpm test:e2e:ui`).
- Lint/format: `pnpm lint` and `pnpm format` (autofix: `pnpm lint:fix`).
- Types/check-all: `pnpm check-types`, or `pnpm check` to run lint + types + unit tests.
- DB: `pnpm db:generate | db:push | db:migrate | db:studio`.
- Docker (DB only): `docker compose -f docker/compose.yml up -d postgres`.
- Full compose: `pnpm docker-compose:up`, `pnpm docker-compose:down`.
- Typical flow (local dev):
  - Start DB: `docker compose -f docker/compose.yml up -d postgres`
  - Migrate: `pnpm db:migrate`
  - Seed test users (E2E): `pnpm test:e2e:seed`
  - Run app: `pnpm dev` or `pnpm build && pnpm start`

## Coding Style & Naming Conventions
- TypeScript, React, Next.js. Prefer functional components and hooks.
- Format/lint with Biome + ESLint (enforced via Husky/lint-staged). Run `pnpm format` before committing.
- Indent with 2 spaces; use descriptive names (e.g., `use-profile-translations.ts`).
- File naming: kebab-case for files, PascalCase for React components.

## Testing Guidelines
- Unit tests with Vitest; colocate as `*.test.ts(x)` near source.
- E2E with Playwright under `tests/`. Common helpers live in `tests/helpers/`.
- Aim to cover core logic in `src/lib/**` and critical flows (auth, workflow, MCP).
- Run `pnpm check` locally before opening a PR.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject; include scope when helpful (e.g., `lib:`, `app:`, `tests:`).
- PRs: clear description, linked issues, screenshots/GIFs for UI, and migration notes when DB changes.
- CI expects `pnpm check` to pass; include new/updated tests for behavior changes.

## Security & Configuration Tips
- Never commit secrets. Copy `.env.example` to `.env` and adjust locally (see `scripts/initial-env.ts`).
- For local services, use Docker (`docker/compose.yml`) or the provided `docker:*` scripts.
- MCP-related setup: see `.mcp-config.json` and `docs/tips-guides/mcp-server-setup-and-tool-testing.md`.
