import { test as setup, expect } from "@playwright/test";
import * as fs from "node:fs";
import { TEST_USERS } from "../constants/test-users";

// Login with already-seeded admin user and save auth state
setup("create admin auth state", async ({ page }) => {
  console.log("🔐 Creating admin auth state...");

  // Login as the pre-seeded admin user
  await page.goto("/sign-in");

  // Sign in with the seeded admin user
  await page.locator("#email").fill(TEST_USERS.admin.email);
  await page.locator("#password").fill(TEST_USERS.admin.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  // Wait for redirect after successful login
  await page.waitForURL(
    (url) => {
      const urlStr = url.toString();
      return !urlStr.includes("/sign-in") && !urlStr.includes("/sign-up");
    },
    { timeout: 10000 },
  );

  // Save admin auth state
  await page.context().storageState({ path: TEST_USERS.admin.authFile });
  expect(fs.existsSync(TEST_USERS.admin.authFile)).toBeTruthy();
});

// Login with already-seeded editor user and save auth state
setup("create editor auth state", async ({ page }) => {
  console.log("🔐 Creating editor auth state...");
  await page.goto("/sign-in");

  // Sign in with the seeded editor user
  await page.locator("#email").fill(TEST_USERS.editor.email);
  await page.locator("#password").fill(TEST_USERS.editor.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  // Wait for redirect after successful login
  await page.waitForURL(
    (url) => {
      const urlStr = url.toString();
      return !urlStr.includes("/sign-in") && !urlStr.includes("/sign-up");
    },
    { timeout: 10000 },
  );

  // Save editor user auth state
  await page.context().storageState({ path: TEST_USERS.editor.authFile });
  expect(fs.existsSync(TEST_USERS.editor.authFile)).toBeTruthy();
});

// Login with already-seeded regular user and save auth state
setup("create regular user auth state", async ({ page }) => {
  console.log("🔐 Creating regular user auth state...");
  await page.goto("/sign-in");

  // Sign in with the seeded regular user
  await page.locator("#email").fill(TEST_USERS.regular.email);
  await page.locator("#password").fill(TEST_USERS.regular.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  // Wait for redirect after successful login
  await page.waitForURL(
    (url) => {
      const urlStr = url.toString();
      return !urlStr.includes("/sign-in") && !urlStr.includes("/sign-up");
    },
    { timeout: 10000 },
  );

  // Save regular user auth state
  await page.context().storageState({ path: TEST_USERS.regular.authFile });
  expect(fs.existsSync(TEST_USERS.regular.authFile)).toBeTruthy();
});
