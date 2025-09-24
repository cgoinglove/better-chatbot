import { test, expect } from "@playwright/test";
import { TEST_USERS } from "../constants/test-users";

// Use admin auth state for all tests in this file
test.use({ storageState: TEST_USERS.admin.authFile });

test.describe("Admin Users List", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/users");
    // Wait for the users table to load
    await page.waitForSelector("[data-testid='users-table']", {
      timeout: 10000,
    });
  });
  test.describe("Search State Preservation", () => {
    test("should maintain search state when navigating to user detail and back", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Perform a search
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Test");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      // Navigate to page 2 if available
      const page2Link = page.getByRole("link", { name: "2" });
      if (await page2Link.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page2Link.click();
        await page.waitForTimeout(500);
      }
      await page.waitForLoadState("networkidle");

      // Click on a user to navigate to detail page
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();

      // Wait for user detail page to load
      await page.waitForURL(/\/admin\/users\/.+/);
      await page.waitForSelector("[data-testid='user-detail-content']");
      await page.waitForLoadState("networkidle");

      // Click back button
      const backButton = page.getByTestId("admin-users-back-button");
      await backButton.click();
      await page.waitForLoadState("networkidle");

      // Should return to users list with search and pagination state preserved
      await page.waitForURL("/admin/users?page=2&query=Test");
      await page.waitForSelector("[data-testid='users-table']");

      // Search input should still contain "Test User"
      const searchValue = await searchInput.inputValue();
      expect(searchValue).toBe("Test");

      // Should still be on page 2 if we were there before
      if (await page2Link.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(page2Link).toHaveAttribute("aria-current", "page");
      }
    });

    test("should preserve search params in URL when navigating to user detail", async ({
      page,
    }) => {
      await page.goto(
        "/admin/users?search=Test&page=2&sort=name&direction=asc",
      );
      await page.waitForSelector("[data-testid='users-table']");
      await page.waitForLoadState("networkidle");

      // Click on a user
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();

      // Wait for user detail page
      await page.waitForURL(/\/admin\/users\/.+/);
      await page.waitForLoadState("networkidle");

      // URL should contain searchPageParams with encoded search state
      const currentUrl = page.url();
      expect(currentUrl).toContain("searchPageParams=");
    });
  });

  test.describe("Users Table", () => {
    test("should display user information in table rows", async ({ page }) => {
      await page.waitForLoadState("networkidle");
      // Check that user rows are displayed
      const rows = page.locator("[data-testid='users-table'] tbody tr");

      // Should have at least one user row
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);

      // First row should contain user data (name, email, etc.)
      const firstRowText = await rows.first().textContent();
      expect(firstRowText).toBeTruthy();
      expect(firstRowText).toMatch(/@/);
    });
    test("should display users table with correct columns", async ({
      page,
    }) => {
      // Check table is present
      await expect(page.getByTestId("users-table")).toBeVisible();

      // Check sortable headers exist
      await expect(page.getByTestId("sort-header-name")).toBeVisible();
      await expect(page.getByTestId("sort-header-role")).toBeVisible();
      await expect(page.getByTestId("header-status")).toBeVisible();
      await expect(page.getByTestId("sort-header-createdAt")).toBeVisible();
    });
  });

  test.describe("Pagination", () => {
    test("should display pagination controls", async ({ page }) => {
      // Check pagination is present
      const pagination = page.getByTestId("table-pagination");
      await expect(pagination).toBeVisible();

      // Check total count is displayed (should be more than 15 with our seeded data)
      const totalCount = page.getByTestId("users-total-count");
      await expect(totalCount).toBeVisible();
      const countText = await totalCount.textContent();
      expect(countText).toMatch(/\d+ users? total/);

      // Check navigation buttons exist (only Previous and Next are shown)
      await expect(
        page.getByRole("link", { name: "Go to previous page" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Go to next page" }),
      ).toBeVisible();
      // Page numbers should be visible
      await expect(page.getByRole("link", { name: "1" })).toBeVisible();
    });
    test("should navigate through pages", async ({ page }) => {
      // Initially on page 1 (check if page 1 button is active)
      await expect(page.getByRole("link", { name: "1" })).toHaveAttribute(
        "aria-current",
        "page",
      );

      // Click next page
      await page.getByRole("link", { name: "Go to next page" }).click();

      // Should be on page 2 (check if page 2 button is now active)
      await expect(page.getByRole("link", { name: "2" })).toHaveAttribute(
        "aria-current",
        "page",
      );

      // Click to go to page 3 if it exists
      const page3Link = page.getByRole("link", { name: "3" });
      if (await page3Link.isVisible()) {
        await page3Link.click();
        await expect(page.getByRole("link", { name: "3" })).toHaveAttribute(
          "aria-current",
          "page",
        );
      }

      // Previous page button should work
      await page.getByRole("link", { name: "Go to previous page" }).click();
      // Should now be on page 2
      await expect(page.getByRole("link", { name: "2" })).toHaveAttribute(
        "aria-current",
        "page",
      );

      // Click page 1 to go back to first page
      await page.getByRole("link", { name: "1" }).click();
      await expect(page.getByRole("link", { name: "1" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    test("should change items per page", async ({ page }) => {
      // Find the items per page selector
      const itemsPerPageSelect = page.getByRole("combobox", {
        name: /rows per page/i,
      });

      // Change to 20 items per page if possible
      if (
        await itemsPerPageSelect.isVisible({ timeout: 1000 }).catch(() => false)
      ) {
        await itemsPerPageSelect.click();
        const option20 = page.getByRole("option", { name: "20" });

        if (await option20.isVisible({ timeout: 1000 }).catch(() => false)) {
          await option20.click();
          await page.waitForTimeout(500);

          // Should now show different number of items
          const newRows = await page
            .locator("[data-testid='users-table'] tbody tr")
            .count();
          expect(newRows).toBeGreaterThanOrEqual(1);
          expect(newRows).toBeLessThanOrEqual(20);
        }
      }
    });
  });

  test.describe("Search", () => {
    test("should search for users", async ({ page }) => {
      // Search for a specific user (using the actual seeded admin user name)
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Admin");
      await searchInput.press("Enter");

      // Wait for search results
      await page.waitForTimeout(500);

      // Should show filtered results
      const rows = page.locator("[data-testid='users-table'] tbody tr");
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);

      // First result should match the search
      await expect(rows.first()).toContainText("Admin");
    });
  });

  test.describe("Sorting", () => {
    test("should sort users by different columns", async ({ page }) => {
      // Sort by name
      await page.getByTestId("sort-header-name").click();
      await page.waitForTimeout(500);

      // Get first row data
      const firstRowBefore = await page
        .locator("[data-testid='users-table'] tbody tr")
        .first()
        .textContent();

      // Sort by name again (should reverse order)
      await page.getByTestId("sort-header-name").click();
      await page.waitForTimeout(500);

      // Get first row data after sorting
      const firstRowAfter = await page
        .locator("[data-testid='users-table'] tbody tr")
        .first()
        .textContent();

      // Data should be different after sorting
      expect(firstRowBefore).not.toBe(firstRowAfter);

      // Sort by created date
      await page.getByTestId("sort-header-createdAt").click();
      await page.waitForTimeout(500);

      // Verify sorting indicator is visible
      const createdHeader = page.getByTestId("sort-header-createdAt");
      const sortIcon = createdHeader.locator("svg");
      await expect(sortIcon).toBeVisible();
    });
  });

  test.describe("Navigation", () => {
    test("should navigate to user detail page", async ({ page }) => {
      // Click on the first user row (entire row is clickable)
      const firstRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await firstRow.click();

      // Should navigate to user detail page
      await page.waitForURL(/\/admin\/users\/.+/);

      // User detail page should load
      await expect(page.getByTestId("user-detail-content")).toBeVisible({
        timeout: 10000,
      });
    });
  });
});
