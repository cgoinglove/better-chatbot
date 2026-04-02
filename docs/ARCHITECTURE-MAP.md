# Architecture Map - SayfeAI Sales Hunter

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 App Router                        │
├──────────────────┬──────────────────┬───────────────────────────────┤
│   (chat) pages   │ (sales-hunter)   │  (admin) pages                │
│   Base chatbot   │  Sales UI pages  │  Platform admin               │
│   from upstream  │  28 pages        │  14 pages                     │
├──────────────────┴──────────────────┴───────────────────────────────┤
│                          API Routes                                  │
├─────────────────┬───────────────────┬───────────────────────────────┤
│ /api/chat/*     │ /api/sales-hunter │ /api/platform/*               │
│ /api/agent/*    │   /leads          │   /connectors                 │
│ /api/workflow/* │   /pipeline       │   /company/profiles           │
│ /api/mcp/*      │   /agents         │   /industries                 │
│ /api/user/*     │   /prospects      │   /knowledge                  │
│ (upstream)      │   /contacts       │   /state-research             │
│                 │   /filings        │ /api/admin/*                  │
│                 │   /analytics      │   /roles, /tokens, /trials    │
│                 │   /intelligence/* │   /api-keys, /stats           │
│                 │     /briefs       │   /tenants, /users            │
│                 │     /alerts       │   /billing, /usage            │
│                 │     /workflows    │   /activity                   │
│                 │     /relationships│                               │
│                 │     /playbooks    │                               │
│                 │     /signals      │                               │
│                 │     /compliance   │                               │
│                 │     /outreach     │                               │
│                 │     /health       │                               │
│                 │     /deals        │                               │
├─────────────────┴───────────────────┴───────────────────────────────┤
│                       Platform Engines                               │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│ Sales Intel  │ Prospecting  │ Knowledge    │ Connectors             │
│ 10 modules   │ EPA scanner  │ Ingestion    │ Salesforce             │
│              │ Web scanner  │ Chunking     │ (extensible)           │
│              │ Scorer       │ Embeddings   │                        │
├──────────────┼──────────────┼──────────────┼────────────────────────┤
│ RBAC         │ Industries   │ Company Intel│ State Research         │
│ Permissions  │ Seed data    │ Research eng │ Orchestrator           │
│ Roles/Keys   │ Context      │ Value chains │ Sources registry       │
├──────────────┴──────────────┼──────────────┼────────────────────────┤
│ Sales Hunter Vertical       │ Contacts     │ Billing                │
│ 5 AI Agents + Workflows     │ Enrichment   │ Plans + Usage          │
│ Prompts + Metrics           │ Scoring      │                        │
├─────────────────────────────┴──────────────┴────────────────────────┤
│                     Repositories (11 platform)                       │
├─────────────────────────────────────────────────────────────────────┤
│              PostgreSQL + Drizzle ORM (schema.pg.ts)                 │
│              ~55 tables | pgvector | Multi-tenant                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Prospect to Deal

```
EPA ECHO Scanner ──┐
                   ├──> Prospect Scorer ──> Lead Creation ──> Pipeline
Web Scanner ───────┘         │
                             ▼
                    Buying Signal Detection
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
            Compliance Calculator  Relationship Mapper
                    │                 │
                    ▼                 ▼
            Sales Brief Generator  Outreach Sequence Generator
                    │                 │
                    └────────┬────────┘
                             ▼
                      Alert Engine (monitors changes)
                             │
                             ▼
                    Customer Health Scoring
                             │
                             ▼
                    Win/Loss Analysis
```

## Database Tables by Module

### Upstream (better-chatbot) — `*Table` naming
- `UserTable`, `SessionTable`, `AccountTable`, `VerificationTable`
- `ChatThreadTable`, `ChatMessageTable`
- `AgentTable`, `BookmarkTable`
- `McpServerTable`, `McpToolCustomizationTable`, `McpServerCustomizationTable`
- `McpOAuthSessionTable`
- `WorkflowTable`, `WorkflowNodeDataTable`, `WorkflowEdgeTable`
- `ArchiveTable`, `ArchiveItemTable`
- `ChatExportTable`, `ChatExportCommentTable`

### Platform Core — `*Schema` naming
- `TenantSchema` — Multi-tenant root
- `ConnectorSchema`, `ConnectorSyncLogSchema` — External integrations
- `PipelineSchema`, `PipelineRunSchema` — Data pipelines
- `ConfigurableAgentSchema` — AI agent configs
- `LeadSchema` — Sales leads
- `ActivityLogSchema` — Audit trail
- `UsageRecordSchema` — Usage metering
- `MetricSchema`, `ROISnapshotSchema` — Metrics + ROI
- `BillingSubscriptionSchema` — Subscriptions

### RBAC
- `PermissionSchema`, `RoleSchema`, `UserRoleSchema`
- `ApiKeySchema`, `TokenUsageSchema`, `TrialSchema`

### Knowledge Base
- `KnowledgeDocumentSchema`, `DocumentChunkSchema`
- `KnowledgeCategorySchema`

### Company Intelligence
- `CompanyProfileSchema`, `CompanyProductSchema`
- `CompanyMethodologySchema`, `ValueChainSchema`

### Industry
- `IndustryProfileSchema`, `IndustryDocumentSchema`

### Prospecting
- `ProspectSchema`, `ProspectSignalSchema`
- `ProspectSourceSchema`, `ScanResultSchema`

### Contact Intelligence
- `ContactSchema`, `ContactActivitySchema`, `ContactEnrichmentSchema`

### State Research
- `StateResearchSourceSchema`, `ResearchAgentConfigSchema`
- `ResearchTaskSchema`, `ResearchFindingSchema`

### Sales Intelligence (10 modules)
- `SalesBriefSchema` — Pre-meeting briefs
- `AlertSchema`, `AlertRuleSchema` — Real-time alerts
- `ResearchWorkflowSchema`, `WorkflowRunSchema` — Multi-step workflows
- `RelationshipMapSchema` — Buying committees
- `SalesPlaybookSchema` — Playbooks & battle cards
- `BuyingSignalSchema` — Signal detection
- `ComplianceBurdenSchema` — Compliance cost estimates
- `OutreachSequenceSchema` — Outreach sequences
- `CustomerHealthSchema` — Health & expansion scoring
- `DealAnalysisSchema` — Win/loss analysis

## Navigation Structure

### Sales Hunter (`/sales/...`)
```
Sales Hub (/)
├── Dashboard (/dashboard)
├── Leads (/leads)
├── Pipeline (/pipeline)
├── Prospects (/prospects)
│   └── Sources (/prospects/sources)
├── Company Intel (/company)
├── Contacts (/contacts)
├── Filings (/filings)
├── Industries (/industries)
├── Knowledge (/knowledge)
├── Research (/research)
│   ├── Agents (/research/agents)
│   └── Sources (/research/sources)
├── AI Agents (/agents)
├── Connectors (/connectors)
└── Intelligence (/intelligence)
    ├── Hub Dashboard (/)
    ├── Briefs (/briefs)
    ├── Alerts (/alerts)
    ├── Workflows (/workflows)
    ├── Relationships (/relationships)
    ├── Playbooks (/playbooks)
    ├── Signals (/signals)
    ├── Compliance (/compliance)
    ├── Outreach (/outreach)
    ├── Health (/health)
    └── Deals (/deals)
```

### Admin (`/admin/...`)
```
Admin Hub (/)
├── Tenants (/tenants)
├── Users (/users)
├── Roles (/roles)
├── API Keys (/api-keys)
├── Tokens (/tokens)
├── Trials (/trials)
├── Activity (/activity)
├── Usage (/usage)
├── Billing (/billing)
├── Companies (/companies)
├── Industries (/industries)
└── Knowledge (/knowledge)
```

## Regulatory Programs (Compliance Calculator)

The platform covers 15 EPA/environmental regulatory programs:
1. CAA (Clean Air Act)
2. CWA (Clean Water Act)
3. RCRA (Resource Conservation and Recovery Act)
4. TSCA (Toxic Substances Control Act)
5. EPCRA (Emergency Planning and Community Right-to-Know Act)
6. TRI (Toxics Release Inventory)
7. MACT (Maximum Achievable Control Technology)
8. NSPS (New Source Performance Standards)
9. Title V (Operating Permits)
10. SPCC (Spill Prevention, Control, and Countermeasure)
11. NPDES (National Pollutant Discharge Elimination System)
12. RMP (Risk Management Program)
13. GHG (Greenhouse Gas Reporting)
14. LDAR (Leak Detection and Repair)
15. OGI (Optical Gas Imaging)
