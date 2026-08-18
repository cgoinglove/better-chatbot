"use server";

import { getAdminUserAnalytics } from "lib/admin/server";
import { AdminUserAnalytics } from "app-types/admin";

export async function getUserAnalyticsAction(
  days: number,
): Promise<AdminUserAnalytics> {
  return getAdminUserAnalytics(days);
}
