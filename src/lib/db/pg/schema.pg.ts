import { ChatMessage } from "app-types/chat";
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
} from "drizzle-orm/pg-core";
import { isNotNull } from "drizzle-orm";
import { DBWorkflow, DBEdge, DBNode } from "app-types/workflow";

export const ChatThreadSchema = pgTable("chat_thread", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ChatMessageSchema = pgTable("chat_message", {
  id: text("id").primaryKey().notNull(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => ChatThreadSchema.id),
  role: text("role").notNull().$type<ChatMessage["role"]>(),
  parts: json("parts").notNull().array(),
  attachments: json("attachments").array(),
  annotations: json("annotations").array(),
  model: text("model"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const AgentSchema = pgTable("agent", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  icon: json("icon").$type<Agent["icon"]>(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id),
  instructions: json("instructions").$type<Agent["instructions"]>(),
  visibility: varchar("visibility", {
    enum: ["public", "private", "readonly"],
  })
    .notNull()
    .default("private"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const BookmarkSchema = pgTable(
  "bookmark",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull(),
    itemType: varchar("item_type", {
      enum: ["agent", "workflow"],
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

export const McpServerSchema = pgTable("mcp_server", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  config: json("config").notNull().$type<MCPServerConfig>(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const UserSchema = pgTable("user", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  password: text("password"),
  image: text("image"),
  preferences: json("preferences").default({}).$type<UserPreferences>(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const SessionSchema = pgTable("session", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
});

export const AccountSchema = pgTable("account", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const VerificationSchema = pgTable("verification", {
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
export const McpToolCustomizationSchema = pgTable(
  "mcp_server_tool_custom_instructions",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => McpServerSchema.id, { onDelete: "cascade" }),
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

export const McpServerCustomizationSchema = pgTable(
  "mcp_server_custom_instructions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => McpServerSchema.id, { onDelete: "cascade" }),
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

export const WorkflowSchema = pgTable("workflow", {
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
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const WorkflowNodeDataSchema = pgTable(
  "workflow_node",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    version: text("version").notNull().default("0.1.0"),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => WorkflowSchema.id, { onDelete: "cascade" }),
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

export const WorkflowEdgeSchema = pgTable("workflow_edge", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  version: text("version").notNull().default("0.1.0"),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => WorkflowSchema.id, { onDelete: "cascade" }),
  source: uuid("source")
    .notNull()
    .references(() => WorkflowNodeDataSchema.id, { onDelete: "cascade" }),
  target: uuid("target")
    .notNull()
    .references(() => WorkflowNodeDataSchema.id, { onDelete: "cascade" }),
  uiConfig: json("ui_config").$type<DBEdge["uiConfig"]>().default({}),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ArchiveSchema = pgTable("archive", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ArchiveItemSchema = pgTable(
  "archive_item",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    archiveId: uuid("archive_id")
      .notNull()
      .references(() => ArchiveSchema.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("archive_item_item_id_idx").on(t.itemId)],
);

export const McpOAuthSessionSchema = pgTable(
  "mcp_oauth_session",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => McpServerSchema.id, { onDelete: "cascade" }),
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

export type McpServerEntity = typeof McpServerSchema.$inferSelect;
export type ChatThreadEntity = typeof ChatThreadSchema.$inferSelect;
export type ChatMessageEntity = typeof ChatMessageSchema.$inferSelect;

export type AgentEntity = typeof AgentSchema.$inferSelect;
export type UserEntity = typeof UserSchema.$inferSelect;
export type ToolCustomizationEntity =
  typeof McpToolCustomizationSchema.$inferSelect;
export type McpServerCustomizationEntity =
  typeof McpServerCustomizationSchema.$inferSelect;

export type ArchiveEntity = typeof ArchiveSchema.$inferSelect;
export type ArchiveItemEntity = typeof ArchiveItemSchema.$inferSelect;
export type BookmarkEntity = typeof BookmarkSchema.$inferSelect;

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
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
    startedAt: timestamp("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
    startedAt: timestamp("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("configurable_agent_tenant_idx").on(t.tenantId),
    index("configurable_agent_vertical_idx").on(t.vertical),
    index("configurable_agent_type_idx").on(t.tenantId, t.vertical, t.agentType),
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
    data: json("data")
      .notNull()
      .default({})
      .$type<Record<string, unknown>>(),
    assignedTo: uuid("assigned_to").references(() => UserSchema.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
    userId: uuid("user_id").references(() => UserSchema.id, {
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
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
    userId: uuid("user_id").references(() => UserSchema.id, {
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
    recordedAt: timestamp("recorded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
    recordedAt: timestamp("recorded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("roi_snapshot_tenant_vertical_idx").on(t.tenantId, t.vertical),
  ],
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
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("billing_sub_tenant_idx").on(t.tenantId),
    index("billing_sub_clerk_idx").on(t.clerkSubscriptionId),
  ],
);

// Platform entity types
export type TenantEntity = typeof TenantSchema.$inferSelect;
export type ConnectorEntity = typeof ConnectorSchema.$inferSelect;
export type ConnectorSyncLogEntity = typeof ConnectorSyncLogSchema.$inferSelect;
export type PipelineEntity = typeof PipelineSchema.$inferSelect;
export type PipelineRunEntity = typeof PipelineRunSchema.$inferSelect;
export type ConfigurableAgentEntity = typeof ConfigurableAgentSchema.$inferSelect;
export type LeadEntity = typeof LeadSchema.$inferSelect;
export type ActivityLogEntity = typeof ActivityLogSchema.$inferSelect;
export type UsageRecordEntity = typeof UsageRecordSchema.$inferSelect;
export type MetricEntity = typeof MetricSchema.$inferSelect;
export type ROISnapshotEntity = typeof ROISnapshotSchema.$inferSelect;
export type BillingSubscriptionEntity = typeof BillingSubscriptionSchema.$inferSelect;
