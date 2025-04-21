import { eq, and } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { sqliteDb as db } from "../db.sqlite";
import { GitHubAccountSqliteSchema } from "../schema.github-account";

export interface GitHubAccount {
  id: string;
  userId: string;
  githubId: string;
  username: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope: string;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubAccountCreate {
  userId: string;
  githubId: string;
  username: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope: string;
  expiresAt?: Date;
}

export interface GitHubAccountUpdate {
  username?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  isActive?: boolean;
  expiresAt?: Date;
}

export const sqliteGithubAccountService = {
  async createAccount(account: GitHubAccountCreate): Promise<GitHubAccount> {
    const id = generateUUID();
    const now = new Date();
    const timestamp = now.getTime();

    await db.insert(GitHubAccountSqliteSchema).values({
      id,
      userId: account.userId,
      githubId: account.githubId,
      username: account.username,
      name: account.name,
      email: account.email,
      avatarUrl: account.avatarUrl,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenType: account.tokenType,
      scope: account.scope,
      isActive: 1,
      expiresAt: account.expiresAt ? account.expiresAt.getTime() : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      id,
      userId: account.userId,
      githubId: account.githubId,
      username: account.username,
      name: account.name,
      email: account.email,
      avatarUrl: account.avatarUrl,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenType: account.tokenType,
      scope: account.scope,
      isActive: true,
      expiresAt: account.expiresAt,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getAccountById(id: string): Promise<GitHubAccount | null> {
    const result = await db
      .select()
      .from(GitHubAccountSqliteSchema)
      .where(eq(GitHubAccountSqliteSchema.id, id));
    
    if (!result[0]) return null;
    
    return {
      ...result[0],
      isActive: Boolean(result[0].isActive),
      expiresAt: result[0].expiresAt ? new Date(result[0].expiresAt) : undefined,
      createdAt: new Date(result[0].createdAt),
      updatedAt: new Date(result[0].updatedAt),
    };
  },

  async getAccountByUserId(userId: string): Promise<GitHubAccount | null> {
    const result = await db
      .select()
      .from(GitHubAccountSqliteSchema)
      .where(
        and(
          eq(GitHubAccountSqliteSchema.userId, userId),
          eq(GitHubAccountSqliteSchema.isActive, 1)
        )
      )
      .orderBy(GitHubAccountSqliteSchema.updatedAt);
    
    if (!result[0]) return null;
    
    return {
      ...result[0],
      isActive: Boolean(result[0].isActive),
      expiresAt: result[0].expiresAt ? new Date(result[0].expiresAt) : undefined,
      createdAt: new Date(result[0].createdAt),
      updatedAt: new Date(result[0].updatedAt),
    };
  },

  async getAccountByGithubId(githubId: string): Promise<GitHubAccount | null> {
    const result = await db
      .select()
      .from(GitHubAccountSqliteSchema)
      .where(eq(GitHubAccountSqliteSchema.githubId, githubId));
    
    if (!result[0]) return null;
    
    return {
      ...result[0],
      isActive: Boolean(result[0].isActive),
      expiresAt: result[0].expiresAt ? new Date(result[0].expiresAt) : undefined,
      createdAt: new Date(result[0].createdAt),
      updatedAt: new Date(result[0].updatedAt),
    };
  },

  async updateAccount(id: string, update: GitHubAccountUpdate): Promise<GitHubAccount | null> {
    const now = new Date();
    const timestamp = now.getTime();
    
    const updates: Partial<typeof GitHubAccountSqliteSchema.$inferInsert> = {
      updatedAt: timestamp,
    };
    
    if (update.username !== undefined) updates.username = update.username;
    if (update.name !== undefined) updates.name = update.name;
    if (update.email !== undefined) updates.email = update.email;
    if (update.avatarUrl !== undefined) updates.avatarUrl = update.avatarUrl;
    if (update.accessToken !== undefined) updates.accessToken = update.accessToken;
    if (update.refreshToken !== undefined) updates.refreshToken = update.refreshToken;
    if (update.tokenType !== undefined) updates.tokenType = update.tokenType;
    if (update.scope !== undefined) updates.scope = update.scope;
    if (update.isActive !== undefined) updates.isActive = update.isActive ? 1 : 0;
    if (update.expiresAt !== undefined) updates.expiresAt = update.expiresAt.getTime();
    
    const result = await db
      .update(GitHubAccountSqliteSchema)
      .set(updates)
      .where(eq(GitHubAccountSqliteSchema.id, id))
      .returning();
    
    if (!result[0]) return null;
    
    return {
      ...result[0],
      isActive: Boolean(result[0].isActive),
      expiresAt: result[0].expiresAt ? new Date(result[0].expiresAt) : undefined,
      createdAt: new Date(result[0].createdAt),
      updatedAt: new Date(result[0].updatedAt),
    };
  },

  async deleteAccount(id: string): Promise<boolean> {
    const result = await db
      .delete(GitHubAccountSqliteSchema)
      .where(eq(GitHubAccountSqliteSchema.id, id))
      .returning();
    
    return result.length > 0;
  },

  async deactivateAccount(id: string): Promise<GitHubAccount | null> {
    return this.updateAccount(id, { isActive: false });
  },

  async reactivateAccount(id: string): Promise<GitHubAccount | null> {
    return this.updateAccount(id, { isActive: true });
  },
};
