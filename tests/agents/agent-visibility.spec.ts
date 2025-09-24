import { test, expect } from "@playwright/test";
import {
  clickAndWaitForNavigation,
  openDropdown,
  selectDropdownOption,
} from "../utils/test-helpers";
import { TEST_USERS } from "../constants/test-users";

// Test names to ensure uniqueness across test runs
const testSuffix =
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const publicAgentName = `Public Agent ${testSuffix}`;
const privateAgentName = `Private Agent ${testSuffix}`;
const readonlyAgentName = `Readonly Agent ${testSuffix}`;

test.describe.configure({ mode: "serial" });

test.describe("Agent Visibility and Sharing Between Users", () => {
  test.beforeAll(
    "editor creates agents with different visibility levels",
    async ({ browser }) => {
      // Use admin to set up test agents with different visibility levels
      const editorContext = await browser.newContext({
        storageState: TEST_USERS.editor.authFile,
      });
      const editorPage = await editorContext.newPage();

      try {
        // Create public agent
        await editorPage.goto("/agent/new");
        await editorPage.waitForLoadState("networkidle");

        await editorPage.getByTestId("agent-name-input").fill(publicAgentName);
        await editorPage
          .getByTestId("agent-description-input")
          .fill("This is a public agent that anyone can see and edit");
        await clickAndWaitForNavigation(
          editorPage,
          "agent-save-button",
          "**/agents",
        );

        // Edit to set visibility to public
        await editorPage
          .locator(`main a:has-text("${publicAgentName}")`)
          .first()
          .click();
        await editorPage.waitForURL("**/agent/**", { timeout: 10000 });

        // Open visibility dropdown and select public
        await openDropdown(editorPage, "visibility-button");
        await selectDropdownOption(editorPage, "visibility-public");

        await clickAndWaitForNavigation(
          editorPage,
          "agent-save-button",
          "**/agents",
        );
        await editorPage.waitForLoadState("networkidle");

        // Create private agent (default is private)
        await editorPage.goto("/agent/new");
        await editorPage.waitForLoadState("networkidle");
        await editorPage.getByTestId("agent-name-input").fill(privateAgentName);
        await editorPage
          .getByTestId("agent-description-input")
          .fill("This is a private agent that only the owner can see");
        await clickAndWaitForNavigation(
          editorPage,
          "agent-save-button",
          "**/agents",
        );

        // Create readonly agent
        await editorPage.goto("/agent/new");
        await editorPage.waitForLoadState("networkidle");
        await editorPage
          .getByTestId("agent-name-input")
          .fill(readonlyAgentName);
        await editorPage
          .getByTestId("agent-description-input")
          .fill("This is a readonly agent that others can see but not edit");
        await clickAndWaitForNavigation(
          editorPage,
          "agent-save-button",
          "**/agents",
        );

        // Edit to set visibility to readonly
        await editorPage
          .locator(`main a:has-text("${readonlyAgentName}")`)
          .first()
          .click();
        await editorPage.waitForURL("**/agent/**", { timeout: 10000 });
        // Open visibility dropdown and select readonly
        await openDropdown(editorPage, "visibility-button");
        await selectDropdownOption(editorPage, "visibility-readonly");

        await clickAndWaitForNavigation(
          editorPage,
          "agent-save-button",
          "**/agents",
        );
        await editorPage.waitForLoadState("networkidle");
      } finally {
        await editorContext.close();
      }
    },
  );

  test("different user can see public and readonly agents but not private", async ({
    browser,
  }) => {
    // Create second user context (using editor auth, but role doesn't matter for sharing)
    const secondUserContext = await browser.newContext({
      storageState: TEST_USERS.editor2.authFile,
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
      storageState: TEST_USERS.editor2.authFile,
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
      storageState: TEST_USERS.editor2.authFile,
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
      storageState: TEST_USERS.editor2.authFile,
    });
    const secondUserPage = await secondUserContext.newPage();

    try {
      await secondUserPage.goto("/agents");
      await secondUserPage.waitForURL("**/agents", { timeout: 10000 });
      await secondUserPage.waitForLoadState("networkidle");

      // Wait a bit for agents to load
      await secondUserPage.waitForTimeout(1000);

      // Find and bookmark the public agent
      // Note: Look for both original and potentially edited names since tests run in serial mode
      const publicAgentCard = secondUserPage
        .locator(`[data-testid*="agent-card"]`)
        .filter({
          has: secondUserPage.locator(`[data-testid="agent-card-name"]`, {
            hasText: new RegExp(publicAgentName),
          }),
        })
        .first();

      // Scroll the card into view and click bookmark
      await publicAgentCard.scrollIntoViewIfNeeded();
      await publicAgentCard.getByTestId("bookmark-button").click();

      // Wait for bookmark to process and refresh to sync
      await secondUserPage.waitForTimeout(1000);
      await secondUserPage.reload();
      await secondUserPage.waitForLoadState("networkidle");

      // Open sidebar to check bookmarks
      await secondUserPage.getByTestId("sidebar-toggle").click();
      await secondUserPage.waitForTimeout(500);

      await expect(
        secondUserPage.getByTestId("agents-sidebar-menu"),
      ).toContainText(publicAgentName, { timeout: 10000 });

      // Find and bookmark the readonly agent
      const readonlyAgentCard = secondUserPage
        .locator(`[data-testid*="agent-card"]`)
        .filter({
          has: secondUserPage.locator(`[data-testid="agent-card-name"]`, {
            hasText: readonlyAgentName,
          }),
        })
        .first();

      await readonlyAgentCard.scrollIntoViewIfNeeded();
      await readonlyAgentCard.getByTestId("bookmark-button").click();
      await secondUserPage.waitForTimeout(1000);

      await expect(
        secondUserPage.getByTestId("agents-sidebar-menu"),
      ).toContainText(readonlyAgentName, { timeout: 10000 });

      // Remove bookmarks from Agents and verify they are removed from sidebar
      await readonlyAgentCard.getByTestId("bookmark-button").click();
      await secondUserPage.waitForTimeout(1000);
      await expect(
        secondUserPage.getByTestId("agents-sidebar-menu"),
      ).not.toContainText(readonlyAgentName);

      await publicAgentCard.getByTestId("bookmark-button").click();
      await secondUserPage.waitForTimeout(1000);
      await expect(
        secondUserPage.getByTestId("agents-sidebar-menu"),
      ).not.toContainText(publicAgentName);
    } finally {
      await secondUserContext.close();
    }
  });
});
