/**
 * Shared test user credentials for E2E tests
 * These users are created by the seed script: pnpm test:e2e:seed
 */

export const TEST_USERS = {
  admin: {
    email: "admin@test-seed.local",
    password: "AdminPassword123!",
    name: "Test Admin User",
    role: "admin",
    authFile: "tests/.auth/admin.json",
  },
  editor: {
    email: "editor@test-seed.local",
    password: "EditorPassword123!",
    name: "Test Editor User",
    role: "editor",
    authFile: "tests/.auth/editor-user.json",
  },
  editor2: {
    email: "editor2@test-seed.local",
    password: "Editor2Password123!",
    name: "Test Editor User 2",
    role: "editor",
    authFile: "tests/.auth/editor-user2.json",
  },
  regular: {
    email: "user@test-seed.local",
    password: "UserPassword123!",
    name: "Test Regular User",
    role: "user",
    authFile: "tests/.auth/regular-user.json",
  },
  banned: {
    email: "testuser21@test-seed.local",
    password: "TestPass21!",
    name: "Test User 21",
    role: "user",
    banReason: "Test ban for E2E testing",
  },
  // Additional test users for pagination testing
  testUsers: Array.from({ length: 18 }, (_, i) => ({
    email: `testuser${i + 4}@test-seed.local`,
    password: `TestPass${i + 4}!`,
    name: `Test User ${i + 4}`,
    role: i + 4 <= 9 ? "editor" : "user",
  })),
} as const;

// Test email domain for easy identification and cleanup
export const TEST_EMAIL_DOMAIN = "@test-seed.local";

// Patterns for identifying test users to clean up
export const TEST_EMAIL_PATTERNS = {
  seeded: "%@test-seed.local%", // Our seeded test users
  playwright: "%playwright%", // Dynamically created playwright users
  example: "%@example.com%", // Test signup users
  tempTest: "%@temp-test.%", // Temporary test users
} as const;
