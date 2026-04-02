# Admin Model Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-tenant AI provider configuration with DB-stored keys, per-model enable/disable toggles, a `/admin/models` split-panel UI, and per-user preferred model persistence.

**Architecture:** Two new DB tables (`tenant_provider_key`, `tenant_model_setting`) plus a `preferredModel` column on `user`. A new async `getTenantModelProvider(tenantId)` reads these at request time and replaces the static `customModelProvider` in the two chat routes. Four new API routes handle CRUD. One admin page provides split-panel management UI. Focused providers: OpenAI, Anthropic, Google, Azure OpenAI.

**Tech Stack:** Next.js App Router, Drizzle ORM (PostgreSQL), `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/azure` (new), Vitest, Tailwind CSS.

---

## File Map

**New files:**
- `src/types/model-config.ts` — TypeScript types for all model config entities
- `src/lib/db/pg/schema.pg.ts` — append 2 new tables; add column to UserTable
- `src/lib/db/pg/repositories/tenant-model-config-repository.pg.ts` — CRUD repository
- `src/lib/ai/tenant-model-provider.ts` — per-tenant async model provider
- `src/app/api/admin/models/providers/route.ts` — provider key CRUD
- `src/app/api/admin/models/settings/route.ts` — model settings CRUD
- `src/app/api/user/preferred-model/route.ts` — user preference save
- `src/app/(admin)/admin/models/page.tsx` — split-panel admin UI

**Modified files:**
- `src/types/user.ts` — add `updatePreferredModel` / `getPreferredModel` to `UserRepository`
- `src/lib/db/pg/repositories/user-repository.pg.ts` — implement those two methods
- `src/lib/db/repository.ts` — export `tenantModelConfigRepository`
- `src/app/api/chat/models/route.ts` — use tenant provider; new `{ models, defaultModel, userPreferred }` shape
- `src/app/api/chat/route.ts` — use tenant provider for model resolution
- `src/hooks/queries/use-chat-models.ts` — handle new response shape
- `src/components/select-model.tsx` — pre-select preferred/default; persist on change
- `src/app/(admin)/admin/layout.tsx` — add Model Settings nav entry

---

### Task 1: Install Azure SDK and create TypeScript types

**Files:**
- Create: `src/types/model-config.ts`
- Modify: `src/types/user.ts`

- [ ] **Step 1: Install @ai-sdk/azure**

```bash
npm install @ai-sdk/azure
```

Expected: package added to `node_modules` and `package.json`.

- [ ] **Step 2: Create model-config types**

Create `src/types/model-config.ts`:

```typescript
export type SupportedProvider = "openai" | "anthropic" | "google" | "azure";

export type TenantProviderKey = {
  id: string;
  tenantId: string;
  provider: SupportedProvider;
  apiKey: string;
  enabled: boolean;
  azureEndpoint: string | null;
  azureDeploymentName: string | null;
  azureApiVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TenantProviderKeyMasked = Omit<TenantProviderKey, "apiKey"> & {
  apiKeyMasked: string; // e.g. "sk-ant-••••••••4f2a"
};

export type TenantModelSetting = {
  id: string;
  tenantId: string;
  provider: SupportedProvider;
  modelName: string;
  enabled: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertProviderKeyData = {
  apiKey: string;
  enabled: boolean;
  azureEndpoint?: string | null;
  azureDeploymentName?: string | null;
  azureApiVersion?: string | null;
};

export type UpsertModelSettingData = {
  enabled: boolean;
  isDefault?: boolean;
};

export type BulkModelSettingInput = {
  provider: SupportedProvider;
  modelName: string;
  enabled?: boolean;
  isDefault?: boolean;
};

export type TenantModelConfigRepository = {
  getProviderKeys: (tenantId: string) => Promise<TenantProviderKey[]>;
  getProviderKey: (
    tenantId: string,
    provider: SupportedProvider,
  ) => Promise<TenantProviderKey | null>;
  upsertProviderKey: (
    tenantId: string,
    provider: SupportedProvider,
    data: UpsertProviderKeyData,
  ) => Promise<TenantProviderKey>;
  deleteProviderKey: (
    tenantId: string,
    provider: SupportedProvider,
  ) => Promise<void>;
  getModelSettings: (tenantId: string) => Promise<TenantModelSetting[]>;
  upsertModelSetting: (
    tenantId: string,
    provider: SupportedProvider,
    modelName: string,
    data: UpsertModelSettingData,
  ) => Promise<TenantModelSetting>;
  setDefaultModel: (
    tenantId: string,
    provider: SupportedProvider,
    modelName: string,
  ) => Promise<void>;
  bulkUpsertModelSettings: (
    tenantId: string,
    settings: BulkModelSettingInput[],
  ) => Promise<void>;
};
```

- [ ] **Step 3: Add two methods to UserRepository interface**

In `src/types/user.ts`, add these two methods to the `UserRepository` type after the `getPreferences` entry:

```typescript
  updatePreferredModel: (
    userId: string,
    model: { provider: string; model: string } | null,
  ) => Promise<void>;
  getPreferredModel: (
    userId: string,
  ) => Promise<{ provider: string; model: string } | null>;
```

- [ ] **Step 4: Commit**

```bash
git add src/types/model-config.ts src/types/user.ts package.json package-lock.json
git commit -m "feat: add model config types, extend UserRepository, install @ai-sdk/azure"
```

---

### Task 2: Extend DB schema

**Files:**
- Modify: `src/lib/db/pg/schema.pg.ts`

- [ ] **Step 1: Write failing test for new tables**

Create `src/lib/db/pg/schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  TenantProviderKeySchema,
  TenantModelSettingSchema,
  UserTable,
} from "./schema.pg";
import { getTableColumns } from "drizzle-orm";

describe("TenantProviderKeySchema", () => {
  it("has required columns", () => {
    const cols = getTableColumns(TenantProviderKeySchema);
    expect(cols).toHaveProperty("id");
    expect(cols).toHaveProperty("tenantId");
    expect(cols).toHaveProperty("provider");
    expect(cols).toHaveProperty("apiKey");
    expect(cols).toHaveProperty("enabled");
    expect(cols).toHaveProperty("azureEndpoint");
    expect(cols).toHaveProperty("azureDeploymentName");
    expect(cols).toHaveProperty("azureApiVersion");
  });
});

describe("TenantModelSettingSchema", () => {
  it("has required columns", () => {
    const cols = getTableColumns(TenantModelSettingSchema);
    expect(cols).toHaveProperty("id");
    expect(cols).toHaveProperty("tenantId");
    expect(cols).toHaveProperty("provider");
    expect(cols).toHaveProperty("modelName");
    expect(cols).toHaveProperty("enabled");
    expect(cols).toHaveProperty("isDefault");
  });
});

describe("UserTable", () => {
  it("has preferredModel column", () => {
    const cols = getTableColumns(UserTable);
    expect(cols).toHaveProperty("preferredModel");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- src/lib/db/pg/schema.test.ts
```

Expected: FAIL — `TenantProviderKeySchema` and `TenantModelSettingSchema` not exported from schema.

- [ ] **Step 3: Add new tables at end of schema.pg.ts**

At the very end of `src/lib/db/pg/schema.pg.ts` (after `export type IssueReportEntity = ...`), append:

```typescript
// ─── Tenant Model Config ────────────────────────────────────────────────────

export const TenantProviderKeySchema = pgTable(
  "tenant_provider_key",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    apiKey: text("api_key").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    azureEndpoint: text("azure_endpoint"),
    azureDeploymentName: text("azure_deployment_name"),
    azureApiVersion: varchar("azure_api_version", { length: 20 }).default(
      "2024-02-01",
    ),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("tenant_provider_key_tenant_id_idx").on(t.tenantId),
    unique("tenant_provider_key_tenant_provider_unq").on(
      t.tenantId,
      t.provider,
    ),
  ],
);

export const TenantModelSettingSchema = pgTable(
  "tenant_model_setting",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    modelName: varchar("model_name", { length: 100 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("tenant_model_setting_tenant_id_idx").on(t.tenantId),
    unique("tenant_model_setting_tenant_provider_model_unq").on(
      t.tenantId,
      t.provider,
      t.modelName,
    ),
  ],
);

export type TenantProviderKeyEntity =
  typeof TenantProviderKeySchema.$inferSelect;
export type TenantModelSettingEntity =
  typeof TenantModelSettingSchema.$inferSelect;
```

- [ ] **Step 4: Add preferredModel column to UserTable**

In `src/lib/db/pg/schema.pg.ts`, find the `UserTable` definition (~line 255). Add `preferredModel` immediately after the `preferences` line:

```typescript
  preferences: json("preferences").default({}).$type<UserPreferences>(),
  preferredModel: json("preferred_model")
    .$type<{ provider: string; model: string } | null>()
    .default(null),
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- src/lib/db/pg/schema.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/pg/schema.pg.ts src/lib/db/pg/schema.test.ts
git commit -m "feat: add tenant_provider_key, tenant_model_setting tables and user.preferred_model column to schema"
```

---

### Task 3: Push schema to database

**Files:** None (DB operation only)

- [ ] **Step 1: Push schema changes**

```bash
npm run db:push
```

When prompted to confirm, press `y`. Expected: Drizzle creates `tenant_provider_key`, `tenant_model_setting` tables and adds `preferred_model` column to `user`.

- [ ] **Step 2: Verify tables exist (optional but recommended)**

```bash
npm run db:studio
```

Open `http://localhost:4983` and confirm `tenant_provider_key` and `tenant_model_setting` appear in the sidebar.

---

### Task 4: Create tenant model config repository

**Files:**
- Create: `src/lib/db/pg/repositories/tenant-model-config-repository.pg.ts`
- Create: `src/lib/db/pg/repositories/tenant-model-config-repository.test.ts`

- [ ] **Step 1: Write tests**

Create `src/lib/db/pg/repositories/tenant-model-config-repository.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { TenantModelConfigRepository } from "app-types/model-config";

describe("TenantModelConfigRepository interface shape", () => {
  it("defines all 8 required methods", () => {
    const methods: (keyof TenantModelConfigRepository)[] = [
      "getProviderKeys",
      "getProviderKey",
      "upsertProviderKey",
      "deleteProviderKey",
      "getModelSettings",
      "upsertModelSetting",
      "setDefaultModel",
      "bulkUpsertModelSettings",
    ];
    expect(methods).toHaveLength(8);
  });
});

describe("maskApiKey", () => {
  it("masks all but the last 4 chars", async () => {
    const { maskApiKey } = await import(
      "./tenant-model-config-repository.pg"
    );
    expect(maskApiKey("sk-ant-api03-abc1234")).toBe(
      "••••••••••••••••1234",
    );
    expect(maskApiKey("ab")).toBe("••");
    expect(maskApiKey("abcd")).toBe("abcd"); // 4 chars — nothing to mask
  });
});
```

- [ ] **Step 2: Run test to see it fail**

```bash
npm test -- tenant-model-config-repository.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the repository**

Create `src/lib/db/pg/repositories/tenant-model-config-repository.pg.ts`:

```typescript
import { pgDb as db } from "../db.pg";
import {
  TenantProviderKeySchema,
  TenantModelSettingSchema,
} from "../schema.pg";
import { eq, and } from "drizzle-orm";
import type {
  TenantModelConfigRepository,
  TenantProviderKey,
  TenantModelSetting,
  SupportedProvider,
} from "app-types/model-config";

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 4) return apiKey;
  return "•".repeat(apiKey.length - 4) + apiKey.slice(-4);
}

export const pgTenantModelConfigRepository: TenantModelConfigRepository = {
  // ─── Provider Keys ──────────────────────────────────────────────────────────

  async getProviderKeys(tenantId) {
    const results = await db
      .select()
      .from(TenantProviderKeySchema)
      .where(eq(TenantProviderKeySchema.tenantId, tenantId));
    return results as TenantProviderKey[];
  },

  async getProviderKey(tenantId, provider) {
    const [result] = await db
      .select()
      .from(TenantProviderKeySchema)
      .where(
        and(
          eq(TenantProviderKeySchema.tenantId, tenantId),
          eq(TenantProviderKeySchema.provider, provider),
        ),
      );
    return (result as TenantProviderKey) ?? null;
  },

  async upsertProviderKey(tenantId, provider, data) {
    const [result] = await db
      .insert(TenantProviderKeySchema)
      .values({
        tenantId,
        provider,
        apiKey: data.apiKey,
        enabled: data.enabled,
        azureEndpoint: data.azureEndpoint ?? null,
        azureDeploymentName: data.azureDeploymentName ?? null,
        azureApiVersion: data.azureApiVersion ?? "2024-02-01",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          TenantProviderKeySchema.tenantId,
          TenantProviderKeySchema.provider,
        ],
        set: {
          apiKey: data.apiKey,
          enabled: data.enabled,
          azureEndpoint: data.azureEndpoint ?? null,
          azureDeploymentName: data.azureDeploymentName ?? null,
          azureApiVersion: data.azureApiVersion ?? "2024-02-01",
          updatedAt: new Date(),
        },
      })
      .returning();
    return result as TenantProviderKey;
  },

  async deleteProviderKey(tenantId, provider) {
    await db
      .delete(TenantProviderKeySchema)
      .where(
        and(
          eq(TenantProviderKeySchema.tenantId, tenantId),
          eq(TenantProviderKeySchema.provider, provider),
        ),
      );
  },

  // ─── Model Settings ─────────────────────────────────────────────────────────

  async getModelSettings(tenantId) {
    const results = await db
      .select()
      .from(TenantModelSettingSchema)
      .where(eq(TenantModelSettingSchema.tenantId, tenantId));
    return results as TenantModelSetting[];
  },

  async upsertModelSetting(tenantId, provider, modelName, data) {
    const [result] = await db
      .insert(TenantModelSettingSchema)
      .values({
        tenantId,
        provider,
        modelName,
        enabled: data.enabled,
        isDefault: data.isDefault ?? false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          TenantModelSettingSchema.tenantId,
          TenantModelSettingSchema.provider,
          TenantModelSettingSchema.modelName,
        ],
        set: {
          enabled: data.enabled,
          ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
          updatedAt: new Date(),
        },
      })
      .returning();
    return result as TenantModelSetting;
  },

  async setDefaultModel(tenantId, provider, modelName) {
    await db
      .update(TenantModelSettingSchema)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(TenantModelSettingSchema.tenantId, tenantId));

    await db
      .insert(TenantModelSettingSchema)
      .values({
        tenantId,
        provider,
        modelName,
        enabled: true,
        isDefault: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          TenantModelSettingSchema.tenantId,
          TenantModelSettingSchema.provider,
          TenantModelSettingSchema.modelName,
        ],
        set: { isDefault: true, enabled: true, updatedAt: new Date() },
      });
  },

  async bulkUpsertModelSettings(tenantId, settings) {
    if (settings.length === 0) return;

    const hasNewDefault = settings.some((s) => s.isDefault === true);
    if (hasNewDefault) {
      await db
        .update(TenantModelSettingSchema)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(TenantModelSettingSchema.tenantId, tenantId));
    }

    for (const s of settings) {
      await db
        .insert(TenantModelSettingSchema)
        .values({
          tenantId,
          provider: s.provider,
          modelName: s.modelName,
          enabled: s.enabled ?? true,
          isDefault: s.isDefault ?? false,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            TenantModelSettingSchema.tenantId,
            TenantModelSettingSchema.provider,
            TenantModelSettingSchema.modelName,
          ],
          set: {
            ...(s.enabled !== undefined && { enabled: s.enabled }),
            ...(s.isDefault !== undefined && { isDefault: s.isDefault }),
            updatedAt: new Date(),
          },
        });
    }
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tenant-model-config-repository.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/pg/repositories/tenant-model-config-repository.pg.ts src/lib/db/pg/repositories/tenant-model-config-repository.test.ts
git commit -m "feat: add tenant model config repository"
```

---

### Task 5: Extend user repository with preferred model methods

**Files:**
- Modify: `src/lib/db/pg/repositories/user-repository.pg.ts`

- [ ] **Step 1: Add methods to the implementation**

At the end of the `pgUserRepository` object in `src/lib/db/pg/repositories/user-repository.pg.ts` (before the closing `};`), append:

```typescript
  updatePreferredModel: async (userId, model) => {
    await db
      .update(UserTable)
      .set({ preferredModel: model, updatedAt: new Date() })
      .where(eq(UserTable.id, userId));
  },

  getPreferredModel: async (userId) => {
    const [result] = await db
      .select({ preferredModel: UserTable.preferredModel })
      .from(UserTable)
      .where(eq(UserTable.id, userId));
    return result?.preferredModel ?? null;
  },
```

- [ ] **Step 2: Run all tests to confirm no regressions**

```bash
npm test
```

Expected: All previously passing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/pg/repositories/user-repository.pg.ts
git commit -m "feat: add updatePreferredModel and getPreferredModel to user repository"
```

---

### Task 6: Export new repository from repository.ts

**Files:**
- Modify: `src/lib/db/repository.ts`

- [ ] **Step 1: Add import and export**

Open `src/lib/db/repository.ts`. Add an import line following the same pattern as the other repositories:

```typescript
import { pgTenantModelConfigRepository } from "./pg/repositories/tenant-model-config-repository.pg";
```

Then add to the exports section:

```typescript
export const tenantModelConfigRepository = pgTenantModelConfigRepository;
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep -i "tenant-model\|repository.ts" | head -10
```

Expected: No output (zero errors on these files).

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/repository.ts
git commit -m "feat: export tenantModelConfigRepository"
```

---

### Task 7: Create getTenantModelProvider

**Files:**
- Create: `src/lib/ai/tenant-model-provider.ts`
- Create: `src/lib/ai/tenant-model-provider.test.ts`

- [ ] **Step 1: Write tests**

Create `src/lib/ai/tenant-model-provider.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("lib/db/repository", () => ({
  tenantModelConfigRepository: {
    getProviderKeys: vi.fn(),
    getModelSettings: vi.fn(),
  },
}));

vi.mock("lib/ai/models", () => ({
  customModelProvider: {
    modelsInfo: [
      {
        provider: "anthropic",
        hasAPIKey: false,
        models: [
          { name: "sonnet-4.5", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: [] },
          { name: "haiku-4.5", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: [] },
        ],
      },
      {
        provider: "openai",
        hasAPIKey: false,
        models: [
          { name: "gpt-4.1", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: [] },
        ],
      },
    ],
    getModel: vi.fn().mockReturnValue({ id: "fallback-model" }),
  },
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn().mockReturnValue(() => ({ id: "anthropic-model" })),
}));
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn().mockReturnValue(() => ({ id: "openai-model" })),
}));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn().mockReturnValue(() => ({ id: "google-model" })),
}));
vi.mock("@ai-sdk/azure", () => ({
  createAzure: vi.fn().mockReturnValue(() => ({ id: "azure-model" })),
}));

describe("getTenantModelProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("falls back to static provider when no DB config exists", async () => {
    const { tenantModelConfigRepository } = await import("lib/db/repository");
    vi.mocked(tenantModelConfigRepository.getProviderKeys).mockResolvedValue([]);
    vi.mocked(tenantModelConfigRepository.getModelSettings).mockResolvedValue([]);

    const { getTenantModelProvider } = await import("./tenant-model-provider");
    const provider = await getTenantModelProvider("tenant-1");

    expect(provider.defaultModel).toBeNull();
    expect(provider.modelsInfo.length).toBeGreaterThan(0);
  });

  it("returns only the configured provider when DB config exists", async () => {
    const { tenantModelConfigRepository } = await import("lib/db/repository");
    vi.mocked(tenantModelConfigRepository.getProviderKeys).mockResolvedValue([
      {
        id: "1", tenantId: "t1", provider: "anthropic" as const,
        apiKey: "sk-ant-test", enabled: true,
        azureEndpoint: null, azureDeploymentName: null, azureApiVersion: null,
        createdAt: new Date(), updatedAt: new Date(),
      },
    ]);
    vi.mocked(tenantModelConfigRepository.getModelSettings).mockResolvedValue([
      {
        id: "1", tenantId: "t1", provider: "anthropic" as const,
        modelName: "sonnet-4.5", enabled: true, isDefault: true,
        createdAt: new Date(), updatedAt: new Date(),
      },
    ]);

    const { getTenantModelProvider } = await import("./tenant-model-provider");
    const provider = await getTenantModelProvider("t1");

    expect(provider.modelsInfo.some((p) => p.provider === "anthropic")).toBe(true);
    expect(provider.modelsInfo.some((p) => p.provider === "openai")).toBe(false);
    expect(provider.defaultModel).toEqual({ provider: "anthropic", model: "sonnet-4.5" });
  });

  it("adds azure as a dynamic provider when configured", async () => {
    const { tenantModelConfigRepository } = await import("lib/db/repository");
    vi.mocked(tenantModelConfigRepository.getProviderKeys).mockResolvedValue([
      {
        id: "2", tenantId: "t2", provider: "azure" as const,
        apiKey: "azure-key", enabled: true,
        azureEndpoint: "https://my-resource.openai.azure.com",
        azureDeploymentName: "gpt4-deploy",
        azureApiVersion: "2024-02-01",
        createdAt: new Date(), updatedAt: new Date(),
      },
    ]);
    vi.mocked(tenantModelConfigRepository.getModelSettings).mockResolvedValue([]);

    const { getTenantModelProvider } = await import("./tenant-model-provider");
    const provider = await getTenantModelProvider("t2");

    const azureEntry = provider.modelsInfo.find((p) => p.provider === "azure");
    expect(azureEntry).toBeDefined();
    expect(azureEntry?.models[0].name).toBe("gpt4-deploy");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tenant-model-provider.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the tenant model provider**

Create `src/lib/ai/tenant-model-provider.ts`:

```typescript
import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAzure } from "@ai-sdk/azure";
import type { LanguageModel } from "ai";
import type { ChatModel } from "app-types/chat";
import type { TenantProviderKey } from "app-types/model-config";
import { customModelProvider } from "./models";
import { tenantModelConfigRepository } from "lib/db/repository";

type ProviderFn = (modelId: string) => LanguageModel;

function buildProviderFn(pk: TenantProviderKey): ProviderFn | null {
  switch (pk.provider) {
    case "openai": {
      const p = createOpenAI({ apiKey: pk.apiKey });
      return (modelId) => p(modelId) as unknown as LanguageModel;
    }
    case "anthropic": {
      const p = createAnthropic({ apiKey: pk.apiKey });
      return (modelId) => p(modelId) as unknown as LanguageModel;
    }
    case "google": {
      const p = createGoogleGenerativeAI({ apiKey: pk.apiKey });
      return (modelId) => p(modelId) as unknown as LanguageModel;
    }
    case "azure": {
      if (!pk.azureEndpoint || !pk.azureDeploymentName) return null;
      const p = createAzure({
        baseURL: `${pk.azureEndpoint}/openai/deployments`,
        apiKey: pk.apiKey,
        apiVersion: pk.azureApiVersion ?? "2024-02-01",
      });
      return (modelId) => p(modelId) as unknown as LanguageModel;
    }
    default:
      return null;
  }
}

export async function getTenantModelProvider(tenantId: string) {
  const [providerKeys, modelSettings] = await Promise.all([
    tenantModelConfigRepository.getProviderKeys(tenantId),
    tenantModelConfigRepository.getModelSettings(tenantId),
  ]);

  // No DB config — fall back to static env-var-based provider
  if (providerKeys.length === 0) {
    return {
      modelsInfo: customModelProvider.modelsInfo,
      defaultModel: null as ChatModel | null,
      getModel: (chatModel?: ChatModel) => customModelProvider.getModel(chatModel),
    };
  }

  // Build provider functions for each enabled provider
  const providerFns = new Map<string, ProviderFn>();
  for (const pk of providerKeys) {
    if (!pk.enabled) continue;
    const fn = buildProviderFn(pk);
    if (fn) providerFns.set(pk.provider, fn);
  }

  // Build per-provider sets of enabled model names
  const enabledByProvider = new Map<string, Set<string>>();
  for (const ms of modelSettings) {
    if (!enabledByProvider.has(ms.provider)) {
      enabledByProvider.set(ms.provider, new Set());
    }
    if (ms.enabled) enabledByProvider.get(ms.provider)!.add(ms.modelName);
  }

  const defaultSetting = modelSettings.find((ms) => ms.isDefault && ms.enabled);
  const defaultModel: ChatModel | null = defaultSetting
    ? { provider: defaultSetting.provider, model: defaultSetting.modelName }
    : null;

  // Filter static models to only enabled ones for configured providers
  const staticModelsInfo = customModelProvider.modelsInfo
    .filter((p) => providerFns.has(p.provider))
    .map((p) => {
      const enabledSet = enabledByProvider.get(p.provider);
      const models =
        !enabledSet || enabledSet.size === 0
          ? p.models
          : p.models.filter((m) => enabledSet.has(m.name));
      return { ...p, hasAPIKey: true, models };
    })
    .filter((p) => p.models.length > 0);

  // Add Azure as a dynamic single-model entry when configured
  const azureKey = providerKeys.find(
    (pk) => pk.provider === "azure" && pk.enabled && pk.azureDeploymentName,
  );
  const azureEntry =
    azureKey && providerFns.has("azure")
      ? [
          {
            provider: "azure" as const,
            hasAPIKey: true,
            models: [
              {
                name: azureKey.azureDeploymentName!,
                isToolCallUnsupported: false,
                isImageInputUnsupported: false,
                supportedFileMimeTypes: [] as string[],
              },
            ],
          },
        ]
      : [];

  const modelsInfo = [...staticModelsInfo, ...azureEntry];

  const getModel = (chatModel?: ChatModel): LanguageModel => {
    if (!chatModel) {
      if (defaultModel) {
        const fn = providerFns.get(defaultModel.provider);
        if (fn) return fn(defaultModel.model);
      }
      return customModelProvider.getModel(undefined);
    }
    const fn = providerFns.get(chatModel.provider);
    if (fn) return fn(chatModel.model);
    return customModelProvider.getModel(chatModel);
  };

  return { modelsInfo, defaultModel, getModel };
}
```

**Note on Azure SDK:** `createAzure` from `@ai-sdk/azure` accepts `baseURL` to set a custom endpoint. If `@ai-sdk/azure` only supports `resourceName` (not `baseURL`), adjust `buildProviderFn` for `"azure"` to use: `createAzure({ resourceName: extractHostname(pk.azureEndpoint), apiKey: pk.apiKey, apiVersion: ... })`. Verify against `node_modules/@ai-sdk/azure/dist/index.d.ts`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tenant-model-provider.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/tenant-model-provider.ts src/lib/ai/tenant-model-provider.test.ts
git commit -m "feat: add getTenantModelProvider with per-tenant DB-driven model resolution"
```

---

### Task 8: Update /api/chat/models route

**Files:**
- Modify: `src/app/api/chat/models/route.ts`

The response shape changes from an array to `{ models, defaultModel, userPreferred }`.

- [ ] **Step 1: Write test**

Create `src/app/api/chat/models/route.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("lib/ai/tenant-model-provider", () => ({
  getTenantModelProvider: vi.fn().mockResolvedValue({
    modelsInfo: [
      {
        provider: "anthropic", hasAPIKey: true,
        models: [{ name: "sonnet-4.5", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: [] }],
      },
    ],
    defaultModel: { provider: "anthropic", model: "sonnet-4.5" },
    getModel: vi.fn(),
  }),
}));

vi.mock("auth/server", () => ({
  getSession: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

vi.mock("lib/db/repository", () => ({
  userRepository: {
    getPreferredModel: vi.fn().mockResolvedValue({ provider: "anthropic", model: "haiku-4.5" }),
  },
}));

describe("GET /api/chat/models", () => {
  it("returns models array, defaultModel, and userPreferred", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/chat/models", {
      headers: { "x-tenant-id": "tenant-1" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(body).toHaveProperty("models");
    expect(body).toHaveProperty("defaultModel");
    expect(body).toHaveProperty("userPreferred");
    expect(Array.isArray(body.models)).toBe(true);
    expect(body.userPreferred).toEqual({ provider: "anthropic", model: "haiku-4.5" });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- src/app/api/chat/models/route.test.ts
```

Expected: FAIL — current route returns array, not `{ models, defaultModel, userPreferred }`.

- [ ] **Step 3: Replace route contents**

Replace all of `src/app/api/chat/models/route.ts` with:

```typescript
import { getTenantModelProvider } from "lib/ai/tenant-model-provider";
import { getSession } from "auth/server";
import { userRepository } from "lib/db/repository";

export const GET = async (request: Request) => {
  const tenantId =
    request.headers.get("x-tenant-id") ??
    "00000000-0000-0000-0000-000000000000";

  const session = await getSession();
  const userId = session?.user.id;

  const [tenantProvider, userPreferred] = await Promise.all([
    getTenantModelProvider(tenantId),
    userId ? userRepository.getPreferredModel(userId) : Promise.resolve(null),
  ]);

  const models = tenantProvider.modelsInfo.slice().sort((a, b) => {
    if (a.hasAPIKey && !b.hasAPIKey) return -1;
    if (!a.hasAPIKey && b.hasAPIKey) return 1;
    return 0;
  });

  return Response.json({
    models,
    defaultModel: tenantProvider.defaultModel,
    userPreferred,
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/app/api/chat/models/route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/chat/models/route.ts src/app/api/chat/models/route.test.ts
git commit -m "feat: update chat/models route to use tenant provider and return userPreferred"
```

---

### Task 9: Update /api/chat route to use tenant provider

**Files:**
- Modify: `src/app/api/chat/route.ts`

Current state: Line 12 imports `customModelProvider`; line 111 calls `customModelProvider.getModel(chatModel)`.

- [ ] **Step 1: Replace the import**

In `src/app/api/chat/route.ts`, find and replace line 12:

Old:
```typescript
import { customModelProvider, isToolCallUnsupportedModel } from "lib/ai/models";
```

New:
```typescript
import { isToolCallUnsupportedModel } from "lib/ai/models";
import { getTenantModelProvider } from "lib/ai/tenant-model-provider";
```

- [ ] **Step 2: Replace the model resolution (line ~111)**

Find:
```typescript
const model = customModelProvider.getModel(chatModel);
```

Replace with:
```typescript
const tenantId =
  request.headers.get("x-tenant-id") ??
  "00000000-0000-0000-0000-000000000000";
const tenantProvider = await getTenantModelProvider(tenantId);
const model = tenantProvider.getModel(chatModel);
```

- [ ] **Step 3: Check TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "api/chat/route" | head -10
```

Expected: No output (no errors on chat route).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: use getTenantModelProvider in /api/chat route"
```

---

### Task 10: Create admin model providers API route

**Files:**
- Create: `src/app/api/admin/models/providers/route.ts`
- Create: `src/app/api/admin/models/providers/route.test.ts`

- [ ] **Step 1: Write tests**

Create `src/app/api/admin/models/providers/route.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("lib/db/repository", () => ({
  tenantModelConfigRepository: {
    getProviderKeys: vi.fn().mockResolvedValue([
      {
        id: "1", tenantId: "t1", provider: "anthropic",
        apiKey: "sk-ant-api03-supersecretkey1234",
        enabled: true, azureEndpoint: null, azureDeploymentName: null,
        azureApiVersion: null, createdAt: new Date(), updatedAt: new Date(),
      },
    ]),
    upsertProviderKey: vi.fn().mockResolvedValue({
      id: "2", tenantId: "t1", provider: "openai",
      apiKey: "sk-openai-test-key-5678",
      enabled: true, azureEndpoint: null, azureDeploymentName: null,
      azureApiVersion: null, createdAt: new Date(), updatedAt: new Date(),
    }),
    deleteProviderKey: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("GET /api/admin/models/providers", () => {
  it("returns masked keys and no raw apiKey", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/admin/models/providers", {
      headers: { "x-tenant-id": "t1" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(body.providers).toHaveLength(1);
    expect(body.providers[0]).toHaveProperty("apiKeyMasked");
    expect(body.providers[0]).not.toHaveProperty("apiKey");
    expect(body.providers[0].apiKeyMasked).toContain("•");
    expect(body.providers[0].apiKeyMasked).toMatch(/1234$/);
  });
});

describe("PUT /api/admin/models/providers", () => {
  it("calls upsertProviderKey and returns masked result", async () => {
    const { PUT } = await import("./route");
    const req = new Request("http://localhost/api/admin/models/providers", {
      method: "PUT",
      headers: { "x-tenant-id": "t1", "content-type": "application/json" },
      body: JSON.stringify({ provider: "openai", apiKey: "sk-new-key", enabled: true }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toHaveProperty("apiKeyMasked");
    expect(body.provider).not.toHaveProperty("apiKey");
  });
});

describe("DELETE /api/admin/models/providers", () => {
  it("deletes provider key and returns success", async () => {
    const { DELETE } = await import("./route");
    const req = new Request(
      "http://localhost/api/admin/models/providers?provider=anthropic",
      { method: "DELETE", headers: { "x-tenant-id": "t1" } },
    );
    const res = await DELETE(req);
    expect(res.status).toBe(200);
  });

  it("returns 400 when provider param missing", async () => {
    const { DELETE } = await import("./route");
    const req = new Request(
      "http://localhost/api/admin/models/providers",
      { method: "DELETE", headers: { "x-tenant-id": "t1" } },
    );
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- providers/route.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the route**

Create `src/app/api/admin/models/providers/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { tenantModelConfigRepository } from "lib/db/repository";
import { maskApiKey } from "lib/db/pg/repositories/tenant-model-config-repository.pg";
import type { TenantProviderKey } from "app-types/model-config";

const UpsertProviderSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "azure"]),
  apiKey: z.string().min(1),
  enabled: z.boolean().default(true),
  azureEndpoint: z.string().url().optional().nullable(),
  azureDeploymentName: z.string().optional().nullable(),
  azureApiVersion: z.string().optional().nullable(),
});

function maskProvider(pk: TenantProviderKey) {
  const { apiKey, ...rest } = pk;
  return { ...rest, apiKeyMasked: maskApiKey(apiKey) };
}

export async function GET(request: Request) {
  try {
    const tenantId =
      request.headers.get("x-tenant-id") ??
      "00000000-0000-0000-0000-000000000000";
    const keys = await tenantModelConfigRepository.getProviderKeys(tenantId);
    return NextResponse.json({ providers: keys.map(maskProvider) });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch provider keys" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId =
      request.headers.get("x-tenant-id") ??
      "00000000-0000-0000-0000-000000000000";
    const body = await request.json();
    const data = UpsertProviderSchema.parse(body);
    const result = await tenantModelConfigRepository.upsertProviderKey(
      tenantId,
      data.provider,
      {
        apiKey: data.apiKey,
        enabled: data.enabled,
        azureEndpoint: data.azureEndpoint ?? null,
        azureDeploymentName: data.azureDeploymentName ?? null,
        azureApiVersion: data.azureApiVersion ?? null,
      },
    );
    return NextResponse.json({ provider: maskProvider(result) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to save provider key" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId =
      request.headers.get("x-tenant-id") ??
      "00000000-0000-0000-0000-000000000000";
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider");
    if (!provider) {
      return NextResponse.json(
        { error: "provider query param required" },
        { status: 400 },
      );
    }
    await tenantModelConfigRepository.deleteProviderKey(
      tenantId,
      provider as "openai" | "anthropic" | "google" | "azure",
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete provider key" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- providers/route.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/models/providers/
git commit -m "feat: add admin models providers route (GET/PUT/DELETE)"
```

---

### Task 11: Create admin model settings API route

**Files:**
- Create: `src/app/api/admin/models/settings/route.ts`
- Create: `src/app/api/admin/models/settings/route.test.ts`

- [ ] **Step 1: Write tests**

Create `src/app/api/admin/models/settings/route.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("lib/db/repository", () => ({
  tenantModelConfigRepository: {
    getModelSettings: vi.fn().mockResolvedValue([
      {
        id: "1", tenantId: "t1", provider: "anthropic",
        modelName: "sonnet-4.5", enabled: true, isDefault: true,
        createdAt: new Date(), updatedAt: new Date(),
      },
    ]),
    bulkUpsertModelSettings: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("lib/ai/models", () => ({
  customModelProvider: {
    modelsInfo: [
      {
        provider: "anthropic", hasAPIKey: false,
        models: [
          { name: "sonnet-4.5", isToolCallUnsupported: false },
          { name: "haiku-4.5", isToolCallUnsupported: false },
        ],
      },
    ],
  },
}));

describe("GET /api/admin/models/settings", () => {
  it("merges static model list with DB overrides", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/admin/models/settings", {
      headers: { "x-tenant-id": "t1" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(body.settings).toBeDefined();
    const sonnet = body.settings.find(
      (s: { modelName: string }) => s.modelName === "sonnet-4.5",
    );
    expect(sonnet?.isDefault).toBe(true);
    expect(sonnet?.enabled).toBe(true);

    // haiku has no DB row — should default to enabled:true
    const haiku = body.settings.find(
      (s: { modelName: string }) => s.modelName === "haiku-4.5",
    );
    expect(haiku?.enabled).toBe(true);
    expect(haiku?.isDefault).toBe(false);
  });
});

describe("PATCH /api/admin/models/settings", () => {
  it("calls bulkUpsertModelSettings with provided updates", async () => {
    const { tenantModelConfigRepository } = await import("lib/db/repository");
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/admin/models/settings", {
      method: "PATCH",
      headers: { "x-tenant-id": "t1", "content-type": "application/json" },
      body: JSON.stringify({
        updates: [{ provider: "anthropic", modelName: "haiku-4.5", enabled: false }],
      }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(tenantModelConfigRepository.bulkUpsertModelSettings).toHaveBeenCalledWith(
      "t1",
      [{ provider: "anthropic", modelName: "haiku-4.5", enabled: false }],
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- settings/route.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the route**

Create `src/app/api/admin/models/settings/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { tenantModelConfigRepository } from "lib/db/repository";
import { customModelProvider } from "lib/ai/models";

const BulkUpdateSchema = z.object({
  updates: z.array(
    z.object({
      provider: z.enum(["openai", "anthropic", "google", "azure"]),
      modelName: z.string().min(1),
      enabled: z.boolean().optional(),
      isDefault: z.boolean().optional(),
    }),
  ),
});

export async function GET(request: Request) {
  try {
    const tenantId =
      request.headers.get("x-tenant-id") ??
      "00000000-0000-0000-0000-000000000000";

    const dbSettings = await tenantModelConfigRepository.getModelSettings(tenantId);
    const dbMap = new Map(
      dbSettings.map((s) => [`${s.provider}:${s.modelName}`, s]),
    );

    // Merge full static model list with DB overrides so UI can show all models
    const settings = customModelProvider.modelsInfo.flatMap((providerInfo) =>
      providerInfo.models.map((m) => {
        const key = `${providerInfo.provider}:${m.name}`;
        const db = dbMap.get(key);
        return {
          tenantId,
          provider: providerInfo.provider,
          modelName: m.name,
          enabled: db?.enabled ?? true,
          isDefault: db?.isDefault ?? false,
          isToolCallUnsupported: m.isToolCallUnsupported,
        };
      }),
    );

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch model settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const tenantId =
      request.headers.get("x-tenant-id") ??
      "00000000-0000-0000-0000-000000000000";
    const body = await request.json();
    const { updates } = BulkUpdateSchema.parse(body);
    await tenantModelConfigRepository.bulkUpsertModelSettings(tenantId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update model settings" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- settings/route.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/models/settings/
git commit -m "feat: add admin models settings route (GET/PATCH)"
```

---

### Task 12: Create user preferred model route

**Files:**
- Create: `src/app/api/user/preferred-model/route.ts`
- Create: `src/app/api/user/preferred-model/route.test.ts`

- [ ] **Step 1: Write tests**

Create `src/app/api/user/preferred-model/route.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("auth/server", () => ({
  getSession: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

vi.mock("lib/db/repository", () => ({
  userRepository: {
    updatePreferredModel: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("PATCH /api/user/preferred-model", () => {
  it("saves preferred model for authenticated user", async () => {
    const { userRepository } = await import("lib/db/repository");
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/user/preferred-model", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", model: "sonnet-4.5" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(userRepository.updatePreferredModel).toHaveBeenCalledWith("user-1", {
      provider: "anthropic",
      model: "sonnet-4.5",
    });
  });

  it("clears preferred model when clear:true sent", async () => {
    const { userRepository } = await import("lib/db/repository");
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/user/preferred-model", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(userRepository.updatePreferredModel).toHaveBeenCalledWith(
      "user-1",
      null,
    );
  });

  it("returns 401 when unauthenticated", async () => {
    const { getSession } = await import("auth/server");
    vi.mocked(getSession).mockResolvedValueOnce(null);
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/user/preferred-model", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", model: "sonnet-4.5" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- preferred-model/route.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the route**

Create `src/app/api/user/preferred-model/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "auth/server";
import { userRepository } from "lib/db/repository";

const PreferredModelSchema = z.union([
  z.object({ provider: z.string().min(1), model: z.string().min(1) }),
  z.object({ clear: z.literal(true) }),
]);

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const data = PreferredModelSchema.parse(body);
    const model =
      "clear" in data
        ? null
        : { provider: data.provider, model: data.model };
    await userRepository.updatePreferredModel(session.user.id, model);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update preferred model" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- preferred-model/route.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/user/preferred-model/
git commit -m "feat: add user preferred model route"
```

---

### Task 13: Update useChatModels hook and SelectModel component

**Files:**
- Modify: `src/hooks/queries/use-chat-models.ts`
- Modify: `src/components/select-model.tsx`

The `/api/chat/models` response shape changed from an array to `{ models, defaultModel, userPreferred }`.

- [ ] **Step 1: Replace useChatModels hook**

Replace all of `src/hooks/queries/use-chat-models.ts` with:

```typescript
import { appStore } from "@/app/store";
import { fetcher } from "lib/utils";
import useSWR, { SWRConfiguration } from "swr";
import type { ChatModel } from "app-types/chat";

type ModelInfo = {
  name: string;
  isToolCallUnsupported: boolean;
  isImageInputUnsupported: boolean;
  supportedFileMimeTypes: string[];
};

export type ProviderInfo = {
  provider: string;
  hasAPIKey: boolean;
  models: ModelInfo[];
};

export type ChatModelsResponse = {
  models: ProviderInfo[];
  defaultModel: ChatModel | null;
  userPreferred: ChatModel | null;
};

export const useChatModels = (options?: SWRConfiguration) => {
  return useSWR<ChatModelsResponse>("/api/chat/models", fetcher, {
    dedupingInterval: 60_000 * 5,
    revalidateOnFocus: false,
    fallbackData: { models: [], defaultModel: null, userPreferred: null },
    onSuccess: (data) => {
      const status = appStore.getState();
      if (!status.chatModel) {
        // Priority: user preferred > tenant default > first available model
        const toSet = data.userPreferred ?? data.defaultModel;
        if (toSet) {
          appStore.setState({ chatModel: toSet });
        } else if (
          data.models.length > 0 &&
          data.models[0].models.length > 0
        ) {
          appStore.setState({
            chatModel: {
              provider: data.models[0].provider,
              model: data.models[0].models[0].name,
            },
          });
        }
      }
    },
    ...options,
  });
};
```

- [ ] **Step 2: Update SelectModel component**

In `src/components/select-model.tsx`, make two targeted changes:

**Change 1** — update the `useChatModels` destructure. Find:

```typescript
const { data: providers } = useChatModels();
```

Replace with:

```typescript
const { data: chatModelsData } = useChatModels();
const providers = chatModelsData?.models ?? [];
```

**Change 2** — add the background save on model select. Find the `onSelect` callback inside `CommandItem`:

```typescript
onSelect={() => {
  setModel({
    provider: provider.provider,
    model: item.name,
  });
  props.onSelect({
    provider: provider.provider,
    model: item.name,
  });
  setOpen(false);
}}
```

Replace with:

```typescript
onSelect={() => {
  const selected = {
    provider: provider.provider,
    model: item.name,
  };
  setModel(selected);
  props.onSelect(selected);
  setOpen(false);
  fetch("/api/user/preferred-model", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(selected),
  }).catch(() => {
    // fire and forget — preference save failure is not user-facing
  });
}}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "select-model|use-chat-models" | head -10
```

Expected: No output.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/queries/use-chat-models.ts src/components/select-model.tsx
git commit -m "feat: update useChatModels and SelectModel for new response shape and user preferred model"
```

---

### Task 14: Create admin models page

**Files:**
- Create: `src/app/(admin)/admin/models/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/(admin)/admin/models/page.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  TenantProviderKeyMasked,
  SupportedProvider,
} from "app-types/model-config";

type ModelRow = {
  provider: string;
  modelName: string;
  enabled: boolean;
  isDefault: boolean;
  isToolCallUnsupported: boolean;
};

type ProviderForm = {
  apiKey: string;
  enabled: boolean;
  azureEndpoint: string;
  azureDeploymentName: string;
  azureApiVersion: string;
};

const PROVIDERS: { id: SupportedProvider; label: string }[] = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "google", label: "Google" },
  { id: "azure", label: "Azure OpenAI" },
];

const DEFAULT_FORM: ProviderForm = {
  apiKey: "",
  enabled: true,
  azureEndpoint: "",
  azureDeploymentName: "",
  azureApiVersion: "2024-02-01",
};

export default function ModelSettingsPage() {
  const [selected, setSelected] = useState<SupportedProvider>("anthropic");
  const [providerKeys, setProviderKeys] = useState<TenantProviderKeyMasked[]>([]);
  const [modelRows, setModelRows] = useState<ModelRow[]>([]);
  const [form, setForm] = useState<ProviderForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [revealKey, setRevealKey] = useState(false);

  const fetchAll = useCallback(async () => {
    const [pkRes, msRes] = await Promise.all([
      fetch("/api/admin/models/providers"),
      fetch("/api/admin/models/settings"),
    ]);
    if (pkRes.ok) {
      const data = await pkRes.json();
      setProviderKeys(data.providers ?? []);
    }
    if (msRes.ok) {
      const data = await msRes.json();
      setModelRows(data.settings ?? []);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Reset form when provider selection changes
  useEffect(() => {
    const pk = providerKeys.find((p) => p.provider === selected);
    setForm({
      ...DEFAULT_FORM,
      enabled: pk?.enabled ?? true,
      azureEndpoint: pk?.azureEndpoint ?? "",
      azureDeploymentName: pk?.azureDeploymentName ?? "",
      azureApiVersion: pk?.azureApiVersion ?? "2024-02-01",
    });
    setRevealKey(false);
    setSaveError(null);
  }, [selected, providerKeys]);

  const providerStatus = (id: string) => {
    const pk = providerKeys.find((p) => p.provider === id);
    if (!pk) return "unconfigured";
    return pk.enabled ? "active" : "disabled";
  };

  const handleSave = async () => {
    const existing = providerKeys.find((p) => p.provider === selected);
    if (!form.apiKey && !existing) {
      setSaveError("API key is required");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const body: Record<string, unknown> = {
        provider: selected,
        apiKey: form.apiKey || existing?.apiKeyMasked || "",
        enabled: form.enabled,
      };
      if (selected === "azure") {
        body.azureEndpoint = form.azureEndpoint || null;
        body.azureDeploymentName = form.azureDeploymentName || null;
        body.azureApiVersion = form.azureApiVersion || "2024-02-01";
      }
      const res = await fetch("/api/admin/models/providers", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setSaveError("Save failed. Check your API key and try again.");
        return;
      }
      await fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (
      !confirm(
        `Remove the ${PROVIDERS.find((p) => p.id === selected)?.label} configuration?`,
      )
    )
      return;
    await fetch(`/api/admin/models/providers?provider=${selected}`, {
      method: "DELETE",
    });
    await fetchAll();
  };

  const handleToggle = async (provider: string, modelName: string, enabled: boolean) => {
    setModelRows((prev) =>
      prev.map((r) =>
        r.provider === provider && r.modelName === modelName
          ? { ...r, enabled }
          : r,
      ),
    );
    await fetch("/api/admin/models/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ updates: [{ provider, modelName, enabled }] }),
    });
  };

  const handleSetDefault = async (provider: string, modelName: string) => {
    setModelRows((prev) =>
      prev.map((r) => ({
        ...r,
        isDefault: r.provider === provider && r.modelName === modelName,
      })),
    );
    await fetch("/api/admin/models/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        updates: [{ provider, modelName, isDefault: true }],
      }),
    });
  };

  const currentModels = modelRows.filter((r) => r.provider === selected);
  const pk = providerKeys.find((p) => p.provider === selected);

  const StatusDot = ({ status }: { status: string }) => (
    <span
      className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
        status === "active"
          ? "bg-green-500"
          : status === "disabled"
            ? "bg-zinc-500"
            : "bg-red-500"
      }`}
    />
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Model Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure AI provider API keys and control which models are available
          for this tenant.
        </p>
      </div>

      <div className="flex gap-6 min-h-[580px]">
        {/* Provider sidebar */}
        <aside className="w-48 flex-shrink-0 space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3 px-1">
            Providers
          </p>
          {PROVIDERS.map(({ id, label }) => {
            const status = providerStatus(id);
            return (
              <button
                key={id}
                onClick={() => setSelected(id)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                  selected === id
                    ? "bg-blue-600/15 border-l-2 border-blue-500 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center">
                  <StatusDot status={status} />
                  {label}
                </div>
                <div
                  className={`text-xs mt-0.5 ml-3.5 ${
                    status === "active"
                      ? "text-green-500"
                      : status === "disabled"
                        ? "text-zinc-500"
                        : "text-red-500"
                  }`}
                >
                  {status === "active"
                    ? "Configured"
                    : status === "disabled"
                      ? "Disabled"
                      : "No API key"}
                </div>
              </button>
            );
          })}
        </aside>

        {/* Detail panel */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Provider config card */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-base font-medium text-zinc-100 mb-4">
              {PROVIDERS.find((p) => p.id === selected)?.label} Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={revealKey ? "text" : "password"}
                    placeholder={pk ? pk.apiKeyMasked : "Enter API key…"}
                    value={form.apiKey}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, apiKey: e.target.value }))
                    }
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setRevealKey((r) => !r)}
                    className="px-3 py-2 text-xs text-zinc-400 border border-zinc-700 rounded-md hover:text-zinc-100 hover:border-zinc-600 transition-colors"
                  >
                    {revealKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {selected === "azure" && (
                <>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      Azure Endpoint URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://your-resource.openai.azure.com"
                      value={form.azureEndpoint}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, azureEndpoint: e.target.value }))
                      }
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      Deployment Name
                    </label>
                    <input
                      type="text"
                      placeholder="my-gpt4-deployment"
                      value={form.azureDeploymentName}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          azureDeploymentName: e.target.value,
                        }))
                      }
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      API Version
                    </label>
                    <input
                      type="text"
                      placeholder="2024-02-01"
                      value={form.azureApiVersion}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          azureApiVersion: e.target.value,
                        }))
                      }
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, enabled: e.target.checked }))
                    }
                    className="rounded border-zinc-600 bg-zinc-800 text-blue-600"
                  />
                  Provider enabled
                </label>
              </div>

              {saveError && (
                <p className="text-sm text-red-400">{saveError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-md font-medium transition-colors"
                >
                  {saving ? "Saving…" : "Save Configuration"}
                </button>
                {pk && (
                  <button
                    onClick={handleRemove}
                    className="px-4 py-2 bg-transparent border border-zinc-700 hover:border-red-600 hover:text-red-400 text-zinc-400 text-sm rounded-md transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Models table card */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-medium text-zinc-100">Models</h2>
                {!pk && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Save an API key above to enable model toggles.
                  </p>
                )}
              </div>
            </div>
            {currentModels.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">
                No models found for this provider.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-zinc-400 w-full">
                      Model
                    </th>
                    <th className="px-5 py-2.5 text-xs font-medium text-zinc-400 whitespace-nowrap">
                      Enabled
                    </th>
                    <th className="px-5 py-2.5 text-xs font-medium text-zinc-400 whitespace-nowrap">
                      Default
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentModels.map((m) => (
                    <tr
                      key={m.modelName}
                      className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40"
                    >
                      <td className="px-5 py-3">
                        <span
                          className={pk ? "text-zinc-200" : "text-zinc-500"}
                        >
                          {m.modelName}
                        </span>
                        {m.isToolCallUnsupported && (
                          <span className="ml-2 text-xs text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">
                            No tools
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={m.enabled}
                          disabled={!pk}
                          onChange={(e) =>
                            handleToggle(
                              m.provider,
                              m.modelName,
                              e.target.checked,
                            )
                          }
                          className="rounded border-zinc-600 bg-zinc-800 text-blue-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="radio"
                          name="default-model"
                          checked={m.isDefault}
                          disabled={!pk || !m.enabled}
                          onChange={() =>
                            handleSetDefault(m.provider, m.modelName)
                          }
                          className="text-blue-600 border-zinc-600 bg-zinc-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "admin/models" | head -10
```

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/models/page.tsx
git commit -m "feat: add admin models split-panel page"
```

---

### Task 15: Add Model Settings to admin nav

**Files:**
- Modify: `src/app/(admin)/admin/layout.tsx`

- [ ] **Step 1: Add nav entry**

In `src/app/(admin)/admin/layout.tsx`, find the `navItems` array. Add this entry after the `Knowledge Base` item:

```typescript
  {
    href: "/admin/models",
    label: "Model Settings",
    icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All tests pass. Note the 3 pre-existing failing tests (upstream, unrelated to this feature) are acceptable.

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/layout.tsx
git commit -m "feat: add Model Settings to admin nav"
```

---

## Verification Checklist

After all tasks complete, verify the full flow works:

1. **Dev mode (no DB config):** Open the app, start a chat — all static models should appear (env-var fallback working).
2. **Configure a provider:** Go to `/admin/models`, select Anthropic, enter an API key, save. Navigate back to chat — only enabled Anthropic models should appear.
3. **Set default model:** In `/admin/models`, set `sonnet-4.5` as default. Open a new chat in a different browser tab — it should pre-select `sonnet-4.5`.
4. **User preference overrides default:** In the chat UI, switch to `haiku-4.5`. Reload — it should still show `haiku-4.5` (preference stored per-user).
5. **Toggle a model off:** In `/admin/models`, disable `opus-4.5`. Verify it no longer appears in the model selector dropdown.
6. **Azure config:** Select Azure provider, enter endpoint, deployment name, API key. Save. Start a chat and select the Azure model — verify it works.
