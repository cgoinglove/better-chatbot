import { eq } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { sqliteDb as db } from "../db.sqlite";
import { GitHubConfigSqliteSchema } from "../schema.github-config";

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

export const sqliteGithubConfigService = {
  async createConfig(config: GitHubConfigCreate): Promise<GitHubConfig> {
    const id = generateUUID();
    const now = new Date();
    const timestamp = now.getTime();

    await db.insert(GitHubConfigSqliteSchema).values({
      id,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      webhookSecret: config.webhookSecret,
      isActive: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      id,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      webhookSecret: config.webhookSecret,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateConfig(id: string, config: GitHubConfigUpdate): Promise<void> {
    const now = new Date();
    const timestamp = now.getTime();

    await db
      .update(GitHubConfigSqliteSchema)
      .set({
        ...(config.clientId !== undefined && { clientId: config.clientId }),
        ...(config.clientSecret !== undefined && { clientSecret: config.clientSecret }),
        ...(config.redirectUri !== undefined && { redirectUri: config.redirectUri }),
        ...(config.webhookSecret !== undefined && { webhookSecret: config.webhookSecret }),
        ...(config.isActive !== undefined && { isActive: config.isActive ? 1 : 0 }),
        updatedAt: timestamp,
      })
      .where(eq(GitHubConfigSqliteSchema.id, id));
  },

  async getActiveConfig(): Promise<GitHubConfig | null> {
    const result = await db
      .select()
      .from(GitHubConfigSqliteSchema)
      .where(eq(GitHubConfigSqliteSchema.isActive, 1))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const config = result[0];
    return {
      ...config,
      isActive: Boolean(config.isActive),
      createdAt: new Date(config.createdAt),
      updatedAt: new Date(config.updatedAt),
    };
  },

  async getAllConfigs(): Promise<GitHubConfig[]> {
    const result = await db
      .select()
      .from(GitHubConfigSqliteSchema)
      .orderBy(GitHubConfigSqliteSchema.createdAt);

    return result.map((config) => ({
      ...config,
      isActive: Boolean(config.isActive),
      createdAt: new Date(config.createdAt),
      updatedAt: new Date(config.updatedAt),
    }));
  },

  async deleteConfig(id: string): Promise<void> {
    await db
      .delete(GitHubConfigSqliteSchema)
      .where(eq(GitHubConfigSqliteSchema.id, id));
  },
};
