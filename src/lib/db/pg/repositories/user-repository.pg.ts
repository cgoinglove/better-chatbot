import {
  BasicUserWithLastLogin,
  User,
  UserPreferences,
  UserRepository,
} from "app-types/user";
import { pgDb as db, pgDb } from "../db.pg";
import {
  AccountTable,
  ChatMessageTable,
  ChatThreadTable,
  SessionTable,
  UserTable,
} from "../schema.pg";
import { count, eq, getTableColumns, sql } from "drizzle-orm";

// Helper function to get user columns without password
const getUserColumnsWithoutPassword = () => {
  const { password, ...userColumns } = getTableColumns(UserTable);
  return userColumns;
};

export const pgUserRepository: UserRepository = {
  existsByEmail: async (email: string): Promise<boolean> => {
    const result = await db
      .select()
      .from(UserTable)
      .where(eq(UserTable.email, email));
    return result.length > 0;
  },
  updateUserDetails: async ({
    userId,
    name,
    image,
    email,
  }: {
    userId: string;
    name?: string;
    image?: string;
    email?: string;
  }): Promise<User> => {
    const [result] = await db
      .update(UserTable)
      .set({
        ...(name && { name }),
        ...(image && { image }),
        ...(email && { email }),
        updatedAt: new Date(),
      })
      .where(eq(UserTable.id, userId))
      .returning();
    return {
      ...result,
      preferences: result.preferences,
    };
  },

  updatePreferences: async (
    userId: string,
    preferences: UserPreferences,
  ): Promise<User> => {
    const [result] = await db
      .update(UserTable)
      .set({
        preferences,
        updatedAt: new Date(),
      })
      .where(eq(UserTable.id, userId))
      .returning();
    return {
      ...result,
      preferences: result.preferences ?? null,
    };
  },
  getPreferences: async (userId: string) => {
    const [result] = await db
      .select({ preferences: UserTable.preferences })
      .from(UserTable)
      .where(eq(UserTable.id, userId));
    return result?.preferences ?? null;
  },
  getUserById: async (
    userId: string,
  ): Promise<BasicUserWithLastLogin | null> => {
    const [result] = await pgDb
      .select({
        ...getUserColumnsWithoutPassword(),
        lastLogin: sql<Date | null>`(
          SELECT MAX(${SessionTable.updatedAt}) 
          FROM ${SessionTable} 
          WHERE ${SessionTable.userId} = ${UserTable.id}
        )`.as("lastLogin"),
      })
      .from(UserTable)
      .where(eq(UserTable.id, userId));

    return result || null;
  },

  getUserCount: async () => {
    const [result] = await db.select({ count: count() }).from(UserTable);
    return result?.count ?? 0;
  },
  getUserStats: async (userId: string) => {
    // Calculate last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Get thread and message counts for the same 30-day period
    const [result] = await db
      .select({
        threadCount: sql<number>`COALESCE(COUNT(DISTINCT ${ChatThreadTable.id}), 0)`,
        messageCount: sql<number>`COALESCE(COUNT(${ChatMessageTable.id}), 0)`,
      })
      .from(ChatThreadTable)
      .leftJoin(
        ChatMessageTable,
        eq(ChatThreadTable.id, ChatMessageTable.threadId),
      )
      .where(
        sql`${ChatThreadTable.userId} = ${userId} AND ${ChatThreadTable.createdAt} >= ${thirtyDaysAgo}`,
      );

    const modelStats = await db
      .select({
        model: sql<string>`${ChatMessageTable.metadata}->'chatModel'->>'model'`,
        messageCount: count(ChatMessageTable.id),
        // Extract usage tokens from metadata
        totalTokens: sql<number>`COALESCE(SUM((${ChatMessageTable.metadata}->'usage'->>'totalTokens')::numeric), 0)`,
      })
      .from(ChatMessageTable)
      .leftJoin(
        ChatThreadTable,
        eq(ChatMessageTable.threadId, ChatThreadTable.id),
      )
      .where(
        sql`${ChatThreadTable.userId} = ${userId} 
            AND ${ChatMessageTable.createdAt} >= ${thirtyDaysAgo}
            AND ${ChatMessageTable.metadata} IS NOT NULL
            AND ${ChatMessageTable.metadata}->'chatModel'->>'model' IS NOT NULL`,
      )
      .groupBy(sql`${ChatMessageTable.metadata}->'chatModel'->>'model'`)
      .orderBy(
        sql`SUM((${ChatMessageTable.metadata}->'usage'->>'totalTokens')::numeric) DESC`,
      )
      .limit(10); // Get top 10 models by token usage

    const totalTokens = modelStats.reduce(
      (acc, curr) => acc + Number(curr.totalTokens || 0),
      0,
    );

    return {
      threadCount: result?.threadCount || 0,
      messageCount: result?.messageCount || 0,
      modelStats: modelStats.map((stat) => ({
        ...stat,
        totalTokens: Number(stat.totalTokens || 0),
      })),
      totalTokens,
      period: "Last 30 Days",
    };
  },
  getUserAuthMethods: async (userId: string) => {
    const accounts = await pgDb
      .select({
        providerId: AccountTable.providerId,
      })
      .from(AccountTable)
      .where(eq(AccountTable.userId, userId));

    return {
      hasPassword: accounts.some((a) => a.providerId === "credential"),
      oauthProviders: accounts
        .filter((a) => a.providerId !== "credential")
        .map((a) => a.providerId),
    };
  },
};
