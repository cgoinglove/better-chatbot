import { McpOAuthSession, McpOAuthRepository } from "app-types/mcp";
import { pgDb as db } from "../db.pg";
import { McpOAuthSessionSchema } from "../schema.pg";
import { eq } from "drizzle-orm";

// Simple OAuth repository implementation with mcpServerId-based upsert
export const pgMcpOAuthRepository: McpOAuthRepository = {
  // Get OAuth data for a server
  getOAuthSession: async (mcpServerId) => {
    const [oauthData] = await db
      .select()
      .from(McpOAuthSessionSchema)
      .where(eq(McpOAuthSessionSchema.mcpServerId, mcpServerId));

    return oauthData as McpOAuthSession | undefined;
  },

  // Get OAuth data by state parameter (for OAuth callback handling)
  getOAuthSessionByState: async (state) => {
    if (!state) return undefined;

    const [oauthData] = await db
      .select()
      .from(McpOAuthSessionSchema)
      .where(eq(McpOAuthSessionSchema.state, state));

    return oauthData as McpOAuthSession | undefined;
  },

  // Save OAuth data using mcpServerId as unique key (upsert)
  saveOAuthSession: async (mcpServerId, data) => {
    const now = new Date();

    const [oauthData] = await db
      .insert(McpOAuthSessionSchema)
      .values({
        ...(data as McpOAuthSession),
        mcpServerId,
        updatedAt: now,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [McpOAuthSessionSchema.mcpServerId],
        set: {
          ...data,
          updatedAt: now,
        },
      })
      .returning();

    return oauthData as McpOAuthSession;
  },

  // Delete OAuth data for a server
  deleteOAuthData: async (mcpServerId) => {
    await db
      .delete(McpOAuthSessionSchema)
      .where(eq(McpOAuthSessionSchema.mcpServerId, mcpServerId));
  },
};
