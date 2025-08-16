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

test.describe("Agent Visibility and Sharing", () => {
  test("user1 creates agents with different visibility levels", async ({
    browser,
  }) => {
    // Create user1 context
    const user1Context = await browser.newContext({
      storageState: "tests/.auth/user1.json",
    });
    const user1Page = await user1Context.newPage();

    try {
      // Create public agent
      await user1Page.goto("/agent/new");
      await user1Page.waitForLoadState("networkidle");

      await user1Page.getByTestId("agent-name-input").fill(publicAgentName);
      await user1Page
        .getByTestId("agent-description-input")
        .fill("This is a public agent that anyone can see and edit");
      await clickAndWaitForNavigation(
        user1Page,
        "agent-save-button",
        "**/agents",
      );

      // Edit to set visibility to public
      await user1Page
        .locator(`main a:has-text("${publicAgentName}")`)
        .first()
        .click();
      await user1Page.waitForURL("**/agent/**", { timeout: 10000 });

      // Open visibility dropdown and select public
      await openDropdown(user1Page, "visibility-button");
      await selectDropdownOption(user1Page, "visibility-public");

      await clickAndWaitForNavigation(
        user1Page,
        "agent-save-button",
        "**/agents",
      );
      await user1Page.waitForLoadState("networkidle");

      // Create private agent (default is private)
      await user1Page.goto("/agent/new");
      await user1Page.waitForLoadState("networkidle");
      await user1Page.getByTestId("agent-name-input").fill(privateAgentName);
      await user1Page
        .getByTestId("agent-description-input")
        .fill("This is a private agent that only the owner can see");
      await clickAndWaitForNavigation(
        user1Page,
        "agent-save-button",
        "**/agents",
      );

      // Create readonly agent
      await user1Page.goto("/agent/new");
      await user1Page.waitForLoadState("networkidle");
      await user1Page.getByTestId("agent-name-input").fill(readonlyAgentName);
      await user1Page
        .getByTestId("agent-description-input")
        .fill("This is a readonly agent that others can see but not edit");
      await clickAndWaitForNavigation(
        user1Page,
        "agent-save-button",
        "**/agents",
      );

      // Edit to set visibility to readonly
      await user1Page
        .locator(`main a:has-text("${readonlyAgentName}")`)
        .first()
        .click();
      await user1Page.waitForURL("**/agent/**", { timeout: 10000 });
      // Open visibility dropdown and select readonly
      await openDropdown(user1Page, "visibility-button");
      await selectDropdownOption(user1Page, "visibility-readonly");

      await clickAndWaitForNavigation(
        user1Page,
        "agent-save-button",
        "**/agents",
      );
      await user1Page.waitForLoadState("networkidle");
    } finally {
      await user1Context.close();
    }
  });

  test("user2 can see public and readonly agents but not private", async ({
    browser,
  }) => {
    const user2Context = await browser.newContext({
      storageState: "tests/.auth/user2.json",
    });
    const user2Page = await user2Context.newPage();

    try {
      await user2Page.goto("/agents");
      await user2Page.waitForLoadState("networkidle");

      // Should see the public agent
      const publicAgent = user2Page.locator(
        `[data-testid="agent-card-name"]:has-text("${publicAgentName}")`,
      );
      await expect(publicAgent).toBeVisible({ timeout: 10000 });

      // Should see the readonly agent
      const readonlyAgent = user2Page.locator(
        `[data-testid="agent-card-name"]:has-text("${readonlyAgentName}")`,
      );
      await expect(readonlyAgent).toBeVisible({ timeout: 10000 });

      // Should NOT see the private agent
      const privateAgent = user2Page.locator(
        `[data-testid="agent-card-name"]:has-text("${privateAgentName}")`,
      );
      await expect(privateAgent).not.toBeVisible();
    } finally {
      await user2Context.close();
    }
  });

  test("user2 can edit public agent", async ({ browser }) => {
    const user2Context = await browser.newContext({
      storageState: "tests/.auth/user2.json",
    });
    const user2Page = await user2Context.newPage();

    try {
      await user2Page.goto("/agents");
      await user2Page.waitForLoadState("networkidle");

      // Click on the public agent
      await user2Page
        .locator(`main a:has-text("${publicAgentName}")`)
        .first()
        .click();
      await user2Page.waitForURL("**/agent/**", { timeout: 10000 });

      // Should be able to see and modify the form fields
      const nameInput = user2Page.getByTestId("agent-name-input");
      const descriptionInput = user2Page.getByTestId("agent-description-input");
      const saveButton = user2Page.getByTestId("agent-save-button");

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
        user2Page.waitForURL("**/agents", { timeout: 10000 }),
        saveButton.click(),
      ]);

      // Verify the edit was successful
      const editedAgent = user2Page.locator(
        `[data-testid="agent-card-name"]:has-text("${publicAgentName} (edited by user2)")`,
      );
      await expect(editedAgent).toBeVisible();
    } finally {
      await user2Context.close();
    }
  });

  test("user2 can view but not edit readonly agent", async ({ browser }) => {
    const user2Context = await browser.newContext({
      storageState: "tests/.auth/user2.json",
    });
    const user2Page = await user2Context.newPage();

    try {
      await user2Page.goto("/agents");
      await user2Page.waitForLoadState("networkidle");

      // Click on the readonly agent
      await user2Page
        .locator(`main a:has-text("${readonlyAgentName}")`)
        .first()
        .click();
      await user2Page.waitForURL("**/agent/**", { timeout: 10000 });

      // Should be able to see the form fields but they should be disabled
      const nameInput = user2Page.getByTestId("agent-name-input");
      const descriptionInput = user2Page.getByTestId("agent-description-input");

      await expect(nameInput).toBeVisible();
      await expect(nameInput).toBeDisabled();
      await expect(descriptionInput).toBeVisible();
      await expect(descriptionInput).toBeDisabled();

      // Save button should not be visible or should be disabled
      const saveButton = user2Page.getByTestId("agent-save-button");
      await expect(saveButton).not.toBeVisible();

      // Verify current values are visible
      await expect(nameInput).toHaveValue(readonlyAgentName);
    } finally {
      await user2Context.close();
    }
  });

  test("user2 can bookmark public and readonly agents", async ({ browser }) => {
    const user2Context = await browser.newContext({
      storageState: "tests/.auth/user2.json",
    });
    const user2Page = await user2Context.newPage();

    try {
      await user2Page.goto("/agents");
      await user2Page.waitForURL("**/agents", { timeout: 10000 });

      // Find and bookmark the public agent (now with edited name)
      const publicAgentCard = user2Page.locator(
        `[data-testid*="agent-card"][data-item-name="${publicAgentName} (edited by user2)"]`,
      );
      await publicAgentCard.getByTestId("bookmark-button").click();
      await user2Page.getByTestId("sidebar-toggle").click();
      await expect(user2Page.getByTestId("agents-sidebar-menu")).toContainText(
        publicAgentName,
      );

      // Find and bookmark the readonly agent
      const readonlyAgentCard = user2Page.locator(
        `[data-testid*="agent-card"][data-item-name="${readonlyAgentName}"]`,
      );
      await readonlyAgentCard.getByTestId("bookmark-button").click();

      await expect(user2Page.getByTestId("agents-sidebar-menu")).toContainText(
        readonlyAgentName,
      );

      // Remove bookmarks from Agents and verify they are removed from sidebar
      await readonlyAgentCard.getByTestId("bookmark-button").click();
      await expect(
        user2Page.getByTestId("agents-sidebar-menu"),
      ).not.toContainText(readonlyAgentName);

      await publicAgentCard.getByTestId("bookmark-button").click();
      await expect(
        user2Page.getByTestId("agents-sidebar-menu"),
      ).not.toContainText(publicAgentName);
    } finally {
      await user2Context.close();
    }
  });
});
