import { test, expect } from "@playwright/test";
import {
  clickAndWaitForNavigation,
  openDropdown,
  selectDropdownOption,
} from "../utils/test-helpers";

// Test names to ensure uniqueness across test runs
const testSuffix =
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const publicAgentName = `Public Agent ${testSuffix}`;
const privateAgentName = `Private Agent ${testSuffix}`;
const readonlyAgentName = `Readonly Agent ${testSuffix}`;

test.describe.configure({ mode: "serial" });

test.describe("Agent Visibility and Sharing Between Users", () => {
  test.beforeAll(
    "admin creates agents with different visibility levels",
    async ({ browser }) => {
      // Use admin to set up test agents with different visibility levels
      const adminContext = await browser.newContext({
        storageState: "tests/.auth/admin.json",
      });
      const adminPage = await adminContext.newPage();

      try {
        // Create public agent
        await adminPage.goto("/agent/new");
        await adminPage.waitForLoadState("networkidle");

        await adminPage.getByTestId("agent-name-input").fill(publicAgentName);
        await adminPage
          .getByTestId("agent-description-input")
          .fill("This is a public agent that anyone can see and edit");
        await clickAndWaitForNavigation(
          adminPage,
          "agent-save-button",
          "**/agents",
        );

        // Edit to set visibility to public
        await adminPage
          .locator(`main a:has-text("${publicAgentName}")`)
          .first()
          .click();
        await adminPage.waitForURL("**/agent/**", { timeout: 10000 });

        // Open visibility dropdown and select public
        await openDropdown(adminPage, "visibility-button");
        await selectDropdownOption(adminPage, "visibility-public");

        await clickAndWaitForNavigation(
          adminPage,
          "agent-save-button",
          "**/agents",
        );
        await adminPage.waitForLoadState("networkidle");

        // Create private agent (default is private)
        await adminPage.goto("/agent/new");
        await adminPage.waitForLoadState("networkidle");
        await adminPage.getByTestId("agent-name-input").fill(privateAgentName);
        await adminPage
          .getByTestId("agent-description-input")
          .fill("This is a private agent that only the owner can see");
        await clickAndWaitForNavigation(
          adminPage,
          "agent-save-button",
          "**/agents",
        );

        // Create readonly agent
        await adminPage.goto("/agent/new");
        await adminPage.waitForLoadState("networkidle");
        await adminPage.getByTestId("agent-name-input").fill(readonlyAgentName);
        await adminPage
          .getByTestId("agent-description-input")
          .fill("This is a readonly agent that others can see but not edit");
        await clickAndWaitForNavigation(
          adminPage,
          "agent-save-button",
          "**/agents",
        );

        // Edit to set visibility to readonly
        await adminPage
          .locator(`main a:has-text("${readonlyAgentName}")`)
          .first()
          .click();
        await adminPage.waitForURL("**/agent/**", { timeout: 10000 });
        // Open visibility dropdown and select readonly
        await openDropdown(adminPage, "visibility-button");
        await selectDropdownOption(adminPage, "visibility-readonly");

        await clickAndWaitForNavigation(
          adminPage,
          "agent-save-button",
          "**/agents",
        );
        await adminPage.waitForLoadState("networkidle");
      } finally {
        await adminContext.close();
      }
    },
  );

  test("different user can see public and readonly agents but not private", async ({
    browser,
  }) => {
    // Create second user context (using editor auth, but role doesn't matter for sharing)
    const secondUserContext = await browser.newContext({
      storageState: "tests/.auth/editor-user.json",
    });
    const secondUserPage = await secondUserContext.newPage();

    try {
      await secondUserPage.goto("/agents");
      await secondUserPage.waitForLoadState("networkidle");

      // Should see the public agent
      const publicAgent = secondUserPage.locator(
        `[data-testid="agent-card-name"]:has-text("${publicAgentName}")`,
      );
      await expect(publicAgent).toBeVisible({ timeout: 10000 });

      // Should see the readonly agent
      const readonlyAgent = secondUserPage.locator(
        `[data-testid="agent-card-name"]:has-text("${readonlyAgentName}")`,
      );
      await expect(readonlyAgent).toBeVisible({ timeout: 10000 });

      // Should NOT see the private agent
      const privateAgent = secondUserPage.locator(
        `[data-testid="agent-card-name"]:has-text("${privateAgentName}")`,
      );
      await expect(privateAgent).not.toBeVisible();
    } finally {
      await secondUserContext.close();
    }
  });

  test("different user can edit public agent", async ({ browser }) => {
    // Create second user context (using editor auth, but role doesn't matter for sharing)
    const secondUserContext = await browser.newContext({
      storageState: "tests/.auth/editor-user.json",
    });
    const secondUserPage = await secondUserContext.newPage();

    try {
      await secondUserPage.goto("/agents");
      await secondUserPage.waitForLoadState("networkidle");

      // Click on the public agent
      await secondUserPage
        .locator(`main a:has-text("${publicAgentName}")`)
        .first()
        .click();
      await secondUserPage.waitForURL("**/agent/**", { timeout: 10000 });

      // Should be able to see and modify the form fields
      const nameInput = secondUserPage.getByTestId("agent-name-input");
      const descriptionInput = secondUserPage.getByTestId(
        "agent-description-input",
      );
      const saveButton = secondUserPage.getByTestId("agent-save-button");

      await expect(nameInput).toBeVisible();
      await expect(nameInput).toBeEnabled();
      await expect(descriptionInput).toBeVisible();
      await expect(descriptionInput).toBeEnabled();
      await expect(saveButton).toBeVisible();
      await expect(saveButton).toBeEnabled();

      // Verify current values and make a small edit
      await expect(nameInput).toHaveValue(publicAgentName);
      await nameInput.clear();
      await nameInput.fill(`${publicAgentName} (edited by user2)`);

      // Should be able to save
      await Promise.all([
        secondUserPage.waitForURL("**/agents", { timeout: 10000 }),
        saveButton.click(),
      ]);

      // Verify the edit was successful
      const editedAgent = secondUserPage.locator(
        `[data-testid="agent-card-name"]:has-text("${publicAgentName} (edited by user2)")`,
      );
      await expect(editedAgent).toBeVisible();
    } finally {
      await secondUserContext.close();
    }
  });

  test("different user can view but not edit readonly agent", async ({
    browser,
  }) => {
    // Create second user context (using editor auth, but role doesn't matter for sharing)
    const secondUserContext = await browser.newContext({
      storageState: "tests/.auth/editor-user.json",
    });
    const secondUserPage = await secondUserContext.newPage();

    try {
      await secondUserPage.goto("/agents");
      await secondUserPage.waitForLoadState("networkidle");

      // Click on the readonly agent
      await secondUserPage
        .locator(`main a:has-text("${readonlyAgentName}")`)
        .first()
        .click();
      await secondUserPage.waitForURL("**/agent/**", { timeout: 10000 });

      // Should be able to see the form fields but they should be disabled
      const nameInput = secondUserPage.getByTestId("agent-name-input");
      const descriptionInput = secondUserPage.getByTestId(
        "agent-description-input",
      );

      await expect(nameInput).toBeVisible();
      await expect(nameInput).toBeDisabled();
      await expect(descriptionInput).toBeVisible();
      await expect(descriptionInput).toBeDisabled();

      // Save button should not be visible or should be disabled
      const saveButton = secondUserPage.getByTestId("agent-save-button");
      await expect(saveButton).not.toBeVisible();

      // Verify current values are visible
      await expect(nameInput).toHaveValue(readonlyAgentName);
    } finally {
      await secondUserContext.close();
    }
  });

  test("different user can bookmark public and readonly agents", async ({
    browser,
  }) => {
    // Create second user context (using editor auth, but role doesn't matter for sharing)
    const secondUserContext = await browser.newContext({
      storageState: "tests/.auth/editor-user.json",
    });
    const secondUserPage = await secondUserContext.newPage();

    try {
      await secondUserPage.goto("/agents");
      await secondUserPage.waitForURL("**/agents", { timeout: 10000 });

      // Find and bookmark the public agent (now with edited name)
      const publicAgentCard = secondUserPage.locator(
        `[data-testid*="agent-card"][data-item-name="${publicAgentName} (edited by user2)"]`,
      );
      await publicAgentCard.getByTestId("bookmark-button").click();
      await secondUserPage.getByTestId("sidebar-toggle").click();
      await expect(
        secondUserPage.getByTestId("agents-sidebar-menu"),
      ).toContainText(publicAgentName);

      // Find and bookmark the readonly agent
      const readonlyAgentCard = secondUserPage.locator(
        `[data-testid*="agent-card"][data-item-name="${readonlyAgentName}"]`,
      );
      await readonlyAgentCard.getByTestId("bookmark-button").click();

      await expect(
        secondUserPage.getByTestId("agents-sidebar-menu"),
      ).toContainText(readonlyAgentName);

      // Remove bookmarks from Agents and verify they are removed from sidebar
      await readonlyAgentCard.getByTestId("bookmark-button").click();
      await expect(
        secondUserPage.getByTestId("agents-sidebar-menu"),
      ).not.toContainText(readonlyAgentName);

      await publicAgentCard.getByTestId("bookmark-button").click();
      await expect(
        secondUserPage.getByTestId("agents-sidebar-menu"),
      ).not.toContainText(publicAgentName);
    } finally {
      await secondUserContext.close();
    }
  });
});
