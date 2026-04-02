# Memory - Platform Build Context

## Project Identity
- **Product Name**: SayfeAI Sales Hunter
- **Repo**: `csbenson001/sayfeai-saleshunter` (private)
- **Upstream Base**: `cgoinglove/better-chatbot` (public)
- **Business Model**: Results-as-a-Service (RaaS)
- **Beachhead Vertical**: Sales Hunter (chemical distribution + oil & gas regulatory)
- **Target Market**: Mid-tier companies, $10M ARR goal
- **Main Branch**: `main` (merged from `claude/platform-architecture-planning-h1crR`)

## Stack
- **Next.js 16.1.6** + React 19.2.4 + TypeScript 5.9
- **PostgreSQL** with Drizzle ORM + pgvector
- **Vercel AI SDK** - Multi-provider AI (OpenAI, Anthropic, Google, XAI, Ollama, OpenRouter)
- **better-auth** for authentication
- **Redis** for multi-instance support
- **Pre-commit**: lint-staged with prettier + eslint

## Key Architecture Decisions
- **Modular Monolith** - NOT microservices. Verticals are isolated modules.
- **Single schema file** - All tables in `src/lib/db/pg/schema.pg.ts`
- **Multi-tenancy** - `tenant_id` on all platform tables. Default: `"00000000-0000-0000-0000-000000000000"`
- **Agentic Configuration** - Agents configured via database/JSON, not code changes
- **Two naming conventions** in schema: upstream uses `*Table`, platform uses `*Schema`

## Build History (5 Sessions)

### Session 1: Platform Foundation
- Architecture strategy doc
- Sales Hunter vertical (5 AI agents, workflows, prompts, metrics)
- Salesforce connector (OAuth, sync, mappings)
- Admin dashboard (billing, usage, tenants, users, activity)
- Billing tables and plans
- Platform types (559 lines)

### Session 2: Core Modules (7 parallel agents)
- RBAC (roles, permissions, API keys, trials)
- Knowledge Base (ingestion, chunking, embeddings, search)
- Company Intelligence (research engine, products, value chains)
- Industry Context (seed data for 15 regulatory programs)
- Prospecting (EPA ECHO scanner, web scanner, prospect scorer)
- Contact Intelligence (enrichment, scoring, filing extraction)
- State Research (orchestrator, sources registry, agent configs)

### Session 3: Completion + Polish
- Fixed ~50 TypeScript errors
- Added prospecting and industry modules (API routes + UI pages)
- Built missing pages (filings, contacts, research, company, industries)
- Added navigation links throughout

### Session 4: Sales Intelligence (10 Modules)
- Sales Brief Generator
- Real-Time Alert System
- Autonomous Research Workflows
- Relationship Mapping & Buying Committee
- Vertical Sales Playbooks & Battle Cards
- Buying Signal Detection
- Compliance Burden Calculator (15 regulatory programs)
- Outreach Sequence Generator
- Customer Health & Expansion Scoring
- Win/Loss Analysis Engine
- 46 files, 10,029 insertions

### Session 5: Merge + Transition
- Merged upstream main (Next.js 16.1.6 upgrade)
- Resolved conflicts (schema, repository, gitignore)
- Fixed UserSchema -> UserTable references (12 FK refs)
- Removed unused React imports
- Created private repo `sayfeai-saleshunter`
- Created CLAUDE.md and transition docs

## Current Stats
- **202 platform files**, **42,551 lines** of platform code
- **0 TypeScript errors** in platform code
- **336 tests passing**
- **180 pre-existing upstream TS errors** (AI SDK, zod, missing packages)
- **3 pre-existing test failures** (missing @aws-sdk/client-s3, ollama-ai-provider-v2)

## What Needs Doing Next (Prioritized)

### P0: Make It Run
1. Generate Drizzle migrations for platform tables (`npx drizzle-kit generate`)
2. Set up PostgreSQL with pgvector extension
3. Run migrations against a real database
4. Fix upstream TypeScript errors (AI SDK breaking changes from Next 16 upgrade)
5. Get `pnpm dev` running end-to-end

### P1: Make It Work
6. Wire up environment variables (.env configuration)
7. Test Salesforce connector against sandbox
8. Add authentication guards to platform API routes
9. Write integration tests for core flows (prospect scan -> lead -> intelligence)
10. Connect AI modules to actual LLM calls (currently use placeholder responses)

### P2: Make It Ship
11. Wire up Clerk/Stripe billing integration
12. Add real-time WebSocket updates for alerts and workflow runs
13. Build onboarding flow for new tenants
14. Performance optimization (server components, caching)
15. Deploy to Vercel or Docker

## Salesforce Connector
- Uses Salesforce REST API (jsforce-compatible patterns)
- OAuth 2.0 flow for authentication
- SOQL for data queries
- Supports: Leads, Contacts, Accounts, Opportunities, Tasks, Custom Objects

## Sales Hunter AI Agents
- **Prospector**: Finds and qualifies prospects from regulatory data
- **Qualifier**: Scores leads based on compliance burden and buying signals
- **Outreach Composer**: Generates personalized multi-channel sequences
- **Pipeline Analyst**: Analyzes deal velocity and conversion patterns
- **Deal Coach**: Real-time coaching during deal progression

## Billing Plans
- Starter ($2K/mo), Professional ($5K/mo), Enterprise ($10K+/mo)
- Usage-based billing via usage tracking tables
- Clerk handles payment processing and subscription management
