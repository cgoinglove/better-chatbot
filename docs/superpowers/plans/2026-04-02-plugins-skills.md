# Plugins & Skills System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Claude.ai-style Customize panel — plugins (bundles of skills + commands) that inject domain expertise into chats, with a unified `/customize` page and on-demand system prompt activation.

**Architecture:** Two new DB tables (`PluginTable`, `UserPluginTable`) using JSONB for skills/commands (Approach B). Pure utility functions handle data transformation and are unit-tested independently of the DB. Chat integration adds an `activePluginId` field to the request schema and a new `<active_plugins>` block to the system prompt.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (PostgreSQL), Vitest, React Query (`@tanstack/react-query`), shadcn/ui, Lucide icons, Zod

**Spec:** `docs/superpowers/specs/2026-04-02-plugins-skills-design.md`

**Test runner:** `npm run test` (vitest)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/plugin.ts` | Create | Types + `PluginRepository` interface |
| `src/lib/db/pg/schema.pg.ts` | Modify | Add `PluginTable`, `UserPluginTable` |
| `src/lib/db/migrations/pg/` | Generate | Migration via `npm run db:generate` |
| `src/lib/plugins/plugin-utils.ts` | Create | Pure helpers: merge, dedupe, findCommand, buildPrompt |
| `src/lib/plugins/plugin-utils.test.ts` | Create | Unit tests for all pure helpers |
| `src/lib/db/pg/repositories/plugin-repository.pg.ts` | Create | Drizzle DB implementation |
| `src/lib/db/repository.ts` | Modify | Export `pluginRepository` |
| `src/app/api/plugins/validations.ts` | Create | Zod schemas + permission helpers |
| `src/app/api/plugins/validations.test.ts` | Create | Validation + permission unit tests |
| `src/app/api/plugins/route.ts` | Create | `GET /api/plugins`, `POST /api/plugins` |
| `src/app/api/plugins/[id]/route.ts` | Create | `GET`, `PATCH`, `DELETE /api/plugins/[id]` |
| `src/app/api/plugins/[id]/enable/route.ts` | Create | `POST`, `DELETE /api/plugins/[id]/enable` |
| `src/app/api/plugins/seed/route.ts` | Create | `POST /api/plugins/seed` (admin) |
| `src/lib/ai/prompts.ts` | Modify | Add `activePlugins` param to `buildUserSystemPrompt` |
| `src/types/chat.ts` | Modify | Add `plugin`/`skill` mention types + `activePluginId` to schema |
| `src/app/api/chat/route.ts` | Modify | Fetch + inject active plugins |
| `src/hooks/queries/use-plugins.ts` | Create | React Query hooks |
| `src/components/plugin-selector.tsx` | Create | Plugin selector pill + skill chips |
| `src/app/(chat)/customize/page.tsx` | Create | `/customize` server page |
| `src/components/customize/customize-shell.tsx` | Create | 3-column client layout |
| `src/components/customize/plugin-list.tsx` | Create | Middle column — plugin list |
| `src/components/customize/plugin-detail.tsx` | Create | Right panel — plugin detail + edit |
| `src/components/layouts/app-sidebar-menus.tsx` | Modify | Add Customize sidebar entry |
| `src/app/(admin)/admin/plugins/page.tsx` | Create | Admin plugins management page |
| `scripts/seed-plugins.ts` | Create | Seed 10 default org plugins |

---

## Task 1: Types

**Files:**
- Create: `src/types/plugin.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/plugin.ts
export type PluginCategory =
  | 'productivity'
  | 'research'
  | 'legal'
  | 'sales'
  | 'hr'
  | 'custom';

export interface PluginSkill {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  prompt: string;
  category: string;
  tags: string[];
}

export interface PluginCommand {
  id: string;
  slug: string;
  name: string;
  description: string;
  prompt: string;
}

export interface Plugin {
  id: string;
  tenantId: string | null;
  userId: string | null;
  name: string;
  description: string;
  category: PluginCategory;
  icon: string;
  color: string;
  systemPromptAddition: string;
  skills: PluginSkill[];
  commands: PluginCommand[];
  isBuiltIn: boolean;
  isPublic: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPlugin {
  id: string;
  userId: string;
  pluginId: string;
  enabled: boolean;
  isPinned: boolean;
  customSystemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PluginWithUserState extends Plugin {
  userState: {
    enabled: boolean;
    isPinned: boolean;
    customSystemPrompt: string | null;
  } | null;
}

export interface PluginRepository {
  listPluginsForUser(userId: string, tenantId: string): Promise<PluginWithUserState[]>;
  listEnabledPluginsForUser(userId: string, tenantId: string): Promise<PluginWithUserState[]>;
  getPluginById(id: string, userId: string): Promise<PluginWithUserState | null>;
  insertPlugin(data: InsertPlugin): Promise<Plugin>;
  updatePlugin(id: string, data: Partial<InsertPlugin>): Promise<Plugin>;
  deletePlugin(id: string): Promise<void>;
  enablePlugin(userId: string, pluginId: string): Promise<UserPlugin>;
  disablePlugin(userId: string, pluginId: string): Promise<void>;
  upsertUserPlugin(data: { userId: string; pluginId: string; enabled?: boolean; isPinned?: boolean; customSystemPrompt?: string | null }): Promise<UserPlugin>;
  seedPlugins(plugins: InsertPlugin[]): Promise<Plugin[]>;
}

export type InsertPlugin = Omit<Plugin, 'id' | 'createdAt' | 'updatedAt'>;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | grep "plugin.ts" | head -20
```

Expected: no errors from `src/types/plugin.ts`

- [ ] **Step 3: Commit**

```bash
git add src/types/plugin.ts
git commit -m "feat: add Plugin types and PluginRepository interface"
```

---

## Task 2: Schema + Migration

**Files:**
- Modify: `src/lib/db/pg/schema.pg.ts`
- Generate: `src/lib/db/migrations/pg/` (via CLI)

- [ ] **Step 1: Add imports to schema.pg.ts**

At the top of `src/lib/db/pg/schema.pg.ts`, add to the existing imports:

```ts
import type { PluginSkill, PluginCommand } from 'app-types/plugin';
```

- [ ] **Step 2: Add PluginTable to schema.pg.ts**

After `McpServerTable` (around line 253), add:

```ts
export const PluginTable = pgTable(
  'plugin',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    tenantId: uuid('tenant_id'),
    userId: uuid('user_id').references(() => UserTable.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    category: varchar('category', {
      enum: ['productivity', 'research', 'legal', 'sales', 'hr', 'custom'],
    })
      .notNull()
      .default('custom'),
    icon: text('icon').notNull().default('Sparkles'),
    color: text('color').notNull().default('bg-blue-500/10 text-blue-500'),
    systemPromptAddition: text('system_prompt_addition').notNull().default(''),
    skills: json('skills').notNull().default([]).$type<PluginSkill[]>(),
    commands: json('commands').notNull().default([]).$type<PluginCommand[]>(),
    isBuiltIn: boolean('is_built_in').notNull().default(false),
    isPublic: boolean('is_public').notNull().default(false),
    version: text('version').notNull().default('1.0.0'),
    createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index('plugin_tenant_id_idx').on(t.tenantId),
    index('plugin_user_id_idx').on(t.userId),
  ],
);

export const UserPluginTable = pgTable(
  'user_plugin',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => UserTable.id, { onDelete: 'cascade' }),
    pluginId: uuid('plugin_id')
      .notNull()
      .references(() => PluginTable.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull().default(false),
    isPinned: boolean('is_pinned').notNull().default(false),
    customSystemPrompt: text('custom_system_prompt'),
    createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    unique().on(t.userId, t.pluginId),
    index('user_plugin_user_id_idx').on(t.userId),
  ],
);

export type PluginEntity = typeof PluginTable.$inferSelect;
export type UserPluginEntity = typeof UserPluginTable.$inferSelect;
```

- [ ] **Step 3: Generate migration**

```bash
npm run db:generate
```

Expected: new SQL file created in `src/lib/db/migrations/pg/`

- [ ] **Step 4: Apply migration**

```bash
npm run db:migrate
```

Expected: migration applied, `plugin` and `user_plugin` tables created in DB

- [ ] **Step 5: Verify no TS errors**

```bash
npx tsc --noEmit 2>&1 | grep -E "schema.pg.ts|plugin" | head -10
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/pg/schema.pg.ts src/lib/db/migrations/
git commit -m "feat: add PluginTable and UserPluginTable schema + migration"
```

---

## Task 3: Plugin Utilities + Unit Tests

**Files:**
- Create: `src/lib/plugins/plugin-utils.ts`
- Create: `src/lib/plugins/plugin-utils.test.ts`

These pure functions are the testable core of the system (covers spec tests R-03, R-08, S-01–S-05, SL-01–SL-03, C-dedupe).

- [ ] **Step 1: Write the failing tests first**

```ts
// src/lib/plugins/plugin-utils.test.ts
import { describe, it, expect } from 'vitest';
import {
  mergePluginWithUserState,
  dedupePluginsById,
  buildPluginsSystemPrompt,
  findCommandBySlug,
} from './plugin-utils';
import type { Plugin, UserPlugin } from 'app-types/plugin';

const basePlugin: Plugin = {
  id: 'p1',
  tenantId: 'tenant-1',
  userId: null,
  name: 'Customer Success',
  description: 'CS plugin',
  category: 'productivity',
  icon: 'HeartHandshake',
  color: 'bg-teal-500/10 text-teal-500',
  systemPromptAddition: 'You are a CS assistant.',
  skills: [{ id: 's1', name: 'QBR Prep', description: 'Build QBR', longDescription: 'Build a QBR', prompt: 'Help me prep a QBR', category: 'productivity', tags: ['QBR'] }],
  commands: [{ id: 'c1', slug: 'qbr-prep', name: 'QBR Prep', description: 'Prep QBR', prompt: 'Help me prep a QBR' }],
  isBuiltIn: true,
  isPublic: true,
  version: '1.0.0',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseUserPlugin: UserPlugin = {
  id: 'up1',
  userId: 'user-1',
  pluginId: 'p1',
  enabled: true,
  isPinned: false,
  customSystemPrompt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// R-03: no userState when no UserPlugin row
describe('mergePluginWithUserState', () => {
  it('returns userState null when no UserPlugin row exists', () => {
    const result = mergePluginWithUserState(basePlugin, null);
    expect(result.userState).toBeNull();
  });

  // R-08: customSystemPrompt is accessible via userState
  it('returns userState with customSystemPrompt when UserPlugin exists', () => {
    const userPlugin = { ...baseUserPlugin, customSystemPrompt: 'Custom override' };
    const result = mergePluginWithUserState(basePlugin, userPlugin);
    expect(result.userState?.customSystemPrompt).toBe('Custom override');
  });

  it('merges enabled and isPinned from UserPlugin', () => {
    const result = mergePluginWithUserState(basePlugin, baseUserPlugin);
    expect(result.userState?.enabled).toBe(true);
    expect(result.userState?.isPinned).toBe(false);
  });
});

// S-05: deduplicate by id
describe('dedupePluginsById', () => {
  it('removes duplicate plugin entries keeping first occurrence', () => {
    const p = mergePluginWithUserState(basePlugin, baseUserPlugin);
    const result = dedupePluginsById([p, p]);
    expect(result).toHaveLength(1);
  });

  it('keeps all unique plugins', () => {
    const p1 = mergePluginWithUserState(basePlugin, null);
    const p2 = mergePluginWithUserState({ ...basePlugin, id: 'p2' }, null);
    expect(dedupePluginsById([p1, p2])).toHaveLength(2);
  });
});

// S-01: no block when no plugins
describe('buildPluginsSystemPrompt', () => {
  it('returns empty string when no plugins', () => {
    expect(buildPluginsSystemPrompt([])).toBe('');
  });

  // S-02: includes plugin name and addition
  it('wraps each plugin systemPromptAddition in named plugin tag', () => {
    const p = mergePluginWithUserState(basePlugin, baseUserPlugin);
    const result = buildPluginsSystemPrompt([p]);
    expect(result).toContain('<active_plugins>');
    expect(result).toContain('<plugin name="Customer Success">');
    expect(result).toContain('You are a CS assistant.');
    expect(result).toContain('</plugin>');
    expect(result).toContain('</active_plugins>');
  });

  // S-03: customSystemPrompt overrides default
  it('uses customSystemPrompt over systemPromptAddition when present', () => {
    const userPlugin = { ...baseUserPlugin, customSystemPrompt: 'Custom override' };
    const p = mergePluginWithUserState(basePlugin, userPlugin);
    const result = buildPluginsSystemPrompt([p]);
    expect(result).toContain('Custom override');
    expect(result).not.toContain('You are a CS assistant.');
  });

  // S-04: multiple plugins
  it('includes all plugins when multiple provided', () => {
    const p1 = mergePluginWithUserState(basePlugin, baseUserPlugin);
    const p2 = mergePluginWithUserState({ ...basePlugin, id: 'p2', name: 'Sales', systemPromptAddition: 'You are a sales expert.' }, baseUserPlugin);
    const result = buildPluginsSystemPrompt([p1, p2]);
    expect(result).toContain('<plugin name="Customer Success">');
    expect(result).toContain('<plugin name="Sales">');
  });
});

// SL-01: found command
describe('findCommandBySlug', () => {
  it('returns command when slug matches', () => {
    const p = mergePluginWithUserState(basePlugin, baseUserPlugin);
    const result = findCommandBySlug('qbr-prep', [p]);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('QBR Prep');
  });

  // SL-03: no match
  it('returns null when no command matches slug', () => {
    const p = mergePluginWithUserState(basePlugin, baseUserPlugin);
    expect(findCommandBySlug('nonexistent', [p])).toBeNull();
  });

  it('returns null for empty plugins array', () => {
    expect(findCommandBySlug('qbr-prep', [])).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — confirm all fail**

```bash
npm run test -- src/lib/plugins/plugin-utils.test.ts
```

Expected: FAIL — `Cannot find module './plugin-utils'`

- [ ] **Step 3: Implement plugin-utils.ts**

```ts
// src/lib/plugins/plugin-utils.ts
import type { Plugin, UserPlugin, PluginWithUserState, PluginCommand } from 'app-types/plugin';

export function mergePluginWithUserState(
  plugin: Plugin,
  userPlugin: UserPlugin | null,
): PluginWithUserState {
  return {
    ...plugin,
    userState: userPlugin
      ? {
          enabled: userPlugin.enabled,
          isPinned: userPlugin.isPinned,
          customSystemPrompt: userPlugin.customSystemPrompt,
        }
      : null,
  };
}

export function dedupePluginsById(plugins: PluginWithUserState[]): PluginWithUserState[] {
  const seen = new Set<string>();
  return plugins.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export function buildPluginsSystemPrompt(plugins: PluginWithUserState[]): string {
  if (plugins.length === 0) return '';
  const blocks = plugins
    .map((p) => {
      const content = p.userState?.customSystemPrompt ?? p.systemPromptAddition;
      return `<plugin name="${p.name}">\n${content}\n</plugin>`;
    })
    .join('\n');
  return `<active_plugins>\n${blocks}\n</active_plugins>`;
}

export function findCommandBySlug(
  slug: string,
  plugins: PluginWithUserState[],
): PluginCommand | null {
  for (const plugin of plugins) {
    const command = plugin.commands.find((c) => c.slug === slug);
    if (command) return command;
  }
  return null;
}
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
npm run test -- src/lib/plugins/plugin-utils.test.ts
```

Expected: PASS — all 10 tests green

- [ ] **Step 5: Commit**

```bash
git add src/lib/plugins/
git commit -m "feat: add plugin-utils pure helpers with full test coverage"
```

---

## Task 4: Repository Implementation

**Files:**
- Create: `src/lib/db/pg/repositories/plugin-repository.pg.ts`
- Modify: `src/lib/db/repository.ts`

- [ ] **Step 1: Create repository**

```ts
// src/lib/db/pg/repositories/plugin-repository.pg.ts
import { pgDb as db } from '../db.pg';
import { PluginTable, UserPluginTable } from '../schema.pg';
import { eq, or, isNull, and } from 'drizzle-orm';
import { generateUUID } from 'lib/utils';
import type { PluginRepository, Plugin, UserPlugin, InsertPlugin } from 'app-types/plugin';
import { mergePluginWithUserState } from 'lib/plugins/plugin-utils';

export const pgPluginRepository: PluginRepository = {
  async listPluginsForUser(userId, tenantId) {
    const rows = await db
      .select({
        plugin: PluginTable,
        userPlugin: UserPluginTable,
      })
      .from(PluginTable)
      .leftJoin(
        UserPluginTable,
        and(eq(UserPluginTable.pluginId, PluginTable.id), eq(UserPluginTable.userId, userId)),
      )
      .where(
        or(
          eq(PluginTable.userId, userId),
          and(eq(PluginTable.tenantId, tenantId), eq(PluginTable.isPublic, true)),
        ),
      );

    return rows.map((r) => mergePluginWithUserState(r.plugin as Plugin, r.userPlugin as UserPlugin | null));
  },

  async listEnabledPluginsForUser(userId, tenantId) {
    const all = await this.listPluginsForUser(userId, tenantId);
    return all.filter((p) => p.userState?.enabled === true);
  },

  async getPluginById(id, userId) {
    const [row] = await db
      .select({ plugin: PluginTable, userPlugin: UserPluginTable })
      .from(PluginTable)
      .leftJoin(
        UserPluginTable,
        and(eq(UserPluginTable.pluginId, PluginTable.id), eq(UserPluginTable.userId, userId)),
      )
      .where(eq(PluginTable.id, id));

    if (!row) return null;
    return mergePluginWithUserState(row.plugin as Plugin, row.userPlugin as UserPlugin | null);
  },

  async insertPlugin(data) {
    const [result] = await db
      .insert(PluginTable)
      .values({ id: generateUUID(), ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning();
    return result as Plugin;
  },

  async updatePlugin(id, data) {
    const [result] = await db
      .update(PluginTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(PluginTable.id, id))
      .returning();
    return result as Plugin;
  },

  async deletePlugin(id) {
    await db.delete(PluginTable).where(eq(PluginTable.id, id));
  },

  async enablePlugin(userId, pluginId) {
    return this.upsertUserPlugin({ userId, pluginId, enabled: true });
  },

  async disablePlugin(userId, pluginId) {
    await db
      .update(UserPluginTable)
      .set({ enabled: false, updatedAt: new Date() })
      .where(and(eq(UserPluginTable.userId, userId), eq(UserPluginTable.pluginId, pluginId)));
  },

  async upsertUserPlugin(data) {
    const [result] = await db
      .insert(UserPluginTable)
      .values({
        id: generateUUID(),
        userId: data.userId,
        pluginId: data.pluginId,
        enabled: data.enabled ?? false,
        isPinned: data.isPinned ?? false,
        customSystemPrompt: data.customSystemPrompt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [UserPluginTable.userId, UserPluginTable.pluginId],
        set: {
          enabled: data.enabled ?? false,
          isPinned: data.isPinned ?? false,
          customSystemPrompt: data.customSystemPrompt ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result as UserPlugin;
  },

  async seedPlugins(plugins) {
    const results = await db
      .insert(PluginTable)
      .values(plugins.map((p) => ({ id: generateUUID(), ...p, createdAt: new Date(), updatedAt: new Date() })))
      .onConflictDoNothing()
      .returning();
    return results as Plugin[];
  },
};
```

- [ ] **Step 2: Export from repository.ts**

Add to the end of `src/lib/db/repository.ts`:

```ts
import { pgPluginRepository } from './pg/repositories/plugin-repository.pg';
export const pluginRepository = pgPluginRepository;
```

- [ ] **Step 3: Verify TS compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "plugin-repository|repository.ts" | head -10
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/pg/repositories/plugin-repository.pg.ts src/lib/db/repository.ts
git commit -m "feat: add plugin repository implementation and export"
```

---

## Task 5: API Validation Schemas + Tests

**Files:**
- Create: `src/app/api/plugins/validations.ts`
- Create: `src/app/api/plugins/validations.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/app/api/plugins/validations.test.ts
import { describe, it, expect } from 'vitest';
import {
  insertPluginSchema,
  updatePluginSchema,
  canModifyPlugin,
  canSeedPlugins,
} from './validations';

// A-05: POST body validation
describe('insertPluginSchema', () => {
  it('accepts valid plugin body', () => {
    const result = insertPluginSchema.safeParse({
      name: 'My Plugin',
      description: 'A test plugin',
      category: 'custom',
      icon: 'Sparkles',
      color: 'bg-blue-500/10 text-blue-500',
      systemPromptAddition: 'You are helpful.',
      skills: [],
      commands: [],
      isPublic: false,
      version: '1.0.0',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = insertPluginSchema.safeParse({ description: 'No name' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = insertPluginSchema.safeParse({ name: 'X', category: 'invalid' });
    expect(result.success).toBe(false);
  });
});

// A-06: owner check
describe('canModifyPlugin', () => {
  it('returns true when user owns the plugin', () => {
    expect(canModifyPlugin({ userId: 'u1', isBuiltIn: false }, 'u1', false)).toBe(true);
  });

  it('returns false when user does not own and is not admin', () => {
    expect(canModifyPlugin({ userId: 'u1', isBuiltIn: false }, 'u2', false)).toBe(false);
  });

  it('returns true for admin even on other user plugin', () => {
    expect(canModifyPlugin({ userId: 'u1', isBuiltIn: false }, 'u2', true)).toBe(true);
  });

  it('returns false for non-admin on built-in plugin', () => {
    expect(canModifyPlugin({ userId: null, isBuiltIn: true }, 'u1', false)).toBe(false);
  });
});

// A-08: seed permission
describe('canSeedPlugins', () => {
  it('returns true for admin role', () => {
    expect(canSeedPlugins('admin')).toBe(true);
  });

  it('returns false for user role', () => {
    expect(canSeedPlugins('user')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — confirm fail**

```bash
npm run test -- src/app/api/plugins/validations.test.ts
```

Expected: FAIL — `Cannot find module './validations'`

- [ ] **Step 3: Implement validations.ts**

```ts
// src/app/api/plugins/validations.ts
import { z } from 'zod';

const pluginSkillSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  longDescription: z.string(),
  prompt: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
});

const pluginCommandSchema = z.object({
  id: z.string(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1),
  description: z.string(),
  prompt: z.string(),
});

export const insertPluginSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().default(''),
  category: z.enum(['productivity', 'research', 'legal', 'sales', 'hr', 'custom']).default('custom'),
  icon: z.string().default('Sparkles'),
  color: z.string().default('bg-blue-500/10 text-blue-500'),
  systemPromptAddition: z.string().default(''),
  skills: z.array(pluginSkillSchema).default([]),
  commands: z.array(pluginCommandSchema).default([]),
  isPublic: z.boolean().default(false),
  version: z.string().default('1.0.0'),
});

export const updatePluginSchema = insertPluginSchema.partial();

export function canModifyPlugin(
  plugin: { userId: string | null; isBuiltIn: boolean },
  requestingUserId: string,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (plugin.isBuiltIn) return false;
  return plugin.userId === requestingUserId;
}

export function canSeedPlugins(role: string): boolean {
  return role === 'admin';
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
npm run test -- src/app/api/plugins/validations.test.ts
```

Expected: PASS — all 8 tests green

- [ ] **Step 5: Commit**

```bash
git add src/app/api/plugins/
git commit -m "feat: add plugin API validation schemas and permission helpers"
```

---

## Task 6: API Routes

**Files:**
- Create: `src/app/api/plugins/route.ts`
- Create: `src/app/api/plugins/[id]/route.ts`
- Create: `src/app/api/plugins/[id]/enable/route.ts`
- Create: `src/app/api/plugins/seed/route.ts`

- [ ] **Step 1: Create GET list + POST create route**

```ts
// src/app/api/plugins/route.ts
import { getSession } from 'auth/server';
import { NextResponse } from 'next/server';
import { pluginRepository } from 'lib/db/repository';
import { insertPluginSchema } from './validations';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = request.headers.get('x-tenant-id') ?? DEFAULT_TENANT_ID;
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope');
  const enabledOnly = searchParams.get('enabled') === 'true';
  const category = searchParams.get('category');

  let plugins = enabledOnly
    ? await pluginRepository.listEnabledPluginsForUser(session.user.id, tenantId)
    : await pluginRepository.listPluginsForUser(session.user.id, tenantId);

  if (scope === 'personal') plugins = plugins.filter((p) => p.userId === session.user.id);
  if (scope === 'org') plugins = plugins.filter((p) => p.tenantId !== null && p.userId === null);
  if (category) plugins = plugins.filter((p) => p.category === category);

  return NextResponse.json(plugins);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const json = await request.json();
  const parsed = insertPluginSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const plugin = await pluginRepository.insertPlugin({
    ...parsed.data,
    userId: session.user.id,
    tenantId: null,
    isBuiltIn: false,
  });

  return NextResponse.json(plugin, { status: 201 });
}
```

- [ ] **Step 2: Create GET one + PATCH + DELETE route**

```ts
// src/app/api/plugins/[id]/route.ts
import { getSession } from 'auth/server';
import { NextResponse } from 'next/server';
import { pluginRepository } from 'lib/db/repository';
import { updatePluginSchema, canModifyPlugin } from '../validations';
import { getIsUserAdmin } from 'lib/user/utils';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const plugin = await pluginRepository.getPluginById(id, session.user.id);
  if (!plugin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(plugin);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const plugin = await pluginRepository.getPluginById(id, session.user.id);
  if (!plugin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = getIsUserAdmin(session.user);
  if (!canModifyPlugin(plugin, session.user.id, isAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const json = await request.json();
  const parsed = updatePluginSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await pluginRepository.updatePlugin(id, parsed.data);
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const plugin = await pluginRepository.getPluginById(id, session.user.id);
  if (!plugin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = getIsUserAdmin(session.user);
  if (!canModifyPlugin(plugin, session.user.id, isAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await pluginRepository.deletePlugin(id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create enable/disable route**

```ts
// src/app/api/plugins/[id]/enable/route.ts
import { getSession } from 'auth/server';
import { NextResponse } from 'next/server';
import { pluginRepository } from 'lib/db/repository';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userPlugin = await pluginRepository.enablePlugin(session.user.id, id);
  return NextResponse.json(userPlugin);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await pluginRepository.disablePlugin(session.user.id, id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Create seed route (admin only)**

```ts
// src/app/api/plugins/seed/route.ts
import { getSession } from 'auth/server';
import { NextResponse } from 'next/server';
import { pluginRepository } from 'lib/db/repository';
import { canSeedPlugins } from '../validations';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canSeedPlugins(session.user.role ?? 'user')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const json = await request.json();
  const plugins = await pluginRepository.seedPlugins(json.plugins);
  return NextResponse.json({ seeded: plugins.length });
}
```

- [ ] **Step 5: Verify TS compiles**

```bash
npx tsc --noEmit 2>&1 | grep "api/plugins" | head -10
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/app/api/plugins/
git commit -m "feat: add plugin CRUD API routes (list, create, get, update, delete, enable, seed)"
```

---

## Task 7: System Prompt Injection

**Files:**
- Modify: `src/lib/ai/prompts.ts`
- Modify: `src/types/chat.ts`
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: Extend buildUserSystemPrompt in prompts.ts**

At the top of `src/lib/ai/prompts.ts`, add import:

```ts
import { buildPluginsSystemPrompt } from 'lib/plugins/plugin-utils';
import type { PluginWithUserState } from 'app-types/plugin';
```

Change the `buildUserSystemPrompt` signature (line ~51):

```ts
export const buildUserSystemPrompt = (
  user?: User,
  userPreferences?: UserPreferences,
  agent?: Agent,
  activePlugins?: PluginWithUserState[],   // NEW param
) => {
```

Add before `return prompt.trim()` (around line 167):

```ts
  // Active plugin system prompts
  if (activePlugins && activePlugins.length > 0) {
    const pluginsBlock = buildPluginsSystemPrompt(activePlugins);
    if (pluginsBlock) {
      prompt += `\n\n${pluginsBlock}`;
    }
  }
```

- [ ] **Step 2: Add plugin/skill mention types + activePluginId to chat.ts**

In `src/types/chat.ts`, add to `ChatMentionSchema` discriminated union (after agent):

```ts
  z.object({
    type: z.literal('plugin'),
    pluginId: z.string(),
    name: z.string(),
  }),
  z.object({
    type: z.literal('skill'),
    pluginId: z.string(),
    skillId: z.string(),
    name: z.string(),
    prompt: z.string(),
  }),
```

In `chatApiSchemaRequestBodySchema`, add:

```ts
  activePluginId: z.string().uuid().optional(),
```

- [ ] **Step 3: Fetch and inject plugins in chat route**

In `src/app/api/chat/route.ts`, add import at top:

```ts
import { pluginRepository } from 'lib/db/repository';
import { dedupePluginsById } from 'lib/plugins/plugin-utils';
```

In the `POST` handler, after the `agentId` extraction (around line 237), add:

```ts
    const tenantId = request.headers.get('x-tenant-id') ?? '00000000-0000-0000-0000-000000000000';
    const { activePluginId } = chatApiSchemaRequestBodySchema.parse(json);

    const enabledPlugins = await pluginRepository.listEnabledPluginsForUser(
      session.user.id,
      tenantId,
    );
    const oneConvPlugin = activePluginId
      ? await pluginRepository.getPluginById(activePluginId, session.user.id)
      : null;
    const activePlugins = dedupePluginsById([
      ...enabledPlugins,
      ...(oneConvPlugin ? [oneConvPlugin] : []),
    ]);
```

Change the `buildUserSystemPrompt` call (around line 334):

```ts
        const systemPrompt = mergeSystemPrompt(
          buildUserSystemPrompt(session.user, userPreferences, agent, activePlugins),
          buildMcpServerCustomizationsSystemPrompt(mcpServerCustomizations),
          !supportToolCall && buildToolCallUnsupportedModelSystemPrompt,
          projectContext?.instructions
            ? `Project instructions:\n${projectContext.instructions}`
            : false,
          projectContext?.memory
            ? `Project memory (key facts from prior conversations):\n${projectContext.memory}`
            : false,
        );
```

- [ ] **Step 4: Run existing tests to confirm nothing broke**

```bash
npm run test
```

Expected: same pass/fail count as before (336 passing, 3 failing upstream)

- [ ] **Step 5: Verify plugin system prompt tests (S-01 to S-05 covered by Task 3 utils)**

```bash
npm run test -- src/lib/plugins/plugin-utils.test.ts
```

Expected: PASS — all tests still green

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/prompts.ts src/types/chat.ts src/app/api/chat/route.ts
git commit -m "feat: inject active plugin system prompts into chat route"
```

---

## Task 8: React Query Hook

**Files:**
- Create: `src/hooks/queries/use-plugins.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/queries/use-plugins.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PluginWithUserState } from 'app-types/plugin';

const PLUGINS_KEY = ['plugins'] as const;

async function fetchPlugins(params?: { scope?: string; enabled?: boolean; category?: string }): Promise<PluginWithUserState[]> {
  const url = new URL('/api/plugins', window.location.origin);
  if (params?.scope) url.searchParams.set('scope', params.scope);
  if (params?.enabled) url.searchParams.set('enabled', 'true');
  if (params?.category) url.searchParams.set('category', params.category);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch plugins');
  return res.json();
}

export function usePlugins(params?: { scope?: string; enabled?: boolean; category?: string }) {
  return useQuery({
    queryKey: [...PLUGINS_KEY, params],
    queryFn: () => fetchPlugins(params),
  });
}

export function useEnabledPlugins() {
  return usePlugins({ enabled: true });
}

export function useEnablePlugin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pluginId: string) => {
      const res = await fetch(`/api/plugins/${pluginId}/enable`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to enable plugin');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLUGINS_KEY }),
  });
}

export function useDisablePlugin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pluginId: string) => {
      const res = await fetch(`/api/plugins/${pluginId}/enable`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disable plugin');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLUGINS_KEY }),
  });
}

export function useCreatePlugin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<PluginWithUserState>) => {
      const res = await fetch('/api/plugins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to create plugin');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLUGINS_KEY }),
  });
}

export function useUpdatePlugin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PluginWithUserState> }) => {
      const res = await fetch(`/api/plugins/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to update plugin');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLUGINS_KEY }),
  });
}

export function useDeletePlugin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pluginId: string) => {
      const res = await fetch(`/api/plugins/${pluginId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete plugin');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLUGINS_KEY }),
  });
}
```

- [ ] **Step 2: Verify TS compiles**

```bash
npx tsc --noEmit 2>&1 | grep "use-plugins" | head -5
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/queries/use-plugins.ts
git commit -m "feat: add React Query hooks for plugin CRUD and enable/disable"
```

---

## Task 9: Plugin Selector + Skill Chips Component

**Files:**
- Create: `src/components/plugin-selector.tsx`

- [ ] **Step 1: Write slash command logic test (SL-02)**

Add to `src/lib/plugins/plugin-utils.test.ts`:

```ts
// SL-02: verify findCommandBySlug returns prompt for pre-fill
it('returns correct prompt for matching slug', () => {
  const p = mergePluginWithUserState(basePlugin, baseUserPlugin);
  const result = findCommandBySlug('qbr-prep', [p]);
  expect(result?.prompt).toBe('Help me prep a QBR');
});
```

Run: `npm run test -- src/lib/plugins/plugin-utils.test.ts` — Expected: PASS (already implemented)

- [ ] **Step 2: Create plugin-selector component**

```tsx
// src/components/plugin-selector.tsx
'use client';

import { useState } from 'react';
import { X, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from 'ui/button';
import { Popover, PopoverContent, PopoverTrigger } from 'ui/popover';
import type { PluginWithUserState, PluginSkill } from 'app-types/plugin';

interface PluginSelectorProps {
  plugins: PluginWithUserState[];
  activePlugin: PluginWithUserState | null;
  onPluginChange: (plugin: PluginWithUserState | null) => void;
  onSkillSelect: (prompt: string) => void;
}

const MAX_VISIBLE_CHIPS = 4;

export function PluginSelector({
  plugins,
  activePlugin,
  onPluginChange,
  onSkillSelect,
}: PluginSelectorProps) {
  const [open, setOpen] = useState(false);

  const visibleSkills = activePlugin?.skills.slice(0, MAX_VISIBLE_CHIPS) ?? [];
  const overflowCount = (activePlugin?.skills.length ?? 0) - MAX_VISIBLE_CHIPS;
  const [overflowOpen, setOverflowOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1 px-3 py-1">
      <div className="flex items-center gap-2">
        {activePlugin ? (
          <div className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
            <span>{activePlugin.name}</span>
            <button
              onClick={() => onPluginChange(null)}
              className="ml-1 hover:text-blue-200"
              aria-label="Remove plugin"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : null}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs text-muted-foreground">
              <Sparkles className="size-3" />
              {activePlugin ? 'Change' : '+ Plugin'}
              <ChevronDown className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1">
            {plugins.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">No plugins available</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {activePlugin && (
                  <button
                    className="rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent"
                    onClick={() => { onPluginChange(null); setOpen(false); }}
                  >
                    None
                  </button>
                )}
                {plugins.map((p) => (
                  <button
                    key={p.id}
                    className="rounded px-2 py-1 text-left text-xs hover:bg-accent"
                    onClick={() => { onPluginChange(p); setOpen(false); }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {activePlugin && visibleSkills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleSkills.map((skill) => (
            <button
              key={skill.id}
              onClick={() => onSkillSelect(skill.prompt)}
              className="rounded border border-border/50 bg-muted/30 px-2 py-0.5 text-xs hover:bg-muted/60"
              title={skill.longDescription}
            >
              {skill.name}
            </button>
          ))}
          {overflowCount > 0 && (
            <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
              <PopoverTrigger asChild>
                <button className="rounded border border-border/50 bg-muted/30 px-2 py-0.5 text-xs hover:bg-muted/60">
                  +{overflowCount} more
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-1">
                {activePlugin.skills.slice(MAX_VISIBLE_CHIPS).map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => { onSkillSelect(skill.prompt); setOverflowOpen(false); }}
                    className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
                  >
                    {skill.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TS compiles**

```bash
npx tsc --noEmit 2>&1 | grep "plugin-selector" | head -5
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/plugin-selector.tsx
git commit -m "feat: add PluginSelector component with skill chips and overflow popover"
```

---

## Task 10: @Mention Extension + Slash Command Pre-fill

**Files:**
- Modify: `src/components/chat-input.tsx` (or equivalent chat input component — locate with `grep -r "ChatMention\|mention" src/components --include="*.tsx" -l`)

- [ ] **Step 1: Find the chat input component**

```bash
grep -r "mentions\|ChatMention\|@mention" src/components --include="*.tsx" -l | head -5
```

Note the file path — it will be the file to modify in the steps below.

- [ ] **Step 2: Extend @mention picker to include plugins**

In the mention picker component (wherever `mcpServer`, `mcpTool`, `agent` mentions are built), add plugin fetching. Add a section after agent mentions:

```tsx
// After existing agent/mcp mention sections:
...plugins.map((plugin) => ({
  type: 'plugin' as const,
  pluginId: plugin.id,
  name: plugin.name,
  // nested skills under each plugin
  skills: plugin.skills.map((skill) => ({
    type: 'skill' as const,
    pluginId: plugin.id,
    skillId: skill.id,
    name: `${plugin.name} → ${skill.name}`,
    prompt: skill.prompt,
  })),
}))
```

When a `skill` mention is selected, instead of adding to `mentions`, call `setInput(skill.prompt)` — pre-fill the chat input and don't send the mention to the server.

When a `plugin` mention is selected, set `activePluginId` in the chat state and clear the `@plugin-name` text from the input.

- [ ] **Step 3: Add slash command pre-fill to chat input onChange**

In the chat input's text change handler, add after existing handling:

```tsx
import { findCommandBySlug } from 'lib/plugins/plugin-utils';

// Inside the onChange / input handler:
const slashMatch = value.match(/^\/([a-z0-9-]+)(\s|$)/);
if (slashMatch) {
  const slug = slashMatch[1];
  const command = findCommandBySlug(slug, enabledPlugins);
  if (command && slashMatch[2] === ' ') {
    // User typed /slug + space — replace with command prompt
    setValue(command.prompt);
    return;
  }
  // Show suggestions if just typing /slug (no trailing space yet)
  setSlashSuggestions(
    enabledPlugins
      .flatMap((p) => p.commands)
      .filter((c) => c.slug.startsWith(slug))
  );
} else {
  setSlashSuggestions([]);
}
```

- [ ] **Step 4: Run tests — confirm nothing broke**

```bash
npm run test
```

Expected: same pass count as before

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: extend @mention picker with plugins/skills, add /slug slash command pre-fill"
```

---

## Task 11: /customize Page

**Files:**
- Create: `src/app/(chat)/customize/page.tsx`
- Create: `src/components/customize/customize-shell.tsx`
- Create: `src/components/customize/plugin-list.tsx`
- Create: `src/components/customize/plugin-detail.tsx`

- [ ] **Step 1: Write failing page tests (P-01 to P-03)**

```ts
// src/app/api/plugins/validations.test.ts — add:
// P-01 covered by auth check already tested in API validations (A-01 pattern)
// P-02 and P-03 are integration tests — verify by manual smoke test after build
```

For P-01 (redirect unauthenticated), the existing session guard pattern (`redirect('/login')`) is verified by the same pattern used in `/mcp/page.tsx`.

- [ ] **Step 2: Create the server page**

```tsx
// src/app/(chat)/customize/page.tsx
import { getSession } from 'auth/server';
import { redirect } from 'next/navigation';
import { CustomizeShell } from '@/components/customize/customize-shell';
import MCPDashboard from '@/components/mcp-dashboard';

export const dynamic = 'force-dynamic';

export default async function CustomizePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect('/login');

  const { tab } = await searchParams;
  const activeTab = tab === 'connectors' ? 'connectors' : 'skills';

  return (
    <CustomizeShell
      activeTab={activeTab}
      connectorsContent={<MCPDashboard user={session.user} />}
    />
  );
}
```

- [ ] **Step 3: Create the 3-column shell**

```tsx
// src/components/customize/customize-shell.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PluginList } from './plugin-list';
import { PluginDetail } from './plugin-detail';
import type { PluginWithUserState } from 'app-types/plugin';
import { usePlugins } from '@/hooks/queries/use-plugins';
import { SlidersHorizontal, Plug } from 'lucide-react';

interface CustomizeShellProps {
  activeTab: 'skills' | 'connectors';
  connectorsContent: React.ReactNode;
}

export function CustomizeShell({ activeTab, connectorsContent }: CustomizeShellProps) {
  const router = useRouter();
  const [selectedPlugin, setSelectedPlugin] = useState<PluginWithUserState | null>(null);
  const { data: plugins = [], isLoading } = usePlugins();

  const personalPlugins = plugins.filter((p) => p.userId !== null);
  const orgPlugins = plugins.filter((p) => p.userId === null && p.tenantId !== null);

  return (
    <div className="flex h-full">
      {/* Left nav */}
      <div className="w-48 shrink-0 border-r border-border/50 p-3">
        <h2 className="mb-4 text-sm font-semibold">Customize</h2>
        <nav className="flex flex-col gap-1">
          <button
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${activeTab === 'skills' ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/50'}`}
            onClick={() => router.push('/customize')}
          >
            <SlidersHorizontal className="size-4" />
            Skills
          </button>
          <button
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${activeTab === 'connectors' ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/50'}`}
            onClick={() => router.push('/customize?tab=connectors')}
          >
            <Plug className="size-4" />
            Connectors
          </button>
        </nav>
      </div>

      {activeTab === 'connectors' ? (
        <div className="flex-1 overflow-auto">{connectorsContent}</div>
      ) : (
        <>
          {/* Middle column — plugin list */}
          <PluginList
            personalPlugins={personalPlugins}
            orgPlugins={orgPlugins}
            isLoading={isLoading}
            selectedId={selectedPlugin?.id ?? null}
            onSelect={setSelectedPlugin}
          />

          {/* Right panel — plugin detail */}
          <div className="flex-1 overflow-auto border-l border-border/50">
            {selectedPlugin ? (
              <PluginDetail plugin={selectedPlugin} onClose={() => setSelectedPlugin(null)} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a plugin to view details
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create plugin list component**

```tsx
// src/components/customize/plugin-list.tsx
'use client';

import { Plus } from 'lucide-react';
import { Button } from 'ui/button';
import { Skeleton } from 'ui/skeleton';
import type { PluginWithUserState } from 'app-types/plugin';
import { useEnablePlugin, useDisablePlugin, useCreatePlugin } from '@/hooks/queries/use-plugins';
import { Switch } from 'ui/switch';

interface PluginListProps {
  personalPlugins: PluginWithUserState[];
  orgPlugins: PluginWithUserState[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (plugin: PluginWithUserState) => void;
}

function PluginRow({ plugin, isSelected, onSelect }: { plugin: PluginWithUserState; isSelected: boolean; onSelect: () => void }) {
  const enable = useEnablePlugin();
  const disable = useDisablePlugin();
  const isEnabled = plugin.userState?.enabled ?? false;

  return (
    <div
      className={`flex cursor-pointer items-center justify-between rounded px-2 py-1.5 ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}`}
      onClick={onSelect}
    >
      <span className="text-sm truncate">{plugin.name}</span>
      <Switch
        checked={isEnabled}
        onCheckedChange={(checked) => {
          checked ? enable.mutate(plugin.id) : disable.mutate(plugin.id);
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Toggle ${plugin.name}`}
      />
    </div>
  );
}

export function PluginList({ personalPlugins, orgPlugins, isLoading, selectedId, onSelect }: PluginListProps) {
  const createPlugin = useCreatePlugin();

  if (isLoading) {
    return (
      <div className="w-56 shrink-0 border-r border-border/50 p-3 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    );
  }

  return (
    <div className="w-56 shrink-0 overflow-y-auto border-r border-border/50 p-3">
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Personal</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-5"
            title="Add personal plugin"
            onClick={() => createPlugin.mutate({ name: 'New Plugin', description: '', category: 'custom', icon: 'Sparkles', color: 'bg-blue-500/10 text-blue-500', systemPromptAddition: '', skills: [], commands: [], isPublic: false, version: '1.0.0' } as any)}
          >
            <Plus className="size-3" />
          </Button>
        </div>
        {personalPlugins.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2">No personal plugins yet</p>
        ) : (
          personalPlugins.map((p) => (
            <PluginRow key={p.id} plugin={p} isSelected={selectedId === p.id} onSelect={() => onSelect(p)} />
          ))
        )}
      </div>

      {orgPlugins.length > 0 && (
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Org Plugins</span>
          {orgPlugins.map((p) => (
            <PluginRow key={p.id} plugin={p} isSelected={selectedId === p.id} onSelect={() => onSelect(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create plugin detail component**

```tsx
// src/components/customize/plugin-detail.tsx
'use client';

import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from 'ui/button';
import { Textarea } from 'ui/textarea';
import { Badge } from 'ui/badge';
import type { PluginWithUserState } from 'app-types/plugin';
import { useUpdatePlugin, useDeletePlugin } from '@/hooks/queries/use-plugins';

interface PluginDetailProps {
  plugin: PluginWithUserState;
  onClose: () => void;
}

export function PluginDetail({ plugin, onClose }: PluginDetailProps) {
  const [systemPrompt, setSystemPrompt] = useState(
    plugin.userState?.customSystemPrompt ?? plugin.systemPromptAddition,
  );
  const updatePlugin = useUpdatePlugin();
  const deletePlugin = useDeletePlugin();
  const isPersonal = plugin.userId !== null;

  const handleSavePrompt = () => {
    if (isPersonal) {
      updatePlugin.mutate({ id: plugin.id, data: { systemPromptAddition: systemPrompt } });
    }
    // For org plugins, save as customSystemPrompt override via upsert — handled by a separate API call if needed
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-semibold">{plugin.name}</h2>
          <p className="text-sm text-muted-foreground">{plugin.description}</p>
          <div className="mt-1 flex gap-2">
            <Badge variant="outline">{plugin.category}</Badge>
            {plugin.isBuiltIn && <Badge variant="secondary">Built-in</Badge>}
            <span className="text-xs text-muted-foreground">
              Invoked by: User or Claude
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {isPersonal && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => { deletePlugin.mutate(plugin.id); onClose(); }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
          System Prompt
        </label>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={5}
          disabled={!isPersonal}
          className="text-sm"
        />
        {isPersonal && (
          <Button size="sm" className="mt-2" onClick={handleSavePrompt}>
            Save
          </Button>
        )}
      </div>

      {plugin.skills.length > 0 && (
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">Skills</label>
          <div className="space-y-2">
            {plugin.skills.map((skill) => (
              <div key={skill.id} className="rounded border border-border/50 p-2">
                <p className="text-sm font-medium">{skill.name}</p>
                <p className="text-xs text-muted-foreground">{skill.longDescription}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {plugin.commands.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">Commands</label>
          <div className="space-y-1">
            {plugin.commands.map((cmd) => (
              <div key={cmd.id} className="flex items-center gap-2 text-sm">
                <code className="rounded bg-muted px-1 text-xs">/{cmd.slug}</code>
                <span className="text-muted-foreground">{cmd.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify TS compiles**

```bash
npx tsc --noEmit 2>&1 | grep "customize" | head -10
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/app/\(chat\)/customize/ src/components/customize/
git commit -m "feat: add /customize page with 3-column Skills + Connectors layout"
```

---

## Task 12: Sidebar Entry + Admin Page + Seed Data

**Files:**
- Modify: `src/components/layouts/app-sidebar-menus.tsx`
- Create: `src/app/(admin)/admin/plugins/page.tsx`
- Create: `scripts/seed-plugins.ts`

- [ ] **Step 1: Add Customize to sidebar**

In `src/components/layouts/app-sidebar-menus.tsx`, add after the Workflow `<SidebarMenu>` block (around line 108):

```tsx
import { SlidersHorizontalIcon } from 'lucide-react';

// After workflow menu item:
<SidebarMenu>
  <Tooltip>
    <SidebarMenuItem>
      <Link href="/customize">
        <SidebarMenuButton
          isActive={pathname.startsWith('/customize')}
          className="font-semibold"
        >
          <SlidersHorizontalIcon className="size-4" />
          {t('Layout.customize')}
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  </Tooltip>
</SidebarMenu>
```

Add `'Layout.customize': 'Customize'` to all locale files (search: `grep -r "Layout.connectors" messages/ --include="*.json" -l`).

- [ ] **Step 2: Update sidebar Connectors link to point to /customize?tab=connectors**

Change the existing `/mcp` link in the sidebar to `/customize?tab=connectors` to unify navigation. The `/mcp` route stays intact for direct access.

- [ ] **Step 3: Create admin plugins page**

```tsx
// src/app/(admin)/admin/plugins/page.tsx
'use client';

import { usePlugins, useDeletePlugin } from '@/hooks/queries/use-plugins';
import { Button } from 'ui/button';
import { Switch } from 'ui/switch';
import { Badge } from 'ui/badge';

export default function AdminPluginsPage() {
  const { data: plugins = [], isLoading } = usePlugins();
  const deletePlugin = useDeletePlugin();

  const handleSeed = async () => {
    const { DEFAULT_PLUGINS } = await import('scripts/seed-plugins');
    await fetch('/api/plugins/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plugins: DEFAULT_PLUGINS }),
    });
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Plugins</h1>
        <Button onClick={handleSeed} variant="outline" size="sm">Seed Default Plugins</Button>
      </div>
      <div className="space-y-2">
        {plugins.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded border border-border p-3">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-1 flex gap-2">
                <Badge variant="outline">{p.category}</Badge>
                {p.isBuiltIn && <Badge variant="secondary">Built-in</Badge>}
                {p.isPublic && <Badge>Public</Badge>}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => deletePlugin.mutate(p.id)}
            >
              Delete
            </Button>
          </div>
        ))}
        {plugins.length === 0 && (
          <p className="text-muted-foreground">No plugins. Click "Seed Default Plugins" to load defaults.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create seed script with 10 default plugins**

```ts
// scripts/seed-plugins.ts
import type { InsertPlugin } from '../src/types/plugin';

export const DEFAULT_PLUGINS: InsertPlugin[] = [
  {
    tenantId: '00000000-0000-0000-0000-000000000000',
    userId: null,
    name: 'Customer Success',
    description: 'Account health monitoring, QBRs, renewal preparation, and escalation management',
    category: 'productivity',
    icon: 'HeartHandshake',
    color: 'bg-teal-500/10 text-teal-500',
    systemPromptAddition: `You are a customer success and account management assistant. When helping with CS tasks:\n- Focus on customer outcomes and measurable value delivered, not just product features\n- For QBRs: lead with business impact, then usage metrics, then roadmap alignment\n- When handling escalations: be empathetic, focus on immediate resolution, then root cause prevention\n- For churn risk accounts: identify early signals and proactive intervention strategies\n- Renewal conversations should start with value delivered, then expansion opportunities`,
    skills: [
      { id: 'qbr-prep', name: 'QBR Preparation', description: 'Prepare a Quarterly Business Review', longDescription: 'Build a complete QBR presentation structure covering customer goals, value delivered, usage metrics, roadmap alignment, and next steps.', prompt: 'Help me prepare a QBR (Quarterly Business Review). Create a structure covering: Customer Goals Review, Value Delivered This Quarter, Usage & Adoption Metrics, Customer Challenges, Roadmap & Future Value, and Next Steps. What account is this QBR for?', category: 'productivity', tags: ['QBR', 'customer success', 'account management'] },
      { id: 'escalation-response', name: 'Escalation Response', description: 'Draft professional escalation response communications', longDescription: 'Write empathetic, professional responses to customer escalations with an action plan and timeline commitments.', prompt: 'Help me draft an escalation response. Write a professional, empathetic response that acknowledges the issue, outlines immediate actions taken, provides a resolution timeline, and explains preventive steps. What is the customer escalation about?', category: 'drafting', tags: ['escalation', 'support', 'customer'] },
      { id: 'renewal-brief', name: 'Renewal Brief', description: 'Prepare a renewal strategy and talking points', longDescription: 'Build a renewal strategy document with value delivered, expansion opportunities, competitive risks, and negotiation positioning.', prompt: 'Help me prepare for a contract renewal. Create a brief covering: Value Delivered, Key Wins, Usage Trends, Expansion Opportunities, Potential Risks, and Recommended Talking Points. What account is up for renewal?', category: 'productivity', tags: ['renewal', 'retention'] },
    ],
    commands: [
      { id: 'health-check', slug: 'health-check', name: 'Account Health Check', description: 'Assess account health and identify risks', prompt: 'Run an account health check. Evaluate health across: Usage & Adoption, Engagement Level, Support Ticket Volume & Severity, Executive Alignment, Contract Risk, and NPS/Satisfaction. Recommend next actions. What account should I assess?' },
      { id: 'success-plan', slug: 'success-plan', name: 'Customer Success Plan', description: 'Create a customer success plan', prompt: 'Create a customer success plan for this account. Include: Customer Goals & KPIs, Success Milestones, Onboarding Checklist, Key Contacts & Roles, Risk Mitigation, and a 90-day action plan. What customer and goals are we planning for?' },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: '1.0.0',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000000',
    userId: null,
    name: 'Sales',
    description: 'Account research, call preparation, pipeline reviews, and competitive intelligence',
    category: 'sales',
    icon: 'TrendingUp',
    color: 'bg-emerald-500/10 text-emerald-500',
    systemPromptAddition: `You are an expert sales assistant. When helping with sales tasks:\n- Use a consultative, professional tone\n- Focus on value proposition and ROI when drafting communications\n- When researching accounts, look for pain points, recent news, and decision makers\n- Structure call prep notes with: Objectives, Key Questions, Expected Objections, Next Steps\n- For pipeline reviews, present data in tables with deal name, stage, ARR, close date, and next action`,
    skills: [
      { id: 'account-research', name: 'Account Research', description: 'Deep research on a prospect or customer account', longDescription: 'Research a company\'s recent news, key contacts, pain points, and buying signals to build a comprehensive account brief.', prompt: 'Research this account for me. Search for recent news, key leadership, company challenges, and how our services could help. What company should I research?', category: 'research', tags: ['accounts', 'prospects'] },
      { id: 'call-prep', name: 'Call Prep', description: 'AI-generated call preparation brief', longDescription: 'Generate a structured call prep document with objectives, discovery questions, likely objections, and talking points.', prompt: 'Help me prepare for a sales call. Generate a call prep brief with objectives, 5 discovery questions, anticipated objections and responses, and suggested next steps. Who is the meeting with?', category: 'productivity', tags: ['calls', 'meetings'] },
    ],
    commands: [
      { id: 'call-summary', slug: 'call-summary', name: 'Call Summary', description: 'Generate a structured summary of a sales call', prompt: 'Generate a structured sales call summary. Include: Call Date & Participants, Key Discussion Points, Pain Points Identified, Our Value Proposition Presented, Next Steps & Owner, and Follow-up Actions. Please provide the call notes or recording transcript to summarize.' },
      { id: 'pipeline-review', slug: 'pipeline-review', name: 'Pipeline Review', description: 'Run a structured pipeline review', prompt: 'Let\'s run a structured pipeline review. For each deal in my pipeline, I\'d like to assess: Stage, Close Date, Deal Size, Next Action, and Risk Level. Then provide a summary with total pipeline value by stage and top deals to focus on. Share your pipeline data and I\'ll structure the review.' },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: '1.0.0',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000000',
    userId: null,
    name: 'Legal',
    description: 'Contract review, NDA triage, compliance research, and legal document drafting',
    category: 'legal',
    icon: 'Scale',
    color: 'bg-slate-500/10 text-slate-500',
    systemPromptAddition: `You are a legal research and document assistant. Important: You are NOT a lawyer and cannot provide legal advice. When helping with legal tasks:\n- Always recommend that important documents be reviewed by qualified legal counsel\n- Focus on organizing, summarizing, and identifying key provisions\n- Flag unusual or potentially problematic clauses for human review\n- Use precise, professional language`,
    skills: [
      { id: 'contract-review', name: 'Contract Review', description: 'Extract key provisions and flag risks from contracts', longDescription: 'Upload a contract and get a structured summary of key provisions, obligations, termination rights, and potential risk areas flagged for attorney review.', prompt: 'Review this contract for me. Extract and summarize: key parties and obligations, important dates and deadlines, liability and indemnification clauses, termination conditions, and any unusual provisions that warrant legal review. Upload the contract to get started.', category: 'analysis', tags: ['contracts', 'legal review'] },
    ],
    commands: [
      { id: 'triage-nda', slug: 'triage-nda', name: 'Triage NDA', description: 'Quickly review an NDA for key terms', prompt: 'Triage this NDA for me. Extract and summarize in a table: Parties, Effective Date, Confidential Information definition, Exclusions, Obligations of Receiving Party, Term & Duration, Return/Destruction of information, Governing Law, and any unusual provisions. Flag anything that deviates from standard NDA terms. Upload the NDA to begin.' },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: '1.0.0',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000000',
    userId: null,
    name: 'Project Management',
    description: 'Project planning, status reports, risk management, and team coordination',
    category: 'productivity',
    icon: 'Kanban',
    color: 'bg-amber-500/10 text-amber-500',
    systemPromptAddition: `You are an expert project management assistant. When helping with PM tasks:\n- Use structured formats: WBS, RACI, RAID logs, and milestone tables\n- Apply PM best practices from PMI/PMBOK and Agile methodologies\n- For status reports: use RAG (Red/Amber/Green) status indicators\n- Break large goals into SMART milestones with clear owners and due dates`,
    skills: [
      { id: 'project-plan', name: 'Project Plan', description: 'Generate a structured project plan with milestones', longDescription: 'Create a detailed project plan with phases, milestones, tasks, dependencies, resource assignments, and timeline.', prompt: 'Help me create a project plan. Generate a structured plan with phases, key milestones, tasks, dependencies, and suggested timeline. What project am I planning?', category: 'productivity', tags: ['project plan', 'milestones'] },
      { id: 'risk-log', name: 'Risk Register', description: 'Identify and document project risks', longDescription: 'Generate a comprehensive risk register with probability/impact assessment, mitigation strategies, and risk owners.', prompt: 'Create a risk register for my project. Identify potential risks, assess probability and impact, suggest mitigation strategies, and assign ownership. What project or context should I analyze for risks?', category: 'analysis', tags: ['risk management'] },
      { id: 'status-report', name: 'Status Report', description: 'Generate a professional project status report', longDescription: 'Create a formatted project status report with RAG status, accomplishments, upcoming milestones, risks, and blockers.', prompt: 'Generate a project status report. Format it with: Overall Status (RAG), This Period Accomplishments, Next Period Priorities, Milestone Status, Risks & Issues, and Budget/Schedule health. What project am I reporting on?', category: 'drafting', tags: ['status report'] },
    ],
    commands: [
      { id: 'action-items', slug: 'action-items', name: 'Action Items', description: 'Extract action items from notes or discussion', prompt: 'Extract all action items from this content. Format as a table with: Action Item, Owner, Due Date, Priority, and Notes. Paste meeting notes or discussion to extract action items from.' },
      { id: 'standup', slug: 'standup', name: 'Daily Standup', description: 'Format a daily standup update', prompt: 'Help me format my daily standup. Structure it as: Yesterday I completed, Today I\'m working on, Blockers/Impediments, and Help Needed. What did you work on?' },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: '1.0.0',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000000',
    userId: null,
    name: 'Marketing',
    description: 'Content strategy, social media, campaign planning, and brand messaging',
    category: 'productivity',
    icon: 'Megaphone',
    color: 'bg-pink-500/10 text-pink-500',
    systemPromptAddition: `You are a professional marketing and content strategy assistant. When helping with marketing tasks:\n- Tailor messaging to the specific audience, channel, and funnel stage\n- Apply copywriting best practices: clear value prop, social proof, strong CTA\n- Lead with the benefit, not the feature`,
    skills: [
      { id: 'content-brief', name: 'Content Brief', description: 'Create a detailed content brief for any marketing asset', longDescription: 'Generate a comprehensive content brief including audience, goals, key messages, SEO keywords, outline, and success metrics.', prompt: 'Create a content brief. Define the target audience, goals, key messages, recommended format, SEO focus, and outline. What content piece are we planning?', category: 'productivity', tags: ['content strategy'] },
      { id: 'social-posts', name: 'Social Media Posts', description: 'Generate platform-optimized social media posts', longDescription: 'Create a set of social posts optimized for LinkedIn, Twitter/X, and other platforms.', prompt: 'Write social media posts for multiple platforms. Create LinkedIn, Twitter/X, and general versions with appropriate tone and length for each platform. What topic or content should the posts be about?', category: 'drafting', tags: ['social media'] },
    ],
    commands: [
      { id: 'blog-post', slug: 'blog-post', name: 'Blog Post', description: 'Draft a professional blog post', prompt: 'Draft a professional blog post. Create an engaging title, introduction hook, 3-5 body sections with subheadings, and a compelling conclusion with CTA. What\'s the topic and target audience?' },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: '1.0.0',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000000',
    userId: null,
    name: 'Research & Analysis',
    description: 'Market research, competitive analysis, data interpretation, and literature review',
    category: 'research',
    icon: 'Search',
    color: 'bg-indigo-500/10 text-indigo-500',
    systemPromptAddition: `You are an expert research and analysis assistant. When helping with research tasks:\n- Search both the internal knowledge base and web for comprehensive information\n- Cite sources clearly and distinguish between internal knowledge and web-sourced information\n- Present findings in structured formats: executive summary, detailed findings, source list`,
    skills: [
      { id: 'swot-analysis', name: 'SWOT Analysis', description: 'Generate a SWOT analysis for any company, product, or initiative', longDescription: 'Build a comprehensive SWOT analysis with internal strengths/weaknesses and external opportunities/threats.', prompt: 'Create a SWOT analysis. Research and analyze the Strengths, Weaknesses, Opportunities, and Threats for the subject. Present findings in a structured table format. What company, product, or initiative should I analyze?', category: 'analysis', tags: ['SWOT', 'strategy'] },
    ],
    commands: [
      { id: 'research', slug: 'research', name: 'Research Topic', description: 'Deep-dive research on any topic', prompt: 'Research this topic comprehensively. Search the web and knowledge base, then provide a structured summary with key findings, important facts, and relevant sources. What would you like me to research?' },
      { id: 'compare', slug: 'compare', name: 'Compare Options', description: 'Compare multiple options side by side', prompt: 'Compare these options side by side in a structured table. Evaluate each across relevant criteria and provide a recommendation. What options should I compare, and what criteria matter most?' },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: '1.0.0',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000000',
    userId: null,
    name: 'Finance & Reporting',
    description: 'Financial analysis, budget planning, expense reporting, and business metrics',
    category: 'productivity',
    icon: 'BarChart3',
    color: 'bg-orange-500/10 text-orange-500',
    systemPromptAddition: `You are a financial analysis and business reporting assistant. When helping with finance tasks:\n- Present financial data clearly in tables with proper formatting (currency, percentages, variances)\n- Calculate and explain variances as both $ amount and % difference\n- Always note assumptions and data limitations when projecting or forecasting`,
    skills: [
      { id: 'budget-analysis', name: 'Budget Analysis', description: 'Analyze budget vs. actual performance', longDescription: 'Paste budget and actual data to get a structured variance analysis with explanations and recommendations.', prompt: 'Analyze my budget vs. actual performance. Compare actuals to budget, calculate variances ($ and %), identify significant deviations, and recommend corrective actions. Paste your budget and actual data.', category: 'analysis', tags: ['budget', 'finance'] },
    ],
    commands: [
      { id: 'financial-summary', slug: 'financial-summary', name: 'Financial Summary', description: 'Create an executive financial summary', prompt: 'Create an executive financial summary. Summarize the key financial metrics, performance vs. targets, notable variances, and recommended actions in a concise format. What period and data should I summarize?' },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: '1.0.0',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000000',
    userId: null,
    name: 'HR & People',
    description: 'HR policy lookup, onboarding guides, job descriptions, and people analytics',
    category: 'hr',
    icon: 'Users',
    color: 'bg-violet-500/10 text-violet-500',
    systemPromptAddition: `You are an HR and people operations assistant. When helping with HR tasks:\n- Be empathetic, professional, and inclusive in all communications\n- Follow best practices for DEI in job descriptions and communications\n- For sensitive matters (terminations, performance issues, complaints), recommend HR professional involvement`,
    skills: [
      { id: 'job-description', name: 'Job Description Writer', description: 'Generate inclusive, compelling job descriptions', longDescription: 'Create a complete job description with responsibilities, qualifications, and benefits. Uses inclusive language best practices.', prompt: 'Help me write a job description. Generate a complete, inclusive job posting with role summary, key responsibilities, required and preferred qualifications, and what we offer. What role are we hiring for?', category: 'drafting', tags: ['recruiting', 'hiring'] },
    ],
    commands: [
      { id: 'onboard', slug: 'onboard', name: 'Onboarding Checklist', description: 'Generate a new hire onboarding checklist', prompt: 'Generate a comprehensive onboarding checklist for a new employee. Include: Pre-arrival setup, Day 1 activities, Week 1 goals, 30/60/90 day milestones, key contacts to meet, systems access to provision, and training to complete. What role/department is this for?' },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: '1.0.0',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000000',
    userId: null,
    name: 'Technical & Engineering',
    description: 'Code review, technical specifications, architecture decisions, and documentation',
    category: 'custom',
    icon: 'Code2',
    color: 'bg-cyan-500/10 text-cyan-500',
    systemPromptAddition: `You are an expert software engineering and technical assistant. When helping with technical tasks:\n- Write clean, well-documented code following language-specific conventions\n- For code review: assess correctness, performance, security, maintainability, and test coverage\n- Flag security vulnerabilities (OWASP Top 10, injection risks, auth issues) immediately`,
    skills: [
      { id: 'code-review', name: 'Code Review', description: 'Comprehensive code review with actionable feedback', longDescription: 'Get a structured code review covering correctness, performance, security, maintainability, and test coverage.', prompt: 'Review this code. Assess for: Correctness & Logic, Performance Issues, Security Vulnerabilities, Code Readability & Maintainability, Test Coverage Gaps, and Best Practice Adherence. Paste the code to review.', category: 'analysis', tags: ['code review', 'security'] },
      { id: 'tech-spec', name: 'Technical Specification', description: 'Write a technical specification document', longDescription: 'Create a comprehensive technical spec with system overview, requirements, architecture, API design, data models, and testing strategy.', prompt: 'Help me write a technical specification. Create a structured spec with: Overview, Problem Statement, Requirements, Architecture Decisions, API/Data Design, Error Handling, Testing Strategy, and Open Questions. What are we building?', category: 'drafting', tags: ['tech spec', 'architecture'] },
    ],
    commands: [
      { id: 'explain-code', slug: 'explain-code', name: 'Explain Code', description: 'Explain what code does in plain English', prompt: 'Explain this code in plain English. Describe what it does, how it works step by step, any important patterns or concepts used, and potential gotchas. Paste the code to explain.' },
      { id: 'write-tests', slug: 'write-tests', name: 'Write Tests', description: 'Generate unit and integration tests', prompt: 'Write tests for this code. Generate comprehensive unit tests covering: happy path, edge cases, error conditions, and boundary values. Use the existing testing framework if identifiable. Paste the code to test.' },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: '1.0.0',
  },
  {
    tenantId: '00000000-0000-0000-0000-000000000000',
    userId: null,
    name: 'Environmental & Compliance',
    description: 'EPA regulations, source testing standards, environmental consulting workflows',
    category: 'research',
    icon: 'Leaf',
    color: 'bg-green-500/10 text-green-500',
    systemPromptAddition: `You are an environmental consulting and regulatory compliance assistant. When helping with environmental tasks:\n- Reference specific EPA methods, standards, and CFR citations when applicable\n- Use technical precision in describing source testing protocols and equipment\n- Distinguish between federal, state, and local requirements`,
    skills: [
      { id: 'reg-research', name: 'Regulatory Research', description: 'Research EPA, OSHA, and state environmental regulations', longDescription: 'Search for applicable regulations, standards, and recent rulemaking relevant to your source testing or compliance project.', prompt: 'Research environmental regulations for me. Search for applicable EPA rules, state regulations, and compliance requirements. What facility type, pollutant, or regulatory topic are you researching?', category: 'research', tags: ['EPA', 'regulations'] },
    ],
    commands: [
      { id: 'test-plan', slug: 'test-plan', name: 'Source Test Plan', description: 'Draft a source emission test plan', prompt: 'Help me draft a source emission test plan. Generate a structured plan covering: Facility Description, Applicable Regulations, Emission Points to Test, EPA Methods to be Used, Sampling Equipment, QA/QC Procedures, and Schedule. What facility and pollutants are being tested?' },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: '1.0.0',
  },
];
```

- [ ] **Step 5: Run all tests**

```bash
npm run test
```

Expected: same pass count as baseline (336 passing, 3 failing upstream)

- [ ] **Step 6: Commit**

```bash
git add src/components/layouts/app-sidebar-menus.tsx src/app/\(admin\)/admin/plugins/ scripts/seed-plugins.ts
git commit -m "feat: add Customize sidebar entry, admin plugins page, and 10 default seed plugins"
```

---

## Self-Review Checklist

- [x] **R-01, R-02**: `listPluginsForUser` / `listEnabledPluginsForUser` — covered by repository implementation (Task 4); merge logic tested via `mergePluginWithUserState` (Task 3)
- [x] **R-03**: `mergePluginWithUserState` null case — Task 3 test
- [x] **R-04, R-05**: `enablePlugin` / `disablePlugin` — Task 4 repository; permission paths tested via `canModifyPlugin` (Task 5)
- [x] **R-06**: `isBuiltIn` insert — Task 6 seed route
- [x] **R-07**: access control — Task 5 `canModifyPlugin` tests
- [x] **R-08**: `customSystemPrompt` override — Task 3 `mergePluginWithUserState` test
- [x] **A-01 to A-09**: covered by Task 5 validations tests + route implementations in Task 6
- [x] **S-01 to S-05**: `buildPluginsSystemPrompt` tests in Task 3
- [x] **C-01, C-02**: chat route injection in Task 7 + utils tests in Task 3
- [x] **U-01 to U-06**: `PluginSelector` component in Task 9 (visual — smoke test manually)
- [x] **SL-01 to SL-03**: `findCommandBySlug` tests in Task 3; integration wired in Task 10
- [x] **P-01**: session guard in `/customize/page.tsx` (Task 11) — same pattern as `/mcp/page.tsx`
- [x] **P-02, P-03**: smoke test `/customize` in browser after Task 11

**Type consistency check:** `PluginWithUserState` defined in Task 1, used identically in Tasks 3, 4, 8, 9, 11. `InsertPlugin` used in Tasks 1, 4, 6, 12 — consistent. `findCommandBySlug` used in Task 3 test and wired in Task 10. `buildPluginsSystemPrompt` defined Task 3, imported Task 7.
