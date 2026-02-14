# Memory - Platform Build Context

## Project Identity
- **Platform Name**: Results-as-a-Service Platform (built on better-chatbot v1.20.2)
- **Beachhead Vertical**: Sales Hunter
- **Target Market**: Mid-tier companies, $10M ARR goal
- **Branch**: `claude/platform-architecture-planning-h1crR`

## Key Architecture Decisions
- **Modular Monolith** - NOT microservices. Verticals are isolated modules.
- **Next.js 15 + PostgreSQL + Redis** - Single stack, no MongoDB.
- **Vercel AI SDK** - Multi-provider AI (already integrated).
- **Drizzle ORM** - Type-safe database layer (already integrated).
- **better-auth** - Auth stays as-is. Clerk added for billing/subscriptions only.
- **Agentic Configuration** - Agents are configured via database/JSON, not code changes.
- **Multi-tenancy** - `tenant_id` on all platform tables. Same codebase for SaaS and air-gapped.

## Existing Patterns to Follow
- Drizzle schemas in `src/lib/db/pg/schema.pg.ts` (single file, extend it)
- Drizzle config points to single schema file: `./src/lib/db/pg/schema.pg.ts`
- Repository pattern: interface in `src/types/`, implementation in `src/lib/db/pg/repositories/`, export from `src/lib/db/repository.ts`
- Tools use Vercel AI SDK `tool()` helper with Zod schemas
- Tool registry: `AppDefaultToolkit` enum + `APP_DEFAULT_TOOL_KIT` record in `tool-kit.ts`
- Agents: Zod-validated, user-owned with visibility (public/private/readonly)
- Workflows: Graph-based with NodeKind enum, node executors, React Flow UI
- All IDs: UUID with `defaultRandom()`
- Timestamps: `createdAt` + `updatedAt` with `CURRENT_TIMESTAMP` default
- DB instance: `pgDb` from `src/lib/db/pg/db.pg.ts`

## File Structure Conventions
- Types: `src/types/*.ts`
- Lib modules: `src/lib/<module>/`
- API routes: `src/app/api/<resource>/route.ts`
- Pages: `src/app/(<group>)/<page>/page.tsx`
- Components: `src/components/<area>/<component>.tsx`

## Connector: Salesforce
- Uses Salesforce REST API (jsforce-compatible patterns)
- OAuth 2.0 flow for authentication
- SOQL for data queries
- Supports: Leads, Contacts, Accounts, Opportunities, Tasks, Custom Objects

## Sales Hunter Vertical
- Pre-built configurable agents: Prospector, Qualifier, Outreach Composer, Pipeline Analyst, Deal Coach
- All agent behaviors defined via database-stored prompts and configs
- Workflows: Lead enrichment, outreach sequences, deal analysis, pipeline review
- Metrics: Pipeline value, conversion rate, response time, leads generated, deals closed

## Admin Requirements
- User management (view all users, activity, roles)
- Usage tracking (AI calls, tokens, connector syncs)
- Billing overview (Clerk subscriptions, plans, revenue)
- Activity feed (audit log of all platform actions)
- Tenant management (for multi-tenant deployments)

## Billing: Clerk
- Clerk handles: payment processing, subscription management, plan enforcement
- Webhook integration for subscription events
- Usage-based billing support via usage tracking tables
- Plans: Starter ($2K/mo), Professional ($5K/mo), Enterprise ($10K+/mo)
