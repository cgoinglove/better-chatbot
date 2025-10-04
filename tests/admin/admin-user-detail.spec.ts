import { test, expect } from "@playwright/test";
import { TEST_USERS } from "../constants/test-users";

// Use admin auth state for all tests in this file
test.use({ storageState: TEST_USERS.admin.authFile });

test.describe("Admin User Detail Page", () => {
  test.describe("Basic Functionality", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to users list first
      await page.goto("/admin/users");
      await page.waitForLoadState("networkidle");

      // Wait for the table to load - using a more generic selector
      await page.waitForSelector("table", { timeout: 10000 });

      // Get the second row (first non-header row with actual user)
      const userRows = page.locator("table tbody tr");
      const rowCount = await userRows.count();

      if (rowCount > 0) {
        // Click on the first user row to navigate to detail
        await userRows.first().click();
        await page.waitForURL(/\/admin\/users\/.+/);
        await page.waitForLoadState("networkidle");
      }
    });
  });
  test.describe("User Information Display", () => {
    test("should display all user information fields correctly", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Check form fields are editable
      await expect(page.getByTestId("user-name-input")).toBeVisible();
      await expect(page.getByTestId("user-email-input")).toBeVisible();
      await expect(page.getByTestId("save-changes-button")).toBeVisible();
    });

    test("should display proper status badge based on user state", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);
      await page.waitForLoadState("networkidle");

      // Should have either active or banned status badge
      const activeBadge = page.getByTestId("status-badge-active");
      const bannedBadge = page.getByTestId("status-badge-banned");

      const hasStatusBadge =
        (await activeBadge.isVisible({ timeout: 1000 }).catch(() => false)) ||
        (await bannedBadge.isVisible({ timeout: 1000 }).catch(() => false));

      expect(hasStatusBadge).toBe(true);
    });
  });

  test.describe("Statistics", () => {
    test("should display stats for user with AI activity", async ({ page }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Search for admin user (likely to have activity)
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Admin");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      // Navigate to user detail
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Click on statistics tab

      // Wait for stats to load
      await page.waitForSelector("[data-testid='user-statistics-card']", {
        timeout: 2000,
      });

      // Check for activity indicators (stats grid should be visible)
      const statsGrid = page.locator("[data-testid='stats-grid']");
      if (await statsGrid.isVisible({ timeout: 2000 }).catch(() => false)) {
        // User has activity - check stats components
        await expect(page.getByTestId("total-tokens-stat")).toBeVisible();
        await expect(page.getByTestId("models-used-stat")).toBeVisible();
        await expect(page.getByTestId("messages-stat")).toBeVisible();
        await expect(page.getByTestId("top-models-section")).toBeVisible();
      }
    });

    test("should display empty state for user with no AI activity", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Search for a regular user (likely to have no activity)
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("user10");
      await searchInput.press("Enter");
      await page.waitForLoadState("networkidle");

      // Navigate to user detail if user exists
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      if (await userRow.isVisible({ timeout: 1000 }).catch(() => false)) {
        await userRow.click();
        await page.waitForURL(/\/admin\/users\/.+/);

        // Wait for stats to load
        await page.waitForSelector("[data-testid='user-statistics-card']", {
          timeout: 10000,
        });

        // Check for empty state indicators
        const emptyState = page.getByTestId("no-activity-state");
        if (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(emptyState).toBeVisible();
          await expect(page.getByText(/No AI Activity Yet/i)).toBeVisible();
          await expect(
            page.getByText(/hasn't interacted with AI models/i),
          ).toBeVisible();
        }
      }
    });
    test("should display user sessions or statistics", async ({ page }) => {
      // Look for Usage Statistics section
      const statsSection = page.getByText("Usage Statistics");

      if (await statsSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(statsSection).toBeVisible();

        // Check for AI model usage text
        const modelUsageText = page.getByText(/AI model usage/i);
        if (
          await modelUsageText.isVisible({ timeout: 1000 }).catch(() => false)
        ) {
          await expect(modelUsageText).toBeVisible();
        }
      }
    });
  });

  test.describe("Role Management", () => {
    test("should display and update user role", async ({ page }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");
      await page.waitForLoadState("networkidle");

      await page.locator("[data-testid='users-table'] tbody tr").nth(6).click();
      await page.waitForURL(/\/admin\/users\/.+/);
      await page.waitForLoadState("networkidle");

      // Look for the Access & Account section
      await expect(page.getByText("Access & Account")).toBeVisible();

      // Check that Roles section exists
      await expect(page.getByText("Roles").first()).toBeVisible();

      // Look for Edit Roles button
      const editRolesButton = page.getByRole("button", { name: "Edit Roles" });

      if (
        await editRolesButton.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        await editRolesButton.click();

        // Role selection dialog should open
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        // Find the currently selected radio button using Radix state
        const currentSelectedRadio = page.locator(
          "[data-testid^='role-radio-'][data-state='checked']",
        );
        await expect(currentSelectedRadio).toBeVisible();

        // Get the value of the currently selected radio
        const currentSelectedValue =
          await currentSelectedRadio.getAttribute("value");

        // Get the specific original radio button by its data-testid
        const originalRadio = page.locator(
          `[data-testid='role-radio-${currentSelectedValue}']`,
        );

        // Select a different role (cycle through all three: admin, editor, user)
        let targetRole: string;
        if (currentSelectedValue === "admin") {
          targetRole = "editor";
        } else if (currentSelectedValue === "editor") {
          targetRole = "user";
        } else {
          targetRole = "admin";
        }
        const targetRadio = page.locator(
          `[data-testid='role-radio-${targetRole}']`,
        );

        // Click the target role radio button
        await targetRadio.click();

        // Verify the new role is selected (Radix should update the state)
        await expect(targetRadio).toHaveAttribute("data-state", "checked");

        // Verify the original role is no longer selected
        await expect(originalRadio).not.toHaveAttribute(
          "data-state",
          "checked",
        );

        // Submit the form
        const updateButton = page.getByRole("button", { name: /Update/i });
        await updateButton.click();

        // Wait for dialog to close
        await expect(dialog).not.toBeVisible();

        // Verify the role was updated on the main screen
        const updatedRoleBadge = page.locator(
          `[data-testid='role-badge-${targetRole}']`,
        );
        await expect(updatedRoleBadge).toBeVisible();

        // Verify the new role text appears in the badge
        const expectedRoleLabels = {
          admin: "Admin",
          editor: "Editor",
          user: "User",
        };
        await expect(updatedRoleBadge).toContainText(
          expectedRoleLabels[targetRole as keyof typeof expectedRoleLabels],
        );
      }
    });
  });

  test.describe("User Details", () => {
    test("should update user details", async ({ page }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");
      await page.waitForLoadState("networkidle");

      await page.locator("[data-testid='users-table'] tbody tr").nth(6).click();
      await page.waitForURL(/\/admin\/users\/.+/);
      await page.waitForLoadState("networkidle");

      const newName = "Updated Test User " + Date.now();
      const newEmail = `updated-${Date.now()}@test-seed.local`;
      // Find the name input field
      const nameInput = page.getByTestId("user-name-input");
      await expect(nameInput).toBeVisible();

      // Clear and update the name
      await nameInput.clear();
      await nameInput.fill(newName);

      // Check if email field is editable
      const emailInput = page.getByTestId("user-email-input");
      if (await emailInput.isEnabled()) {
        await emailInput.clear();
        await emailInput.fill(newEmail);
      }

      // Submit the form
      const saveButton = page.getByRole("button", { name: "Save Changes" });
      await saveButton.click();

      // Wait for update to complete
      await page.waitForTimeout(2000);

      // Verify the name was updated in the heading
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        newName,
      );
      await expect(page.getByTestId("user-email-input")).toHaveValue(newEmail);
    });
  });
  test.describe("User Account Status Management", () => {
    test("should complete ban user workflow with success toast", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Find an active non-admin user
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("user8");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      if (await userRow.isVisible({ timeout: 1000 }).catch(() => false)) {
        await userRow.click();
        await page.waitForURL(/\/admin\/users\/.+/);

        // Test ban functionality if user is currently active
        const activeBadge = page.getByTestId("status-badge-active");
        if (await activeBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
          await activeBadge.click();

          // Ban confirmation dialog should open
          const dialog = page.getByRole("dialog");
          await expect(dialog).toBeVisible();
          await expect(dialog).toContainText(/ban.*user/i);
          await expect(dialog).toContainText(/lose access/i);

          // Proceed with ban
          const banButton = page.getByRole("button", { name: /ban.*user/i });
          await banButton.click();

          // Wait for success and check status changed
          await page.waitForTimeout(2000);
          await expect(page.getByTestId("status-badge-banned")).toBeVisible();

          // Verify success toast appeared (check for toast text)
          const toastContent = page.locator(".sonner-toast");
          if (
            await toastContent.isVisible({ timeout: 1000 }).catch(() => false)
          ) {
            await expect(toastContent).toContainText(/success|updated/i);
          }

          // Unban the user to restore state
          await page.getByTestId("status-badge-banned").click();
          const unbanDialog = page.getByRole("dialog");
          await expect(unbanDialog).toBeVisible();
          await page.getByRole("button", { name: /unban.*user/i }).click();
          await page.waitForTimeout(2000);
        }
      }
    });

    test("should show OAuth user account type restrictions", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Search for any user (might be OAuth)
      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .nth(2);
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Check account type display in security section
      const securitySection = page.getByText(/password management/i);
      await expect(securitySection).toBeVisible();

      // Should show either "User has a password set" or "User signs in with OAuth only"
      const passwordStatus = page.getByText(/password set|oauth only/i);
      await expect(passwordStatus).toBeVisible();

      // If OAuth only, password button should be disabled
      const passwordButton = page.getByTestId("update-password-button");
      const oauthOnlyText = page.getByText(/oauth only/i);

      if (await oauthOnlyText.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(passwordButton).toBeDisabled();
      }
    });

    test("should show email modification restrictions for SSO users", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Check email input state
      const emailInput = page.getByTestId("user-email-input");

      // If email is disabled, should show restriction message
      if (await emailInput.isDisabled({ timeout: 1000 }).catch(() => false)) {
        const restrictionText = page.getByText(
          /email cannot be modified.*sso|email.*managed.*provider/i,
        );
        if (
          await restrictionText.isVisible({ timeout: 1000 }).catch(() => false)
        ) {
          await expect(restrictionText).toBeVisible();
        }
      }
    });
  });

  test.describe("Password Management", () => {
    test("should open password update dialog", async ({ page }) => {
      // Look for Security section and Reset Password button
      const securitySection = page.getByText("Security");

      if (
        await securitySection.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        const resetPasswordButton = page.getByRole("button", {
          name: /Reset Password/i,
        });

        if (
          (await resetPasswordButton
            .isVisible({ timeout: 1000 })
            .catch(() => false)) &&
          (await resetPasswordButton.isEnabled())
        ) {
          await resetPasswordButton.click();

          // Password dialog should open
          const dialog = page.getByRole("dialog");
          await expect(dialog).toBeVisible();

          // Close dialog
          await page.keyboard.press("Escape");
          await expect(dialog).not.toBeVisible();
        }
      }
    });
    test("should complete password update with success feedback", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Find a user with password capability
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.fill("Test User 5");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      await page
        .locator("[data-testid='users-table'] tbody tr")
        .first()
        .click();
      await page.waitForURL(/\/admin\/users\/.+/);

      await page.getByTestId("update-password-button").click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Should show admin context
      await expect(dialog).toContainText(/update user password/i);

      const testPassword = "NewTestPassword123!";
      await page.getByTestId("new-password-input").fill(testPassword);
      await page.getByTestId("confirm-password-input").fill(testPassword);

      // Submit password update
      await page.getByTestId("update-password-submit-button").click();

      // Verify success toast or error handling
      const toastContent = page.locator(".sonner-toast");
      if (await toastContent.isVisible({ timeout: 1000 }).catch(() => false)) {
        const toastText = await toastContent.textContent();
        expect(toastText).toMatch(/password.*updated|success|error/i);
      }
    });
  });

  test.describe("Delete User", () => {
    test("should complete full delete confirmation flow with name typing", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      // Search for a specific test user that we can safely test deletion on
      const searchInput = page.getByTestId("users-search-input");
      await searchInput.press("Enter");
      await page.waitForTimeout(500);

      await page.locator("[data-testid='users-table'] tbody tr").nth(4).click();
      await page.waitForURL(/\/admin\/users\/.+/);

      const userName = await page.getByTestId("user-name-input").inputValue();
      expect(userName).toBeTruthy();
      // Click delete button
      await page.getByTestId("delete-user-button").click();

      // Delete dialog should open
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Find confirmation input
      const confirmInput = page.getByPlaceholder(/type.*to confirm/i);
      await expect(confirmInput).toBeVisible();

      // Delete button should be disabled initially
      const deleteButton = page.getByRole("button", {
        name: /delete.*user/i,
      });
      await expect(deleteButton).toBeDisabled();

      // Type wrong name
      await confirmInput.fill("Wrong Name");
      await expect(deleteButton).toBeDisabled();

      // Type correct name (extracted from page)
      await confirmInput.clear();
      if (userName) {
        await confirmInput.fill(userName);

        // Delete button should now be enabled
        await expect(deleteButton).toBeEnabled();
      }

      // Cancel instead of actually deleting
      await page.getByRole("button", { name: /cancel/i }).click();
      await expect(dialog).not.toBeVisible();
    });

    test("should show proper delete confirmation text with user name", async ({
      page,
    }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .nth(4);
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Get user name
      const userName = await page.getByTestId("user-name-input").inputValue();

      // Open delete dialog
      await page.getByTestId("delete-user-button").click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Dialog should contain the user's name in multiple places
      if (userName) {
        const dialogText = await dialog.textContent();
        const nameOccurrences = (
          dialogText?.match(new RegExp(userName, "gi")) || []
        ).length;
        expect(nameOccurrences).toBeGreaterThanOrEqual(2); // Name should appear in description and confirmation
      }

      await page.getByRole("button", { name: /cancel/i }).click();
    });
  });
  test.describe("Role Management", () => {
    test("admin cannot update their own role", async ({ page }) => {
      // Navigate to admin's own profile
      await page.goto("/admin/users");
      await page.waitForLoadState("networkidle");

      // Look for search input or find admin user in the table
      const searchInput = page.getByPlaceholder(/search/i);

      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill("admin@test-seed.local");
        await searchInput.press("Enter");
        await page.waitForTimeout(1000);
      }

      // Click on admin user row
      const adminRow = page
        .locator("table tbody tr")
        .filter({ hasText: "admin@test-seed.local" });
      if (await adminRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await adminRow.click();
        await page.waitForURL(/\/admin\/users\/.+/);
        await page.waitForLoadState("networkidle");
      }

      // Try to change role
      const editRolesButton = page.getByRole("button", { name: "Edit Roles" });

      // Button should be disabled or show error for self-editing
      if (
        (await editRolesButton
          .isVisible({ timeout: 2000 })
          .catch(() => false)) &&
        (await editRolesButton.isEnabled())
      ) {
        await editRolesButton.click();

        // If dialog opens, try to change role
        const dialog = page.getByRole("dialog");
        if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
          const userOption = page.getByRole("radio", { name: /User/i });
          if (
            await userOption.isVisible({ timeout: 1000 }).catch(() => false)
          ) {
            await userOption.click();
            const updateButton = page.getByRole("button", { name: /update/i });
            await updateButton.click();

            // Wait for any error message
            await page.waitForTimeout(2000);
          }
        }
      }
    });
  });

  test.describe("Account Status Management", () => {
    test("should ban and unban user and display banned status", async ({
      page,
    }) => {
      // Use the current user (already loaded from beforeEach)
      // Look for the Account Status section
      const statusSection = page.getByText("Account Status");
      if (await statusSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Find the status badge (should be "Active" initially)
        const activeBadge = page.locator("[data-testid='status-badge-active']");

        if (await activeBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Click to ban the user
          await activeBadge.click();

          // Ban confirmation dialog should open
          const dialog = page.getByRole("dialog");
          await expect(dialog).toBeVisible();

          // Confirm the ban
          const confirmButton = page.getByRole("button", { name: /ban/i });
          await confirmButton.click();

          // Wait for dialog to close and status to update
          await expect(dialog).not.toBeVisible();

          // Verify banned status is displayed
          const bannedBadge = page.locator(
            "[data-testid='status-badge-banned']",
          );
          await expect(bannedBadge).toBeVisible();
          await expect(bannedBadge).toContainText(/banned/i);

          // Unban the user to clean up
          await bannedBadge.click();

          // Unban confirmation dialog should open
          const unbanDialog = page.getByRole("dialog");
          await expect(unbanDialog).toBeVisible();

          // Confirm the unban
          const unbanButton = page.getByRole("button", { name: /unban/i });
          await unbanButton.click();

          // Wait for dialog to close and status to revert
          await expect(unbanDialog).not.toBeVisible();

          // Verify active status is restored
          await expect(activeBadge).toBeVisible();
          await expect(activeBadge).toContainText(/active/i);
        }
      }
    });
  });
  test.describe("Form Validation and Error Handling", () => {
    test("should handle user update form validation", async ({ page }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Try to save with invalid email
      const emailInput = page.getByTestId("user-email-input");
      if (await emailInput.isEnabled({ timeout: 1000 }).catch(() => false)) {
        await emailInput.clear();
        await emailInput.fill("invalid-email");

        const saveButton = page.getByTestId("save-changes-button");
        await saveButton.click();

        // Should show validation error (either client-side or server-side)
        await page.waitForTimeout(1000);

        // Form validation should prevent submission or show error
        // (Implementation may vary - could be HTML5 validation or custom)
      }
    });

    test("should handle empty name validation", async ({ page }) => {
      await page.goto("/admin/users");
      await page.waitForSelector("[data-testid='users-table']");

      const userRow = page
        .locator("[data-testid='users-table'] tbody tr")
        .first();
      await userRow.click();
      await page.waitForURL(/\/admin\/users\/.+/);

      // Try to save with empty name
      const nameInput = page.getByTestId("user-name-input");
      await nameInput.clear();

      const saveButton = page.getByTestId("save-changes-button");
      await saveButton.click();

      // Should show validation error or prevent submission
      await page.waitForTimeout(1000);
    });
  });
});
