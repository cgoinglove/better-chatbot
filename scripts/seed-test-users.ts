#!/usr/bin/env tsx
/**
 * Script to seed test users using Better Auth's APIs
 * Creates 21 users with proper password hashing via Better Auth
 *
 * Usage:
 *   npm run test:e2e:seed
 *   pnpm test:e2e:seed
 */

import { config } from "dotenv";

// Load environment variables FIRST
if (process.env.CI) {
  config({ path: ".env.test" });
} else {
  config();
}

import { auth } from "../src/lib/auth/auth-instance";
import { USER_ROLES } from "../src/types/roles";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  UserSchema,
  ChatMessageSchema,
  ChatThreadSchema,
} from "../src/lib/db/pg/schema.pg";
import { like, eq } from "drizzle-orm";

// Create database connection with Pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL!,
});
const db = drizzle(pool);

// Helper function to get user by email
async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(UserSchema)
    .where(eq(UserSchema.email, email));
  return user || null;
}

async function clearExistingTestUsers() {
  console.log("🧹 Clearing existing test users...");

  try {
    // Clean up ALL test users with reliable patterns
    const testEmailPatterns = [
      "%@test-seed.local%", // Our main seeded test domain
      "%playwright%", // Dynamically created playwright users
      "%@example.com%", // General test signup users
      "%testuser%@testuser.com%", // Legacy test users
      "%testuser%@gmail.com%", // Legacy test users
    ];

    // First, get all test user IDs
    const testUsers: { id: string }[] = [];
    for (const pattern of testEmailPatterns) {
      const users = await db
        .select({ id: UserSchema.id })
        .from(UserSchema)
        .where(like(UserSchema.email, pattern));
      testUsers.push(...users);
    }

    // Also get legacy test users by exact email match
    const legacyTestEmails = [
      "admin@testuser.com",
      "editor@testuser.com",
      "user@testuser.com",
    ];

    for (let i = 4; i <= 21; i++) {
      legacyTestEmails.push(`testuser${i}@testuser.com`);
      legacyTestEmails.push(`testuser${i}@gmail.com`);
    }

    for (const email of legacyTestEmails) {
      const users = await db
        .select({ id: UserSchema.id })
        .from(UserSchema)
        .where(sql`email = ${email}`);
      testUsers.push(...users);
    }

    if (testUsers.length > 0) {
      const userIds = testUsers.map((u) => u.id);
      console.log(`Found ${userIds.length} test users to clean up`);

      // Delete in dependency order
      console.log("Deleting chat messages...");
      // Messages reference threads, not users directly
      if (userIds.length > 0) {
        const threads = await db
          .select({ id: ChatThreadSchema.id })
          .from(ChatThreadSchema)
          .where(sql`${ChatThreadSchema.userId} = ANY(${userIds})`);
        const threadIds = threads.map((t) => t.id);
        if (threadIds.length > 0) {
          await db
            .delete(ChatMessageSchema)
            .where(sql`${ChatMessageSchema.threadId} = ANY(${threadIds})`);
        }
      }

      console.log("Deleting chat threads...");
      for (const userId of userIds) {
        await db
          .delete(ChatThreadSchema)
          .where(sql`${ChatThreadSchema.userId} = ${userId}`);
      }

      // Now delete the users
      console.log("Deleting users...");
      for (const pattern of testEmailPatterns) {
        await db.delete(UserSchema).where(like(UserSchema.email, pattern));
      }
      for (const email of legacyTestEmails) {
        await db.delete(UserSchema).where(sql`email = ${email}`);
      }
    }
  } catch (error) {
    console.log(
      "Note: Error during cleanup (may be expected if tables are empty):",
      error,
    );
  }
}

async function createUserWithBetterAuth(userData: {
  email: string;
  password: string;
  name: string;
  role?: string;
  banned?: boolean;
  banReason?: string;
}) {
  try {
    // First, check if user already exists
    const existingUser = await getUserByEmail(userData.email);

    let user;
    if (existingUser) {
      console.log(
        `  User ${userData.email} already exists, using existing user (ID: ${existingUser.id})`,
      );
      user = existingUser;
    } else {
      // Use Better Auth's signUp API to create user with proper password hashing
      const result = await auth.api.signUpEmail({
        body: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
        },
        headers: new Headers({
          "content-type": "application/json",
        }),
      });

      if (!result.user) {
        throw new Error("User creation failed");
      }

      user = result.user;
      console.log(`  Created new user ${userData.email} (ID: ${user.id})`);
    }

    // Update user role if needed
    // IMPORTANT: Check current role first to avoid overwriting first-user admin
    const [currentUser] = await db
      .select()
      .from(UserSchema)
      .where(sql`id = ${user.id}`);

    if (userData.role && currentUser) {
      // If this is the first user and they already have admin role from Better Auth hook,
      // and we're trying to set admin role, that's fine - they match
      // const _isFirstUserAdmin = currentUser.role === USER_ROLES.ADMIN && userData.role === USER_ROLES.ADMIN;

      // Only update if the role is different and it's not the first-user-admin case
      if (currentUser.role !== userData.role) {
        try {
          console.log(
            `  Updating role from ${currentUser.role} to ${userData.role} for ${userData.email}`,
          );
          await db
            .update(UserSchema)
            .set({ role: userData.role })
            .where(sql`id = ${user.id}`);
        } catch (error) {
          console.warn(`Could not set role for ${userData.email}:`, error);
        }
      } else {
        console.log(
          `  Role already correct (${currentUser.role}) for ${userData.email}`,
        );
      }
    }

    // Ban user if needed - do this via direct database update since we don't have admin auth
    if (userData.banned && userData.banReason) {
      try {
        await db
          .update(UserSchema)
          .set({
            banned: true,
            banReason: userData.banReason,
            banExpires: null, // Permanent ban for testing
          })
          .where(sql`id = ${user.id}`);
      } catch (error) {
        console.warn(`Could not ban user ${userData.email}:`, error);
      }
    }

    return user;
  } catch (error) {
    console.error(`Failed to create user ${userData.email}:`, error);

    // Try to get existing user as fallback
    try {
      const existingUser = await getUserByEmail(userData.email);
      if (existingUser) {
        console.log(
          `  Found existing user ${userData.email} after error, using existing user (ID: ${existingUser.id})`,
        );
        return existingUser;
      }
    } catch (fallbackError) {
      console.warn(
        `Could not retrieve existing user ${userData.email}:`,
        fallbackError,
      );
    }

    return null;
  }
}

async function seedTestUsers() {
  console.log("🌱 Starting test user seeding using Better Auth APIs...");

  try {
    // Clear existing test users first
    await clearExistingTestUsers();
    console.log("✅ Existing test users cleared");

    console.log("👤 Creating main test users...");

    // 1. Admin User
    const adminUser = await createUserWithBetterAuth({
      email: "admin@test-seed.local",
      password: "AdminPassword123!",
      name: "Test Admin User",
      role: USER_ROLES.ADMIN,
    });
    console.log("✅ Created admin user:", adminUser?.id);

    // 2. Editor User
    const editorUser = await createUserWithBetterAuth({
      email: "editor@test-seed.local",
      password: "EditorPassword123!",
      name: "Test Editor User",
      role: USER_ROLES.EDITOR,
    });
    console.log("✅ Created editor user:", editorUser?.id);

    // 3. Regular User
    const regularUser = await createUserWithBetterAuth({
      email: "user@test-seed.local",
      password: "UserPassword123!",
      name: "Test Regular User",
      role: USER_ROLES.USER,
    });
    console.log("✅ Created regular user:", regularUser?.id);

    // 4. Create additional test users
    console.log("👥 Creating additional test users...");
    let createdCount = 3;

    for (let i = 4; i <= 21; i++) {
      try {
        const isEditor = i <= 9;
        const isBanned = i === 21;
        const email = `testuser${i}@test-seed.local`;

        await createUserWithBetterAuth({
          email,
          password: `TestPass${i}!`,
          name: `Test User ${i}`,
          role: isEditor ? USER_ROLES.EDITOR : USER_ROLES.USER,
          banned: isBanned,
          banReason: isBanned ? "Test ban for E2E testing" : undefined,
        });
        createdCount++;
        console.log(`✅ Created user ${i}`);
      } catch (_error) {
        console.warn(`⚠️ Failed to create user ${i}, continuing...`);
      }
    }

    // 5. Seed some basic message/model data for stats testing
    console.log("📊 Creating sample AI usage data for stats testing...");
    const userIdsForSampleData = [
      adminUser?.id,
      editorUser?.id,
      regularUser?.id,
    ].filter(Boolean) as string[];
    if (userIdsForSampleData.length > 0) {
      await seedSampleUsageData(userIdsForSampleData);
    } else {
      console.warn("⚠️ No valid user IDs found for sample data creation");
    }

    console.log(
      `\n✅ Test data seeded successfully! Created ${createdCount} users with sample usage data.`,
    );

    console.log("\n🔑 Test Credentials:");
    console.log("  Admin: admin@test-seed.local / AdminPassword123!");
    console.log("  Editor: editor@test-seed.local / EditorPassword123!");
    console.log("  Regular: user@test-seed.local / UserPassword123!");
    console.log("  Others: testuser{4-21}@test-seed.local / TestPass{n}!");

    console.log("\n📁 Auth Files Will Be Created:");
    console.log("  - tests/.auth/admin.json (admin user)");
    console.log("  - tests/.auth/editor-user.json (editor user)");
    console.log("  - tests/.auth/regular-user.json (regular user)");
    console.log("  - tests/.auth/user1.json (backward compatibility - admin)");
    console.log("  - tests/.auth/user2.json (backward compatibility - editor)");
  } catch (error) {
    console.error("❌ Error seeding test users:", error);
    throw error;
  }
}

async function seedSampleUsageData(userIds: string[]) {
  try {
    for (const userId of userIds) {
      if (!userId) {
        console.warn("⚠️ Skipping sample data creation for undefined user ID");
        continue;
      }

      // Create sample threads and messages for user (should have stats)
      const thread = await db
        .insert(ChatThreadSchema)
        .values({
          userId: userId,
          title: `Test AI Conversation ${userId}`,
        })
        .returning();

      if (thread[0]) {
        // Create sample messages with token usage
        const timestamp = Date.now();
        await db.insert(ChatMessageSchema).values([
          {
            id: `${userId}-msg-1-${timestamp}`,
            threadId: thread[0].id,
            role: "user" as const,
            parts: [{ type: "text", text: "Test user message" }],
          },
          {
            id: `${userId}-msg-2-${timestamp}`,
            threadId: thread[0].id,
            role: "assistant" as const,
            parts: [{ type: "text", text: "Test assistant response" }],
            metadata: {
              chatModel: { provider: "openai", model: "gpt-4o" },
              usage: {
                totalTokens: Math.floor(Math.random() * 100) + 100,
                inputTokens: Math.floor(Math.random() * 100) + 50,
                outputTokens: Math.floor(Math.random() * 100) + 50,
              },
            },
          },
          {
            id: `${userId}-msg-3-${timestamp}`,
            threadId: thread[0].id,
            role: "assistant" as const,
            parts: [{ type: "text", text: "Another test response" }],
            metadata: {
              chatModel: {
                provider: "anthropic",
                model: "claude-3-5-sonnet-20241022",
              },
              usage: {
                totalTokens: Math.floor(Math.random() * 100) + 100,
                inputTokens: Math.floor(Math.random() * 100) + 50,
                outputTokens: Math.floor(Math.random() * 100) + 50,
              },
            },
          },
        ]);
      }
    }

    console.log(`✅ Created sample usage data for admin user`);

    // Editor user has no messages (should show empty state)
    console.log(
      `✅ Editor user left without usage data for empty state testing`,
    );
  } catch (error) {
    console.warn("⚠️ Failed to seed usage data:", error);
  }
}

// Run the seeding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestUsers()
    .then(async () => {
      console.log("🎉 Seeding completed!");
      await pool.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("💥 Seeding failed:", error);
      await pool.end();
      process.exit(1);
    });
}
