import { test, expect } from "@playwright/test";

test.describe("Unauthenticated User Experience", () => {
  test("should load the landing page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Basic app health check
    await expect(page.locator("body")).toBeVisible();

    // Should have a title
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test("should redirect to sign-in from protected routes", async ({ page }) => {
    await page.goto("/agents");
    await page.waitForLoadState("networkidle");

    // Should redirect to auth page or show login UI
    const currentUrl = page.url();
    expect(
      currentUrl.includes("/sign-in") || currentUrl.includes("/sign-up"),
    ).toBeTruthy();
  });

  test("should display sign-in page", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    // Should show sign-in form elements
    await expect(
      page.locator(
        'input[type="email"], input[name="email"], input[id="email"]',
      ),
    ).toBeVisible();
    await expect(
      page.locator(
        'button[type="submit"], button:has-text("Sign in"), button:has-text("Continue")',
      ),
    ).toBeVisible();
  });

  test("should display sign-up page", async ({ page }) => {
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");

    // Should show sign-up form elements
    await expect(page.getByTestId("email-signup-button")).toBeVisible();
  });

  test("should navigate between sign-in and sign-up pages", async ({
    page,
  }) => {
    // Test that both authentication pages are accessible
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/sign-in");

    // Verify sign-in page has expected elements
    await expect(page.getByTestId("signin-submit-button")).toBeVisible();

    // Navigate to sign-up page
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/sign-up");

    // Verify sign-up page has expected elements
    await expect(page.getByTestId("email-signup-button")).toBeVisible();

    // Verify we can navigate back to sign-in
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/sign-in");

    // Verify sign-in page has expected elements
    await expect(page.getByTestId("signin-submit-button")).toBeVisible();
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });

  test("should have no critical console errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          !text.includes("API key") &&
          !text.includes("401") &&
          !text.includes("403") &&
          !text.includes("fetch") &&
          !text.includes("MCP")
        ) {
          errors.push(text);
        }
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(errors).toEqual([]);
  });
});
