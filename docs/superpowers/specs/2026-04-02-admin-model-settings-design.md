# Admin Model Settings — Design Spec

**Date:** 2026-04-02  
**Status:** Approved  
**Scope:** Per-tenant AI provider configuration, per-model enable/disable toggles, user preferred model persistence, and admin UI at `/admin/models`.

---

## Overview

Today, AI provider API keys and available models are hardcoded in `src/lib/ai/models.ts` using environment variables. This feature replaces that static config with a per-tenant database-driven system, allowing tenant-admins to configure provider API keys, enable/disable individual models, and set a default model — all through a new admin UI panel.

Users retain the ability to choose their own preferred model from the enabled set, with their preference persisted per-user.

**Focused providers for this release:** OpenAI, Anthropic, Google, Azure OpenAI.

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Azure config complexity | Single deployment (endpoint + key + deployment name) | Simpler; covers 95% of use cases |
| Model enable/disable | Per-model toggles (key + individual toggle) | Admins need fine-grained control |
| Who manages model settings | Tenant-admins only, per their own tenant | Each tenant is independent |
| API key storage | Plaintext in DB (encrypt at rest later) | Acceptable for v1; DB already behind auth |
| Default model scope | Per tenant | Different tenants may have different default workflows |
| Admin UI layout | Split panel — provider list left, config detail right | Familiar settings-page pattern |

---

## 1. Data Model

### New table: `tenant_provider_key` (`TenantProviderKeySchema`)

One row per tenant + provider. Stores the API key and provider-level config.

```typescript
TenantProviderKeySchema = pgTable("tenant_provider_key", {
  id:                   uuid().primaryKey().defaultRandom(),
  tenantId:             uuid().notNull().references(() => TenantSchema.id, { onDelete: "cascade" }),
  provider:             varchar({ length: 50 }).notNull(),   // "openai" | "anthropic" | "google" | "azure"
  apiKey:               text().notNull(),                    // plaintext for now
  enabled:              boolean().notNull().default(true),   // provider-level on/off
  azureEndpoint:        text(),                              // Azure only
  azureDeploymentName:  text(),                              // Azure only
  azureApiVersion:      varchar({ length: 20 }).default("2024-02-01"), // Azure only
  createdAt:            timestamp().notNull().defaultNow(),
  updatedAt:            timestamp().notNull().defaultNow(),
}, (t) => [
  uniqueIndex().on(t.tenantId, t.provider),
]);
```

### New table: `tenant_model_setting` (`TenantModelSettingSchema`)

One row per tenant + provider + model. Stores enable/disable state and default flag.

```typescript
TenantModelSettingSchema = pgTable("tenant_model_setting", {
  id:         uuid().primaryKey().defaultRandom(),
  tenantId:   uuid().notNull().references(() => TenantSchema.id, { onDelete: "cascade" }),
  provider:   varchar({ length: 50 }).notNull(),
  modelName:  varchar({ length: 100 }).notNull(),  // matches key in models.ts (e.g. "sonnet-4.5")
  enabled:    boolean().notNull().default(true),
  isDefault:  boolean().notNull().default(false),  // exactly one per tenant should be true
  createdAt:  timestamp().notNull().defaultNow(),
  updatedAt:  timestamp().notNull().defaultNow(),
}, (t) => [
  uniqueIndex().on(t.tenantId, t.provider, t.modelName),
]);
```

**Default model invariant:** When `setDefaultModel` is called, all other rows for that tenant are set to `isDefault: false` in the same transaction.

### `UserTable` extension

Add one column to the existing `user` table:

```typescript
preferredModel: json().$type<{ provider: string; model: string } | null>().default(null),
```

Set when the user explicitly picks a model in the chat UI. `null` means "use the tenant default."

---

## 2. Repository Layer

New file: `src/lib/db/pg/repositories/tenant-model-config-repository.pg.ts`

```typescript
interface TenantModelConfigRepository {
  // Provider keys
  getProviderKeys(tenantId: string): Promise<TenantProviderKey[]>;
  getProviderKey(tenantId: string, provider: string): Promise<TenantProviderKey | null>;
  upsertProviderKey(tenantId: string, provider: string, data: UpsertProviderKeyData): Promise<TenantProviderKey>;
  deleteProviderKey(tenantId: string, provider: string): Promise<void>;

  // Model settings
  getModelSettings(tenantId: string): Promise<TenantModelSetting[]>;
  upsertModelSetting(tenantId: string, provider: string, modelName: string, data: UpsertModelSettingData): Promise<TenantModelSetting>;
  setDefaultModel(tenantId: string, provider: string, modelName: string): Promise<void>;
  bulkUpsertModelSettings(tenantId: string, settings: BulkModelSettingInput[]): Promise<void>;
}
```

User preferred model methods added to the **existing** user repository:
- `updatePreferredModel(userId: string, model: { provider: string; model: string } | null): Promise<void>`
- `getPreferredModel(userId: string): Promise<{ provider: string; model: string } | null>`

---

## 3. Runtime Integration

### New function: `getTenantModelProvider(tenantId: string)`

Located in `src/lib/ai/tenant-model-provider.ts`.

**Flow:**
1. Query `TenantProviderKeySchema` for the tenant → get configured providers + keys
2. For each configured provider, create a provider instance using the DB key (falls back to env var key if DB key is null/not configured)
3. Azure: create `createAzure({ endpoint, apiKey })` instance with the configured deployment
4. Query `TenantModelSettingSchema` for the tenant → get enabled models + default
5. Build `modelsInfo` filtered to only enabled models for configured providers
6. Return `{ modelsInfo, getModel(chatModel), defaultModel }`

**Fallback:** If no DB config exists for the tenant, fall back to the existing static `customModelProvider` (env var keys, all models shown). This keeps dev mode working.

**Caching:** Results are cached per-request (within a single API call). No cross-request caching — DB reads are fast and config changes must reflect immediately.

### Routes updated

| Route | Change |
|---|---|
| `GET /api/chat/models` | Call `getTenantModelProvider(tenantId)` instead of static provider. Include `userPreferred` field in response. |
| `POST /api/chat` (AI stream) | Use `getTenantModelProvider(tenantId).getModel(selectedModel)` for model resolution. |

---

## 4. Admin API Routes

Base path: `/api/admin/models/`

All routes:
- Read `x-tenant-id` header for tenant isolation
- Verify caller has `tenant-admin` role via `checkPermission(userId, tenantId, "settings", "manage")`
- Return `403` if unauthorized

### `GET /api/admin/models/providers`
Returns all provider configs for the tenant. API key is **masked** (last 4 chars shown, rest replaced with `••••`).

```typescript
// Response
{ providers: TenantProviderKeyMasked[] }
```

### `PUT /api/admin/models/providers`
Upsert a provider config. Full API key accepted on write; never returned in full after.

```typescript
// Body
{
  provider: "openai" | "anthropic" | "google" | "azure";
  apiKey: string;
  enabled: boolean;
  azureEndpoint?: string;       // required if provider === "azure"
  azureDeploymentName?: string; // required if provider === "azure"
  azureApiVersion?: string;
}
```

### `DELETE /api/admin/models/providers?provider=openai`
Removes provider config. Also disables all model settings rows for that provider.

### `GET /api/admin/models/settings`
Returns all model settings for the tenant. Includes the full static model list from `models.ts` merged with DB overrides, so the UI can show all possible models (not just ones with existing DB rows).

```typescript
// Response
{ settings: TenantModelSettingWithMeta[] }
// TenantModelSettingWithMeta adds: displayName, provider label, isToolCallUnsupported
```

### `PATCH /api/admin/models/settings`
Update one or more model settings (toggle enabled, set default).

```typescript
// Body — batch updates
{
  updates: Array<{
    provider: string;
    modelName: string;
    enabled?: boolean;
    isDefault?: boolean;  // setting true clears all other defaults for tenant
  }>;
}
```

### `PATCH /api/user/preferred-model`
Saves user preferred model. Auth: current user session only.

```typescript
// Body
{ provider: string; model: string } | { clear: true }
```

---

## 5. Admin UI

### New page: `src/app/(admin)/admin/models/page.tsx`

Layout: **Split panel** — provider list sidebar left, config detail panel right. Matches the existing admin dark-theme pattern (zinc-900/800, blue-600 accents).

**Left sidebar:**
- List of 4 providers: OpenAI, Anthropic, Google, Azure
- Each shows status dot: green (configured + enabled), red (no key), gray (disabled)
- Clicking a provider loads its detail in the right panel

**Right detail panel — two sections:**

*Provider config section:*
- API key input (masked on load, "reveal" eye icon, "Update Key" button)
- Enable/disable toggle for the whole provider
- Azure extras: Endpoint URL, Deployment Name, API Version fields (shown only for Azure)
- Save button (calls `PUT /api/admin/models/providers`)

*Models section (below provider config):*
- Table of all models for this provider
- Columns: Model name, Enabled toggle, Default radio button (select one per tenant)
- Models from unconfigured providers are shown but grayed out with "Configure provider first" tooltip
- Changes auto-save on toggle (debounced `PATCH /api/admin/models/settings`)

### Admin sidebar nav

Add "Models" entry to `src/app/(admin)/admin/layout.tsx` navItems:

```typescript
{
  href: "/admin/models",
  label: "Model Settings",
  icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
}
```

---

## 6. Chat UI Changes

### `src/components/select-model.tsx`

Two changes:
1. **Pre-select on load:** `/api/chat/models` response now includes `userPreferred: { provider, model } | null`. If present, pre-select it; otherwise pre-select the tenant's default model.
2. **Persist on change:** When user picks a model, fire `PATCH /api/user/preferred-model` silently in the background.

No structural changes to the component — just wiring in the new response field and the background save call.

---

## 7. Migration

New migration file: `src/lib/db/pg/migrations/0017_tenant_model_config.sql`

```sql
-- tenant_provider_key
CREATE TABLE tenant_provider_key (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  provider             VARCHAR(50) NOT NULL,
  api_key              TEXT NOT NULL,
  enabled              BOOLEAN NOT NULL DEFAULT true,
  azure_endpoint       TEXT,
  azure_deployment_name TEXT,
  azure_api_version    VARCHAR(20) DEFAULT '2024-02-01',
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, provider)
);

-- tenant_model_setting
CREATE TABLE tenant_model_setting (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  provider    VARCHAR(50) NOT NULL,
  model_name  VARCHAR(100) NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, provider, model_name)
);

-- user preferred model
ALTER TABLE "user" ADD COLUMN preferred_model JSONB DEFAULT NULL;
```

---

## 8. Auth Summary

| Layer | Mechanism |
|---|---|
| `/api/admin/models/*` | `checkPermission(userId, tenantId, "settings", "manage")` — tenant-admin required |
| `/api/user/preferred-model` | Session auth only — any authenticated user |
| Admin UI page | No server guard (same as all admin pages); relies on API 403s |

---

## File Checklist

**New files:**
- `src/lib/db/pg/schema.pg.ts` — add `TenantProviderKeySchema`, `TenantModelSettingSchema`, extend `UserTable`
- `src/lib/db/pg/migrations/0017_tenant_model_config.sql`
- `src/lib/db/pg/repositories/tenant-model-config-repository.pg.ts`
- `src/lib/ai/tenant-model-provider.ts` — `getTenantModelProvider(tenantId)`
- `src/app/api/admin/models/providers/route.ts`
- `src/app/api/admin/models/settings/route.ts`
- `src/app/api/user/preferred-model/route.ts`
- `src/app/(admin)/admin/models/page.tsx`

**Modified files:**
- `src/lib/db/repository.ts` — export new repository
- `src/app/api/chat/models/route.ts` — use tenant provider, add `userPreferred`
- `src/app/api/chat/route.ts` — use tenant provider for model resolution
- `src/components/select-model.tsx` — pre-select preferred/default, persist on change
- `src/app/(admin)/admin/layout.tsx` — add Model Settings nav item
- `src/types/platform.ts` — add `TenantProviderKey`, `TenantModelSetting` types
- `src/lib/db/pg/repositories/user-repository.pg.ts` — add `updatePreferredModel`, `getPreferredModel` methods
