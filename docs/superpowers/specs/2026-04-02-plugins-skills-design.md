# Plugins & Skills System — Design Spec

**Date:** 2026-04-02  
**Status:** Approved  
**Feature:** Customize — Skills & Plugins (Claude.ai parity + enhancements)

---

## Overview

A full Skills & Plugins system modeled after Claude.ai's Customize panel, merged with the richer plugin model from the ChatATG platform. Users can browse, enable, and invoke plugins (bundles of skills and commands) that inject domain expertise into their conversations. Org admins can publish tenant-wide built-in plugins; users can also create personal plugins.

The feature surfaces in a unified `/customize` page accessible from the sidebar, combining Skills and Connectors (MCP) under one destination — identical to Claude.ai's UX pattern.

---

## Confirmed Design Decisions

| Decision | Choice |
|----------|--------|
| Ownership model | Both personal (user) + org-wide (tenant admin) |
| System prompt injection | On-demand per conversation, not ambient/always-on |
| Plugin activation in chat | Both @mention AND plugin selector above input |
| Skills browser in chat | Context-aware chips above input + extended @mention picker |
| Slash commands | `/slug` in chat input pre-fills with command prompt |
| Database architecture | Approach B — PluginTable + UserPluginTable (JSONB children) |
| Navigation | Unified `/customize` — Skills + Connectors in same sidebar |

---

## Data Model

### Types — `src/types/plugin.ts` (new file)

```ts
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
  prompt: string;          // pre-fills chat input when invoked
  category: string;
  tags: string[];
}

export interface PluginCommand {
  id: string;
  slug: string;            // used for /slug trigger in chat input
  name: string;
  description: string;
  prompt: string;          // pre-fills chat input when triggered
}

export interface Plugin {
  id: string;
  tenantId: string | null; // null = personal/user-level
  userId: string | null;   // null = org-wide built-in
  name: string;
  description: string;
  category: PluginCategory;
  icon: string;            // Lucide icon name
  color: string;           // Tailwind class string
  systemPromptAddition: string; // injected when plugin active in conversation
  skills: PluginSkill[];
  commands: PluginCommand[];
  isBuiltIn: boolean;      // true = seeded platform default
  isPublic: boolean;       // true = visible to all users in tenant
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
  customSystemPrompt: string | null; // user override for systemPromptAddition
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
```

### Schema — `src/lib/db/pg/schema.pg.ts` additions

**`PluginTable`**
```ts
export const PluginTable = pgTable('plugin', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  tenantId: uuid('tenant_id'),                          // null = personal
  userId: uuid('user_id').references(() => UserTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  category: varchar('category', {
    enum: ['productivity', 'research', 'legal', 'sales', 'hr', 'custom'],
  }).notNull().default('custom'),
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
}, (t) => [
  index('plugin_tenant_id_idx').on(t.tenantId),
  index('plugin_user_id_idx').on(t.userId),
]);
```

**`UserPluginTable`**
```ts
export const UserPluginTable = pgTable('user_plugin', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => UserTable.id, { onDelete: 'cascade' }),
  pluginId: uuid('plugin_id').notNull().references(() => PluginTable.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  isPinned: boolean('is_pinned').notNull().default(false),
  customSystemPrompt: text('custom_system_prompt'),
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  unique().on(t.userId, t.pluginId),
  index('user_plugin_user_id_idx').on(t.userId),
]);
```

---

## API Design

All routes follow existing conventions: `NextResponse.json()`, session from `getSession()`, tenant from `x-tenant-id` header.

### Routes — `src/app/api/plugins/`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/plugins` | List all plugins (org + personal) with user state merged | User |
| POST | `/api/plugins` | Create a personal plugin | User |
| GET | `/api/plugins/[id]` | Get single plugin with user state | User |
| PATCH | `/api/plugins/[id]` | Update plugin (owner or admin only) | User |
| DELETE | `/api/plugins/[id]` | Delete plugin (owner or admin only) | User |
| POST | `/api/plugins/[id]/enable` | Enable plugin for current user | User |
| DELETE | `/api/plugins/[id]/enable` | Disable plugin for current user | User |
| POST | `/api/plugins/seed` | Bulk seed org-wide built-in plugins | Admin |

### GET /api/plugins — query params

- `?scope=personal` — only user's own plugins
- `?scope=org` — only tenant-wide plugins
- `?enabled=true` — only enabled plugins (used by chat route)
- `?category=sales` — filter by category

### Repository — `src/lib/db/pg/repositories/plugin-repository.pg.ts`

Interface in `src/types/plugin.ts`, implementing:
```ts
// InsertPlugin = typeof PluginTable.$inferInsert (Drizzle-inferred)
interface PluginRepository {
  listPluginsForUser(userId: string, tenantId: string): Promise<PluginWithUserState[]>;
  listEnabledPluginsForUser(userId: string, tenantId: string): Promise<PluginWithUserState[]>;
  getPluginById(id: string, userId: string): Promise<PluginWithUserState | null>;
  insertPlugin(data: InsertPlugin): Promise<Plugin>;
  updatePlugin(id: string, data: Partial<InsertPlugin>): Promise<Plugin>;
  deletePlugin(id: string): Promise<void>;
  enablePlugin(userId: string, pluginId: string): Promise<UserPlugin>;
  disablePlugin(userId: string, pluginId: string): Promise<void>;
  upsertUserPlugin(data: Partial<UserPlugin> & { userId: string; pluginId: string }): Promise<UserPlugin>;
  seedPlugins(plugins: InsertPlugin[]): Promise<Plugin[]>;
}
```

Exported from `src/lib/db/repository.ts` as `pluginRepository`.

---

## Chat Integration

### 1. System prompt injection

`buildUserSystemPrompt()` in `src/lib/ai/prompts.ts` gains a new optional parameter:

```ts
export const buildUserSystemPrompt = (
  user?: User,
  userPreferences?: UserPreferences,
  agent?: Agent,
  activePlugins?: PluginWithUserState[],  // NEW
) => { ... }
```

When `activePlugins` is non-empty, appends after core instructions:

```
<active_plugins>
<plugin name="Customer Success">
You are a customer success and account management assistant. When helping with CS tasks:
- Focus on customer outcomes...
</plugin>
</active_plugins>
```

The chat route (`src/app/api/chat/route.ts`) fetches enabled plugins before `streamText`. `tenantId` is read from the `x-tenant-id` request header (existing multi-tenancy pattern):

```ts
const tenantId = request.headers.get('x-tenant-id') ?? DEFAULT_TENANT_ID;
const enabledPlugins = await pluginRepository.listEnabledPluginsForUser(
  session.user.id,
  tenantId,
);

// If activePluginId was sent in the request body, fetch and merge it (deduped by id)
const activePlugin = activePluginId
  ? await pluginRepository.getPluginById(activePluginId, session.user.id)
  : null;
const activePlugins = dedupeById([...enabledPlugins, ...(activePlugin ? [activePlugin] : [])]);
```

When building the system prompt, each plugin uses `userState.customSystemPrompt ?? plugin.systemPromptAddition` so user overrides take precedence.

### 2. Chat request schema addition

`chatApiSchemaRequestBodySchema` in `src/types/chat.ts` gains:

```ts
activePluginId: z.string().uuid().optional(), // one-conversation activation via selector
```

When present, the chat route fetches that specific plugin and injects its `systemPromptAddition` regardless of user enable state.

### 3. Plugin selector component

New component: `src/components/plugin-selector.tsx`

- Renders above the chat input bar when plugins exist
- Shows active plugin as a dismissible pill (blue badge, plugin name + ×)
- "+ Plugin" button opens a popover listing all available plugins grouped by category
- Selecting a plugin sets `activePluginId` in chat state; dismissing clears it
- When a plugin is active, its skills render as clickable chips below the selector

### 4. Skills chips

When a plugin is active in the selector:
- Skills render as a horizontal chip strip below the plugin selector
- Clicking a chip sets the chat input value to the skill's `prompt`
- Overflow chips collapse to "+ N more" popover
- Chips are hidden when no plugin is active

### 5. @mention extension

Two new mention types added to the existing mention system in `src/types/chat.ts`:

```ts
| { type: 'plugin'; pluginId: string; name: string }
| { type: 'skill'; pluginId: string; skillId: string; name: string; prompt: string }
```

Mention picker behavior:
- `@` shows plugins at top level, skills nested under each plugin
- Selecting a `plugin` mention → activates that plugin (sets `activePluginId`)
- Selecting a `skill` mention → inserts skill prompt into chat input (client-side, no mention sent to AI)

### 6. Slash commands

In the chat input's `onChange` handler (existing `ChatInput` component):
- If input matches `/slug` exactly (full word, no trailing space yet), search across all enabled plugins' `commands` for a slug equal to `input.slice(1)`
- On match when user hits Space or Enter: replace input value with that command's `prompt`
- No API call — all enabled plugin data fetched client-side via `/api/plugins?enabled=true` on page load
- A suggestions dropdown appears listing matching commands as the user types after `/`

---

## UI & Navigation

### Sidebar entry

In `src/components/layouts/app-sidebar-menus.tsx`, add a new entry between Workflow and Archive:

```tsx
<SidebarMenuItem>
  <Link href="/customize">
    <SidebarMenuButton className="font-semibold">
      <SlidersHorizontalIcon className="size-4" />
      {t('Layout.customize')}
    </SidebarMenuButton>
  </Link>
</SidebarMenuItem>
```

### `/customize` page — `src/app/(chat)/customize/page.tsx`

Three-column layout mirroring Claude.ai:

```
┌─────────────────────────────────────────────────────┐
│ ← Customize                                         │
├──────────────┬─────────────────────────────────────-│
│ Skills       │  [Plugin list]   │  [Plugin detail]  │
│ Connectors   │                  │                   │
│              │  Personal        │  Name      [ON]   │
│              │  ├ spec-interview│  Description      │
│              │  + Add plugin    │                   │
│              │                  │  System prompt    │
│              │  Org Plugins     │  [editable]       │
│              │  ├ Customer Suc. │                   │
│              │  ├ Sales         │  Skills           │
│              │  └ Legal         │  ├ QBR Prep       │
│              │                  │  └ Escalation     │
│              │                  │                   │
│              │                  │  Commands         │
│              │                  │  └ /health-check  │
└──────────────┴──────────────────┴────────────────---┘
```

**Left nav** (`Skills` | `Connectors`):
- `Skills` — the new plugin/skills management panel
- `Connectors` — a tab that embeds the existing MCP dashboard component. The `/mcp` route remains intact and functional; `/customize?tab=connectors` renders the same `MCPDashboard` component. The sidebar "Connectors" link redirects to `/customize?tab=connectors`.

**Middle column** — plugin list:
- "Personal" section: user's own plugins + "+ Add plugin" button
- "Org Plugins" section: tenant-wide plugins (toggle enable/disable only, edit for admins)
- ON/OFF toggle per plugin (calls enable/disable API)

**Right detail panel** — selected plugin:
- Name, description, category, icon (editable for personal/admin)
- System prompt addition (editable, shows "Invoked by: User" label)
- Skills list with name + long description (read-only for built-in, editable for personal)
- Commands list with `/slug` display
- Delete button for personal plugins

### Admin — `/admin` additions

Existing admin area gets a new "Plugins" page: `src/app/(admin)/admin/plugins/page.tsx`

- Lists all tenant-wide plugins
- Allows create/edit/delete of org plugins
- Seed button to load the default plugin library
- Toggle `isPublic` per plugin

---

## Migration

New Drizzle migration file: `src/lib/db/pg/migrations/0017_plugin_tables.sql`

Creates:
- `plugin` table
- `user_plugin` table

Seed script: `scripts/seed-plugins.ts` — seeds the 10 default org plugins (Customer Success, Sales, Legal, etc.) from the existing JSON definition.

---

## Scope Boundaries

**In scope:**
- PluginTable + UserPluginTable schema + migration
- Plugin repository + CRUD API
- `/customize` page (3-column layout, Skills + Connectors tabs)
- Plugin selector component + skill chips above chat input
- @mention extension for plugins + skills
- `/slug` slash command pre-fill
- System prompt injection in chat route
- Sidebar "Customize" entry
- Admin plugins page + seed endpoint
- 10 default org plugin seed data

**Out of scope (future):**
- Plugin marketplace / sharing between tenants
- Per-skill analytics / usage tracking
- Plugin versioning / changelog
- AI-generated plugin creation wizard
- Plugin import/export (JSON)
- Per-command usage stats
