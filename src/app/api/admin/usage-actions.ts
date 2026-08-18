"use server";

import { getAdminUsageOverview } from "lib/admin/server";
import { AdminUsageOverview, AdminUsagePeriod } from "app-types/admin";

export async function getUsageOverviewAction(
  period: AdminUsagePeriod,
): Promise<AdminUsageOverview> {
  return getAdminUsageOverview(period);
}
