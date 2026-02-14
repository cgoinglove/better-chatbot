import type { BillingRepository } from "app-types/platform";
import { pgDb as db } from "../db.pg";
import { BillingSubscriptionSchema, TenantSchema } from "../schema.pg";
import { eq, desc } from "drizzle-orm";

export const pgBillingRepository: BillingRepository = {
  async insertSubscription(sub) {
    const [result] = await db
      .insert(BillingSubscriptionSchema)
      .values(sub)
      .returning();
    return result as any;
  },

  async selectSubscriptionByTenantId(tenantId) {
    const [result] = await db
      .select()
      .from(BillingSubscriptionSchema)
      .where(eq(BillingSubscriptionSchema.tenantId, tenantId));
    return (result as any) ?? null;
  },

  async selectSubscriptionByClerkId(clerkId) {
    const [result] = await db
      .select()
      .from(BillingSubscriptionSchema)
      .where(eq(BillingSubscriptionSchema.clerkSubscriptionId, clerkId));
    return (result as any) ?? null;
  },

  async updateSubscription(id, data) {
    const [result] = await db
      .update(BillingSubscriptionSchema)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(BillingSubscriptionSchema.id, id))
      .returning();
    return result as any;
  },

  async selectAllSubscriptions() {
    const results = await db
      .select({
        id: BillingSubscriptionSchema.id,
        tenantId: BillingSubscriptionSchema.tenantId,
        clerkSubscriptionId: BillingSubscriptionSchema.clerkSubscriptionId,
        plan: BillingSubscriptionSchema.plan,
        status: BillingSubscriptionSchema.status,
        currentPeriodStart: BillingSubscriptionSchema.currentPeriodStart,
        currentPeriodEnd: BillingSubscriptionSchema.currentPeriodEnd,
        canceledAt: BillingSubscriptionSchema.canceledAt,
        createdAt: BillingSubscriptionSchema.createdAt,
        updatedAt: BillingSubscriptionSchema.updatedAt,
        tenantName: TenantSchema.name,
      })
      .from(BillingSubscriptionSchema)
      .leftJoin(
        TenantSchema,
        eq(BillingSubscriptionSchema.tenantId, TenantSchema.id)
      )
      .orderBy(desc(BillingSubscriptionSchema.createdAt));
    return results as any[];
  },
};
