import { eq } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { pgDb as db } from "../db.pg";
import { GitHubConfigPgSchema } from "../schema.github-config";

export interface GitHubConfig {
  id: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  webhookSecret: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubConfigCreate {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  webhookSecret: string;
}

export interface GitHubConfigUpdate {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  webhookSecret?: string;
  isActive?: boolean;
}

export const pgGithubConfigService = {
  async createConfig(config: GitHubConfigCreate): Promise<GitHubConfig> {
    const id = generateUUID();
    const now = new Date();

    const result = await db
      .insert(GitHubConfigPgSchema)
      .values({
        id,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
        webhookSecret: config.webhookSecret,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return result[0];
  },

  async updateConfig(id: string, config: GitHubConfigUpdate): Promise<void> {
    const now = new Date();

    await db
      .update(GitHubConfigPgSchema)
      .set({
        ...(config.clientId !== undefined && { clientId: config.clientId }),
        ...(config.clientSecret !== undefined && { clientSecret: config.clientSecret }),
        ...(config.redirectUri !== undefined && { redirectUri: config.redirectUri }),
        ...(config.webhookSecret !== undefined && { webhookSecret: config.webhookSecret }),
        ...(config.isActive !== undefined && { isActive: config.isActive }),
        updatedAt: now,
      })
      .where(eq(GitHubConfigPgSchema.id, id));
  },

  async getActiveConfig(): Promise<GitHubConfig | null> {
    const result = await db
      .select()
      .from(GitHubConfigPgSchema)
      .where(eq(GitHubConfigPgSchema.isActive, true))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0];
  },

  async getAllConfigs(): Promise<GitHubConfig[]> {
    const result = await db
      .select()
      .from(GitHubConfigPgSchema)
      .orderBy(GitHubConfigPgSchema.createdAt);

    return result;
  },

  async deleteConfig(id: string): Promise<void> {
    await db
      .delete(GitHubConfigPgSchema)
      .where(eq(GitHubConfigPgSchema.id, id));
  },
};
