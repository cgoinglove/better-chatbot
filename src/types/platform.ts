import z from "zod";

// ============================================================================
// TENANT
// ============================================================================

export const DeploymentModeSchema = z.enum(["single-tenant", "multi-tenant"]);
export type DeploymentMode = z.infer<typeof DeploymentModeSchema>;

export const TenantCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  deploymentMode: DeploymentModeSchema.default("single-tenant"),
  enabledVerticals: z.array(z.string()).default([]),
  settings: z.record(z.string(), z.unknown()).default({}),
});

export const TenantUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  enabledVerticals: z.array(z.string()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  deploymentMode: DeploymentMode;
  enabledVerticals: string[];
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// CONNECTORS
// ============================================================================

export const ConnectorTypeSchema = z.enum([
  "salesforce",
  "hubspot",
  "csv-import",
  "api-generic",
  "edi-837",
  "edi-835",
]);
export type ConnectorType = z.infer<typeof ConnectorTypeSchema>;

export const ConnectorStatusSchema = z.enum([
  "disconnected",
  "connected",
  "syncing",
  "error",
]);
export type ConnectorStatus = z.infer<typeof ConnectorStatusSchema>;

export const ConnectorCreateSchema = z.object({
  tenantId: z.string().uuid(),
  type: ConnectorTypeSchema,
  name: z.string().min(1).max(200),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const ConnectorUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  status: ConnectorStatusSchema.optional(),
});

export type Connector = {
  id: string;
  tenantId: string;
  type: ConnectorType;
  name: string;
  config: Record<string, unknown>;
  status: ConnectorStatus;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ConnectorSyncLog = {
  id: string;
  connectorId: string;
  status: "running" | "completed" | "failed";
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
};

// ============================================================================
// PIPELINES
// ============================================================================

export const PipelineCreateSchema = z.object({
  tenantId: z.string().uuid(),
  connectorId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  schedule: z.string().optional(),
  transformConfig: z.record(z.string(), z.unknown()).default({}),
});

export type Pipeline = {
  id: string;
  tenantId: string;
  connectorId: string | null;
  name: string;
  schedule: string | null;
  transformConfig: Record<string, unknown>;
  status: "idle" | "running" | "completed" | "failed";
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PipelineRun = {
  id: string;
  pipelineId: string;
  status: "running" | "completed" | "failed";
  recordsProcessed: number;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
};

// ============================================================================
// CONFIGURABLE AGENTS (Agentic System)
// ============================================================================

export const AgentToolConfigSchema = z.object({
  name: z.string(),
  type: z.enum(["mcp-tool", "app-tool", "connector-tool", "workflow-tool"]),
  serverId: z.string().optional(),
  workflowId: z.string().optional(),
  config: z.record(z.string(), z.unknown()).default({}),
});
export type AgentToolConfig = z.infer<typeof AgentToolConfigSchema>;

export const GuardrailSchema = z.object({
  type: z.enum(["input-filter", "output-filter", "topic-restriction", "pii-filter"]),
  config: z.record(z.string(), z.unknown()).default({}),
  enabled: z.boolean().default(true),
});
export type Guardrail = z.infer<typeof GuardrailSchema>;

export const ConfigurableAgentCreateSchema = z.object({
  tenantId: z.string().uuid(),
  vertical: z.string().min(1).max(100),
  agentType: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(8000).optional(),
  systemPrompt: z.string(),
  tools: z.array(AgentToolConfigSchema).default([]),
  guardrails: z.array(GuardrailSchema).default([]),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).optional(),
  config: z.record(z.string(), z.unknown()).default({}),
  enabled: z.boolean().default(true),
});

export const ConfigurableAgentUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(8000).optional(),
  systemPrompt: z.string().optional(),
  tools: z.array(AgentToolConfigSchema).optional(),
  guardrails: z.array(GuardrailSchema).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export type ConfigurableAgent = {
  id: string;
  tenantId: string;
  vertical: string;
  agentType: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  tools: AgentToolConfig[];
  guardrails: Guardrail[];
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// VERTICALS
// ============================================================================

export type VerticalAgentDefaults = {
  agentType: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: AgentToolConfig[];
  guardrails?: Guardrail[];
  model?: string;
  temperature?: number;
  config?: Record<string, unknown>;
};

export type VerticalMetricDefinition = {
  key: string;
  name: string;
  description: string;
  unit: string;
  aggregation: "sum" | "avg" | "count" | "max" | "min" | "latest";
};

export type VerticalDefinition = {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultAgents: VerticalAgentDefaults[];
  metrics: VerticalMetricDefinition[];
  connectorTypes: ConnectorType[];
  dashboardConfig: Record<string, unknown>;
};

// ============================================================================
// LEADS (Sales Hunter)
// ============================================================================

export const LeadStatusSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
  "disqualified",
]);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

export const LeadSourceSchema = z.enum([
  "salesforce",
  "hubspot",
  "manual",
  "csv-import",
  "ai-prospected",
  "web-form",
  "referral",
]);
export type LeadSource = z.infer<typeof LeadSourceSchema>;

export const LeadCreateSchema = z.object({
  tenantId: z.string().uuid(),
  externalId: z.string().optional(),
  source: LeadSourceSchema,
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  email: z.string().email().optional(),
  company: z.string().max(500).optional(),
  title: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  status: LeadStatusSchema.default("new"),
  score: z.number().min(0).max(100).optional(),
  estimatedValue: z.number().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
  assignedTo: z.string().uuid().optional(),
});

export const LeadUpdateSchema = z.object({
  firstName: z.string().min(1).max(200).optional(),
  lastName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  company: z.string().max(500).optional(),
  title: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  status: LeadStatusSchema.optional(),
  score: z.number().min(0).max(100).optional(),
  estimatedValue: z.number().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  assignedTo: z.string().uuid().optional(),
});

export type Lead = {
  id: string;
  tenantId: string;
  externalId: string | null;
  source: LeadSource;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  title: string | null;
  phone: string | null;
  status: LeadStatus;
  score: number | null;
  estimatedValue: number | null;
  data: Record<string, unknown>;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// ANALYTICS & METRICS
// ============================================================================

export type MetricRecord = {
  id: string;
  tenantId: string;
  vertical: string;
  metricKey: string;
  metricValue: number;
  metadata: Record<string, unknown>;
  recordedAt: Date;
};

export type ROISnapshot = {
  id: string;
  tenantId: string;
  vertical: string;
  periodStart: Date;
  periodEnd: Date;
  metrics: Record<string, number>;
  calculatedRoi: number | null;
  createdAt: Date;
};

// ============================================================================
// ACTIVITY & AUDIT
// ============================================================================

export const ActivityActionSchema = z.enum([
  "user.login",
  "user.logout",
  "agent.chat",
  "agent.create",
  "agent.update",
  "agent.delete",
  "connector.sync",
  "connector.create",
  "connector.update",
  "lead.create",
  "lead.update",
  "lead.score",
  "workflow.execute",
  "pipeline.run",
  "admin.user.update",
  "admin.tenant.update",
  "billing.subscription.create",
  "billing.subscription.update",
  "billing.payment.success",
  "billing.payment.failed",
]);
export type ActivityAction = z.infer<typeof ActivityActionSchema>;

export type ActivityLog = {
  id: string;
  tenantId: string;
  userId: string | null;
  action: ActivityAction;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: Date;
};

// ============================================================================
// USAGE TRACKING
// ============================================================================

export const UsageResourceTypeSchema = z.enum([
  "ai-tokens",
  "ai-requests",
  "connector-sync",
  "storage-bytes",
  "workflow-execution",
  "api-call",
]);
export type UsageResourceType = z.infer<typeof UsageResourceTypeSchema>;

export type UsageRecord = {
  id: string;
  tenantId: string;
  userId: string | null;
  resourceType: UsageResourceType;
  quantity: number;
  metadata: Record<string, unknown>;
  recordedAt: Date;
};

// ============================================================================
// BILLING (Clerk)
// ============================================================================

export const BillingPlanSchema = z.enum(["starter", "professional", "enterprise"]);
export type BillingPlan = z.infer<typeof BillingPlanSchema>;

export const SubscriptionStatusSchema = z.enum([
  "active",
  "past_due",
  "canceled",
  "trialing",
  "incomplete",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export type BillingSubscription = {
  id: string;
  tenantId: string;
  clerkSubscriptionId: string;
  plan: BillingPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PlanLimits = {
  maxUsers: number;
  maxConnectors: number;
  maxAgents: number;
  maxAiRequestsPerMonth: number;
  maxStorageBytes: number;
  enabledVerticals: string[] | "all";
  airgapEnabled: boolean;
  customAgents: boolean;
  prioritySupport: boolean;
};

export const PLAN_LIMITS: Record<BillingPlan, PlanLimits> = {
  starter: {
    maxUsers: 5,
    maxConnectors: 2,
    maxAgents: 10,
    maxAiRequestsPerMonth: 10000,
    maxStorageBytes: 5 * 1024 * 1024 * 1024, // 5GB
    enabledVerticals: ["sales-hunter"],
    airgapEnabled: false,
    customAgents: false,
    prioritySupport: false,
  },
  professional: {
    maxUsers: 25,
    maxConnectors: 10,
    maxAgents: 50,
    maxAiRequestsPerMonth: 100000,
    maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50GB
    enabledVerticals: ["sales-hunter"],
    airgapEnabled: false,
    customAgents: true,
    prioritySupport: true,
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxConnectors: -1,
    maxAgents: -1,
    maxAiRequestsPerMonth: -1,
    maxStorageBytes: -1,
    enabledVerticals: "all",
    airgapEnabled: true,
    customAgents: true,
    prioritySupport: true,
  },
};

// ============================================================================
// REPOSITORIES
// ============================================================================

export type PlatformRepository = {
  // Tenants
  insertTenant(tenant: z.infer<typeof TenantCreateSchema>): Promise<Tenant>;
  selectTenantById(id: string): Promise<Tenant | null>;
  selectTenantBySlug(slug: string): Promise<Tenant | null>;
  selectAllTenants(): Promise<Tenant[]>;
  updateTenant(id: string, data: z.infer<typeof TenantUpdateSchema>): Promise<Tenant>;

  // Connectors
  insertConnector(connector: z.infer<typeof ConnectorCreateSchema>): Promise<Connector>;
  selectConnectorsByTenantId(tenantId: string): Promise<Connector[]>;
  selectConnectorById(id: string, tenantId: string): Promise<Connector | null>;
  updateConnector(id: string, tenantId: string, data: z.infer<typeof ConnectorUpdateSchema>): Promise<Connector>;
  deleteConnector(id: string, tenantId: string): Promise<void>;
  insertSyncLog(log: Omit<ConnectorSyncLog, "id">): Promise<ConnectorSyncLog>;
  selectSyncLogsByConnectorId(connectorId: string, limit?: number): Promise<ConnectorSyncLog[]>;

  // Configurable Agents
  insertConfigurableAgent(agent: z.infer<typeof ConfigurableAgentCreateSchema>): Promise<ConfigurableAgent>;
  selectConfigurableAgentsByTenantId(tenantId: string, vertical?: string): Promise<ConfigurableAgent[]>;
  selectConfigurableAgentById(id: string, tenantId: string): Promise<ConfigurableAgent | null>;
  updateConfigurableAgent(id: string, tenantId: string, data: z.infer<typeof ConfigurableAgentUpdateSchema>): Promise<ConfigurableAgent>;
  deleteConfigurableAgent(id: string, tenantId: string): Promise<void>;

  // Activity Log
  insertActivityLog(log: Omit<ActivityLog, "id" | "createdAt">): Promise<ActivityLog>;
  selectActivityLogs(tenantId: string, options?: {
    userId?: string;
    action?: ActivityAction;
    limit?: number;
    offset?: number;
  }): Promise<ActivityLog[]>;
  countActivityLogs(tenantId: string, options?: {
    userId?: string;
    action?: ActivityAction;
  }): Promise<number>;

  // Usage
  insertUsageRecord(record: Omit<UsageRecord, "id" | "recordedAt">): Promise<UsageRecord>;
  selectUsageSummary(tenantId: string, periodStart: Date, periodEnd: Date): Promise<{
    resourceType: UsageResourceType;
    totalQuantity: number;
  }[]>;

  // Metrics
  insertMetric(metric: Omit<MetricRecord, "id">): Promise<MetricRecord>;
  selectMetrics(tenantId: string, vertical: string, metricKey: string, periodStart: Date, periodEnd: Date): Promise<MetricRecord[]>;

  // ROI Snapshots
  insertROISnapshot(snapshot: Omit<ROISnapshot, "id" | "createdAt">): Promise<ROISnapshot>;
  selectROISnapshots(tenantId: string, vertical: string, limit?: number): Promise<ROISnapshot[]>;
};

export type SalesHunterRepository = {
  insertLead(lead: z.infer<typeof LeadCreateSchema>): Promise<Lead>;
  selectLeadsByTenantId(tenantId: string, options?: {
    status?: LeadStatus;
    source?: LeadSource;
    assignedTo?: string;
    minScore?: number;
    limit?: number;
    offset?: number;
  }): Promise<Lead[]>;
  selectLeadById(id: string, tenantId: string): Promise<Lead | null>;
  updateLead(id: string, tenantId: string, data: z.infer<typeof LeadUpdateSchema>): Promise<Lead>;
  deleteLead(id: string, tenantId: string): Promise<void>;
  countLeadsByStatus(tenantId: string): Promise<Record<LeadStatus, number>>;
  selectLeadsByExternalIds(tenantId: string, externalIds: string[]): Promise<Lead[]>;
  calculatePipelineValue(tenantId: string): Promise<{
    totalValue: number;
    byStatus: Record<LeadStatus, number>;
  }>;
};

export type BillingRepository = {
  insertSubscription(sub: Omit<BillingSubscription, "id" | "createdAt" | "updatedAt">): Promise<BillingSubscription>;
  selectSubscriptionByTenantId(tenantId: string): Promise<BillingSubscription | null>;
  selectSubscriptionByClerkId(clerkId: string): Promise<BillingSubscription | null>;
  updateSubscription(id: string, data: Partial<Pick<BillingSubscription, "plan" | "status" | "currentPeriodStart" | "currentPeriodEnd" | "canceledAt">>): Promise<BillingSubscription>;
  selectAllSubscriptions(): Promise<(BillingSubscription & { tenantName: string })[]>;
};
