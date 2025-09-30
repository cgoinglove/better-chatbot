import { McpOAuthSession, McpOAuthRepository } from "app-types/mcp";
import { pgDb as db } from "../db.pg";
import { McpOAuthSessionTable } from "../schema.pg";
import { eq, and, isNotNull, desc, isNull, ne } from "drizzle-orm";

// OAuth repository implementation for multi-instance support
export const pgMcpOAuthRepository: McpOAuthRepository = {
  // 1. Query methods

  // Get session with valid tokens (authenticated)
  getAuthenticatedSession: async (mcpServerId) => {
    const [session] = await db
      .select()
      .from(McpOAuthSessionTable)
      .where(
        and(
          eq(McpOAuthSessionTable.mcpServerId, mcpServerId),
          isNotNull(McpOAuthSessionTable.tokens),
        ),
      )
      .orderBy(desc(McpOAuthSessionTable.updatedAt))
      .limit(1);

    return session as McpOAuthSession | undefined;
  },

  // Get session by OAuth state (for callback handling)
  getSessionByState: async (state) => {
    if (!state) return undefined;

    const [session] = await db
      .select()
      .from(McpOAuthSessionTable)
      .where(eq(McpOAuthSessionTable.state, state));

    return session as McpOAuthSession | undefined;
  },

  // 2. Create/Update methods

  // Create new OAuth session
  createSession: async (mcpServerId, data) => {
    const now = new Date();

    const [session] = await db
      .insert(McpOAuthSessionTable)
      .values({
        ...(data as McpOAuthSession),
        mcpServerId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return session as McpOAuthSession;
  },

  // Update existing session by state
  updateSessionByState: async (state, data) => {
    const now = new Date();

    const [session] = await db
      .update(McpOAuthSessionTable)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(McpOAuthSessionTable.state, state))
      .returning();

    if (!session) {
      throw new Error(`Session with state ${state} not found`);
    }

    return session as McpOAuthSession;
  },

  saveTokensAndCleanup: async (state, mcpServerId, data) => {
    const [session] = await db
      .update(McpOAuthSessionTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(McpOAuthSessionTable.state, state))
      .returning();

    await db
      .delete(McpOAuthSessionTable)
      .where(
        and(
          eq(McpOAuthSessionTable.mcpServerId, mcpServerId),
          isNull(McpOAuthSessionTable.tokens),
          ne(McpOAuthSessionTable.state, state),
        ),
      );

    return session as McpOAuthSession;
  },

  // Delete a session by its OAuth state
  deleteByState: async (state) => {
    await db
      .delete(McpOAuthSessionTable)
      .where(eq(McpOAuthSessionTable.state, state));
  },
};
