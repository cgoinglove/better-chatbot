import { McpOAuthSession, McpOAuthRepository } from "app-types/mcp";
import { pgDb as db } from "../db.pg";
import { McpOAuthSessionSchema } from "../schema.pg";
import { eq, and, isNull, isNotNull, desc, ne } from "drizzle-orm";

// OAuth repository implementation for multi-instance support
export const pgMcpOAuthRepository: McpOAuthRepository = {
  // 1. Query methods

  // Get session with valid tokens (authenticated)
  getAuthenticatedSession: async (mcpServerId) => {
    const [session] = await db
      .select()
      .from(McpOAuthSessionSchema)
      .where(
        and(
          eq(McpOAuthSessionSchema.mcpServerId, mcpServerId),
          isNotNull(McpOAuthSessionSchema.tokens),
        ),
      )
      .orderBy(desc(McpOAuthSessionSchema.updatedAt))
      .limit(1);

    return session as McpOAuthSession | undefined;
  },

  // Get in-progress OAuth session (has state but no tokens)
  getInProgressSession: async (mcpServerId) => {
    const [session] = await db
      .select()
      .from(McpOAuthSessionSchema)
      .where(
        and(
          eq(McpOAuthSessionSchema.mcpServerId, mcpServerId),
          isNotNull(McpOAuthSessionSchema.state),
          isNull(McpOAuthSessionSchema.tokens),
        ),
      )
      .orderBy(desc(McpOAuthSessionSchema.updatedAt))
      .limit(1);

    return session as McpOAuthSession | undefined;
  },

  // Get session by OAuth state (for callback handling)
  getSessionByState: async (state) => {
    if (!state) return undefined;

    const [session] = await db
      .select()
      .from(McpOAuthSessionSchema)
      .where(eq(McpOAuthSessionSchema.state, state));

    return session as McpOAuthSession | undefined;
  },

  // 2. Create/Update methods

  // Create new OAuth session
  createSession: async (mcpServerId, data) => {
    const now = new Date();

    const [session] = await db
      .insert(McpOAuthSessionSchema)
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
      .update(McpOAuthSessionSchema)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(McpOAuthSessionSchema.state, state))
      .returning();

    if (!session) {
      throw new Error(`Session with state ${state} not found`);
    }

    return session as McpOAuthSession;
  },

  // Save tokens and cleanup incomplete sessions
  saveTokensAndCleanup: async (mcpServerId, state, tokens) => {
    return await db.transaction(async (tx) => {
      // 1. Update current session with tokens
      const [updatedSession] = await tx
        .update(McpOAuthSessionSchema)
        .set({
          tokens,
          updatedAt: new Date(),
        })
        .where(eq(McpOAuthSessionSchema.state, state))
        .returning();

      if (!updatedSession) {
        throw new Error(`Session with state ${state} not found`);
      }

      // 2. Delete incomplete sessions for the same server (except current one)
      await tx
        .delete(McpOAuthSessionSchema)
        .where(
          and(
            eq(McpOAuthSessionSchema.mcpServerId, mcpServerId),
            isNull(McpOAuthSessionSchema.tokens),
            ne(McpOAuthSessionSchema.state, state),
          ),
        );

      return updatedSession as McpOAuthSession;
    });
  },

  // 3. Delete methods

  // Delete all sessions for a server
  deleteAllSessions: async (mcpServerId) => {
    await db
      .delete(McpOAuthSessionSchema)
      .where(eq(McpOAuthSessionSchema.mcpServerId, mcpServerId));
  },
};
