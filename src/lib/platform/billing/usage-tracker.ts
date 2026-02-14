import { platformRepository } from "lib/db/repository";
import type { UsageResourceType } from "app-types/platform";

export class UsageTracker {
  constructor(private tenantId: string) {}

  async track(
    resourceType: UsageResourceType,
    quantity: number,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await platformRepository.insertUsageRecord({
      tenantId: this.tenantId,
      userId: userId ?? null,
      resourceType,
      quantity,
      metadata: metadata ?? {},
    });
  }

  async getUsageSummary(periodStart: Date, periodEnd: Date) {
    return platformRepository.selectUsageSummary(
      this.tenantId,
      periodStart,
      periodEnd,
    );
  }

  async getCurrentMonthUsage() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return this.getUsageSummary(start, end);
  }
}
