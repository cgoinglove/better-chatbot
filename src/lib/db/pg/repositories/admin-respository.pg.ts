import {
  AdminRepository,
  AdminUsersQuery,
  AdminUsersPaginated,
  AdminUserRoleCounts,
  AdminUserAnalytics,
  AdminAnalyticsPoint,
} from "app-types/admin";
import { USER_ROLES } from "app-types/roles";
import { pgDb as db } from "../db.pg";
import {
  UserTable,
  SessionTable,
  ChatMessageTable,
  ChatThreadTable,
} from "../schema.pg";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns";
import { buildActiveUserAnalytics } from "lib/admin/user-analytics";

// Only these windows are supported for the analytics charts
const VALID_ANALYTICS_WINDOWS = [7, 30, 90] as const;

// Helper function to get user columns without password
const getUserColumnsWithoutPassword = () => {
  const { password, ...userColumns } = getTableColumns(UserTable);
  return userColumns;
};

const pgAdminRepository: AdminRepository = {
  getUsers: async (query?: AdminUsersQuery): Promise<AdminUsersPaginated> => {
    const {
      searchValue,
      limit = 10,
      offset = 0,
      sortBy = "createdAt",
      sortDirection = "desc",
      filterField,
      filterValue,
      filterOperator = "eq",
    } = query || {};

    // Base query with user columns (excluding password) and last login
    const baseQuery = db
      .select({
        ...getUserColumnsWithoutPassword(),
        lastLogin: sql<Date | null>`(
          SELECT MAX(${SessionTable.updatedAt}) 
          FROM ${SessionTable} 
          WHERE ${SessionTable.userId} = ${UserTable.id}
        )`.as("lastLogin"),
      })
      .from(UserTable);

    // Build WHERE conditions
    const whereConditions: any[] = [];

    // Search across multiple fields (case insensitive)
    if (searchValue && searchValue.trim()) {
      const searchTerm = `%${searchValue.trim()}%`;
      whereConditions.push(
        or(
          ilike(UserTable.name, searchTerm),
          ilike(UserTable.email, searchTerm),
        ),
      );
    }

    // Apply filters
    if (filterField && filterValue !== undefined) {
      const filterCondition = buildFilterCondition(
        filterField,
        filterValue,
        filterOperator,
      );
      if (filterCondition) {
        whereConditions.push(filterCondition);
      }
    }

    // Build the final WHERE clause
    const whereClause =
      whereConditions.length > 0
        ? whereConditions.length === 1
          ? whereConditions[0]
          : and(...whereConditions)
        : undefined;

    // Build ORDER BY
    const orderByClause = buildOrderBy(sortBy, sortDirection);

    // Execute main query
    const usersQueryBuilder = baseQuery
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    const users = whereClause
      ? await usersQueryBuilder.where(whereClause)
      : await usersQueryBuilder;

    // Get total count with same WHERE conditions
    const countQueryBuilder = db.select({ count: count() }).from(UserTable);
    const [totalResult] = whereClause
      ? await countQueryBuilder.where(whereClause)
      : await countQueryBuilder;

    return {
      users: users.map((user) => ({
        ...user,
        preferences: undefined, // Exclude preferences from admin list
      })),
      total: totalResult?.count || 0,
      limit,
      offset,
    };
  },

  getUserRoleCounts: async (): Promise<AdminUserRoleCounts> => {
    const [roleRows, [totalResult], [onlineResult]] = await Promise.all([
      db
        .select({
          // role can be a comma-separated multi-role string (see UserRoleBadges),
          // so explode it before counting
          role: sql<string>`trim(unnest(string_to_array(${UserTable.role}, ',')))`.as(
            "role",
          ),
          count: count(),
        })
        .from(UserTable)
        .groupBy(sql`1`),
      db.select({ count: count() }).from(UserTable),
      db
        .select({
          count: sql<number>`count(distinct ${ChatThreadTable.userId})::int`.as(
            "count",
          ),
        })
        .from(ChatMessageTable)
        .innerJoin(
          ChatThreadTable,
          eq(ChatThreadTable.id, ChatMessageTable.threadId),
        )
        .where(
          and(
            gte(
              ChatMessageTable.createdAt,
              new Date(Date.now() - 5 * 60 * 1000),
            ),
            eq(ChatMessageTable.role, "user"),
          ),
        ),
    ]);

    const counts: AdminUserRoleCounts = {
      total: totalResult?.count || 0,
      online: Number(onlineResult?.count) || 0,
      admin: 0,
      editor: 0,
      user: 0,
    };

    for (const row of roleRows) {
      const role = row.role?.toLowerCase();
      if (
        role === USER_ROLES.ADMIN ||
        role === USER_ROLES.EDITOR ||
        role === USER_ROLES.USER
      ) {
        counts[role] += Number(row.count);
      }
    }

    return counts;
  },

  getUserAnalytics: async (days: number): Promise<AdminUserAnalytics> => {
    const validDays = (VALID_ANALYTICS_WINDOWS as readonly number[]).includes(
      days,
    )
      ? days
      : 30;
    const windowStart = startOfDay(subDays(new Date(), validDays - 1));
    const activityWindowStart = subDays(windowStart, 2);

    const [signupRows, [baselineResult], activeRows] = await Promise.all([
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${UserTable.createdAt}), 'YYYY-MM-DD')`.as(
            "day",
          ),
          count: count(),
        })
        .from(UserTable)
        .where(gte(UserTable.createdAt, windowStart))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      db
        .select({ count: count() })
        .from(UserTable)
        .where(lt(UserTable.createdAt, windowStart)),
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${ChatMessageTable.createdAt}), 'YYYY-MM-DD')`.as(
            "day",
          ),
          userId: ChatThreadTable.userId,
        })
        .from(ChatMessageTable)
        .innerJoin(
          ChatThreadTable,
          eq(ChatThreadTable.id, ChatMessageTable.threadId),
        )
        .where(
          and(
            gte(ChatMessageTable.createdAt, activityWindowStart),
            eq(ChatMessageTable.role, "user"),
          ),
        )
        .groupBy(sql`1`, ChatThreadTable.userId)
        .orderBy(sql`1`, ChatThreadTable.userId),
    ]);

    const signupsByDay = new Map(
      signupRows.map((row) => [row.day, Number(row.count)]),
    );
    const allDays = eachDayOfInterval({
      start: windowStart,
      end: new Date(),
    }).map((day) => format(day, "yyyy-MM-dd"));

    let running = baselineResult?.count || 0;
    const growth: AdminAnalyticsPoint[] = allDays.map((date) => {
      running += signupsByDay.get(date) ?? 0;
      return { date, count: running };
    });

    const activeAnalytics = buildActiveUserAnalytics(
      allDays,
      activeRows.map((row) => ({
        date: row.day,
        userId: row.userId,
      })),
    );

    return { growth, ...activeAnalytics };
  },
};

// Helper function to build filter conditions
function buildFilterCondition(
  field: string,
  value: string | number | boolean,
  operator: string,
) {
  // Map common field names to actual columns
  let column;
  switch (field) {
    case "name":
      column = UserTable.name;
      break;
    case "email":
      column = UserTable.email;
      break;
    case "role":
      column = UserTable.role;
      break;
    case "banned":
      column = UserTable.banned;
      break;
    case "createdAt":
      column = UserTable.createdAt;
      break;
    case "updatedAt":
      column = UserTable.updatedAt;
      break;
    default:
      return null; // Unknown field
  }

  switch (operator) {
    case "eq":
      return eq(column, value);
    case "ne":
      return sql`${column} != ${value}`;
    case "lt":
      return sql`${column} < ${value}`;
    case "lte":
      return sql`${column} <= ${value}`;
    case "gt":
      return sql`${column} > ${value}`;
    case "gte":
      return sql`${column} >= ${value}`;
    case "contains":
      return ilike(column, `%${value}%`);
    default:
      return eq(column, value);
  }
}

// Helper function to build ORDER BY clause
function buildOrderBy(sortBy: string, direction: "asc" | "desc") {
  // Map common sort fields to actual columns
  let column;
  switch (sortBy) {
    case "name":
      column = UserTable.name;
      break;
    case "email":
      column = UserTable.email;
      break;
    case "role":
      column = UserTable.role;
      break;
    case "createdAt":
      column = UserTable.createdAt;
      break;
    case "updatedAt":
      column = UserTable.updatedAt;
      break;
    default:
      // Default to createdAt if invalid sortBy
      column = UserTable.createdAt;
      break;
  }
  return direction === "asc" ? asc(column) : desc(column);
}

export default pgAdminRepository;
