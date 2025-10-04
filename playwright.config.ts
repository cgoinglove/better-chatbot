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
  timeout: 60 * 1000, // Increased timeout for agent operations
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 3,
  // Removed maxFailures - let tests run to completion and fail properly
  reporter: process.env.CI
    ? [
        ["html", { open: "never", outputFolder: "playwright-report" }],
        ["list"],
        ["json", { outputFile: "test-results/.last-run.json" }],
      ]
    : [["html"], ["list"]],
  use: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },

  globalSetup: "./tests/lifecycle/setup.global.ts",
  globalTeardown: "./tests/lifecycle/teardown.global.ts",

  projects: [
    // Standard test setup - seeds users before running tests
    {
      name: "setup",
      testMatch: /.*auth-states\.setup\.ts/,
    },

    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup"],
      testMatch: /.*\.spec\.ts/,
      testIgnore: [/.*\.setup\.ts/],
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
