import { pgDb as db } from "../db.pg";
import { LeadSchema } from "../schema.pg";
import { eq, and, desc, gte, count, sum } from "drizzle-orm";
import type {
  SalesHunterRepository,
  Lead,
  LeadStatus,
} from "app-types/platform";
import { inArray } from "drizzle-orm";

export const pgSalesHunterRepository: SalesHunterRepository = {
  async insertLead(lead) {
    const [result] = await db
      .insert(LeadSchema)
      .values({
        tenantId: lead.tenantId,
        externalId: lead.externalId,
        source: lead.source,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        company: lead.company,
        title: lead.title,
        phone: lead.phone,
        status: lead.status,
        score: lead.score,
        estimatedValue:
          lead.estimatedValue != null ? String(lead.estimatedValue) : undefined,
        data: lead.data,
        assignedTo: lead.assignedTo,
      })
      .returning();
    return {
      ...result,
      estimatedValue:
        result.estimatedValue != null ? Number(result.estimatedValue) : null,
    } as Lead;
  },

  async selectLeadsByTenantId(tenantId, options = {}) {
    const conditions = [eq(LeadSchema.tenantId, tenantId)];

    if (options.status) {
      conditions.push(eq(LeadSchema.status, options.status));
    }
    if (options.source) {
      conditions.push(eq(LeadSchema.source, options.source));
    }
    if (options.assignedTo) {
      conditions.push(eq(LeadSchema.assignedTo, options.assignedTo));
    }
    if (options.minScore != null) {
      conditions.push(gte(LeadSchema.score, options.minScore));
    }

    const results = await db
      .select()
      .from(LeadSchema)
      .where(and(...conditions))
      .orderBy(desc(LeadSchema.createdAt))
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0);

    return results.map((r) => ({
      ...r,
      estimatedValue:
        r.estimatedValue != null ? Number(r.estimatedValue) : null,
    })) as Lead[];
  },

  async selectLeadById(id, tenantId) {
    const [result] = await db
      .select()
      .from(LeadSchema)
      .where(and(eq(LeadSchema.id, id), eq(LeadSchema.tenantId, tenantId)));
    if (!result) return null;
    return {
      ...result,
      estimatedValue:
        result.estimatedValue != null ? Number(result.estimatedValue) : null,
    } as Lead;
  },

  async updateLead(id, tenantId, data) {
    const setData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };
    if (data.estimatedValue != null) {
      setData.estimatedValue = String(data.estimatedValue);
    }

    const [result] = await db
      .update(LeadSchema)
      .set(setData)
      .where(and(eq(LeadSchema.id, id), eq(LeadSchema.tenantId, tenantId)))
      .returning();
    return {
      ...result,
      estimatedValue:
        result.estimatedValue != null ? Number(result.estimatedValue) : null,
    } as Lead;
  },

  async deleteLead(id, tenantId) {
    await db
      .delete(LeadSchema)
      .where(and(eq(LeadSchema.id, id), eq(LeadSchema.tenantId, tenantId)));
  },

  async countLeadsByStatus(tenantId) {
    const results = await db
      .select({
        status: LeadSchema.status,
        count: count(),
      })
      .from(LeadSchema)
      .where(eq(LeadSchema.tenantId, tenantId))
      .groupBy(LeadSchema.status);

    const allStatuses: LeadStatus[] = [
      "new",
      "contacted",
      "qualified",
      "proposal",
      "negotiation",
      "won",
      "lost",
      "disqualified",
    ];

    const statusCounts = {} as Record<LeadStatus, number>;
    for (const status of allStatuses) {
      statusCounts[status] = 0;
    }
    for (const row of results) {
      statusCounts[row.status as LeadStatus] = row.count;
    }

    return statusCounts;
  },

  async selectLeadsByExternalIds(tenantId, externalIds) {
    if (externalIds.length === 0) return [];

    const results = await db
      .select()
      .from(LeadSchema)
      .where(
        and(
          eq(LeadSchema.tenantId, tenantId),
          inArray(LeadSchema.externalId, externalIds),
        ),
      );

    return results.map((r) => ({
      ...r,
      estimatedValue:
        r.estimatedValue != null ? Number(r.estimatedValue) : null,
    })) as Lead[];
  },

  async calculatePipelineValue(tenantId) {
    const activeStatuses: LeadStatus[] = [
      "new",
      "contacted",
      "qualified",
      "proposal",
      "negotiation",
      "won",
    ];

    const results = await db
      .select({
        status: LeadSchema.status,
        totalValue: sum(LeadSchema.estimatedValue),
      })
      .from(LeadSchema)
      .where(
        and(
          eq(LeadSchema.tenantId, tenantId),
          inArray(LeadSchema.status, activeStatuses),
        ),
      )
      .groupBy(LeadSchema.status);

    const allStatuses: LeadStatus[] = [
      "new",
      "contacted",
      "qualified",
      "proposal",
      "negotiation",
      "won",
      "lost",
      "disqualified",
    ];

    const byStatus = {} as Record<LeadStatus, number>;
    for (const status of allStatuses) {
      byStatus[status] = 0;
    }

    let totalValue = 0;
    for (const row of results) {
      const value = Number(row.totalValue) || 0;
      byStatus[row.status as LeadStatus] = value;
      totalValue += value;
    }

    return { totalValue, byStatus };
  },
};
