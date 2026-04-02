import { Agent } from "app-types/agent";
import { UserPreferences } from "app-types/user";
import { MCPServerConfig } from "app-types/mcp";
import type {
  ConnectorType,
  ConnectorStatus,
  AgentToolConfig,
  Guardrail,
  LeadStatus,
  LeadSource,
  ActivityAction,
  UsageResourceType,
  BillingPlan,
  SubscriptionStatus,
  DeploymentMode,
} from "app-types/platform";
import type { RoleType, TrialStatus } from "app-types/rbac";
import type {
  DocumentType,
  DocumentStatus,
  DocumentSource,
} from "app-types/knowledge";
import type {
  ProductType,
  ValueChainStage,
} from "app-types/company-intelligence";
import type { IndustryDocType } from "app-types/industry";
import type {
  ProspectStatus,
  ProspectSourceType,
  SignalType,
} from "app-types/prospecting";
import type {
  ContactStatus,
  ContactSourceType,
  ContactRole,
  EnrichmentStatus,
  ContactActivityType,
} from "app-types/contact-intelligence";
import type {
  StateSourceType,
  ResearchTaskStatus,
  ResearchTaskType,
  ResearchFinding,
  AgentLogEntry,
} from "app-types/state-research";
import type {
  BriefStatus,
  BriefType,
  BriefSection,
  AlertSeverity,
  AlertStatus,
  AlertCategory,
  AlertRuleConfig,
  WorkflowRunStatus,
  WorkflowStepConfig,
  WorkflowStepResult,
  PlaybookType,
  PlaybookStatus,
  PlaybookSection,
  CompositeSignalType,
  ComponentSignal,
  CostCategory,
  ROIProjection,
  SequenceStatus,
  OutreachStep,
  HealthStatus,
  HealthFactor,
  ExpansionOpportunity,
  DealOutcome,
  StageRecord,
  DealFactor,
  BuyingCommitteeMember,
  Relationship,
} from "app-types/sales-intelligence";
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  json,
  uuid,
  boolean,
  unique,
  varchar,
  index,
  integer,
  numeric,
  date,
  customType,
} from "drizzle-orm/pg-core";

// pgvector custom type (requires CREATE EXTENSION vector)
const vector = customType<{ data: number[]; dpiType: string }>({
  dataType() {
    return "vector(1536)";
  },
  fromDriver(value: unknown) {
    if (typeof value === "string") {
      return value.slice(1, -1).split(",").map(Number);
    }
    return value as number[];
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
});
import { isNotNull } from "drizzle-orm";
import { DBWorkflow, DBEdge, DBNode } from "app-types/workflow";
import { UIMessage } from "ai";
import { ChatMetadata } from "app-types/chat";
import { TipTapMentionJsonContent } from "@/types/util";
import type { PluginSkill, PluginCommand } from "app-types/plugin";

export const ProjectTable = pgTable("project", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  memory: text("memory"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ProjectFileTable = pgTable(
  "project_file",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => ProjectTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("project_file_project_id_idx").on(t.projectId)],
);

export const ChatThreadTable = pgTable(
  "chat_thread",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    title: text("title").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => ProjectTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("chat_thread_project_id_idx").on(t.projectId)],
);

export const ChatMessageTable = pgTable("chat_message", {
  id: text("id").primaryKey().notNull(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => ChatThreadTable.id, { onDelete: "cascade" }),
  role: text("role").notNull().$type<UIMessage["role"]>(),
  parts: json("parts").notNull().array().$type<UIMessage["parts"]>(),
  metadata: json("metadata").$type<ChatMetadata>(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const AgentTable = pgTable("agent", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  icon: json("icon").$type<Agent["icon"]>(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  instructions: json("instructions").$type<Agent["instructions"]>(),
  visibility: varchar("visibility", {
    enum: ["public", "private", "readonly"],
  })
    .notNull()
    .default("private"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const AgentFileTable = pgTable(
  "agent_file",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => AgentTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("agent_file_agent_id_idx").on(t.agentId)],
);

export const BookmarkTable = pgTable(
  "bookmark",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull(),
    itemType: varchar("item_type", {
      enum: ["agent", "workflow", "mcp"],
    }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.userId, table.itemId, table.itemType),
    index("bookmark_user_id_idx").on(table.userId),
    index("bookmark_item_idx").on(table.itemId, table.itemType),
  ],
);

export const McpServerTable = pgTable("mcp_server", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  config: json("config").notNull().$type<MCPServerConfig>(),
  enabled: boolean("enabled").notNull().default(true),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  visibility: varchar("visibility", {
    enum: ["public", "private"],
  })
    .notNull()
    .default("private"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const PluginTable = pgTable(
  "plugin",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id"),
    userId: uuid("user_id").references(() => UserTable.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    category: varchar("category", {
      enum: ["productivity", "research", "legal", "sales", "hr", "custom"],
    })
      .notNull()
      .default("custom"),
    icon: text("icon").notNull().default("Sparkles"),
    color: text("color").notNull().default("bg-blue-500/10 text-blue-500"),
    systemPromptAddition: text("system_prompt_addition").notNull().default(""),
    skills: json("skills").notNull().default([]).$type<PluginSkill[]>(),
    commands: json("commands").notNull().default([]).$type<PluginCommand[]>(),
    isBuiltIn: boolean("is_built_in").notNull().default(false),
    isPublic: boolean("is_public").notNull().default(false),
    version: text("version").notNull().default("1.0.0"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("plugin_tenant_id_idx").on(t.tenantId),
    index("plugin_user_id_idx").on(t.userId),
  ],
);

export const UserPluginTable = pgTable(
  "user_plugin",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    pluginId: uuid("plugin_id")
      .notNull()
      .references(() => PluginTable.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false),
    customSystemPrompt: text("custom_system_prompt"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    unique().on(t.userId, t.pluginId),
    index("user_plugin_user_id_idx").on(t.userId),
  ],
);

export type PluginEntity = typeof PluginTable.$inferSelect;
export type UserPluginEntity = typeof UserPluginTable.$inferSelect;

export const UserTable = pgTable("user", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  password: text("password"),
  image: text("image"),
  preferences: json("preferences").default({}).$type<UserPreferences>(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  role: text("role").notNull().default("user"),
});

// Role tables removed - using Better Auth's built-in role system
// Roles are now managed via the 'role' field on UserTable

export const SessionTable = pgTable("session", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  // Admin plugin field (from better-auth generated schema)
  impersonatedBy: text("impersonated_by"),
});

export const AccountTable = pgTable("account", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const VerificationTable = pgTable("verification", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

// Tool customization table for per-user additional instructions
export const McpToolCustomizationTable = pgTable(
  "mcp_server_tool_custom_instructions",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => McpServerTable.id, { onDelete: "cascade" }),
    prompt: text("prompt"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [unique().on(table.userId, table.toolName, table.mcpServerId)],
);

export const McpServerCustomizationTable = pgTable(
  "mcp_server_custom_instructions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => McpServerTable.id, { onDelete: "cascade" }),
    prompt: text("prompt"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique().on(table.userId, table.mcpServerId)],
);

export const WorkflowTable = pgTable("workflow", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  version: text("version").notNull().default("0.1.0"),
  name: text("name").notNull(),
  icon: json("icon").$type<DBWorkflow["icon"]>(),
  description: text("description"),
  isPublished: boolean("is_published").notNull().default(false),
  visibility: varchar("visibility", {
    enum: ["public", "private", "readonly"],
  })
    .notNull()
    .default("private"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const WorkflowNodeDataTable = pgTable(
  "workflow_node",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    version: text("version").notNull().default("0.1.0"),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => WorkflowTable.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    uiConfig: json("ui_config").$type<DBNode["uiConfig"]>().default({}),
    nodeConfig: json("node_config")
      .$type<Partial<DBNode["nodeConfig"]>>()
      .default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("workflow_node_kind_idx").on(t.kind)],
);

export const WorkflowEdgeTable = pgTable("workflow_edge", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  version: text("version").notNull().default("0.1.0"),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => WorkflowTable.id, { onDelete: "cascade" }),
  source: uuid("source")
    .notNull()
    .references(() => WorkflowNodeDataTable.id, { onDelete: "cascade" }),
  target: uuid("target")
    .notNull()
    .references(() => WorkflowNodeDataTable.id, { onDelete: "cascade" }),
  uiConfig: json("ui_config").$type<DBEdge["uiConfig"]>().default({}),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ArchiveTable = pgTable("archive", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ArchiveItemTable = pgTable(
  "archive_item",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    archiveId: uuid("archive_id")
      .notNull()
      .references(() => ArchiveTable.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("archive_item_item_id_idx").on(t.itemId)],
);

export const McpOAuthSessionTable = pgTable(
  "mcp_oauth_session",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => McpServerTable.id, { onDelete: "cascade" }),
    serverUrl: text("server_url").notNull(),
    clientInfo: json("client_info"),
    tokens: json("tokens"),
    codeVerifier: text("code_verifier"),
    state: text("state").unique(), // OAuth state parameter for current flow (unique for security)
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("mcp_oauth_session_server_id_idx").on(t.mcpServerId),
    index("mcp_oauth_session_state_idx").on(t.state),
    // Partial index for sessions with tokens for better performance
    index("mcp_oauth_session_tokens_idx")
      .on(t.mcpServerId)
      .where(isNotNull(t.tokens)),
  ],
);

export type McpServerEntity = typeof McpServerTable.$inferSelect;
export type ChatThreadEntity = typeof ChatThreadTable.$inferSelect;
export type ChatMessageEntity = typeof ChatMessageTable.$inferSelect;

export type ProjectEntity = typeof ProjectTable.$inferSelect;
export type ProjectFileEntity = typeof ProjectFileTable.$inferSelect;

export type AgentEntity = typeof AgentTable.$inferSelect;
export type AgentFileEntity = typeof AgentFileTable.$inferSelect;
export type UserEntity = typeof UserTable.$inferSelect;
export type SessionEntity = typeof SessionTable.$inferSelect;

export type ToolCustomizationEntity =
  typeof McpToolCustomizationTable.$inferSelect;
export type McpServerCustomizationEntity =
  typeof McpServerCustomizationTable.$inferSelect;

export type ArchiveEntity = typeof ArchiveTable.$inferSelect;
export type ArchiveItemEntity = typeof ArchiveItemTable.$inferSelect;
export type BookmarkEntity = typeof BookmarkTable.$inferSelect;

export const ChatExportTable = pgTable("chat_export", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  exporterId: uuid("exporter_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  originalThreadId: uuid("original_thread_id"),
  messages: json("messages").notNull().$type<
    Array<{
      id: string;
      role: UIMessage["role"];
      parts: UIMessage["parts"];
      metadata?: ChatMetadata;
    }>
  >(),
  exportedAt: timestamp("exported_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  expiresAt: timestamp("expires_at"),
});

export const ChatExportCommentTable = pgTable("chat_export_comment", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  exportId: uuid("export_id")
    .notNull()
    .references(() => ChatExportTable.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references(() => ChatExportCommentTable.id, {
    onDelete: "cascade",
  }),
  content: json("content").notNull().$type<TipTapMentionJsonContent>(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type ChatExportEntity = typeof ChatExportTable.$inferSelect;
export type ChatExportCommentEntity =
  typeof ChatExportCommentTable.$inferSelect;

// ============================================================================
// PLATFORM TABLES
// ============================================================================

export const TenantSchema = pgTable(
  "tenant",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    deploymentMode: varchar("deployment_mode", {
      enum: ["single-tenant", "multi-tenant"],
    })
      .notNull()
      .default("single-tenant")
      .$type<DeploymentMode>(),
    enabledVerticals: json("enabled_verticals")
      .notNull()
      .default([])
      .$type<string[]>(),
    settings: json("settings")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("tenant_slug_idx").on(t.slug)],
);

export const ConnectorSchema = pgTable(
  "connector",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    type: varchar("type", {
      enum: [
        "salesforce",
        "hubspot",
        "csv-import",
        "api-generic",
        "edi-837",
        "edi-835",
      ],
    })
      .notNull()
      .$type<ConnectorType>(),
    name: text("name").notNull(),
    config: json("config")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    status: varchar("status", {
      enum: ["disconnected", "connected", "syncing", "error"],
    })
      .notNull()
      .default("disconnected")
      .$type<ConnectorStatus>(),
    lastSyncAt: timestamp("last_sync_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("connector_tenant_id_idx").on(t.tenantId)],
);

export const ConnectorSyncLogSchema = pgTable(
  "connector_sync_log",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    connectorId: uuid("connector_id")
      .notNull()
      .references(() => ConnectorSchema.id, { onDelete: "cascade" }),
    status: varchar("status", {
      enum: ["running", "completed", "failed"],
    }).notNull(),
    recordsProcessed: integer("records_processed").notNull().default(0),
    recordsFailed: integer("records_failed").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    completedAt: timestamp("completed_at"),
  },
  (t) => [index("sync_log_connector_id_idx").on(t.connectorId)],
);

export const PipelineSchema = pgTable(
  "pipeline",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    connectorId: uuid("connector_id").references(() => ConnectorSchema.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    schedule: text("schedule"),
    transformConfig: json("transform_config")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    status: varchar("status", {
      enum: ["idle", "running", "completed", "failed"],
    })
      .notNull()
      .default("idle"),
    lastRunAt: timestamp("last_run_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("pipeline_tenant_id_idx").on(t.tenantId)],
);

export const PipelineRunSchema = pgTable(
  "pipeline_run",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => PipelineSchema.id, { onDelete: "cascade" }),
    status: varchar("status", {
      enum: ["running", "completed", "failed"],
    }).notNull(),
    recordsProcessed: integer("records_processed").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    completedAt: timestamp("completed_at"),
  },
  (t) => [index("pipeline_run_pipeline_id_idx").on(t.pipelineId)],
);

export const ConfigurableAgentSchema = pgTable(
  "configurable_agent",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    vertical: varchar("vertical", { length: 100 }).notNull(),
    agentType: varchar("agent_type", { length: 100 }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    systemPrompt: text("system_prompt").notNull(),
    tools: json("tools").notNull().default([]).$type<AgentToolConfig[]>(),
    guardrails: json("guardrails").notNull().default([]).$type<Guardrail[]>(),
    model: text("model"),
    temperature: numeric("temperature"),
    maxTokens: integer("max_tokens"),
    config: json("config")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("configurable_agent_tenant_idx").on(t.tenantId),
    index("configurable_agent_vertical_idx").on(t.vertical),
    index("configurable_agent_type_idx").on(
      t.tenantId,
      t.vertical,
      t.agentType,
    ),
  ],
);

export const LeadSchema = pgTable(
  "lead",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    source: varchar("source", {
      enum: [
        "salesforce",
        "hubspot",
        "manual",
        "csv-import",
        "ai-prospected",
        "web-form",
        "referral",
      ],
    })
      .notNull()
      .$type<LeadSource>(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    company: text("company"),
    title: text("title"),
    phone: text("phone"),
    status: varchar("status", {
      enum: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
        "disqualified",
      ],
    })
      .notNull()
      .default("new")
      .$type<LeadStatus>(),
    score: integer("score"),
    estimatedValue: numeric("estimated_value"),
    data: json("data").notNull().default({}).$type<Record<string, unknown>>(),
    assignedTo: uuid("assigned_to").references(() => UserTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("lead_tenant_id_idx").on(t.tenantId),
    index("lead_status_idx").on(t.tenantId, t.status),
    index("lead_external_id_idx").on(t.tenantId, t.externalId),
    index("lead_assigned_to_idx").on(t.assignedTo),
  ],
);

export const ActivityLogSchema = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => UserTable.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull().$type<ActivityAction>(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("activity_log_tenant_idx").on(t.tenantId),
    index("activity_log_user_idx").on(t.userId),
    index("activity_log_action_idx").on(t.action),
    index("activity_log_created_at_idx").on(t.createdAt),
  ],
);

export const UsageRecordSchema = pgTable(
  "usage_record",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => UserTable.id, {
      onDelete: "set null",
    }),
    resourceType: varchar("resource_type", {
      enum: [
        "ai-tokens",
        "ai-requests",
        "connector-sync",
        "storage-bytes",
        "workflow-execution",
        "api-call",
      ],
    })
      .notNull()
      .$type<UsageResourceType>(),
    quantity: integer("quantity").notNull(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    recordedAt: timestamp("recorded_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("usage_record_tenant_idx").on(t.tenantId),
    index("usage_record_type_idx").on(t.tenantId, t.resourceType),
    index("usage_record_date_idx").on(t.recordedAt),
  ],
);

export const MetricSchema = pgTable(
  "metric",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    vertical: text("vertical").notNull(),
    metricKey: text("metric_key").notNull(),
    metricValue: numeric("metric_value").notNull(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    recordedAt: timestamp("recorded_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("metric_tenant_vertical_idx").on(t.tenantId, t.vertical),
    index("metric_key_idx").on(t.tenantId, t.vertical, t.metricKey),
    index("metric_recorded_at_idx").on(t.recordedAt),
  ],
);

export const ROISnapshotSchema = pgTable(
  "roi_snapshot",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    vertical: text("vertical").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    metrics: json("metrics").notNull().$type<Record<string, number>>(),
    calculatedRoi: numeric("calculated_roi"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("roi_snapshot_tenant_vertical_idx").on(t.tenantId, t.vertical)],
);

export const BillingSubscriptionSchema = pgTable(
  "billing_subscription",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    clerkSubscriptionId: text("clerk_subscription_id").notNull().unique(),
    plan: varchar("plan", {
      enum: ["starter", "professional", "enterprise"],
    })
      .notNull()
      .$type<BillingPlan>(),
    status: varchar("status", {
      enum: ["active", "past_due", "canceled", "trialing", "incomplete"],
    })
      .notNull()
      .$type<SubscriptionStatus>(),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    canceledAt: timestamp("canceled_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("billing_sub_tenant_idx").on(t.tenantId),
    index("billing_sub_clerk_idx").on(t.clerkSubscriptionId),
  ],
);

// ============================================================================
// RBAC TABLES
// ============================================================================

export const PermissionSchema = pgTable(
  "permission",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    resource: varchar("resource", { length: 100 }).notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [unique("permission_resource_action_unique").on(t.resource, t.action)],
);

export const RoleSchema = pgTable(
  "role",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    type: varchar("type", {
      enum: [
        "super-admin",
        "tenant-admin",
        "manager",
        "user",
        "viewer",
        "custom",
      ],
    })
      .notNull()
      .$type<RoleType>(),
    description: text("description"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("role_tenant_idx").on(t.tenantId),
    unique("role_tenant_name_unique").on(t.tenantId, t.name),
  ],
);

export const RolePermissionSchema = pgTable(
  "role_permission",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => RoleSchema.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => PermissionSchema.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [unique("role_permission_unique").on(t.roleId, t.permissionId)],
);

export const UserRoleSchema = pgTable(
  "user_role",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => RoleSchema.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by").references(() => UserTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    unique("user_role_unique").on(t.userId, t.roleId, t.tenantId),
    index("user_role_user_idx").on(t.userId),
    index("user_role_tenant_idx").on(t.tenantId),
  ],
);

export const TrialSchema = pgTable(
  "trial",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    plan: varchar("plan", { length: 50 }).notNull(),
    status: varchar("status", {
      enum: ["active", "expired", "converted", "canceled"],
    })
      .notNull()
      .default("active")
      .$type<TrialStatus>(),
    startDate: timestamp("start_date")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    endDate: timestamp("end_date").notNull(),
    features: json("features")
      .notNull()
      .default({})
      .$type<Record<string, boolean>>(),
    maxUsers: integer("max_users").notNull().default(5),
    maxAiRequests: integer("max_ai_requests").notNull().default(1000),
    convertedAt: timestamp("converted_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("trial_tenant_idx").on(t.tenantId),
    index("trial_status_idx").on(t.status),
  ],
);

export const TokenUsageSchema = pgTable(
  "token_usage",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => UserTable.id, {
      onDelete: "set null",
    }),
    model: varchar("model", { length: 200 }).notNull(),
    provider: varchar("provider", { length: 100 }).notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    costCents: numeric("cost_cents"),
    sessionId: text("session_id"),
    agentType: varchar("agent_type", { length: 100 }),
    vertical: varchar("vertical", { length: 100 }),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("token_usage_tenant_idx").on(t.tenantId),
    index("token_usage_user_idx").on(t.tenantId, t.userId),
    index("token_usage_model_idx").on(t.tenantId, t.model),
    index("token_usage_created_idx").on(t.createdAt),
  ],
);

export const ApiKeySchema = pgTable(
  "api_key",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: varchar("key_prefix", { length: 20 }).notNull(),
    scopes: json("scopes").notNull().default([]).$type<string[]>(),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("api_key_tenant_idx").on(t.tenantId),
    index("api_key_hash_idx").on(t.keyHash),
  ],
);

// ============================================================================
// KNOWLEDGE BASE TABLES
// ============================================================================

export const KnowledgeCategorySchema = pgTable(
  "knowledge_category",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    parentId: uuid("parent_id"),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("knowledge_cat_tenant_idx").on(t.tenantId),
    unique("knowledge_cat_tenant_slug").on(t.tenantId, t.slug),
  ],
);

export const KnowledgeDocumentSchema = pgTable(
  "knowledge_document",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(
      () => KnowledgeCategorySchema.id,
      { onDelete: "set null" },
    ),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content").notNull(),
    documentType: varchar("document_type", {
      enum: [
        "pdf",
        "web-page",
        "text",
        "markdown",
        "csv",
        "json",
        "api-response",
        "filing",
        "report",
        "email",
        "presentation",
        "spreadsheet",
      ],
    })
      .notNull()
      .$type<DocumentType>(),
    source: varchar("source", {
      enum: [
        "upload",
        "web-scrape",
        "connector-sync",
        "api-import",
        "enrichment",
        "filing-scan",
        "manual",
      ],
    })
      .notNull()
      .default("manual")
      .$type<DocumentSource>(),
    sourceUrl: text("source_url"),
    sourceId: text("source_id"),
    status: varchar("status", {
      enum: ["pending", "processing", "indexed", "failed", "archived"],
    })
      .notNull()
      .default("pending")
      .$type<DocumentStatus>(),
    chunkCount: integer("chunk_count").notNull().default(0),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    tags: json("tags").notNull().default([]).$type<string[]>(),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("knowledge_doc_tenant_idx").on(t.tenantId),
    index("knowledge_doc_category_idx").on(t.categoryId),
    index("knowledge_doc_status_idx").on(t.tenantId, t.status),
    index("knowledge_doc_type_idx").on(t.tenantId, t.documentType),
  ],
);

export const DocumentChunkSchema = pgTable(
  "document_chunk",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => KnowledgeDocumentSchema.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding"),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("chunk_document_idx").on(t.documentId),
    index("chunk_tenant_idx").on(t.tenantId),
  ],
);

// ============================================================================
// COMPANY INTELLIGENCE TABLES
// ============================================================================

export const CompanyProfileSchema = pgTable(
  "company_profile",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 500 }).notNull(),
    legalName: varchar("legal_name", { length: 500 }),
    website: text("website"),
    industry: varchar("industry", { length: 200 }),
    subIndustry: varchar("sub_industry", { length: 200 }),
    naicsCode: varchar("naics_code", { length: 10 }),
    sicCode: varchar("sic_code", { length: 10 }),
    description: text("description"),
    headquarters: json("headquarters").$type<Record<string, unknown>>(),
    annualRevenue: numeric("annual_revenue"),
    employeeCount: integer("employee_count"),
    foundedYear: integer("founded_year"),
    stockTicker: varchar("stock_ticker", { length: 10 }),
    linkedinUrl: text("linkedin_url"),
    salesMethodology: text("sales_methodology"),
    valueProposition: text("value_proposition"),
    targetMarkets: json("target_markets")
      .notNull()
      .default([])
      .$type<string[]>(),
    competitors: json("competitors").notNull().default([]).$type<string[]>(),
    keyDifferentiators: json("key_differentiators")
      .notNull()
      .default([])
      .$type<string[]>(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    isClientCompany: boolean("is_client_company").notNull().default(false),
    enrichedAt: timestamp("enriched_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("company_tenant_idx").on(t.tenantId),
    index("company_industry_idx").on(t.tenantId, t.industry),
    index("company_client_idx").on(t.tenantId, t.isClientCompany),
  ],
);

export const ProductSchema = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => CompanyProfileSchema.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 500 }).notNull(),
    type: varchar("type", {
      enum: ["product", "service", "solution", "bundle"],
    })
      .notNull()
      .$type<ProductType>(),
    category: varchar("category", { length: 200 }),
    description: text("description"),
    features: json("features").notNull().default([]).$type<string[]>(),
    benefits: json("benefits").notNull().default([]).$type<string[]>(),
    useCases: json("use_cases").notNull().default([]).$type<string[]>(),
    targetIndustries: json("target_industries")
      .notNull()
      .default([])
      .$type<string[]>(),
    priceRange: json("price_range").$type<Record<string, unknown>>(),
    competitiveAdvantages: json("competitive_advantages")
      .notNull()
      .default([])
      .$type<string[]>(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("product_tenant_idx").on(t.tenantId),
    index("product_company_idx").on(t.companyId),
    index("product_type_idx").on(t.tenantId, t.type),
  ],
);

export const ValueChainSchema = pgTable(
  "value_chain",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => CompanyProfileSchema.id, { onDelete: "cascade" }),
    stage: varchar("stage", {
      enum: [
        "raw-materials",
        "manufacturing",
        "processing",
        "distribution",
        "wholesale",
        "retail",
        "end-user",
        "recycling",
        "regulatory",
        "support-services",
      ],
    })
      .notNull()
      .$type<ValueChainStage>(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    activities: json("activities").notNull().default([]).$type<string[]>(),
    partners: json("partners").notNull().default([]).$type<string[]>(),
    inputs: json("inputs").notNull().default([]).$type<string[]>(),
    outputs: json("outputs").notNull().default([]).$type<string[]>(),
    painPoints: json("pain_points").notNull().default([]).$type<string[]>(),
    opportunities: json("opportunities")
      .notNull()
      .default([])
      .$type<string[]>(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("value_chain_company_idx").on(t.companyId),
    index("value_chain_tenant_idx").on(t.tenantId),
  ],
);

export const SalesMethodologySchema = pgTable(
  "sales_methodology",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => CompanyProfileSchema.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    framework: varchar("framework", { length: 100 }),
    stages: json("stages")
      .notNull()
      .default([])
      .$type<Record<string, unknown>[]>(),
    qualificationCriteria: json("qualification_criteria")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    idealCustomerProfile: json("ideal_customer_profile")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    buyerPersonas: json("buyer_personas")
      .notNull()
      .default([])
      .$type<Record<string, unknown>[]>(),
    objectionHandling: json("objection_handling")
      .notNull()
      .default([])
      .$type<Record<string, unknown>[]>(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("sales_method_company_idx").on(t.companyId),
    index("sales_method_tenant_idx").on(t.tenantId),
  ],
);

// ============================================================================
// INDUSTRY TABLES
// ============================================================================

export const IndustrySchema = pgTable(
  "industry",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    parentId: uuid("parent_id"),
    description: text("description"),
    naicsCodes: json("naics_codes").notNull().default([]).$type<string[]>(),
    sicCodes: json("sic_codes").notNull().default([]).$type<string[]>(),
    keywords: json("keywords").notNull().default([]).$type<string[]>(),
    valueChainTemplate: json("value_chain_template")
      .notNull()
      .default([])
      .$type<Record<string, unknown>[]>(),
    regulatoryBodies: json("regulatory_bodies")
      .notNull()
      .default([])
      .$type<string[]>(),
    dataSources: json("data_sources")
      .notNull()
      .default([])
      .$type<Record<string, unknown>[]>(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("industry_slug_idx").on(t.slug),
    index("industry_parent_idx").on(t.parentId),
  ],
);

export const IndustryDocumentSchema = pgTable(
  "industry_document",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    industryId: uuid("industry_id")
      .notNull()
      .references(() => IndustrySchema.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id"),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content").notNull(),
    docType: varchar("doc_type", {
      enum: [
        "market-overview",
        "regulatory-guide",
        "value-chain-analysis",
        "competitive-landscape",
        "technology-trends",
        "buyer-guide",
        "pricing-intelligence",
        "trade-publication",
        "standard-specification",
        "safety-data-sheet",
        "compliance-requirement",
      ],
    })
      .notNull()
      .$type<IndustryDocType>(),
    sourceUrl: text("source_url"),
    author: varchar("author", { length: 200 }),
    publishedAt: timestamp("published_at"),
    tags: json("tags").notNull().default([]).$type<string[]>(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("industry_doc_industry_idx").on(t.industryId),
    index("industry_doc_type_idx").on(t.industryId, t.docType),
    index("industry_doc_tenant_idx").on(t.tenantId),
  ],
);

// ============================================================================
// PROSPECTING TABLES
// ============================================================================

export const ProspectSchema = pgTable(
  "prospect",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    companyName: varchar("company_name", { length: 500 }).notNull(),
    website: text("website"),
    industry: varchar("industry", { length: 200 }),
    subIndustry: varchar("sub_industry", { length: 200 }),
    location: json("location").$type<Record<string, unknown>>(),
    employeeCount: integer("employee_count"),
    annualRevenue: numeric("annual_revenue"),
    fitScore: integer("fit_score"),
    intentScore: integer("intent_score"),
    status: varchar("status", {
      enum: [
        "identified",
        "researching",
        "enriched",
        "qualified",
        "converted-to-lead",
        "disqualified",
        "stale",
      ],
    })
      .notNull()
      .default("identified")
      .$type<ProspectStatus>(),
    sourceId: text("source_id"),
    sourceType: varchar("source_type", { length: 100 }),
    convertedLeadId: uuid("converted_lead_id").references(() => LeadSchema.id, {
      onDelete: "set null",
    }),
    tags: json("tags").notNull().default([]).$type<string[]>(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    enrichedAt: timestamp("enriched_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("prospect_tenant_idx").on(t.tenantId),
    index("prospect_status_idx").on(t.tenantId, t.status),
    index("prospect_industry_idx").on(t.tenantId, t.industry),
    index("prospect_fit_idx").on(t.tenantId, t.fitScore),
  ],
);

export const ProspectSourceSchema = pgTable(
  "prospect_source",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    type: varchar("type", {
      enum: [
        "epa-echo",
        "epa-tri",
        "sec-edgar",
        "state-permit",
        "federal-filing",
        "county-records",
        "business-registry",
        "trade-association",
        "web-scrape",
        "industry-directory",
        "government-contract",
        "import-export-records",
      ],
    })
      .notNull()
      .$type<ProspectSourceType>(),
    baseUrl: text("base_url"),
    apiEndpoint: text("api_endpoint"),
    config: json("config")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    schedule: text("schedule"),
    filters: json("filters")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    enabled: boolean("enabled").notNull().default(true),
    lastScanAt: timestamp("last_scan_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("prospect_source_tenant_idx").on(t.tenantId),
    index("prospect_source_type_idx").on(t.tenantId, t.type),
  ],
);

export const FilingRecordSchema = pgTable(
  "filing_record",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => ProspectSourceSchema.id, { onDelete: "cascade" }),
    prospectId: uuid("prospect_id").references(() => ProspectSchema.id, {
      onDelete: "set null",
    }),
    externalId: text("external_id").notNull(),
    filingType: varchar("filing_type", { length: 200 }).notNull(),
    title: varchar("title", { length: 1000 }).notNull(),
    description: text("description"),
    filingDate: date("filing_date").notNull(),
    filingUrl: text("filing_url"),
    facilityName: varchar("facility_name", { length: 500 }),
    facilityId: varchar("facility_id", { length: 200 }),
    state: varchar("state", { length: 2 }),
    county: varchar("county", { length: 200 }),
    regulatoryProgram: varchar("regulatory_program", { length: 200 }),
    companyName: varchar("company_name", { length: 500 }),
    contactName: varchar("contact_name", { length: 200 }),
    contactTitle: varchar("contact_title", { length: 200 }),
    contactEmail: text("contact_email"),
    contactPhone: varchar("contact_phone", { length: 50 }),
    rawData: json("raw_data")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("filing_tenant_idx").on(t.tenantId),
    index("filing_source_idx").on(t.sourceId),
    index("filing_external_idx").on(t.tenantId, t.sourceId, t.externalId),
    index("filing_type_idx").on(t.tenantId, t.filingType),
    index("filing_state_idx").on(t.tenantId, t.state),
    index("filing_date_idx").on(t.filingDate),
  ],
);

export const ProspectSignalSchema = pgTable(
  "prospect_signal",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => ProspectSchema.id, { onDelete: "cascade" }),
    signalType: varchar("signal_type", {
      enum: [
        "new-permit",
        "permit-renewal",
        "violation",
        "expansion",
        "hiring",
        "funding",
        "acquisition",
        "new-product",
        "regulatory-change",
        "contract-award",
        "leadership-change",
        "facility-opening",
      ],
    })
      .notNull()
      .$type<SignalType>(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    sourceUrl: text("source_url"),
    sourceType: varchar("source_type", { length: 100 }),
    strength: integer("strength").notNull().default(50),
    detectedAt: timestamp("detected_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("signal_tenant_idx").on(t.tenantId),
    index("signal_prospect_idx").on(t.prospectId),
    index("signal_type_idx").on(t.tenantId, t.signalType),
    index("signal_detected_idx").on(t.detectedAt),
  ],
);

// ============================================================================
// CONTACT INTELLIGENCE TABLES
// ============================================================================

export const ContactRecordSchema = pgTable(
  "contact_record",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    prospectId: uuid("prospect_id").references(() => ProspectSchema.id, {
      onDelete: "set null",
    }),
    leadId: uuid("lead_id").references(() => LeadSchema.id, {
      onDelete: "set null",
    }),
    firstName: varchar("first_name", { length: 200 }).notNull(),
    lastName: varchar("last_name", { length: 200 }).notNull(),
    email: text("email"),
    emailVerified: boolean("email_verified").notNull().default(false),
    phone: varchar("phone", { length: 50 }),
    mobilePhone: varchar("mobile_phone", { length: 50 }),
    title: varchar("title", { length: 500 }),
    department: varchar("department", { length: 200 }),
    company: varchar("company", { length: 500 }),
    companyId: uuid("company_id").references(() => CompanyProfileSchema.id, {
      onDelete: "set null",
    }),
    linkedinUrl: text("linkedin_url"),
    role: varchar("role", {
      enum: [
        "decision-maker",
        "influencer",
        "champion",
        "gatekeeper",
        "end-user",
        "technical-evaluator",
        "economic-buyer",
        "executive-sponsor",
        "unknown",
      ],
    })
      .notNull()
      .default("unknown")
      .$type<ContactRole>(),
    seniority: varchar("seniority", { length: 50 }),
    status: varchar("status", {
      enum: [
        "identified",
        "verified",
        "enriched",
        "engaged",
        "opted-out",
        "bounced",
        "stale",
      ],
    })
      .notNull()
      .default("identified")
      .$type<ContactStatus>(),
    location: json("location").$type<Record<string, unknown>>(),
    confidenceScore: integer("confidence_score").notNull().default(50),
    tags: json("tags").notNull().default([]).$type<string[]>(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    enrichedAt: timestamp("enriched_at"),
    lastContactedAt: timestamp("last_contacted_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("contact_tenant_idx").on(t.tenantId),
    index("contact_prospect_idx").on(t.prospectId),
    index("contact_lead_idx").on(t.leadId),
    index("contact_company_idx").on(t.companyId),
    index("contact_email_idx").on(t.tenantId, t.email),
    index("contact_status_idx").on(t.tenantId, t.status),
    index("contact_role_idx").on(t.tenantId, t.role),
  ],
);

export const ContactEnrichmentSchema = pgTable(
  "contact_enrichment",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => ContactRecordSchema.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    sourceType: varchar("source_type", {
      enum: [
        "linkedin",
        "zoominfo",
        "salesforce",
        "hubspot",
        "filing-document",
        "epa-echo",
        "permit-application",
        "company-website",
        "press-release",
        "conference-attendee",
        "trade-publication",
        "manual",
        "csv-import",
        "api-enrichment",
      ],
    })
      .notNull()
      .$type<ContactSourceType>(),
    sourceId: text("source_id"),
    status: varchar("status", {
      enum: ["pending", "in-progress", "completed", "failed", "partial"],
    })
      .notNull()
      .default("pending")
      .$type<EnrichmentStatus>(),
    enrichedData: json("enriched_data")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    confidenceScore: integer("confidence_score").notNull().default(50),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("enrichment_contact_idx").on(t.contactId),
    index("enrichment_tenant_idx").on(t.tenantId),
    index("enrichment_source_idx").on(t.contactId, t.sourceType),
  ],
);

export const ContactActivitySchema = pgTable(
  "contact_activity",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => ContactRecordSchema.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => UserTable.id, {
      onDelete: "set null",
    }),
    activityType: varchar("activity_type", {
      enum: [
        "email-sent",
        "email-opened",
        "email-replied",
        "email-bounced",
        "call-made",
        "call-answered",
        "meeting-scheduled",
        "meeting-held",
        "linkedin-connected",
        "linkedin-messaged",
        "note-added",
        "status-changed",
      ],
    })
      .notNull()
      .$type<ContactActivityType>(),
    subject: varchar("subject", { length: 500 }),
    notes: text("notes"),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("contact_activity_contact_idx").on(t.contactId),
    index("contact_activity_tenant_idx").on(t.tenantId),
    index("contact_activity_type_idx").on(t.contactId, t.activityType),
  ],
);

// ============================================================================
// STATE-LEVEL RESEARCH TABLES
// ============================================================================

export const StateSourceSchema = pgTable(
  "state_source",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    state: varchar("state", { length: 2 }).notNull(),
    name: varchar("name", { length: 300 }).notNull(),
    sourceType: varchar("source_type", {
      enum: [
        "oil-gas-commission",
        "environmental-agency",
        "air-quality",
        "water-quality",
        "waste-management",
        "permits-registry",
        "enforcement-actions",
        "emissions-inventory",
        "compliance-monitoring",
        "well-registry",
        "production-data",
        "general-regulatory",
      ],
    })
      .notNull()
      .$type<StateSourceType>(),
    agencyName: varchar("agency_name", { length: 300 }),
    url: text("url").notNull(),
    apiEndpoint: text("api_endpoint"),
    searchUrl: text("search_url"),
    dataFormat: varchar("data_format", { length: 20 })
      .notNull()
      .default("html"),
    capabilities: json("capabilities").notNull().default([]).$type<string[]>(),
    scrapingConfig: json("scraping_config")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    schedule: text("schedule"),
    enabled: boolean("enabled").notNull().default(true),
    lastScanAt: timestamp("last_scan_at"),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("state_source_tenant_idx").on(t.tenantId),
    index("state_source_state_idx").on(t.tenantId, t.state),
    index("state_source_type_idx").on(t.tenantId, t.sourceType),
  ],
);

export const ResearchTaskSchema = pgTable(
  "research_task",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => UserTable.id, {
      onDelete: "set null",
    }),
    taskType: varchar("task_type", {
      enum: [
        "company-deep-dive",
        "facility-compliance",
        "state-permit-scan",
        "enforcement-scan",
        "emissions-analysis",
        "competitor-analysis",
        "market-opportunity",
        "regulatory-change-scan",
        "contact-discovery",
        "prospect-qualification",
      ],
    })
      .notNull()
      .$type<ResearchTaskType>(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    targetCompany: varchar("target_company", { length: 500 }),
    targetState: varchar("target_state", { length: 2 }),
    targetFacilityId: text("target_facility_id"),
    parameters: json("parameters")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    sourceIds: json("source_ids").notNull().default([]).$type<string[]>(),
    priority: varchar("priority", { length: 20 }).notNull().default("medium"),
    status: varchar("status", {
      enum: ["pending", "in-progress", "completed", "failed", "canceled"],
    })
      .notNull()
      .default("pending")
      .$type<ResearchTaskStatus>(),
    results: json("results").$type<Record<string, unknown>>(),
    findings: json("findings").notNull().default([]).$type<ResearchFinding[]>(),
    agentLog: json("agent_log").notNull().default([]).$type<AgentLogEntry[]>(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("research_task_tenant_idx").on(t.tenantId),
    index("research_task_status_idx").on(t.tenantId, t.status),
    index("research_task_type_idx").on(t.tenantId, t.taskType),
    index("research_task_state_idx").on(t.tenantId, t.targetState),
    index("research_task_user_idx").on(t.userId),
  ],
);

export const ResearchAgentConfigSchema = pgTable(
  "research_agent_config",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    agentType: varchar("agent_type", {
      enum: [
        "company-deep-dive",
        "facility-compliance",
        "state-permit-scan",
        "enforcement-scan",
        "emissions-analysis",
        "competitor-analysis",
        "market-opportunity",
        "regulatory-change-scan",
        "contact-discovery",
        "prospect-qualification",
      ],
    })
      .notNull()
      .$type<ResearchTaskType>(),
    name: varchar("name", { length: 200 }).notNull(),
    systemPrompt: text("system_prompt").notNull(),
    targetStates: json("target_states").notNull().default([]).$type<string[]>(),
    targetIndustries: json("target_industries")
      .notNull()
      .default([])
      .$type<string[]>(),
    enabledSources: json("enabled_sources")
      .notNull()
      .default([])
      .$type<string[]>(),
    searchKeywords: json("search_keywords")
      .notNull()
      .default([])
      .$type<string[]>(),
    filters: json("filters")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    schedule: text("schedule"),
    enabled: boolean("enabled").notNull().default(true),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("research_agent_tenant_idx").on(t.tenantId),
    index("research_agent_type_idx").on(t.tenantId, t.agentType),
  ],
);

// ============================================================================
// SALES INTELLIGENCE TABLES
// ============================================================================

// --- Sales Brief Generator ---

export const SalesBriefSchema = pgTable(
  "sales_brief",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    prospectId: uuid("prospect_id").references(() => ProspectSchema.id, {
      onDelete: "set null",
    }),
    leadId: uuid("lead_id").references(() => LeadSchema.id, {
      onDelete: "set null",
    }),
    companyId: uuid("company_id").references(() => CompanyProfileSchema.id, {
      onDelete: "set null",
    }),
    briefType: varchar("brief_type", {
      enum: [
        "prospect-overview",
        "pre-meeting",
        "quarterly-review",
        "competitive-analysis",
        "expansion-opportunity",
      ],
    })
      .notNull()
      .$type<BriefType>(),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content").notNull().default(""),
    sections: json("sections").notNull().default([]).$type<BriefSection[]>(),
    status: varchar("status", {
      enum: ["pending", "generating", "completed", "failed"],
    })
      .notNull()
      .default("pending")
      .$type<BriefStatus>(),
    generatedBy: uuid("generated_by").references(() => UserTable.id, {
      onDelete: "set null",
    }),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("sales_brief_tenant_idx").on(t.tenantId),
    index("sales_brief_prospect_idx").on(t.prospectId),
    index("sales_brief_lead_idx").on(t.leadId),
    index("sales_brief_status_idx").on(t.tenantId, t.status),
  ],
);

// --- Alert System ---

export const AlertSchema = pgTable(
  "alert",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    prospectId: uuid("prospect_id").references(() => ProspectSchema.id, {
      onDelete: "set null",
    }),
    leadId: uuid("lead_id").references(() => LeadSchema.id, {
      onDelete: "set null",
    }),
    category: varchar("category", {
      enum: [
        "regulatory-change",
        "compliance-violation",
        "permit-expiry",
        "competitor-activity",
        "buying-signal",
        "contact-change",
        "market-shift",
        "expansion-signal",
      ],
    })
      .notNull()
      .$type<AlertCategory>(),
    severity: varchar("severity", {
      enum: ["info", "low", "medium", "high", "critical"],
    })
      .notNull()
      .$type<AlertSeverity>(),
    status: varchar("status", {
      enum: ["active", "acknowledged", "dismissed", "resolved"],
    })
      .notNull()
      .default("active")
      .$type<AlertStatus>(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").notNull(),
    sourceUrl: text("source_url"),
    sourceType: varchar("source_type", { length: 100 }),
    actionItems: json("action_items").notNull().default([]).$type<string[]>(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    acknowledgedBy: uuid("acknowledged_by").references(() => UserTable.id, {
      onDelete: "set null",
    }),
    acknowledgedAt: timestamp("acknowledged_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("alert_tenant_idx").on(t.tenantId),
    index("alert_category_idx").on(t.tenantId, t.category),
    index("alert_severity_idx").on(t.tenantId, t.severity),
    index("alert_status_idx").on(t.tenantId, t.status),
    index("alert_prospect_idx").on(t.prospectId),
    index("alert_created_idx").on(t.createdAt),
  ],
);

export const AlertRuleSchema = pgTable(
  "alert_rule",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    category: varchar("category", {
      enum: [
        "regulatory-change",
        "compliance-violation",
        "permit-expiry",
        "competitor-activity",
        "buying-signal",
        "contact-change",
        "market-shift",
        "expansion-signal",
      ],
    })
      .notNull()
      .$type<AlertCategory>(),
    conditions: json("conditions")
      .notNull()
      .default([])
      .$type<AlertRuleConfig[]>(),
    severity: varchar("severity", {
      enum: ["info", "low", "medium", "high", "critical"],
    })
      .notNull()
      .default("medium")
      .$type<AlertSeverity>(),
    notifyChannels: json("notify_channels")
      .notNull()
      .default([])
      .$type<string[]>(),
    enabled: boolean("enabled").notNull().default(true),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("alert_rule_tenant_idx").on(t.tenantId),
    index("alert_rule_category_idx").on(t.tenantId, t.category),
  ],
);

// --- Autonomous Research Workflows ---

export const ResearchWorkflowSchema = pgTable(
  "research_workflow",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 300 }).notNull(),
    description: text("description"),
    steps: json("steps").notNull().default([]).$type<WorkflowStepConfig[]>(),
    schedule: text("schedule"),
    enabled: boolean("enabled").notNull().default(true),
    lastRunId: uuid("last_run_id"),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("research_wf_tenant_idx").on(t.tenantId)],
);

export const WorkflowRunSchema = pgTable(
  "workflow_run",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => ResearchWorkflowSchema.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    status: varchar("status", {
      enum: ["pending", "running", "paused", "completed", "failed", "canceled"],
    })
      .notNull()
      .default("pending")
      .$type<WorkflowRunStatus>(),
    currentStep: integer("current_step").notNull().default(0),
    stepResults: json("step_results")
      .notNull()
      .default([])
      .$type<WorkflowStepResult[]>(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    errorMessage: text("error_message"),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("wf_run_workflow_idx").on(t.workflowId),
    index("wf_run_tenant_idx").on(t.tenantId),
    index("wf_run_status_idx").on(t.tenantId, t.status),
  ],
);

// --- Relationship Mapping & Buying Committee ---

export const RelationshipMapSchema = pgTable(
  "relationship_map",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    prospectId: uuid("prospect_id").references(() => ProspectSchema.id, {
      onDelete: "set null",
    }),
    leadId: uuid("lead_id").references(() => LeadSchema.id, {
      onDelete: "set null",
    }),
    companyName: varchar("company_name", { length: 500 }).notNull(),
    contacts: json("contacts")
      .notNull()
      .default([])
      .$type<BuyingCommitteeMember[]>(),
    relationships: json("relationships")
      .notNull()
      .default([])
      .$type<Relationship[]>(),
    dealStrategy: text("deal_strategy"),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("rel_map_tenant_idx").on(t.tenantId),
    index("rel_map_prospect_idx").on(t.prospectId),
    index("rel_map_lead_idx").on(t.leadId),
  ],
);

// --- Vertical Sales Playbooks & Battle Cards ---

export const SalesPlaybookSchema = pgTable(
  "sales_playbook",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    industryId: uuid("industry_id").references(() => IndustrySchema.id, {
      onDelete: "set null",
    }),
    type: varchar("type", {
      enum: [
        "industry-playbook",
        "competitor-battle-card",
        "objection-handler",
        "roi-calculator",
        "discovery-guide",
        "demo-script",
      ],
    })
      .notNull()
      .$type<PlaybookType>(),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content").notNull().default(""),
    sections: json("sections").notNull().default([]).$type<PlaybookSection[]>(),
    targetPersona: varchar("target_persona", { length: 200 }),
    status: varchar("status", {
      enum: ["draft", "published", "archived"],
    })
      .notNull()
      .default("draft")
      .$type<PlaybookStatus>(),
    version: integer("version").notNull().default(1),
    tags: json("tags").notNull().default([]).$type<string[]>(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("playbook_tenant_idx").on(t.tenantId),
    index("playbook_industry_idx").on(t.industryId),
    index("playbook_type_idx").on(t.tenantId, t.type),
    index("playbook_status_idx").on(t.tenantId, t.status),
  ],
);

// --- Buying Signal Detection & Deal Timing ---

export const BuyingSignalSchema = pgTable(
  "buying_signal",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => ProspectSchema.id, { onDelete: "cascade" }),
    signalType: varchar("signal_type", {
      enum: [
        "high-intent",
        "expansion-ready",
        "compliance-urgency",
        "competitive-displacement",
        "budget-cycle",
        "leadership-transition",
        "growth-trajectory",
      ],
    })
      .notNull()
      .$type<CompositeSignalType>(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").notNull(),
    compositeScore: integer("composite_score").notNull().default(50),
    componentSignals: json("component_signals")
      .notNull()
      .default([])
      .$type<ComponentSignal[]>(),
    recommendedAction: text("recommended_action").notNull(),
    optimalTiming: text("optimal_timing"),
    expiresAt: timestamp("expires_at"),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    detectedAt: timestamp("detected_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("buying_signal_tenant_idx").on(t.tenantId),
    index("buying_signal_prospect_idx").on(t.prospectId),
    index("buying_signal_type_idx").on(t.tenantId, t.signalType),
    index("buying_signal_score_idx").on(t.tenantId, t.compositeScore),
    index("buying_signal_detected_idx").on(t.detectedAt),
  ],
);

// --- Compliance Burden Calculator ---

export const ComplianceBurdenSchema = pgTable(
  "compliance_burden",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => ProspectSchema.id, { onDelete: "cascade" }),
    facilityCount: integer("facility_count").notNull().default(1),
    regulatoryPrograms: json("regulatory_programs")
      .notNull()
      .default([])
      .$type<string[]>(),
    estimatedAnnualCost: numeric("estimated_annual_cost").notNull(),
    costBreakdown: json("cost_breakdown")
      .notNull()
      .default([])
      .$type<CostCategory[]>(),
    riskLevel: varchar("risk_level", {
      enum: ["low", "medium", "high", "critical"],
    })
      .notNull()
      .default("medium"),
    savingsOpportunity: numeric("savings_opportunity").notNull().default("0"),
    roiProjection: json("roi_projection")
      .notNull()
      .default({})
      .$type<ROIProjection>(),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    calculatedAt: timestamp("calculated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("compliance_burden_tenant_idx").on(t.tenantId),
    index("compliance_burden_prospect_idx").on(t.prospectId),
    index("compliance_burden_risk_idx").on(t.tenantId, t.riskLevel),
  ],
);

// --- Outreach Sequence Generator ---

export const OutreachSequenceSchema = pgTable(
  "outreach_sequence",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    prospectId: uuid("prospect_id").references(() => ProspectSchema.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => ContactRecordSchema.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 300 }).notNull(),
    description: text("description"),
    steps: json("steps").notNull().default([]).$type<OutreachStep[]>(),
    status: varchar("status", {
      enum: ["draft", "active", "paused", "completed", "archived"],
    })
      .notNull()
      .default("draft")
      .$type<SequenceStatus>(),
    personalizationContext: json("personalization_context")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("outreach_seq_tenant_idx").on(t.tenantId),
    index("outreach_seq_prospect_idx").on(t.prospectId),
    index("outreach_seq_contact_idx").on(t.contactId),
    index("outreach_seq_status_idx").on(t.tenantId, t.status),
  ],
);

// --- Customer Health & Expansion Scoring ---

export const CustomerHealthSchema = pgTable(
  "customer_health",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => LeadSchema.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => CompanyProfileSchema.id, {
      onDelete: "set null",
    }),
    healthScore: integer("health_score").notNull().default(50),
    healthStatus: varchar("health_status", {
      enum: ["healthy", "at-risk", "churning", "expanding"],
    })
      .notNull()
      .default("healthy")
      .$type<HealthStatus>(),
    engagementScore: integer("engagement_score").notNull().default(50),
    adoptionScore: integer("adoption_score").notNull().default(50),
    sentimentScore: integer("sentiment_score").notNull().default(50),
    expansionProbability: numeric("expansion_probability")
      .notNull()
      .default("0"),
    churnRisk: numeric("churn_risk").notNull().default("0"),
    factors: json("factors").notNull().default([]).$type<HealthFactor[]>(),
    expansionOpportunities: json("expansion_opportunities")
      .notNull()
      .default([])
      .$type<ExpansionOpportunity[]>(),
    lastAssessedAt: timestamp("last_assessed_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("customer_health_tenant_idx").on(t.tenantId),
    index("customer_health_lead_idx").on(t.leadId),
    index("customer_health_status_idx").on(t.tenantId, t.healthStatus),
    index("customer_health_score_idx").on(t.tenantId, t.healthScore),
  ],
);

// --- Win/Loss Analysis Engine ---

export const DealAnalysisSchema = pgTable(
  "deal_analysis",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => TenantSchema.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => LeadSchema.id, { onDelete: "cascade" }),
    prospectId: uuid("prospect_id").references(() => ProspectSchema.id, {
      onDelete: "set null",
    }),
    outcome: varchar("outcome", {
      enum: ["won", "lost", "no-decision", "disqualified"],
    })
      .notNull()
      .$type<DealOutcome>(),
    dealValue: numeric("deal_value").notNull().default("0"),
    salesCycleLength: integer("sales_cycle_length").notNull().default(0),
    competitorInvolved: varchar("competitor_involved", { length: 300 }),
    winLossReasons: json("win_loss_reasons")
      .notNull()
      .default([])
      .$type<string[]>(),
    stageProgression: json("stage_progression")
      .notNull()
      .default([])
      .$type<StageRecord[]>(),
    keyFactors: json("key_factors").notNull().default([]).$type<DealFactor[]>(),
    lessonsLearned: json("lessons_learned")
      .notNull()
      .default([])
      .$type<string[]>(),
    recommendations: json("recommendations")
      .notNull()
      .default([])
      .$type<string[]>(),
    analyzedBy: uuid("analyzed_by").references(() => UserTable.id, {
      onDelete: "set null",
    }),
    metadata: json("metadata")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    analyzedAt: timestamp("analyzed_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("deal_analysis_tenant_idx").on(t.tenantId),
    index("deal_analysis_lead_idx").on(t.leadId),
    index("deal_analysis_outcome_idx").on(t.tenantId, t.outcome),
    index("deal_analysis_date_idx").on(t.analyzedAt),
  ],
);

// Platform entity types
export type TenantEntity = typeof TenantSchema.$inferSelect;
export type ConnectorEntity = typeof ConnectorSchema.$inferSelect;
export type ConnectorSyncLogEntity = typeof ConnectorSyncLogSchema.$inferSelect;
export type PipelineEntity = typeof PipelineSchema.$inferSelect;
export type PipelineRunEntity = typeof PipelineRunSchema.$inferSelect;
export type ConfigurableAgentEntity =
  typeof ConfigurableAgentSchema.$inferSelect;
export type LeadEntity = typeof LeadSchema.$inferSelect;
export type ActivityLogEntity = typeof ActivityLogSchema.$inferSelect;
export type UsageRecordEntity = typeof UsageRecordSchema.$inferSelect;
export type MetricEntity = typeof MetricSchema.$inferSelect;
export type ROISnapshotEntity = typeof ROISnapshotSchema.$inferSelect;
export type BillingSubscriptionEntity =
  typeof BillingSubscriptionSchema.$inferSelect;

// RBAC entity types
export type PermissionEntity = typeof PermissionSchema.$inferSelect;
export type RoleEntity = typeof RoleSchema.$inferSelect;
export type RolePermissionEntity = typeof RolePermissionSchema.$inferSelect;
export type UserRoleEntity = typeof UserRoleSchema.$inferSelect;
export type TrialEntity = typeof TrialSchema.$inferSelect;
export type TokenUsageEntity = typeof TokenUsageSchema.$inferSelect;
export type ApiKeyEntity = typeof ApiKeySchema.$inferSelect;

// Knowledge entity types
export type KnowledgeCategoryEntity =
  typeof KnowledgeCategorySchema.$inferSelect;
export type KnowledgeDocumentEntity =
  typeof KnowledgeDocumentSchema.$inferSelect;
export type DocumentChunkEntity = typeof DocumentChunkSchema.$inferSelect;

// Company Intelligence entity types
export type CompanyProfileEntity = typeof CompanyProfileSchema.$inferSelect;
export type ProductEntity = typeof ProductSchema.$inferSelect;
export type ValueChainEntity = typeof ValueChainSchema.$inferSelect;
export type SalesMethodologyEntity = typeof SalesMethodologySchema.$inferSelect;

// Industry entity types
export type IndustryEntity = typeof IndustrySchema.$inferSelect;
export type IndustryDocumentEntity = typeof IndustryDocumentSchema.$inferSelect;

// Prospecting entity types
export type ProspectEntity = typeof ProspectSchema.$inferSelect;
export type ProspectSourceEntity = typeof ProspectSourceSchema.$inferSelect;
export type FilingRecordEntity = typeof FilingRecordSchema.$inferSelect;
export type ProspectSignalEntity = typeof ProspectSignalSchema.$inferSelect;

// Contact Intelligence entity types
export type ContactRecordEntity = typeof ContactRecordSchema.$inferSelect;
export type ContactEnrichmentEntity =
  typeof ContactEnrichmentSchema.$inferSelect;
export type ContactActivityEntity = typeof ContactActivitySchema.$inferSelect;

// State Research entity types
export type StateSourceEntity = typeof StateSourceSchema.$inferSelect;
export type ResearchTaskEntity = typeof ResearchTaskSchema.$inferSelect;
export type ResearchAgentConfigEntity =
  typeof ResearchAgentConfigSchema.$inferSelect;

// Sales Intelligence entity types
export type SalesBriefEntity = typeof SalesBriefSchema.$inferSelect;
export type AlertEntity = typeof AlertSchema.$inferSelect;
export type AlertRuleEntity = typeof AlertRuleSchema.$inferSelect;
export type ResearchWorkflowEntity = typeof ResearchWorkflowSchema.$inferSelect;
export type WorkflowRunEntity = typeof WorkflowRunSchema.$inferSelect;
export type RelationshipMapEntity = typeof RelationshipMapSchema.$inferSelect;
export type SalesPlaybookEntity = typeof SalesPlaybookSchema.$inferSelect;
export type BuyingSignalEntity = typeof BuyingSignalSchema.$inferSelect;
export type ComplianceBurdenEntity = typeof ComplianceBurdenSchema.$inferSelect;
export type OutreachSequenceEntity = typeof OutreachSequenceSchema.$inferSelect;
export type CustomerHealthEntity = typeof CustomerHealthSchema.$inferSelect;
export type DealAnalysisEntity = typeof DealAnalysisSchema.$inferSelect;

// Issue Reports
export const IssueReportSchema = pgTable(
  "issue_report",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id").references(() => UserTable.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: varchar("category", {
      enum: ["bug", "feature", "question", "other"],
    })
      .notNull()
      .default("bug"),
    status: varchar("status", {
      enum: ["new", "reviewing", "resolved"],
    })
      .notNull()
      .default("new"),
    userEmail: text("user_email"),
    userName: text("user_name"),
    pageUrl: text("page_url"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("issue_report_user_id_idx").on(t.userId),
    index("issue_report_status_idx").on(t.status),
  ],
);

export type IssueReportEntity = typeof IssueReportSchema.$inferSelect;
