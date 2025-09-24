import { drizzle } from "drizzle-orm/node-postgres";
import {
  UserSchema,
  SessionSchema,
  AgentSchema,
  BookmarkSchema,
  ChatThreadSchema,
} from "../../src/lib/db/pg/schema.pg";
import { eq, like, or } from "drizzle-orm";
import { config } from "dotenv";

config();

const db = drizzle(process.env.POSTGRES_URL!);

async function cleanup() {
  console.log("Cleaning up test data...");

  try {
    // Clean up only dynamically created test users (not seeded ones)
    // Preserve our seeded test users in @test-seed.local domain
    const testEmailPatterns = [
      "%playwright%", // Dynamically created playwright users
      "%@example.com%", // Test signup users
      "%@temp-test.%", // Temporary test users
    ];

    // First, get all test users
    const testUsers = await db
      .select({ id: UserSchema.id })
      .from(UserSchema)
      .where(
        or(
          ...testEmailPatterns.map((pattern) =>
            like(UserSchema.email, pattern),
          ),
        ),
      );

    console.log(`Found ${testUsers.length} test users to clean up`);

    // Delete in reverse order due to foreign key constraints
    for (const user of testUsers) {
      console.log(`Cleaning up user: ${user.id}`);

      // Delete chat threads
      await db
        .delete(ChatThreadSchema)
        .where(eq(ChatThreadSchema.userId, user.id));

      // Delete bookmarks
      await db.delete(BookmarkSchema).where(eq(BookmarkSchema.userId, user.id));

      // Delete agents
      await db.delete(AgentSchema).where(eq(AgentSchema.userId, user.id));

      // Delete sessions
      await db.delete(SessionSchema).where(eq(SessionSchema.userId, user.id));

      // Delete user
      await db.delete(UserSchema).where(eq(UserSchema.id, user.id));
    }

    console.log("Test data cleaned up successfully");
  } catch (error) {
    console.error("Error cleaning up test data:", error);
  }

  process.exit(0);
}

export default cleanup;
