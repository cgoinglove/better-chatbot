# Platform Build Specification: Sales Hunter on Results-as-a-Service

## Scope Overview

Transform better-chatbot (Next.js 15 chatbot) into a multi-tenant, vertical SaaS platform
with Sales Hunter as the beachhead vertical. All vertical modules are isolated from core.
System is agentic and configuration-driven -- behaviors change via database config, not code.

## Architecture Principles

1. **Modular Monolith**: Single Next.js app, verticals are isolated modules under `src/lib/verticals/`
2. **Config-Driven Agents**: All AI agent behaviors stored in database, loaded at runtime
3. **Connector Framework**: Pluggable data source connectors, starting with Salesforce
4. **Multi-Tenancy**: `tenant_id` column on all platform tables, middleware sets tenant context
5. **Vertical Isolation**: Each vertical has its own agents, workflows, prompts, metrics, UI
6. **Clerk for Billing**: Payment, subscriptions, plan enforcement via Clerk webhooks
7. **Admin Oversight**: Full admin dashboard for users, usage, activity, billing

## Module Specifications

### 1. Platform Types (`src/types/platform.ts`)
- Tenant, Connector, Pipeline, PipelineRun, Metric, ROISnapshot types
- ConfigurableAgent, AgentConfig, AgentTool types
- VerticalDefinition, VerticalModule interfaces
- BillingPlan, Subscription, UsageRecord types
- AdminUser, ActivityLog, AuditEntry types
- All Zod schemas for validation

### 2. Database Schema Extensions (`src/lib/db/pg/schema.pg.ts`)
New tables:
- `tenant` - multi-tenancy (id, name, slug, deployment_mode, enabled_verticals, settings)
- `connector` - data source configs (tenant_id, type, name, config, status, last_sync_at)
- `connector_sync_log` - sync history (connector_id, status, records_processed, errors)
- `pipeline` - data pipelines (tenant_id, connector_id, name, schedule, transform_config)
- `pipeline_run` - pipeline execution history
- `configurable_agent` - agentic configs (tenant_id, vertical, agent_type, name, system_prompt, tools, config)
- `lead` - sales leads (tenant_id, external_id, source, data, score, status)
- `activity_log` - audit trail (tenant_id, user_id, action, resource_type, resource_id, metadata)
- `usage_record` - usage tracking (tenant_id, user_id, resource_type, quantity, metadata)
- `billing_subscription` - Clerk subscription mirror (tenant_id, clerk_subscription_id, plan, status)

### 3. Multi-Tenancy (`src/lib/platform/tenancy/`)
- `context.ts` - getTenantContext() reads tenant from session/headers, provides to all downstream
- `middleware.ts` - Next.js middleware that sets tenant context on every request
- `isolation.ts` - withTenant() wrapper that automatically filters queries by tenant_id
- `types.ts` - TenantContext type

### 4. Vertical Framework (`src/lib/platform/verticals/`)
- `registry.ts` - VerticalRegistry singleton, register/get verticals
- `types.ts` - VerticalDefinition interface (id, name, agents, workflows, prompts, metrics, connectors, dashboards)
- `loader.ts` - Dynamic vertical loading from database config

### 5. Connector Framework (`src/lib/platform/connectors/`)
- `base.ts` - BaseConnector abstract class (connect, disconnect, sync, query, getSchema)
- `registry.ts` - ConnectorRegistry singleton
- `sync-engine.ts` - SyncEngine class (run syncs, track progress, handle errors)
- `types.ts` - ConnectorConfig, SyncResult, DataRecord types

### 6. Salesforce Connector (`src/lib/connectors/salesforce/`)
- `client.ts` - SalesforceClient class (OAuth2 auth, REST API, SOQL queries)
- `connector.ts` - SalesforceConnector extends BaseConnector
- `mappings.ts` - Standard object field mappings (Lead, Contact, Account, Opportunity, Task)
- `sync.ts` - Salesforce-specific sync logic (incremental, full, delta detection)
- `types.ts` - Salesforce-specific types (SFLead, SFContact, SFOpportunity, etc.)

### 7. Agentic Configuration System (`src/lib/platform/agents/`)
- `configurable-agent.ts` - ConfigurableAgentEngine: loads agent config from DB, builds AI SDK tools, executes
- `agent-registry.ts` - AgentConfigRegistry: CRUD for agent configs
- `types.ts` - AgentConfig schema (name, type, systemPrompt, tools, guardrails, temperature, model)
- Agents are defined as database records, not code. Adding a new agent = inserting a row.

### 8. Sales Hunter Vertical (`src/lib/verticals/sales-hunter/`)
- `index.ts` - Vertical registration with all sub-modules
- `agents/index.ts` - Default agent configs for: Prospector, Qualifier, OutreachComposer, PipelineAnalyst, DealCoach
- `agents/prospector.ts` - Prospecting agent config and prompts
- `agents/qualifier.ts` - Lead qualification agent
- `agents/outreach.ts` - Outreach composition agent
- `agents/pipeline-analyst.ts` - Pipeline analysis agent
- `agents/deal-coach.ts` - Deal coaching agent
- `workflows/index.ts` - Workflow templates
- `workflows/lead-enrichment.ts` - Automated lead data enrichment
- `workflows/outreach-sequence.ts` - Multi-step outreach automation
- `workflows/pipeline-review.ts` - Weekly pipeline review
- `prompts/system.ts` - Base sales system prompts
- `prompts/prospecting.ts` - Prospecting-specific prompts
- `prompts/qualification.ts` - Qualification frameworks (BANT, MEDDIC, SPIN)
- `metrics/index.ts` - Sales KPI definitions and calculators

### 9. Clerk Billing (`src/lib/platform/billing/`)
- `clerk.ts` - Clerk SDK integration (subscriptions, usage, webhooks)
- `plans.ts` - Plan definitions (Starter, Professional, Enterprise)
- `usage-tracker.ts` - Track AI usage, connector syncs, storage
- `middleware.ts` - Plan enforcement (check limits before actions)
- `types.ts` - Plan, Feature, Limit types

### 10. Admin System
**API Routes** (`src/app/api/admin/`):
- `users/route.ts` - List/search users, view details, manage roles
- `activity/route.ts` - Query activity log with filters
- `usage/route.ts` - Usage analytics and reporting
- `billing/route.ts` - Billing overview, subscription management
- `tenants/route.ts` - Tenant CRUD and configuration

**Pages** (`src/app/(admin)/admin/`):
- `layout.tsx` - Admin layout with sidebar navigation
- `page.tsx` - Admin dashboard overview
- `users/page.tsx` - User management
- `activity/page.tsx` - Activity feed / audit log
- `usage/page.tsx` - Usage analytics
- `billing/page.tsx` - Billing management
- `tenants/page.tsx` - Tenant management

**Components** (`src/components/admin/`):
- `admin-sidebar.tsx` - Admin navigation sidebar
- `stats-cards.tsx` - KPI stat cards
- `user-table.tsx` - User data table
- `activity-feed.tsx` - Activity log feed
- `usage-charts.tsx` - Usage visualization
- `billing-overview.tsx` - Billing summary

### 11. Sales Hunter UI
**API Routes** (`src/app/api/sales-hunter/`):
- `leads/route.ts` - Lead CRUD, search, scoring
- `pipeline/route.ts` - Pipeline view data
- `analytics/route.ts` - Sales analytics and ROI

**Pages** (`src/app/(sales-hunter)/`):
- `layout.tsx` - Sales Hunter layout
- `dashboard/page.tsx` - Sales dashboard with ROI metrics
- `leads/page.tsx` - Lead management view
- `pipeline/page.tsx` - Visual pipeline view
- `agents/page.tsx` - Configure sales agents

**Components** (`src/components/verticals/sales-hunter/`):
- `pipeline-view.tsx` - Kanban-style pipeline board
- `lead-card.tsx` - Lead detail card
- `roi-dashboard.tsx` - ROI metrics dashboard
- `agent-config-panel.tsx` - Agent configuration UI

### 12. Platform API Routes (`src/app/api/platform/`)
- `connectors/route.ts` - Connector CRUD
- `connectors/[id]/sync/route.ts` - Trigger/status sync operations
- `verticals/route.ts` - List available verticals
- `tenants/route.ts` - Tenant management
- `agents/configurable/route.ts` - Configurable agent CRUD

## Repositories to Create
- `platform-repository.pg.ts` - Tenant, Connector, Pipeline, ActivityLog, UsageRecord CRUD
- `sales-hunter-repository.pg.ts` - Lead, SalesMetric CRUD
- `billing-repository.pg.ts` - Subscription, Plan management

## Environment Variables (New)
```
# Salesforce
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_REDIRECT_URI=

# Clerk Billing
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=

# Platform
DEPLOYMENT_MODE=single-tenant  # or multi-tenant
DEFAULT_TENANT_SLUG=default
```
