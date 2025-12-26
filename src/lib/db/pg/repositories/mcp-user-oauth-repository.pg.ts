import {
  UserSessionAuthorization,
  UserSessionAuthorizationRepository,
} from "app-types/mcp";
import { pgDb as db } from "../db.pg";
import { UserSessionAuthorizationTable } from "../schema.pg";
import { eq, and, isNotNull, gt } from "drizzle-orm";

/**
 * User Session Authorization Repository Implementation
 * Manages per-user authorization sessions for MCP server access.
 * Each user has an isolated session per MCP server, ensuring proper
 * session isolation and access governance.
 */
export const pgUserSessionAuthorizationRepository: UserSessionAuthorizationRepository =
  {
    // Get authenticated session for a user and MCP server
    async getAuthenticatedSession(userId, mcpServerId) {
      const [session] = await db
        .select()
        .from(UserSessionAuthorizationTable)
        .where(
          and(
            eq(UserSessionAuthorizationTable.userId, userId),
            eq(UserSessionAuthorizationTable.mcpServerId, mcpServerId),
            isNotNull(UserSessionAuthorizationTable.accessToken),
          ),
        )
        .limit(1);

      return session as UserSessionAuthorization | undefined;
    },

    // Get session by OAuth state (for callback handling)
    async getSessionByState(state) {
      if (!state) return undefined;

      const [session] = await db
        .select()
        .from(UserSessionAuthorizationTable)
        .where(eq(UserSessionAuthorizationTable.state, state));

      return session as UserSessionAuthorization | undefined;
    },

    // Check if user has valid (non-expired) tokens for an MCP server
    async hasValidTokens(userId, mcpServerId) {
      const now = new Date();
      const [session] = await db
        .select({ id: UserSessionAuthorizationTable.id })
        .from(UserSessionAuthorizationTable)
        .where(
          and(
            eq(UserSessionAuthorizationTable.userId, userId),
            eq(UserSessionAuthorizationTable.mcpServerId, mcpServerId),
            isNotNull(UserSessionAuthorizationTable.accessToken),
            // Token is valid if expiresAt is null or in the future
            // We check if expiresAt > now OR expiresAt is null
          ),
        )
        .limit(1);

      if (!session) return false;

      // Additional check for expiration
      const fullSession = await this.getAuthenticatedSession(
        userId,
        mcpServerId,
      );
      if (!fullSession) return false;

      // If no expiration set, assume valid
      if (!fullSession.expiresAt) return true;

      // Check if not expired (with 5 minute buffer)
      const bufferMs = 5 * 60 * 1000;
      return (
        new Date(fullSession.expiresAt).getTime() > now.getTime() + bufferMs
      );
    },

    // Get all authenticated MCP servers for a user
    async getAuthenticatedServersForUser(userId) {
      const sessions = await db
        .select({ mcpServerId: UserSessionAuthorizationTable.mcpServerId })
        .from(UserSessionAuthorizationTable)
        .where(
          and(
            eq(UserSessionAuthorizationTable.userId, userId),
            isNotNull(UserSessionAuthorizationTable.accessToken),
          ),
        );

      return sessions.map((s) => s.mcpServerId);
    },

    // Create or update OAuth session for user
    async upsertSession(userId, mcpServerId, data) {
      const now = new Date();

      const [session] = await db
        .insert(UserSessionAuthorizationTable)
        .values({
          userId,
          mcpServerId,
          ...data,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            UserSessionAuthorizationTable.userId,
            UserSessionAuthorizationTable.mcpServerId,
          ],
          set: {
            ...data,
            updatedAt: now,
          },
        })
        .returning();

      return session as UserSessionAuthorization;
    },

    // Save tokens after OAuth callback
    async saveTokens(state, tokens) {
      const now = new Date();

      const [session] = await db
        .update(UserSessionAuthorizationTable)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          idToken: tokens.idToken,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope,
          // Clear OAuth flow state after successful token exchange
          state: null,
          codeVerifier: null,
          updatedAt: now,
        })
        .where(eq(UserSessionAuthorizationTable.state, state))
        .returning();

      if (!session) {
        throw new Error(`Session with state ${state} not found`);
      }

      return session as UserSessionAuthorization;
    },

    // Update session by state (for OAuth flow)
    async updateSessionByState(state, data) {
      const now = new Date();

      const [session] = await db
        .update(UserSessionAuthorizationTable)
        .set({
          ...data,
          updatedAt: now,
        })
        .where(eq(UserSessionAuthorizationTable.state, state))
        .returning();

      if (!session) {
        throw new Error(`Session with state ${state} not found`);
      }

      return session as UserSessionAuthorization;
    },

    // Delete session for user and MCP server
    async deleteSession(userId, mcpServerId) {
      await db
        .delete(UserSessionAuthorizationTable)
        .where(
          and(
            eq(UserSessionAuthorizationTable.userId, userId),
            eq(UserSessionAuthorizationTable.mcpServerId, mcpServerId),
          ),
        );
    },

    // Delete session by state
    async deleteByState(state) {
      await db
        .delete(UserSessionAuthorizationTable)
        .where(eq(UserSessionAuthorizationTable.state, state));
    },

    // Delete all sessions for a user
    async deleteAllForUser(userId) {
      await db
        .delete(UserSessionAuthorizationTable)
        .where(eq(UserSessionAuthorizationTable.userId, userId));
    },
  };

// Alias for backward compatibility
export const pgMcpUserOAuthRepository = pgUserSessionAuthorizationRepository;
