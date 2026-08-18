import "server-only";

import { getSession } from "lib/auth/server";
import {
  AdminUsersQuery,
  AdminUsersPaginated,
  AdminUserRoleCounts,
  AdminUserAnalytics,
} from "app-types/admin";
import {
  requireAdminPermission,
  requireUserListPermission,
} from "lib/auth/permissions";
import pgAdminRepository from "lib/db/pg/repositories/admin-respository.pg";

export const ADMIN_USER_LIST_LIMIT = 10;
export const DEFAULT_SORT_BY = "createdAt";
export const DEFAULT_SORT_DIRECTION = "desc";

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
