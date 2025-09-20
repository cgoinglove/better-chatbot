import {
  BasicUserWithLastLogin,
  User,
  UserPreferences,
  UserRepository,
} from "app-types/user";
import { pgDb as db, pgDb } from "../db.pg";
import {
  AccountSchema,
  ChatMessageSchema,
  ChatThreadSchema,
  SessionSchema,
  UserSchema,
} from "../schema.pg";
import { count, eq, getTableColumns, sql } from "drizzle-orm";

// Helper function to get user columns without password
const getUserColumnsWithoutPassword = () => {
  const { password, ...userColumns } = getTableColumns(UserSchema);
  return userColumns;
};

export const pgUserRepository: UserRepository = {
  existsByEmail: async (email: string): Promise<boolean> => {
    const result = await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, email));
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
      .update(UserSchema)
      .set({
        ...(name && { name }),
        ...(image && { image }),
        ...(email && { email }),
        updatedAt: new Date(),
      })
      .where(eq(UserSchema.id, userId))
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
      .update(UserSchema)
      .set({
        preferences,
        updatedAt: new Date(),
      })
      .where(eq(UserSchema.id, userId))
      .returning();
    return {
      ...result,
      preferences: result.preferences ?? null,
    };
  },
  getPreferences: async (userId: string) => {
    const [result] = await db
      .select({ preferences: UserSchema.preferences })
      .from(UserSchema)
      .where(eq(UserSchema.id, userId));
    return result?.preferences ?? null;
  },
  getUserById: async (
    userId: string,
  ): Promise<BasicUserWithLastLogin | null> => {
    const [result] = await pgDb
      .select({
        ...getUserColumnsWithoutPassword(),
        lastLogin: sql<Date | null>`(
          SELECT MAX(${SessionSchema.updatedAt}) 
          FROM ${SessionSchema} 
          WHERE ${SessionSchema.userId} = ${UserSchema.id}
        )`.as("lastLogin"),
      })
      .from(UserSchema)
      .where(eq(UserSchema.id, userId));

    return result || null;
  },

  getUserCount: async () => {
    const [result] = await db.select({ count: count() }).from(UserSchema);
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
        threadCount: sql<number>`COALESCE(COUNT(DISTINCT ${ChatThreadSchema.id}), 0)`,
        messageCount: sql<number>`COALESCE(COUNT(${ChatMessageSchema.id}), 0)`,
      })
      .from(ChatThreadSchema)
      .leftJoin(
        ChatMessageSchema,
        eq(ChatThreadSchema.id, ChatMessageSchema.threadId),
      )
      .where(
        sql`${ChatThreadSchema.userId} = ${userId} AND ${ChatThreadSchema.createdAt} >= ${thirtyDaysAgo}`,
      );

    const modelStats = await db
      .select({
        model: sql<string>`${ChatMessageSchema.metadata}->'chatModel'->>'model'`,
        messageCount: count(ChatMessageSchema.id),
        // Extract usage tokens from metadata
        totalTokens: sql<number>`COALESCE(SUM((${ChatMessageSchema.metadata}->'usage'->>'totalTokens')::numeric), 0)`,
      })
      .from(ChatMessageSchema)
      .leftJoin(
        ChatThreadSchema,
        eq(ChatMessageSchema.threadId, ChatThreadSchema.id),
      )
      .where(
        sql`${ChatThreadSchema.userId} = ${userId} 
            AND ${ChatMessageSchema.createdAt} >= ${thirtyDaysAgo}
            AND ${ChatMessageSchema.metadata} IS NOT NULL
            AND ${ChatMessageSchema.metadata}->'chatModel'->>'model' IS NOT NULL`,
      )
      .groupBy(sql`${ChatMessageSchema.metadata}->'chatModel'->>'model'`)
      .orderBy(
        sql`SUM((${ChatMessageSchema.metadata}->'usage'->>'totalTokens')::numeric) DESC`,
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
        providerId: AccountSchema.providerId,
      })
      .from(AccountSchema)
      .where(eq(AccountSchema.userId, userId));

    return {
      hasPassword: accounts.some((a) => a.providerId === "credential"),
      oauthProviders: accounts
        .filter((a) => a.providerId !== "credential")
        .map((a) => a.providerId),
    };
  },
};
