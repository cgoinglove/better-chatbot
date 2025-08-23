import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Load environment variables
if (process.env.CI) {
  config({ path: ".env.test" });
} else {
  config();
}

export default defineConfig({
  testDir: "./tests",
  timeout: 30 * 1000, // Increased timeout for agent operations
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },

  globalTeardown: "./tests/lifecycle/teardown.global.ts",

  projects: [
    // Setup project to create authentication states
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup"],
      testIgnore: [/.*\.setup\.ts/, /.*mobile.*\.spec\.ts/],
    },

    // Mobile tests
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 667 }, // iPhone SE size
      },
      dependencies: ["setup"],
      testMatch: /.*mobile.*\.spec\.ts/,
    },
  ],

  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // 3 minutes for build and start
    stdout: "pipe",
    stderr: "pipe",
  },
});
