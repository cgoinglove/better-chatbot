import { test, expect } from "@playwright/test";
import { TEST_USERS } from "../constants/test-users";
import { ensureSidebarOpen } from "../helpers/sidebar-helper";

test.describe("Permissions", () => {
  test("regular user can access basic functionality", async ({ browser }) => {
    // Create context with regular user auth
    const context = await browser.newContext({
      storageState: TEST_USERS.regular.authFile,
    });
    const page = await context.newPage();

    // Regular users might access through profile/settings
    // Test basic navigation works
    await page.goto("/");

    // Check if user has access to basic functionality
    await page.waitForLoadState("networkidle");
    const url = page.url();
    expect(url).not.toContain("/sign-in");

    await context.close();
  });

  test("editor user can access application but not admin panel", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.editor.authFile,
    });
    const page = await context.newPage();

    // Editor should have access to main app
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const homeUrl = page.url();
    expect(homeUrl).not.toContain("/sign-in");

    // But should not have access to admin panel
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("401")).toBeVisible();
  });

  test("regular user cannot access admin panel", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.regular.authFile,
    });
    const page = await context.newPage();

    // But should not have access to admin panel
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("401")).toBeVisible();

    await context.close();
  });
  test("ensure admin sidebar link is visible to admin", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.admin.authFile,
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await ensureSidebarOpen(page);
    await expect(page.getByTestId("admin-sidebar-link")).toBeVisible();
    await context.close();
  });
  test("ensure admin sidebar link is not visible to editor", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.editor.authFile,
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await ensureSidebarOpen(page);
    await expect(page.getByTestId("admin-sidebar-link")).not.toBeVisible();
    await context.close();
  });
  test("ensure admin sidebar link is not visible to regular user", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.regular.authFile,
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await ensureSidebarOpen(page);
    await expect(page.getByTestId("admin-sidebar-link")).not.toBeVisible();
    await context.close();
  });
  test("ensure admin sidebar link goes to users page and shows user menu", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.admin.authFile,
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await ensureSidebarOpen(page);
    await page.getByTestId("admin-sidebar-link").click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("admin-sidebar-link-users")).toBeVisible();
    expect(page.url()).toContain("/admin/users");
    await context.close();
  });
});
