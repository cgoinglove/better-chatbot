# SayfeAI Sales Hunter - Project Context

## What This Is

A **Results-as-a-Service (RaaS) AI sales intelligence platform** built on top of [better-chatbot](https://github.com/cgoinglove/better-chatbot). Targets chemical distribution and oil & gas regulatory sales teams.

- **Repo**: `csbenson001/sayfeai-saleshunter` (private)
- **Upstream**: `cgoinglove/better-chatbot` (public, for pulling base updates)
- **Stack**: Next.js 16.1.6, React 19.2.4, TypeScript 5.9, PostgreSQL, Drizzle ORM, Vercel AI SDK
- **Architecture**: Modular monolith with multi-tenancy

## Critical Patterns

### Drizzle ORM

- **Single schema file**: `src/lib/db/pg/schema.pg.ts` (2,839 lines, ~55 tables)
- **Upstream tables use `*Table` naming** (e.g., `UserTable`, `ChatThreadTable`)
- **Platform tables use `*Schema` naming** (e.g., `TenantSchema`, `LeadSchema`, `SalesBriefSchema`)
- **Typed varchar columns require casts**: `eq(Schema.status, value as BriefStatus)` — Drizzle's `eq()` rejects plain strings for typed columns
- **Numeric columns store as strings**: Use `String()` on insert, `Number()` on read
- **pgvector**: Custom type for `vector(1536)` defined at top of schema file
- **DB instance**: `pgDb` from `src/lib/db/pg/db.pg.ts`

### Multi-Tenancy

- All platform tables have `tenant_id` column
- Default tenant: `"00000000-0000-0000-0000-000000000000"`
- Resolved from `x-tenant-id` request header in API routes

### Next.js App Router

- Route params are async: `{ params }: { params: Promise<{ id: string }> }` with `const { id } = await params;`
- API routes return `NextResponse.json()`
- Pages under route groups: `(sales-hunter)`, `(admin)`, `(chat)`, `(auth)`

### Import Aliases

```
app-types/*  → src/types/*
lib/*        → src/lib/*
ui/*         → src/components/ui/*
auth/*       → src/lib/auth/*
@/*          → src/*
```

### Repository Pattern

- Interface types in `src/types/*.ts`
- Implementation in `src/lib/db/pg/repositories/*-repository.pg.ts`
- Exported from `src/lib/db/repository.ts`

## Platform File Structure (202 files, 42,551 lines)

```
src/types/                          # 9 type definition files (2,842 lines)
  platform.ts                       # Core platform types (tenants, connectors, leads, billing)
  rbac.ts                           # Roles, permissions, API keys, trials
  knowledge.ts                      # Document ingestion, chunks, embeddings
  company-intelligence.ts           # Company profiles, products, value chains
  contact-intelligence.ts           # Contacts, enrichment, activities
  industry.ts                       # Industry profiles, regulations, documents
  prospecting.ts                    # Prospects, signals, sources, scanning
  state-research.ts                 # Research agents, tasks, sources, findings
  sales-intelligence.ts             # All 10 intelligence module types

src/lib/db/pg/schema.pg.ts         # Single schema file (2,839 lines, ~55 tables)
src/lib/db/pg/repositories/        # 11 platform repositories (3,745 lines)
src/lib/db/repository.ts           # Central export file

src/lib/platform/                   # 36 platform engine modules (7,062 lines)
  sales-intelligence/               # 10 modules: brief-generator, alert-engine,
                                    #   workflow-engine, relationship-mapper,
                                    #   playbook-builder, signal-detector,
                                    #   compliance-calculator, outreach-generator,
                                    #   customer-health, win-loss-analyzer
  prospecting/                      # EPA ECHO scanner, web scanner, prospect scorer
  industries/                       # Industry context, seed data (15 regulatory programs)
  knowledge/                        # Chunker, embeddings, ingestion
  company-intelligence/             # Research engine
  contacts/                         # Enrichment, scoring, filing extraction
  state-research/                   # Orchestrator, sources registry, agent configs
  rbac/                             # Permissions, seed data
  agents/                           # Configurable agent engine
  connectors/                       # Base, registry, sync engine
  billing/                          # Plans, usage tracker
  tenancy/                          # Multi-tenant context
  verticals/                        # Vertical registry

src/lib/connectors/salesforce/      # 5 files (1,546 lines) - Salesforce integration
src/lib/verticals/sales-hunter/     # 11 files (1,622 lines) - Sales Hunter AI agents

src/app/api/sales-hunter/           # 36 API routes (2,649 lines)
src/app/api/platform/               # 22 API routes (1,505 lines)
src/app/api/admin/                  # 14 API routes (762 lines)

src/app/(sales-hunter)/sales/       # 28 UI pages (10,651 lines)
src/app/(admin)/admin/              # 14 UI pages (5,293 lines)
```

## 10 Sales Intelligence Modules

| # | Module | Engine File | API Routes |
|---|--------|-------------|------------|
| 1 | Sales Brief Generator | `brief-generator.ts` | briefs/, briefs/[id] |
| 2 | Real-Time Alert System | `alert-engine.ts` | alerts/, alerts/[id], alerts/evaluate, alerts/rules |
| 3 | Research Workflows | `workflow-engine.ts` | workflows/, workflows/[id], workflows/[id]/run |
| 4 | Relationship Mapping | `relationship-mapper.ts` | relationships/, relationships/[id] |
| 5 | Sales Playbooks | `playbook-builder.ts` | playbooks/, playbooks/[id] |
| 6 | Buying Signal Detection | `signal-detector.ts` | signals/ |
| 7 | Compliance Calculator | `compliance-calculator.ts` | compliance/ |
| 8 | Outreach Sequences | `outreach-generator.ts` | outreach/, outreach/[id] |
| 9 | Customer Health | `customer-health.ts` | health/ |
| 10 | Win/Loss Analysis | `win-loss-analyzer.ts` | deals/, deals/[id] |

## Current State

- **TypeScript**: 0 errors in platform code (180 pre-existing upstream errors in base chatbot code)
- **Tests**: 336 passing, 3 failing (all upstream: missing `@aws-sdk/client-s3`, `ollama-ai-provider-v2`)
- **Pre-commit hooks**: lint-staged with prettier + eslint (auto-runs on commit)

## Known Issues / Tech Debt

1. **180 upstream TypeScript errors** — base better-chatbot code has type issues with AI SDK, zod v3/v4, and missing packages. These are NOT platform code issues.
2. **No database migrations** for platform tables — schema defined but no Drizzle migration files generated yet
3. **No integration tests** for platform modules — unit test infrastructure exists but platform-specific tests not written
4. **Salesforce connector untested** — OAuth flow and sync engine built but not tested against live instance
5. **UI pages are client-side only** — All sales-hunter pages use `"use client"` with fetch calls; no server components yet
6. **Billing integration placeholder** — Plans defined but no Clerk/Stripe integration wired up
