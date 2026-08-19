# Tool → Widget population

How connected tools (Composio / MCP) populate the widgets on a project's
Overview tab. Design principle: **metadata-driven, no static per-toolkit
registry** — the model learns what a tool provides from the metadata Composio
already ships with every action, and the project's own goal/description
decides which data is fetched. Works for any toolkit, including ones the
codebase has never seen.

## Pipeline

```
attach / manual sync / daily dream cycle
        │  POST /api/projects/{id}/tools/{toolId}/sync
        ▼
ProjectBrainRunTable row  ──►  Inngest project-brain-ingest-run
        │
        ▼
1. GATHER   lib/project-brain/run-source.ts
   • loads the connector's read-only actions (composio.tools.get /
     MCP read-only tools) — each action carries the provider's description
   • builds a toolCatalog [{slug, description}] from those actions
   • agentic loop (≤6 steps, 90s): the model derives the project's key
     topics from name + goal + description and calls the read actions WITH
     project-scoped parameters (search queries, filters, repo/board names,
     recent time ranges) → only project-relevant data is fetched
   • persists raw source; toolCatalog rides along in rawPayload
        │
        ▼
2. EXTRACT  lib/project-brain/analyze-persisted-source.ts
   • input: project context, source text, sourcePayload (incl. toolCatalog),
     and existingWidgets [{slot, kind, title}] for this sourceScope
   • toolCatalog tells the model which categories of information the tool
     provides → it decides which widgets fit the data
   • slot rules: reuse an existing slot when the data matches its purpose;
     new slots only for genuinely new categories; stable snake_case names
     (inbox, agenda, open_prs, …)
   • output: ProjectBrainExtractionSchema — entities/relations/timeline +
     todos + status + up to 6 table/metric widgets
        │
        ▼
3. MATERIALIZE  lib/project-brain/materialize-run.ts
   • upserts widgets into ProjectWidgetTable keyed
     (projectId, sourceScope, slot) → stable slots update in place
   • todos → slot "todos" (kind todos), status → slot "status" (kind status)
     — materialized from the dedicated extraction fields
        │
        ▼
4. RENDER  components/projects/project-native-widget.tsx
   • native React renderers for table, metric, todos, status
   • Overview tab grid via GET /api/projects/{id}/widgets
```

## Keys and scopes

| Field | Convention | Purpose |
| --- | --- | --- |
| `sourceScope` | `tool:{connectedToolId}` (tool syncs), `document:{documentId}`, `chat:{threadId}`, `onboarding:{projectId}` | isolates widget sets per source |
| `slot` | stable snake_case data-category name (`inbox`, `agenda`, `open_prs`, `todos`, `status`) | upsert-in-place across syncs (unique on projectId+sourceScope+slot) |
| `renderData` | `{columns, rows}` (table) · `{items}` (metric/todos) · `{health, progressPct?, blockers, shortSummary}` (status) | fixed shapes the native renderers understand |

## Refresh cadence

- **Attach-time**: the tool picker fires a sync right after attaching.
- **Manual**: per-tool `⟳` on the Brain tab; header `Sync now` syncs every
  connected tool.
- **Daily**: the dream cycle (`project-brain-dream-cycle.ts`) enqueues a
  `tool_sync` run per connector.
- `staleAt`/`generatedAt` are tracked per widget for future stale badges.

## Why no per-toolkit seed table

Composio maintains descriptions for every action (the same metadata that
powers their semantic tool search). Feeding that catalog to the gather and
extraction prompts gives the model the same knowledge a hand-written
"gmail → inbox table" registry would encode, without a second source of truth
to maintain — and it extends automatically to all 250+ toolkits and any MCP
server. Slot stability comes from passing the already-materialized widgets
back into extraction instead of from hardcoded slot names.
