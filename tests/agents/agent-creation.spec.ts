import { test, expect, Page } from "@playwright/test";
import {
  uniqueTestName,
  clickAndWaitForNavigation,
  openDropdown,
  selectDropdownOption,
} from "../utils/test-helpers";
import { TEST_USERS } from "../constants/test-users";

async function createAgent(
  page: Page,
  name: string,
  description: string,
): Promise<void> {
  await page.goto("/agent/new");

  await page.getByTestId("agent-name-input").fill(name);
  await page.getByTestId("agent-description-input").fill(description);

  await clickAndWaitForNavigation(page, "agent-save-button", "**/agents");
}

test.describe("Agent Creation and Sharing Workflow", () => {
  test.use({ storageState: TEST_USERS.editor.authFile });

  test("should create a new agent successfully", async ({ page }) => {
    await page.goto("/agent/new");
    await createAgent(
      page,
      "Test Agent for Sharing",
      "This agent tests the sharing workflow",
    );

    // Verify we're on agents list
    expect(page.url()).toContain("/agents");
  });

  test("should show created agent on agents page", async ({ page }) => {
    // Create an agent
    const agentName = uniqueTestName("Test Agent");
    await createAgent(page, agentName, "Should appear in agent list");

    // We should already be on agents page after creation
    expect(page.url()).toContain("/agents");

    // Check if agent appears in the page - more specific selector
    await expect(
      page.locator(`[data-testid*="agent-card-name"]:has-text("${agentName}")`),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show agent in sidebar after creation", async ({ page }) => {
    const agentName = uniqueTestName("Sidebar Agent");
    await createAgent(page, agentName, "Should appear in sidebar");

    // Navigate to home to see sidebar
    await page.goto("/");

    // Agent should be visible in the sidebar - use specific selector
    await expect(
      page.locator(
        `[data-testid*="sidebar-agent-name"]:has-text("${agentName}")`,
      ),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to agent from agents list", async ({ page }) => {
    const agentName = uniqueTestName("Clickable Agent");
    await createAgent(page, agentName, "Click to open");

    await page.locator(`main a:has-text("${agentName}")`).first().click();
    await expect(page.getByTestId("agent-name-input")).toHaveValue(agentName);
  });

  test("should edit an existing agent", async ({ page }) => {
    // Create an agent first
    const originalName = uniqueTestName("Original Agent");
    const updatedName = uniqueTestName("Updated Agent");
    await createAgent(page, originalName, "Will be edited");

    // Click on the agent from the list using a simpler selector
    await page.locator(`main a:has-text("${originalName}")`).first().click();

    // Edit the name with a unique name
    await page.getByTestId("agent-name-input").fill(updatedName);

    // Edit the description
    await page
      .getByTestId("agent-description-input")
      .fill("Updated description after editing");

    // Save changes
    await clickAndWaitForNavigation(page, "agent-save-button", "**/agents");

    // Check the updated agent appears using the unique name
    await expect(
      page.locator(
        `[data-testid*="agent-card-name"]:has-text("${updatedName}")`,
      ),
    ).toBeVisible({ timeout: 5000 });
  });

  // Commenting out due to rate limiting issues with free OpenRouter API
  // This test is flaky in CI due to 429 errors from the free tier
  test.skip("should generate an agent with AI", async ({ page }) => {
    await page.goto("/agent/new");

    // Click Generate With AI button
    await page.getByTestId("agent-generate-with-ai-button").click();

    // Should open a dialog - wait for it to appear
    await expect(
      page.getByTestId("agent-generate-agent-prompt-textarea"),
    ).toBeVisible({
      timeout: 5000,
    });
    await page
      .getByTestId("agent-generate-agent-prompt-textarea")
      .fill("Help me come up with a dog names.");
    await page.getByTestId("agent-generate-agent-prompt-submit-button").click();
    await expect(page.getByTestId("agent-name-input")).toHaveValue(/Dog/i, {
      timeout: 10000,
    });
  });

  test("should create an agent with example", async ({ page }) => {
    await page.goto("/agent/new");

    // Click Create With Example button
    await openDropdown(page, "agent-create-with-example-button");
    await selectDropdownOption(
      page,
      "agent-create-with-example-weather-button",
    );
    await expect(page.getByTestId("agent-name-input")).toHaveValue(/Weather/i, {
      timeout: 5000,
    });
  });

  test("should add instructions to agent", async ({ page }) => {
    await page.goto("/agent/new");

    // Fill basic info
    await page.getByTestId("agent-name-input").fill("Agent with Instructions");
    await page
      .getByTestId("agent-description-input")
      .fill("Has custom instructions");

    await page
      .getByTestId("agent-prompt-textarea")
      .fill(
        "You are a helpful assistant that specializes in testing and quality assurance.",
      );

    await clickAndWaitForNavigation(page, "agent-save-button", "**/agents");
    expect(page.url()).toContain("/agents");
  });
});
