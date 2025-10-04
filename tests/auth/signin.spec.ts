import { test, expect } from "@playwright/test";
import { TEST_USERS } from "../constants/test-users";

test.describe("User Signin", () => {
  test("should allow signin with valid seeded user credentials", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    // Sign in with admin user
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

    // Verify we're authenticated
    const url = page.url();
    expect(url).not.toContain("/sign-in");
    expect(url).not.toContain("/sign-up");

    await page.waitForLoadState("networkidle");
  });

  test("should handle invalid credentials", async ({ page }) => {
    await page.goto("/sign-in");

    // Try with invalid credentials
    await page.locator("#email").fill("nonexistent@test-seed.local");
    await page.locator("#password").fill("WrongPassword123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Should still be on sign-in page or show error message
    const emailInput = page.locator("#email");
    await expect(emailInput).toBeVisible();
  });

  test("should handle empty form submission", async ({ page }) => {
    await page.goto("/sign-in");

    // Try to submit empty form
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Should show validation or stay on page
    const emailInput = page.locator("#email");
    const passwordInput = page.locator("#password");
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test("should navigate to sign-up from sign-in", async ({ page }) => {
    await page.goto("/sign-in");

    // Look for sign-up link
    const signUpLink = page.getByRole("link", { name: /sign.?up/i });

    // The sign-in page should have a sign-up link
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();

    // Should navigate to sign-up page
    await page.waitForURL(/.*sign-up.*/, { timeout: 5000 });

    // Verify we're on sign-up page
    const currentUrl = page.url();
    expect(currentUrl).toContain("/sign-up");
  });

  test("should signin with different user roles", async ({ page }) => {
    // Test editor user signin
    await page.goto("/sign-in");

    await page.locator("#email").fill(TEST_USERS.editor.email);
    await page.locator("#password").fill(TEST_USERS.editor.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await page.waitForURL(
      (url) => {
        const urlStr = url.toString();
        return !urlStr.includes("/sign-in") && !urlStr.includes("/sign-up");
      },
      { timeout: 10000 },
    );

    // Verify authentication
    expect(page.url()).not.toContain("/sign-in");

    // Sign out - we need to clear cookies and storage to test another user
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Navigate back to sign-in
    await page.goto("/sign-in");

    // Test regular user signin
    await page.locator("#email").fill(TEST_USERS.regular.email);
    await page.locator("#password").fill(TEST_USERS.regular.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await page.waitForURL(
      (url) => {
        const urlStr = url.toString();
        return !urlStr.includes("/sign-in") && !urlStr.includes("/sign-up");
      },
      { timeout: 10000 },
    );

    expect(page.url()).not.toContain("/sign-in");
  });

  test("should remember email on failed login", async ({ page }) => {
    await page.goto("/sign-in");

    const testEmail = TEST_USERS.admin.email;

    // Enter correct email but wrong password
    await page.locator("#email").fill(testEmail);
    await page.locator("#password").fill("WrongPassword123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Wait for potential error
    await page.waitForTimeout(2000);

    // Email should still be filled
    const emailInput = page.locator("#email");
    await expect(emailInput).toHaveValue(testEmail);

    // Password field behavior can vary - it might be cleared or not
    // Let's just check that both fields are still visible
    const passwordInput = page.locator("#password");
    await expect(passwordInput).toBeVisible();
  });
});
