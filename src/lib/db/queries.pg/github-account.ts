import { eq, and } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { pgDb as db } from "../db.pg";
import { GitHubAccountPgSchema } from "../schema.github-account";
import { GitHubAccount, GitHubAccountCreate, GitHubAccountUpdate } from "../queries.sqlite/github-account";

export const pgGithubAccountService = {
  async createAccount(account: GitHubAccountCreate): Promise<GitHubAccount> {
    const id = generateUUID();
    const now = new Date();

    await db.insert(GitHubAccountPgSchema).values({
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
      .from(GitHubAccountPgSchema)
      .where(eq(GitHubAccountPgSchema.id, id));
    
    return result[0] || null;
  },

  async getAccountByUserId(userId: string): Promise<GitHubAccount | null> {
    const result = await db
      .select()
      .from(GitHubAccountPgSchema)
      .where(
        and(
          eq(GitHubAccountPgSchema.userId, userId),
          eq(GitHubAccountPgSchema.isActive, true)
        )
      )
      .orderBy(GitHubAccountPgSchema.updatedAt);
    
    return result[0] || null;
  },

  async getAccountByGithubId(githubId: string): Promise<GitHubAccount | null> {
    const result = await db
      .select()
      .from(GitHubAccountPgSchema)
      .where(eq(GitHubAccountPgSchema.githubId, githubId));
    
    return result[0] || null;
  },

  async updateAccount(id: string, update: GitHubAccountUpdate): Promise<GitHubAccount | null> {
    const now = new Date();
    
    const updates: Partial<typeof GitHubAccountPgSchema.$inferInsert> = {
      updatedAt: now,
    };
    
    if (update.username !== undefined) updates.username = update.username;
    if (update.name !== undefined) updates.name = update.name;
    if (update.email !== undefined) updates.email = update.email;
    if (update.avatarUrl !== undefined) updates.avatarUrl = update.avatarUrl;
    if (update.accessToken !== undefined) updates.accessToken = update.accessToken;
    if (update.refreshToken !== undefined) updates.refreshToken = update.refreshToken;
    if (update.tokenType !== undefined) updates.tokenType = update.tokenType;
    if (update.scope !== undefined) updates.scope = update.scope;
    if (update.isActive !== undefined) updates.isActive = update.isActive;
    if (update.expiresAt !== undefined) updates.expiresAt = update.expiresAt;
    
    const result = await db
      .update(GitHubAccountPgSchema)
      .set(updates)
      .where(eq(GitHubAccountPgSchema.id, id))
      .returning();
    
    return result[0] || null;
  },

  async deleteAccount(id: string): Promise<boolean> {
    const result = await db
      .delete(GitHubAccountPgSchema)
      .where(eq(GitHubAccountPgSchema.id, id))
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
