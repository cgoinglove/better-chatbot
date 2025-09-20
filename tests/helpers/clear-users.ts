import { pgDb } from "../../src/lib/db/pg/db.pg";
import {
  UserSchema,
  SessionSchema,
  AccountSchema,
  VerificationSchema,
  ChatThreadSchema,
  ChatMessageSchema,
  AgentSchema,
  WorkflowSchema,
  McpServerSchema,
  ArchiveSchema,
  ArchiveItemSchema,
} from "../../src/lib/db/pg/schema.pg";

/**
 * Clear all users from the database for first-user testing
 * WARNING: Only use in test environment!
 */
export async function clearAllUsers() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Cannot clear users in production!");
  }

  console.log("🧹 Clearing all users for first-user testing...");

  // Clear in order of dependencies (most dependent first)
  // 1. Clear archive items first (depends on archives)
  await pgDb.delete(ArchiveItemSchema);

  // 2. Clear archives (depends on users)
  await pgDb.delete(ArchiveSchema);

  // 3. Clear chat messages (depends on threads)
  await pgDb.delete(ChatMessageSchema);

  // 4. Clear chat threads (depends on users)
  await pgDb.delete(ChatThreadSchema);

  // 5. Clear workflows (depends on users)
  await pgDb.delete(WorkflowSchema);

  // 6. Clear agents (depends on users)
  await pgDb.delete(AgentSchema);

  // 7. Clear MCP servers (depends on users)
  await pgDb.delete(McpServerSchema);

  // 8. Clear sessions (depends on users)
  await pgDb.delete(SessionSchema);

  // 9. Clear accounts (depends on users)
  await pgDb.delete(AccountSchema);

  // 10. Clear verifications (depends on users)
  await pgDb.delete(VerificationSchema);

  // 11. Finally clear users
  await pgDb.delete(UserSchema);

  console.log("✅ All users and related data cleared");
}

/**
 * Check if any users exist in the database
 */
export async function getUserCount(): Promise<number> {
  const users = await pgDb.select().from(UserSchema);
  return users.length;
}
