import "server-only";

import {
  ADMIN_USAGE_PERIODS,
  AdminUsageOverview,
  AdminUsagePeriod,
  AdminUserAnalytics,
  AdminUserRoleCounts,
  AdminUsersPaginated,
  AdminUsersQuery,
} from "app-types/admin";
import { startOfDay, subDays } from "date-fns";
import { customModelProvider } from "lib/ai/models";
import {
  requireAdminPermission,
  requireUserListPermission,
} from "lib/auth/permissions";
import { getSession } from "lib/auth/server";
import pgAdminRepository from "lib/db/pg/repositories/admin-respository.pg";

export const ADMIN_USER_LIST_LIMIT = 10;
export const DEFAULT_SORT_BY = "createdAt";
export const DEFAULT_SORT_DIRECTION = "desc";
export const DEFAULT_USAGE_PERIOD: AdminUsagePeriod = "7";

const VALID_ANALYTICS_WINDOWS = [7, 30, 90] as const;
export const DEFAULT_ANALYTICS_WINDOW_DAYS = 7;

/**
 * Require an admin session
 * This is a wrapper around the getSession function
 * that throws an error if the user is not an admin
 *
 * @deprecated Use requireAdminPermission() from lib/auth/permissions instead
 */
export async function requireAdminSession(): Promise<
  NonNullable<Awaited<ReturnType<typeof getSession>>>
> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized: No session found");
  }

  // Use our new permission system internally
  await requireAdminPermission("access admin functions");

  return session;
}

/**
 * Get paginated users using our custom repository with improved search capabilities
 * Only admins can list and search users
 */
export async function getAdminUsers(
  query?: AdminUsersQuery,
): Promise<AdminUsersPaginated> {
  // Use our new permission system
  await requireUserListPermission("list users in admin panel");
  await getSession();

  try {
    // Use our custom repository with improved search
    const result = await pgAdminRepository.getUsers({
      ...query,
      limit: query?.limit ?? ADMIN_USER_LIST_LIMIT,
      offset: query?.offset ?? 0,
      sortBy: query?.sortBy ?? DEFAULT_SORT_BY,
      sortDirection: query?.sortDirection ?? DEFAULT_SORT_DIRECTION,
    });

    return result;
  } catch (error) {
    console.error("Error getting admin users", error);
    throw error;
  }
}

/**
 * Get user counts broken down by role, for the admin users dashboard pills
 */
export async function getAdminUserRoleCounts(): Promise<AdminUserRoleCounts> {
  await requireUserListPermission("view user role counts in admin panel");

  return pgAdminRepository.getUserRoleCounts();
}

/**
 * Get registered-user growth and active-user analytics for the admin
 * users dashboard charts
 */
export async function getAdminUserAnalytics(
  days: number = DEFAULT_ANALYTICS_WINDOW_DAYS,
): Promise<AdminUserAnalytics> {
  await requireUserListPermission("view user analytics in admin panel");

  const validDays = (VALID_ANALYTICS_WINDOWS as readonly number[]).includes(
    days,
  )
    ? days
    : DEFAULT_ANALYTICS_WINDOW_DAYS;

  return pgAdminRepository.getUserAnalytics(validDays);
}

/**
 * Get usage analytics (messages, tokens, per-model breakdown) for the admin
 * Usage page. Reads only data already persisted on chat_message/chat_thread
 * plus the in-process model registry — no new data collection.
 */
export async function getAdminUsageOverview(
  period: AdminUsagePeriod = DEFAULT_USAGE_PERIOD,
): Promise<AdminUsageOverview> {
  await requireAdminPermission("view usage analytics in admin panel");

  const validPeriod = (ADMIN_USAGE_PERIODS as readonly string[]).includes(
    period,
  )
    ? period
    : DEFAULT_USAGE_PERIOD;

  const since =
    validPeriod === "all"
      ? null
      : startOfDay(subDays(new Date(), Number(validPeriod) - 1));

  const stats = await pgAdminRepository.getUsageStats(since);

  const registryModels = customModelProvider.modelsInfo.flatMap((entry) =>
    entry.models.map((model) => ({
      provider: entry.provider,
      model: model.name,
      hasApiKey: entry.hasAPIKey,
    })),
  );

  const dbByKey = new Map(
    stats.models.map((row) => [`${row.provider}::${row.model}`, row]),
  );
  const seenKeys = new Set<string>();

  const registryRows: AdminUsageOverview["models"] = registryModels.map(
    (registryModel) => {
      const key = `${registryModel.provider}::${registryModel.model}`;
      seenKeys.add(key);
      const dbRow = dbByKey.get(key);
      return {
        provider: registryModel.provider,
        model: registryModel.model,
        threadCount: dbRow?.threadCount ?? 0,
        messageCount: dbRow?.messageCount ?? 0,
        totalTokens: dbRow?.totalTokens ?? 0,
        inputTokens: dbRow?.inputTokens ?? 0,
        outputTokens: dbRow?.outputTokens ?? 0,
        lastUsedAt: dbRow?.lastUsedAt ? dbRow.lastUsedAt.toISOString() : null,
        available: true,
        hasApiKey: registryModel.hasApiKey,
      };
    },
  );

  // Models with usage history but no longer present in the registry
  // (e.g. a retired model, or an OpenAI-compatible provider that's no
  // longer configured).
  const retiredRows: AdminUsageOverview["models"] = stats.models
    .filter((row) => !seenKeys.has(`${row.provider}::${row.model}`))
    .map((row) => ({
      provider: row.provider,
      model: row.model,
      threadCount: row.threadCount,
      messageCount: row.messageCount,
      totalTokens: row.totalTokens,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
      available: false,
      hasApiKey: false,
    }));

  const models = [...registryRows, ...retiredRows].sort((a, b) => {
    if (a.messageCount === 0 && b.messageCount !== 0) return 1;
    if (b.messageCount === 0 && a.messageCount !== 0) return -1;
    if (a.messageCount === 0 && b.messageCount === 0) {
      return a.provider === b.provider
        ? a.model.localeCompare(b.model)
        : a.provider.localeCompare(b.provider);
    }
    if (b.totalTokens !== a.totalTokens) return b.totalTokens - a.totalTokens;
    return b.messageCount - a.messageCount;
  });

  return {
    period: validPeriod,
    totals: stats.totals,
    timeline: stats.timeline,
    models,
    availableModelCount: registryModels.length,
  };
}
