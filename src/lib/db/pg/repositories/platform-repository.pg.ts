import type { PlatformRepository, UsageResourceType } from "app-types/platform";
import { pgDb as db } from "../db.pg";
import {
  TenantSchema,
  ConnectorSchema,
  ConnectorSyncLogSchema,
  ConfigurableAgentSchema,
  ActivityLogSchema,
  UsageRecordSchema,
  MetricSchema,
  ROISnapshotSchema,
} from "../schema.pg";
import { eq, and, desc, gte, lte, sql, count } from "drizzle-orm";

export const pgPlatformRepository: PlatformRepository = {
  // ─── Tenants ────────────────────────────────────────────────────────────────
  async insertTenant(tenant) {
    const [result] = await db.insert(TenantSchema).values(tenant).returning();
    return result as any;
  },

  async selectTenantById(id) {
    const [result] = await db
      .select()
      .from(TenantSchema)
      .where(eq(TenantSchema.id, id));
    return (result as any) ?? null;
  },

  async selectTenantBySlug(slug) {
    const [result] = await db
      .select()
      .from(TenantSchema)
      .where(eq(TenantSchema.slug, slug));
    return (result as any) ?? null;
  },

  async selectAllTenants() {
    const results = await db
      .select()
      .from(TenantSchema)
      .orderBy(desc(TenantSchema.createdAt));
    return results as any[];
  },

  async updateTenant(id, data) {
    const [result] = await db
      .update(TenantSchema)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(TenantSchema.id, id))
      .returning();
    return result as any;
  },

  // ─── Connectors ─────────────────────────────────────────────────────────────
  async insertConnector(connector) {
    const [result] = await db
      .insert(ConnectorSchema)
      .values(connector)
      .returning();
    return result as any;
  },

  async selectConnectorsByTenantId(tenantId) {
    const results = await db
      .select()
      .from(ConnectorSchema)
      .where(eq(ConnectorSchema.tenantId, tenantId))
      .orderBy(desc(ConnectorSchema.createdAt));
    return results as any[];
  },

  async selectConnectorById(id, tenantId) {
    const [result] = await db
      .select()
      .from(ConnectorSchema)
      .where(
        and(eq(ConnectorSchema.id, id), eq(ConnectorSchema.tenantId, tenantId)),
      );
    return (result as any) ?? null;
  },

  async updateConnector(id, tenantId, data) {
    const [result] = await db
      .update(ConnectorSchema)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(ConnectorSchema.id, id), eq(ConnectorSchema.tenantId, tenantId)),
      )
      .returning();
    return result as any;
  },

  async deleteConnector(id, tenantId) {
    await db
      .delete(ConnectorSchema)
      .where(
        and(eq(ConnectorSchema.id, id), eq(ConnectorSchema.tenantId, tenantId)),
      );
  },

  async insertSyncLog(log) {
    const [result] = await db
      .insert(ConnectorSyncLogSchema)
      .values(log)
      .returning();
    return result as any;
  },

  async selectSyncLogsByConnectorId(connectorId, limit = 50) {
    const results = await db
      .select()
      .from(ConnectorSyncLogSchema)
      .where(eq(ConnectorSyncLogSchema.connectorId, connectorId))
      .orderBy(desc(ConnectorSyncLogSchema.startedAt))
      .limit(limit);
    return results as any[];
  },

  // ─── Configurable Agents ────────────────────────────────────────────────────
  async insertConfigurableAgent(agent) {
    const { temperature, maxTokens, ...rest } = agent;
    const [result] = await db
      .insert(ConfigurableAgentSchema)
      .values({
        ...rest,
        temperature: temperature != null ? String(temperature) : null,
        maxTokens: maxTokens ?? null,
      })
      .returning();
    return result as any;
  },

  async selectConfigurableAgentsByTenantId(tenantId, vertical?) {
    const conditions = vertical
      ? and(
          eq(ConfigurableAgentSchema.tenantId, tenantId),
          eq(ConfigurableAgentSchema.vertical, vertical),
        )
      : eq(ConfigurableAgentSchema.tenantId, tenantId);

    const results = await db
      .select()
      .from(ConfigurableAgentSchema)
      .where(conditions)
      .orderBy(desc(ConfigurableAgentSchema.createdAt));
    return results as any[];
  },

  async selectConfigurableAgentById(id, tenantId) {
    const [result] = await db
      .select()
      .from(ConfigurableAgentSchema)
      .where(
        and(
          eq(ConfigurableAgentSchema.id, id),
          eq(ConfigurableAgentSchema.tenantId, tenantId),
        ),
      );
    return (result as any) ?? null;
  },

  async updateConfigurableAgent(id, tenantId, data) {
    const { temperature, maxTokens, ...rest } = data;
    const setData: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (temperature !== undefined)
      setData.temperature = temperature != null ? String(temperature) : null;
    if (maxTokens !== undefined) setData.maxTokens = maxTokens ?? null;
    const [result] = await db
      .update(ConfigurableAgentSchema)
      .set(setData)
      .where(
        and(
          eq(ConfigurableAgentSchema.id, id),
          eq(ConfigurableAgentSchema.tenantId, tenantId),
        ),
      )
      .returning();
    return result as any;
  },

  async deleteConfigurableAgent(id, tenantId) {
    await db
      .delete(ConfigurableAgentSchema)
      .where(
        and(
          eq(ConfigurableAgentSchema.id, id),
          eq(ConfigurableAgentSchema.tenantId, tenantId),
        ),
      );
  },

  // ─── Activity Log ───────────────────────────────────────────────────────────
  async insertActivityLog(log) {
    const [result] = await db.insert(ActivityLogSchema).values(log).returning();
    return result as any;
  },

  async selectActivityLogs(tenantId, options) {
    const conditions = [eq(ActivityLogSchema.tenantId, tenantId)];

    if (options?.userId) {
      conditions.push(eq(ActivityLogSchema.userId, options.userId));
    }
    if (options?.action) {
      conditions.push(eq(ActivityLogSchema.action, options.action));
    }

    const results = await db
      .select()
      .from(ActivityLogSchema)
      .where(and(...conditions))
      .orderBy(desc(ActivityLogSchema.createdAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);
    return results as any[];
  },

  async countActivityLogs(tenantId, options) {
    const conditions = [eq(ActivityLogSchema.tenantId, tenantId)];

    if (options?.userId) {
      conditions.push(eq(ActivityLogSchema.userId, options.userId));
    }
    if (options?.action) {
      conditions.push(eq(ActivityLogSchema.action, options.action));
    }

    const [result] = await db
      .select({ count: count() })
      .from(ActivityLogSchema)
      .where(and(...conditions));
    return result?.count ?? 0;
  },

  // ─── Usage ──────────────────────────────────────────────────────────────────
  async insertUsageRecord(record) {
    const [result] = await db
      .insert(UsageRecordSchema)
      .values(record)
      .returning();
    return result as any;
  },

  async selectUsageSummary(tenantId, periodStart, periodEnd) {
    const results = await db
      .select({
        resourceType: UsageRecordSchema.resourceType,
        totalQuantity:
          sql<number>`COALESCE(SUM(${UsageRecordSchema.quantity}), 0)`.mapWith(
            Number,
          ),
      })
      .from(UsageRecordSchema)
      .where(
        and(
          eq(UsageRecordSchema.tenantId, tenantId),
          gte(UsageRecordSchema.recordedAt, periodStart),
          lte(UsageRecordSchema.recordedAt, periodEnd),
        ),
      )
      .groupBy(UsageRecordSchema.resourceType);
    return results as {
      resourceType: UsageResourceType;
      totalQuantity: number;
    }[];
  },

  // ─── Metrics ────────────────────────────────────────────────────────────────
  async insertMetric(metric) {
    const { metricValue, ...rest } = metric;
    const [result] = await db
      .insert(MetricSchema)
      .values({ ...rest, metricValue: String(metricValue) })
      .returning();
    return result as any;
  },

  async selectMetrics(tenantId, vertical, metricKey, periodStart, periodEnd) {
    const results = await db
      .select()
      .from(MetricSchema)
      .where(
        and(
          eq(MetricSchema.tenantId, tenantId),
          eq(MetricSchema.vertical, vertical),
          eq(MetricSchema.metricKey, metricKey),
          gte(MetricSchema.recordedAt, periodStart),
          lte(MetricSchema.recordedAt, periodEnd),
        ),
      )
      .orderBy(desc(MetricSchema.recordedAt));
    return results as any[];
  },

  // ─── ROI Snapshots ──────────────────────────────────────────────────────────
  async insertROISnapshot(snapshot) {
    const { periodStart, periodEnd, calculatedRoi, ...rest } = snapshot;
    const [result] = await db
      .insert(ROISnapshotSchema)
      .values({
        ...rest,
        periodStart:
          periodStart instanceof Date
            ? periodStart.toISOString().split("T")[0]
            : periodStart,
        periodEnd:
          periodEnd instanceof Date
            ? periodEnd.toISOString().split("T")[0]
            : periodEnd,
        calculatedRoi: calculatedRoi != null ? String(calculatedRoi) : null,
      })
      .returning();
    return result as any;
  },

  async selectROISnapshots(tenantId, vertical, limit = 10) {
    const results = await db
      .select()
      .from(ROISnapshotSchema)
      .where(
        and(
          eq(ROISnapshotSchema.tenantId, tenantId),
          eq(ROISnapshotSchema.vertical, vertical),
        ),
      )
      .orderBy(desc(ROISnapshotSchema.createdAt))
      .limit(limit);
    return results as any[];
  },
};
